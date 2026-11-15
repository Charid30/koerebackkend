import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';

@Injectable()
export class InspectionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(vehiculeId?: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = vehiculeId ? { vehiculeId } : {};

    const [data, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicule: { select: { id: true, numeroInterne: true, immatriculation: true } },
          inspecteur: { select: { id: true, nom: true, prenom: true } },
          items: true,
        },
        orderBy: { dateInspection: 'desc' },
      }),
      this.prisma.inspection.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: {
        vehicule: true,
        inspecteur: { select: { id: true, nom: true, prenom: true } },
        items: true,
      },
    });
    if (!inspection) throw new NotFoundException(`Inspection #${id} introuvable`);
    return inspection;
  }

  async update(id: number, data: { notes?: string; statut?: string }) {
    const inspection = await this.prisma.inspection.findUnique({ where: { id } });
    if (!inspection) throw new NotFoundException(`Inspection #${id} introuvable`);
    return this.prisma.inspection.update({
      where: { id },
      data: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.statut && { statut: data.statut as any }),
      },
    });
  }

  async remove(id: number) {
    const inspection = await this.prisma.inspection.findUnique({ where: { id } });
    if (!inspection) throw new NotFoundException(`Inspection #${id} introuvable`);
    return this.prisma.inspection.delete({ where: { id } });
  }

  private normaliserDates(dto: any) {
    const d = { ...dto };
    if (d.dateInspection) d.dateInspection = new Date(d.dateInspection);
    return d;
  }

  async create(dto: CreateInspectionDto, inspecteurId: number) {
    const { items, ...rawData } = dto;
    const inspectionData = this.normaliserDates(rawData);

    const hasAnomalie = items.some((i) => i.resultat === 'KO');
    const statut = items.every((i) => i.resultat === 'OK')
      ? 'CONFORME'
      : hasAnomalie
        ? 'NON_CONFORME'
        : 'PARTIEL';

    const inspection = await this.prisma.inspection.create({
      data: {
        ...inspectionData,
        inspecteurId,
        statut: statut as any,
        items: { create: items },
      },
      include: { items: true },
    });

    // Créer une DI automatiquement si anomalie critique
    const anomaliesCritiques = items.filter((i) => i.resultat === 'KO');
    if (anomaliesCritiques.length > 0) {
      await this.creerDiAutomatique(inspection.id, dto.vehiculeId, inspecteurId, anomaliesCritiques);
    }

    return inspection;
  }

  private async creerDiAutomatique(inspectionId: number, vehiculeId: number, declarantId: number, anomalies: any[]) {
    const description = anomalies.map((a) => `${a.categorie} — ${a.libelle}: ${a.observation ?? 'Anomalie détectée'}`).join('\n');
    const count = await this.prisma.demandeIntervention.count();
    const numeroDI = `DI-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    await this.prisma.demandeIntervention.create({
      data: {
        numeroDI,
        vehiculeId,
        declarantId,
        inspectionId,
        description,
        priorite: 'URGENTE',
      },
    });
  }
}
