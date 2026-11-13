import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const debutMois = new Date(today.getFullYear(), today.getMonth(), 1);
    const debutAnnee = new Date(today.getFullYear(), 0, 1);

    const [
      totalVehicules, disponibles, enMaintenance, immobilises, enCirculation,
      otEnAttente, otPlanifies, otEnCours, otTermines,
      totalPieces, diEnAttente, diUrgentes, diCritiques,
      allPieces, prochainesMaintenances, otRecents,
      otMois, otAnnee, otPreventifMois, otCorrectifMois,
    ] = await Promise.all([
      this.prisma.vehicule.count(),
      this.prisma.vehicule.count({ where: { statut: 'DISPONIBLE' } }),
      this.prisma.vehicule.count({ where: { statut: 'EN_MAINTENANCE' } }),
      this.prisma.vehicule.count({ where: { statut: 'IMMOBILISE' } }),
      this.prisma.vehicule.count({ where: { statut: 'EN_CIRCULATION' } }),
      this.prisma.ordresTravail.count({ where: { statut: 'EN_ATTENTE_VALIDATION' } }),
      this.prisma.ordresTravail.count({ where: { statut: 'PLANIFIE' } }),
      this.prisma.ordresTravail.count({ where: { statut: 'EN_COURS' } }),
      this.prisma.ordresTravail.count({ where: { statut: 'TERMINE', dateFin: { gte: today } } }),
      this.prisma.pieceStock.count(),
      this.prisma.demandeIntervention.count({ where: { statut: 'EN_ATTENTE' } }),
      this.prisma.demandeIntervention.count({ where: { statut: 'EN_ATTENTE', priorite: 'URGENTE' } }),
      this.prisma.demandeIntervention.count({ where: { statut: 'EN_ATTENTE', priorite: 'CRITIQUE' } }),
      this.prisma.pieceStock.findMany({ select: { quantiteDisponible: true, quantiteMinimum: true } }),
      this.prisma.planMaintenance.findMany({
        where: { actif: true },
        take: 5,
        orderBy: { prochaineExecutionDate: 'asc' },
        include: { vehicule: { select: { numeroInterne: true, marque: true, modele: true, kilometrage: true, heuresMoteur: true, typeVehicule: true } } },
      }),
      this.prisma.ordresTravail.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { vehicule: { select: { numeroInterne: true, marque: true, modele: true } } },
      }),
      // OT ce mois
      this.prisma.ordresTravail.findMany({
        where: { createdAt: { gte: debutMois } },
        select: { coutPrestataire: true, coutPiecesTotal: true, heuresInternesTotal: true },
      }),
      // OT cette année
      this.prisma.ordresTravail.findMany({
        where: { createdAt: { gte: debutAnnee } },
        select: { coutPrestataire: true, coutPiecesTotal: true },
      }),
      this.prisma.ordresTravail.count({ where: { typeMaintenance: 'PREVENTIVE', createdAt: { gte: debutMois } } }),
      this.prisma.ordresTravail.count({ where: { typeMaintenance: 'CORRECTIVE', createdAt: { gte: debutMois } } }),
    ]);

    const alertesSeuil = allPieces.filter(p => p.quantiteDisponible <= p.quantiteMinimum).length;

    // Calcul des coûts
    const coutMois = otMois.reduce((sum, ot) => {
      return sum + Number(ot.coutPrestataire ?? 0) + Number(ot.coutPiecesTotal ?? 0);
    }, 0);
    const coutAnnee = otAnnee.reduce((sum, ot) => {
      return sum + Number(ot.coutPrestataire ?? 0) + Number(ot.coutPiecesTotal ?? 0);
    }, 0);

    // Taux de disponibilité (simplifiée : nombre de véhicules disponibles / total)
    const tauxDisponibilite = totalVehicules > 0
      ? Math.round(((disponibles + enCirculation) / totalVehicules) * 100)
      : 0;

    // Taux de maintenabilité (MTTR simplifié : % OT clôturés en < 48h ce mois)
    const otClotures = await this.prisma.ordresTravail.findMany({
      where: { statut: 'CLOTURE', createdAt: { gte: debutMois } },
      select: { dateDebut: true, dateFin: true },
    });
    const otClouresAvecDates = otClotures.filter(o => o.dateDebut && o.dateFin);
    const otRapides = otClouresAvecDates.filter(o => {
      const duree = (new Date(o.dateFin!).getTime() - new Date(o.dateDebut!).getTime()) / (1000 * 3600);
      return duree <= 48;
    });
    const tauxMaintenabilite = otClouresAvecDates.length > 0
      ? Math.round((otRapides.length / otClouresAvecDates.length) * 100)
      : 0;

    // Graphique OT par mois (12 derniers mois)
    const graphOtParMois = await this.getOtParMois();

    // Véhicules les plus en panne
    const vehiculesPannes = await this.prisma.$queryRaw<{ id: number; marque: string; modele: string; numeroInterne: string; nb_di: bigint }[]>`
      SELECT v.id, v.marque, v.modele, v.numeroInterne, COUNT(di.id) as nb_di
      FROM vehicules v
      LEFT JOIN demandes_intervention di ON di.vehiculeId = v.id AND di.createdAt >= ${debutAnnee}
      GROUP BY v.id, v.marque, v.modele, v.numeroInterne
      ORDER BY nb_di DESC
      LIMIT 5
    `;

    return {
      vehicules: { total: totalVehicules, disponibles, enMaintenance, immobilises, enCirculation },
      ordresTravail: { enAttente: otEnAttente, planifies: otPlanifies, enCours: otEnCours, terminesAujourdhui: otTermines },
      stock: { totalReferences: totalPieces, alertesSeuil },
      demandesIntervention: { enAttente: diEnAttente, urgentes: diUrgentes, critiques: diCritiques },
      kpis: {
        tauxDisponibilite,
        tauxMaintenabilite,
        coutMois: Math.round(coutMois),
        coutAnnee: Math.round(coutAnnee),
        repartitionMois: { preventif: otPreventifMois, correctif: otCorrectifMois },
      },
      prochainesMaintenances: prochainesMaintenances.map(m => ({
        vehiculeId: m.vehiculeId,
        vehicule: `${m.vehicule.marque} ${m.vehicule.modele} (${m.vehicule.numeroInterne})`,
        typeOperation: m.typeOperation,
        prochaineExecutionDate: m.prochaineExecutionDate?.toISOString() ?? null,
        prochaineExecutionKm: m.prochaineExecutionKm,
        prochaineExecutionHeures: m.prochaineExecutionHeures,
        typeVehicule: m.vehicule.typeVehicule,
        compteurActuel: ['ENGIN_TP','EQUIPEMENT_SPECIAL'].includes(m.vehicule.typeVehicule)
          ? m.vehicule.heuresMoteur
          : m.vehicule.kilometrage,
      })),
      otRecents: otRecents.map(ot => ({
        id: ot.id,
        numeroOT: ot.numeroOT,
        vehicule: `${ot.vehicule.marque} ${ot.vehicule.modele} (${ot.vehicule.numeroInterne})`,
        typeMaintenance: ot.typeMaintenance,
        statut: ot.statut,
        datePlanifiee: ot.datePlanifiee?.toISOString() ?? null,
      })),
      graphiques: {
        otParMois: graphOtParMois,
        vehiculesPannes: vehiculesPannes.map(v => ({
          id: v.id,
          label: `${v.marque} ${v.modele} (${v.numeroInterne})`,
          nbDi: Number(v.nb_di),
        })),
      },
    };
  }

  private async getOtParMois() {
    const result: { mois: string; preventif: number; correctif: number }[] = [];
    const maintenant = new Date();

    for (let i = 11; i >= 0; i--) {
      const debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      const fin = new Date(maintenant.getFullYear(), maintenant.getMonth() - i + 1, 0);

      const [preventif, correctif] = await Promise.all([
        this.prisma.ordresTravail.count({
          where: { typeMaintenance: 'PREVENTIVE', createdAt: { gte: debut, lte: fin } },
        }),
        this.prisma.ordresTravail.count({
          where: { typeMaintenance: 'CORRECTIVE', createdAt: { gte: debut, lte: fin } },
        }),
      ]);

      result.push({
        mois: debut.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        preventif,
        correctif,
      });
    }
    return result;
  }
}
