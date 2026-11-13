import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, TypePlanMaintenance } from './dto/create-plan.dto';

const VEHICULE_SELECT = {
  id: true, numeroInterne: true, immatriculation: true,
  marque: true, modele: true, kilometrage: true, heuresMoteur: true, typeVehicule: true,
};

const SEUIL_KM   = 10_000;
const RAPPEL_KM_JOURS = 14; // rappel bimensuel pour vérifier le km

@Injectable()
export class MaintenancePreventiveService {
  constructor(private prisma: PrismaService) {}

  // ── Lecture ──────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.planMaintenance.findMany({
      where: { actif: true },
      include: { vehicule: { select: VEHICULE_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByType(typePlan: TypePlanMaintenance) {
    return this.prisma.planMaintenance.findMany({
      where: { actif: true, typePlan },
      include: { vehicule: { select: VEHICULE_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByVehicule(vehiculeId: number) {
    return this.prisma.planMaintenance.findMany({
      where: { vehiculeId, actif: true },
      include: { vehicule: { select: VEHICULE_SELECT } },
    });
  }

  /** Alertes actives : km dépassé (PERIODIQUE) ou date dépassée (GENERALE) */
  async findAlertes() {
    const now = new Date();
    const plans = await this.prisma.planMaintenance.findMany({
      where: { actif: true },
      include: { vehicule: { select: VEHICULE_SELECT } },
    });

    return plans.filter(p => {
      if (p.typePlan === 'PERIODIQUE') {
        const kmActuel = p.vehicule?.kilometrage ?? 0;
        return p.prochaineExecutionKm != null && kmActuel >= p.prochaineExecutionKm;
      }
      // GENERALE
      return p.prochaineExecutionDate != null && p.prochaineExecutionDate <= now;
    });
  }

  /** Rappels bimensuels : tous les plans PERIODIQUE actifs (à vérifier toutes les 2 sem.) */
  async findRappelsBimensuels() {
    return this.prisma.planMaintenance.findMany({
      where: { actif: true, typePlan: 'PERIODIQUE' },
      include: { vehicule: { select: VEHICULE_SELECT } },
    });
  }

  // ── Création ─────────────────────────────────────────────────────────

  async create(dto: CreatePlanDto) {
    if (dto.typePlan === TypePlanMaintenance.PERIODIQUE) {
      const kmBase = dto.derniereExecutionKm ?? 0;
      return this.prisma.planMaintenance.create({
        data: {
          vehiculeId:          dto.vehiculeId,
          typePlan:            'PERIODIQUE',
          typeOperation:       'Maintenance périodique',
          description:         dto.description,
          frequenceKm:         SEUIL_KM,
          frequenceJours:      RAPPEL_KM_JOURS,
          derniereExecutionKm: kmBase,
          prochaineExecutionKm: kmBase + SEUIL_KM,
          derniereExecutionDate: dto.derniereExecutionDate
            ? new Date(dto.derniereExecutionDate)
            : new Date(),
        },
      });
    }

    // GENERALE
    const frequenceMois = dto.frequenceMois ?? 2;
    const dateBase = dto.derniereExecutionDate
      ? new Date(dto.derniereExecutionDate)
      : new Date();
    const prochaineDate = new Date(dateBase);
    prochaineDate.setMonth(prochaineDate.getMonth() + frequenceMois);

    return this.prisma.planMaintenance.create({
      data: {
        vehiculeId:            dto.vehiculeId,
        typePlan:              'GENERALE',
        typeOperation:         'Maintenance générale',
        description:           dto.description,
        frequenceMois,
        frequenceJours:        frequenceMois * 30,
        derniereExecutionDate: dateBase,
        prochaineExecutionDate: prochaineDate,
      },
    });
  }

  // ── Marquer comme effectuée ──────────────────────────────────────────

  async enregistrerExecution(id: number, body: { kilometrage?: number }) {
    const plan = await this.prisma.planMaintenance.findUnique({
      where: { id },
      include: { vehicule: { select: { kilometrage: true } } },
    });
    if (!plan) throw new NotFoundException(`Plan #${id} introuvable`);

    const now = new Date();

    if (plan.typePlan === 'PERIODIQUE') {
      const km = body.kilometrage ?? plan.vehicule?.kilometrage ?? 0;
      return this.prisma.planMaintenance.update({
        where: { id },
        data: {
          derniereExecutionKm:   km,
          prochaineExecutionKm:  km + SEUIL_KM,
          derniereExecutionDate: now,
        },
      });
    }

    // GENERALE
    const mois = plan.frequenceMois ?? 2;
    const prochaine = new Date(now);
    prochaine.setMonth(prochaine.getMonth() + mois);

    return this.prisma.planMaintenance.update({
      where: { id },
      data: {
        derniereExecutionDate:  now,
        prochaineExecutionDate: prochaine,
      },
    });
  }

  // ── Suppression / désactivation ──────────────────────────────────────

  async desactiver(id: number) {
    const plan = await this.prisma.planMaintenance.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan #${id} introuvable`);
    return this.prisma.planMaintenance.update({ where: { id }, data: { actif: false } });
  }
}
