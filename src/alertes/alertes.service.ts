import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AlertesService {
  private readonly logger = new Logger(AlertesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Tous les jours à 7h00
  @Cron('0 7 * * *')
  async verifierEcheancesMaintenances() {
    this.logger.log('Vérification des échéances de maintenance...');
    const dans7Jours = new Date();
    dans7Jours.setDate(dans7Jours.getDate() + 7);

    const plans = await this.prisma.planMaintenance.findMany({
      where: {
        actif: true,
        prochaineExecutionDate: { lte: dans7Jours },
      },
      include: {
        vehicule: { select: { id: true, numeroInterne: true, marque: true, modele: true } },
      },
    });

    const responsables = await this.prisma.user.findMany({
      where: { role: { in: ['RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'ADMIN'] }, actif: true },
      select: { id: true },
    });

    for (const plan of plans) {
      const v = plan.vehicule;
      const dateStr = plan.prochaineExecutionDate
        ? new Date(plan.prochaineExecutionDate).toLocaleDateString('fr-FR')
        : 'N/A';

      for (const user of responsables) {
        const dejaNotifie = await this.prisma.notification.findFirst({
          where: {
            destinataireId: user.id,
            type: 'MAINTENANCE_ECHEANCE',
            lien: `/maintenance`,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!dejaNotifie) {
          await this.notifications.envoyer(
            user.id,
            'MAINTENANCE_ECHEANCE',
            `Maintenance à venir — ${v.marque} ${v.modele}`,
            `${plan.typeOperation} prévue le ${dateStr} pour ${v.marque} ${v.modele} (${v.numeroInterne})`,
            `/maintenance`,
          );
        }
      }
    }
  }

  // Toutes les heures
  @Cron(CronExpression.EVERY_HOUR)
  async verifierStockFaible() {
    const piecesEnAlerte = await this.prisma.$queryRaw<{ id: number; designation: string; quantiteDisponible: number; quantiteMinimum: number }[]>`
      SELECT id, designation, quantiteDisponible, quantiteMinimum
      FROM pieces_stock
      WHERE quantiteDisponible <= quantiteMinimum
    `;

    if (piecesEnAlerte.length === 0) return;

    const responsables = await this.prisma.user.findMany({
      where: { role: { in: ['RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'ADMIN'] }, actif: true },
      select: { id: true },
    });

    for (const piece of piecesEnAlerte) {
      for (const user of responsables) {
        const dejaNotifie = await this.prisma.notification.findFirst({
          where: {
            destinataireId: user.id,
            type: 'STOCK_FAIBLE',
            lien: `/stocks`,
            createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          },
        });
        if (!dejaNotifie) {
          await this.notifications.envoyer(
            user.id,
            'STOCK_FAIBLE',
            `Stock faible — ${piece.designation}`,
            `Quantité disponible: ${piece.quantiteDisponible} (seuil min: ${piece.quantiteMinimum})`,
            `/stocks`,
          );
        }
      }
    }
  }

  // Tous les jours à 8h00 — véhicules immobilisés depuis plus de 7 jours
  @Cron('0 8 * * *')
  async verifierImmobilisations() {
    const il7JoursPassEs = new Date();
    il7JoursPassEs.setDate(il7JoursPassEs.getDate() - 7);

    const vehiculesImmobilises = await this.prisma.vehicule.findMany({
      where: {
        statut: 'IMMOBILISE',
        updatedAt: { lte: il7JoursPassEs },
      },
    });

    if (vehiculesImmobilises.length === 0) return;

    const responsables = await this.prisma.user.findMany({
      where: { role: { in: ['RESPONSABLE_PARC', 'ADMIN', 'DIRECTION'] }, actif: true },
      select: { id: true },
    });

    for (const v of vehiculesImmobilises) {
      for (const user of responsables) {
        const dejaNotifie = await this.prisma.notification.findFirst({
          where: {
            destinataireId: user.id,
            type: 'IMMOBILISATION',
            lien: `/vehicules/${v.id}`,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!dejaNotifie) {
          await this.notifications.envoyer(
            user.id,
            'IMMOBILISATION',
            `Immobilisation prolongée — ${v.marque} ${v.modele}`,
            `${v.marque} ${v.modele} (${v.numeroInterne}) est immobilisé depuis plus de 7 jours.`,
            `/vehicules/${v.id}`,
          );
        }
      }
    }
  }

  // Tous les jours à 9h00 — pannes récurrentes (même anomalie 5x en 3 mois)
  @Cron('0 9 * * *')
  async verifierPannesRecurrentes() {
    const il3MoisPassEs = new Date();
    il3MoisPassEs.setMonth(il3MoisPassEs.getMonth() - 3);

    // Grouper les DI par véhicule et détecter celles avec >= 5 occurrences
    const groupes = await this.prisma.$queryRaw<{ vehiculeId: number; nb: bigint }[]>`
      SELECT vehiculeId, COUNT(*) as nb
      FROM demandes_intervention
      WHERE createdAt >= ${il3MoisPassEs}
        AND statut NOT IN ('REJETEE')
      GROUP BY vehiculeId
      HAVING COUNT(*) >= 5
    `;

    if (groupes.length === 0) return;

    const responsables = await this.prisma.user.findMany({
      where: { role: { in: ['RESPONSABLE_MAINTENANCE', 'ADMIN'] }, actif: true },
      select: { id: true },
    });

    for (const g of groupes) {
      const vehicule = await this.prisma.vehicule.findUnique({
        where: { id: g.vehiculeId },
      });
      if (!vehicule) continue;

      for (const user of responsables) {
        const dejaNotifie = await this.prisma.notification.findFirst({
          where: {
            destinataireId: user.id,
            type: 'ANOMALIE_RECURRENTE',
            lien: `/vehicules/${vehicule.id}`,
            createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
          },
        });
        if (!dejaNotifie) {
          await this.notifications.envoyer(
            user.id,
            'ANOMALIE_RECURRENTE',
            `Pannes récurrentes — ${vehicule.marque} ${vehicule.modele}`,
            `${vehicule.marque} ${vehicule.modele} (${vehicule.numeroInterne}) a enregistré ${g.nb} interventions en moins de 3 mois.`,
            `/vehicules/${vehicule.id}`,
          );
        }
      }
    }
  }
}
