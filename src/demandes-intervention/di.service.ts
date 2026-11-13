import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiDto } from './dto/create-di.dto';

@Injectable()
export class DemandesInterventionService {
  constructor(private prisma: PrismaService) {}

  private async genererNumeroDI(): Promise<string> {
    const count = await this.prisma.demandeIntervention.count();
    return `DI-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(vehiculeId?: number, statut?: string, priorite?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (vehiculeId) where.vehiculeId = vehiculeId;
    if (statut) where.statut = statut;
    if (priorite) where.priorite = priorite;

    const [data, total] = await Promise.all([
      this.prisma.demandeIntervention.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priorite: 'desc' }, { createdAt: 'desc' }],
        include: {
          vehicule: { select: { id: true, numeroInterne: true, marque: true, modele: true, immatriculation: true } },
          declarant: { select: { id: true, nom: true, prenom: true } },
          ordresTravail: { select: { id: true, numeroOT: true, statut: true } },
        },
      }),
      this.prisma.demandeIntervention.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const di = await this.prisma.demandeIntervention.findUnique({
      where: { id },
      include: {
        vehicule: true,
        declarant: { select: { id: true, nom: true, prenom: true, email: true } },
        inspection: { select: { id: true, dateInspection: true, statut: true } },
        ordresTravail: {
          include: {
            vehicule: { select: { numeroInterne: true, marque: true, modele: true } },
          },
        },
        photos: true,
      },
    });
    if (!di) throw new NotFoundException(`DI #${id} introuvable`);
    return di;
  }

  async create(dto: CreateDiDto, declarantId: number) {
    const numeroDI = await this.genererNumeroDI();
    return this.prisma.demandeIntervention.create({
      data: {
        numeroDI,
        vehiculeId: dto.vehiculeId,
        declarantId,
        description: dto.description,
        priorite: dto.priorite ?? 'NORMALE',
        localisation: dto.localisation,
      },
    });
  }

  async update(id: number, data: { description?: string; priorite?: string; localisation?: string }) {
    await this.findOne(id);
    return this.prisma.demandeIntervention.update({
      where: { id },
      data: {
        ...(data.description && { description: data.description }),
        ...(data.priorite && { priorite: data.priorite as any }),
        ...(data.localisation !== undefined && { localisation: data.localisation }),
      },
    });
  }

  async updateStatut(id: number, statut: string) {
    await this.findOne(id);
    return this.prisma.demandeIntervention.update({
      where: { id },
      data: { statut: statut as any },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.demandeIntervention.delete({ where: { id } });
    return { message: `DI #${id} supprimée` };
  }
}
