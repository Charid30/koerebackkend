import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOtDto } from './dto/create-ot.dto';
import { UpdateStatutOtDto } from './dto/update-statut-ot.dto';
import { StatutOT } from '@prisma/client';

@Injectable()
export class OrdresTravauxService {
  constructor(private prisma: PrismaService) {}

  private async genererNumeroOT(): Promise<string> {
    const count = await this.prisma.ordresTravail.count();
    return `OT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(statut?: StatutOT, vehiculeId?: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (statut) where.statut = statut;
    if (vehiculeId) where.vehiculeId = vehiculeId;

    const [data, total] = await Promise.all([
      this.prisma.ordresTravail.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicule: { select: { id: true, numeroInterne: true, immatriculation: true, marque: true, modele: true } },
          responsable: { select: { id: true, nom: true, prenom: true } },
          mecaniciens: { include: { mecanicien: { select: { id: true, nom: true, prenom: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ordresTravail.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const ot = await this.prisma.ordresTravail.findUnique({
      where: { id },
      include: {
        vehicule: true,
        responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        mecaniciens: { include: { mecanicien: { select: { id: true, nom: true, prenom: true } } } },
        piecesUtilisees: { include: { piece: true } },
        photos: true,
        demandeIntervention: true,
      },
    });
    if (!ot) throw new NotFoundException(`OT #${id} introuvable`);
    return ot;
  }

  async create(dto: CreateOtDto, responsableId: number) {
    const numeroOT = await this.genererNumeroOT();
    const data = this.normaliserDates({ ...dto, numeroOT, responsableId });
    return this.prisma.ordresTravail.create({ data });
  }

  private normaliserDates(dto: any) {
    const d = { ...dto };
    if (d.datePlanifiee && !d.datePlanifiee.includes('T')) d.datePlanifiee = new Date(d.datePlanifiee + 'T00:00:00.000Z');
    return d;
  }

  async updateStatut(id: number, dto: UpdateStatutOtDto, userId: number) {
    const ot = await this.findOne(id);

    const transitionsValides: Partial<Record<StatutOT, StatutOT[]>> = {
      EN_ATTENTE_VALIDATION: [StatutOT.PLANIFIE, StatutOT.ANNULE],
      PLANIFIE: [StatutOT.EN_COURS, StatutOT.ANNULE],
      EN_COURS: [StatutOT.EN_ATTENTE_PIECES, StatutOT.EN_ATTENTE_PRESTATAIRE, StatutOT.TERMINE],
      EN_ATTENTE_PIECES: [StatutOT.EN_COURS],
      EN_ATTENTE_PRESTATAIRE: [StatutOT.EN_COURS, StatutOT.TERMINE],
      TERMINE: [StatutOT.CONTROLE],
      CONTROLE: [StatutOT.CLOTURE],
    };

    const permis = transitionsValides[ot.statut];
    if (!permis || !permis.includes(dto.statut)) {
      throw new BadRequestException(
        `Transition invalide : ${ot.statut} → ${dto.statut}`,
      );
    }

    // Mise à jour du statut véhicule selon la transition OT
    const statutVehicule =
      dto.statut === StatutOT.EN_COURS                                         ? 'EN_MAINTENANCE'
      : dto.statut === StatutOT.CLOTURE || dto.statut === StatutOT.ANNULE      ? 'DISPONIBLE'
      : null;

    const [updatedOt] = await this.prisma.$transaction([
      this.prisma.ordresTravail.update({
        where: { id },
        data: {
          statut: dto.statut,
          ...(dto.statut === StatutOT.EN_COURS && !ot.dateDebut ? { dateDebut: new Date() } : {}),
          ...(dto.statut === StatutOT.TERMINE ? { dateFin: new Date() } : {}),
          ...(dto.notesControle ? { notesControle: dto.notesControle } : {}),
        },
      }),
      ...(statutVehicule
        ? [this.prisma.vehicule.update({ where: { id: ot.vehiculeId }, data: { statut: statutVehicule as any } })]
        : []),
    ]);

    return updatedOt;
  }

  async affecterMecanicien(otId: number, mecanicienId: number) {
    await this.findOne(otId);
    return this.prisma.otMecanicien.upsert({
      where: { otId_mecanicienId: { otId, mecanicienId } },
      create: { otId, mecanicienId },
      update: {},
    });
  }

  async updateCouts(id: number, body: {
    coutPrestataire?: number;
    coutPiecesTotal?: number;
    heuresInternesTotal?: number;
    prestatireExterne?: string;
  }) {
    await this.findOne(id);
    return this.prisma.ordresTravail.update({
      where: { id },
      data: {
        ...(body.coutPrestataire !== undefined ? { coutPrestataire: body.coutPrestataire } : {}),
        ...(body.coutPiecesTotal !== undefined ? { coutPiecesTotal: body.coutPiecesTotal } : {}),
        ...(body.heuresInternesTotal !== undefined ? { heuresInternesTotal: body.heuresInternesTotal } : {}),
        ...(body.prestatireExterne !== undefined ? { prestatireExterne: body.prestatireExterne } : {}),
      },
    });
  }

  async updateMecanicienTravaux(otId: number, mecanicienId: number, body: {
    tempsPasse?: number;
    diagnostic?: string;
    travauxEffectues?: string;
  }) {
    return this.prisma.otMecanicien.update({
      where: { otId_mecanicienId: { otId, mecanicienId } },
      data: body,
    });
  }

  async update(id: number, data: { typeMaintenance?: string; datePlanifiee?: string; prestatireExterne?: string; description?: string }) {
    const ot = await this.prisma.ordresTravail.findUnique({ where: { id } });
    if (!ot) throw new NotFoundException(`OT #${id} introuvable`);
    return this.prisma.ordresTravail.update({
      where: { id },
      data: {
        ...(data.typeMaintenance && { typeMaintenance: data.typeMaintenance as any }),
        ...(data.datePlanifiee !== undefined && { datePlanifiee: data.datePlanifiee ? new Date(data.datePlanifiee) : null }),
        ...(data.prestatireExterne !== undefined && { prestatireExterne: data.prestatireExterne }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  async remove(id: number) {
    const ot = await this.prisma.ordresTravail.findUnique({ where: { id } });
    if (!ot) throw new NotFoundException(`OT #${id} introuvable`);
    return this.prisma.ordresTravail.delete({ where: { id } });
  }
}
