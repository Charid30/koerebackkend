import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehiculeDto } from './dto/create-vehicule.dto';
import { UpdateVehiculeDto } from './dto/update-vehicule.dto';
import { FilterVehiculeDto } from './dto/filter-vehicule.dto';

@Injectable()
export class VehiculesService {
  constructor(private prisma: PrismaService) {}

  async findEntites(): Promise<string[]> {
    const rows = await this.prisma.vehicule.findMany({
      where: { entite: { not: null } },
      select: { entite: true },
      distinct: ['entite'],
      orderBy: { entite: 'asc' },
    });
    return rows.map(r => r.entite!).filter(Boolean);
  }

  async findAll(filters: FilterVehiculeDto) {
    const { statut, typeVehicule, departement, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const { search } = filters;
    const where: any = {};
    if (statut) where.statut = statut;
    if (typeVehicule) where.typeVehicule = typeVehicule;
    if (departement) where.departement = { contains: departement };
    if (search) {
      where.OR = [
        { immatriculation: { contains: search } },
        { marque: { contains: search } },
        { modele: { contains: search } },
        { numeroInterne: { contains: search } },
        { numeroSerie: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicule.findMany({
        where,
        skip,
        take: limit,
        include: { conducteurHabituel: { select: { id: true, nom: true, prenom: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicule.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const vehicule = await this.prisma.vehicule.findUnique({
      where: { id },
      include: {
        conducteurHabituel: { select: { id: true, nom: true, prenom: true, email: true } },
        plansPreventifs: { where: { actif: true } },
        _count: { select: { inspections: true, ordresTravail: true } },
      },
    });
    if (!vehicule) throw new NotFoundException(`Véhicule #${id} introuvable`);
    return vehicule;
  }

  async create(dto: CreateVehiculeDto) {
    return this.prisma.vehicule.create({ data: this.normaliserDates(dto) });
  }

  async update(id: number, dto: UpdateVehiculeDto) {
    await this.findOne(id);
    return this.prisma.vehicule.update({ where: { id }, data: this.normaliserDates(dto) });
  }

  private normaliserDates(dto: any) {
    const d = { ...dto };
    if (d.dateAcquisition && !d.dateAcquisition.includes('T')) d.dateAcquisition = new Date(d.dateAcquisition + 'T00:00:00.000Z');
    if (d.dateMiseEnService && !d.dateMiseEnService.includes('T')) d.dateMiseEnService = new Date(d.dateMiseEnService + 'T00:00:00.000Z');
    return d;
  }

  async updateStatut(id: number, statut: string) {
    await this.findOne(id);
    return this.prisma.vehicule.update({ where: { id }, data: { statut: statut as any } });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Supprimer en cascade les données liées
    await this.prisma.$transaction([
      this.prisma.inspectionItem.deleteMany({ where: { inspection: { vehiculeId: id } } }),
      this.prisma.inspection.deleteMany({ where: { vehiculeId: id } }),
      this.prisma.otMecanicien.deleteMany({ where: { ot: { vehiculeId: id } } }),
      this.prisma.ordresTravail.deleteMany({ where: { vehiculeId: id } }),
      this.prisma.demandeIntervention.deleteMany({ where: { vehiculeId: id } }),
      this.prisma.planMaintenance.deleteMany({ where: { vehiculeId: id } }),
      this.prisma.amdecAnalyse.deleteMany({ where: { vehiculeId: id } }),
      this.prisma.vehicule.delete({ where: { id } }),
    ]);
    return { message: `Véhicule #${id} supprimé` };
  }

  async findHistorique(id: number) {
    await this.findOne(id);
    const [inspections, ordresTravail, demandesIntervention, plansMaintenances] = await Promise.all([
      this.prisma.inspection.findMany({
        where: { vehiculeId: id },
        orderBy: { dateInspection: 'desc' },
        take: 50,
        include: {
          inspecteur: { select: { nom: true, prenom: true } },
          items: true,
        },
      }),
      this.prisma.ordresTravail.findMany({
        where: { vehiculeId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          responsable: { select: { nom: true, prenom: true } },
          mecaniciens: { include: { mecanicien: { select: { nom: true, prenom: true } } } },
        },
      }),
      this.prisma.demandeIntervention.findMany({
        where: { vehiculeId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          declarant: { select: { nom: true, prenom: true } },
        },
      }),
      this.prisma.planMaintenance.findMany({
        where: { vehiculeId: id, actif: true },
        orderBy: { prochaineExecutionDate: 'asc' },
      }),
    ]);

    return { inspections, ordresTravail, demandesIntervention, plansMaintenances };
  }
}
