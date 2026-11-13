import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class RapportsService {
  constructor(private prisma: PrismaService) {}

  // ─── Rapport Parc Véhicules ───────────────────────────────────────────────

  async genererEtatParc(): Promise<Buffer> {
    const vehicules = await this.prisma.vehicule.findMany({
      include: {
        conducteurHabituel: { select: { nom: true, prenom: true } },
        _count: { select: { inspections: true, ordresTravail: true, demandesIntervention: true } },
      },
      orderBy: { numeroInterne: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SOFARY GMAO';
    wb.created = new Date();

    const ws = wb.addWorksheet('État du Parc');
    ws.columns = [
      { header: 'N° Interne',      key: 'numeroInterne',    width: 14 },
      { header: 'Immatriculation', key: 'immatriculation',  width: 16 },
      { header: 'Marque',          key: 'marque',           width: 14 },
      { header: 'Modèle',          key: 'modele',           width: 16 },
      { header: 'Type',            key: 'type',             width: 18 },
      { header: 'Statut',          key: 'statut',           width: 20 },
      { header: 'Km / Heures',     key: 'compteur',         width: 14 },
      { header: 'Département',     key: 'departement',      width: 16 },
      { header: 'Conducteur',      key: 'conducteur',       width: 20 },
      { header: 'Inspections',     key: 'nbInspections',    width: 12 },
      { header: 'OT',              key: 'nbOt',             width: 8 },
      { header: 'DI',              key: 'nbDi',             width: 8 },
    ];

    // En-tête stylé
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

    const STATUT_LABELS: Record<string, string> = {
      DISPONIBLE: 'Disponible',
      EN_CIRCULATION: 'En circulation',
      EN_MAINTENANCE: 'En maintenance',
      IMMOBILISE: 'Immobilisé',
      ACCIDENTE: 'Accidenté',
      HORS_SERVICE: 'Hors service',
      EN_ATTENTE_PIECES: 'Att. pièces',
      EN_ATTENTE_REPARATION_EXTERNE: 'Att. réparation ext.',
    };
    const TYPE_LABELS: Record<string, string> = {
      VOITURE: 'Voiture', CAMION: 'Camion',
      EQUIPEMENT_SPECIAL: 'Équipement spécial', ENGIN_TP: 'Engin TP',
    };

    for (const v of vehicules) {
      const isHeure = v.typeVehicule === 'ENGIN_TP' || v.typeVehicule === 'EQUIPEMENT_SPECIAL';
      const row = ws.addRow({
        numeroInterne: v.numeroInterne,
        immatriculation: v.immatriculation,
        marque: v.marque,
        modele: v.modele,
        type: TYPE_LABELS[v.typeVehicule] ?? v.typeVehicule,
        statut: STATUT_LABELS[v.statut] ?? v.statut,
        compteur: isHeure ? `${v.heuresMoteur} h` : `${v.kilometrage} km`,
        departement: v.departement ?? '',
        conducteur: v.conducteurHabituel
          ? `${v.conducteurHabituel.nom} ${v.conducteurHabituel.prenom}`
          : '',
        nbInspections: v._count.inspections,
        nbOt: v._count.ordresTravail,
        nbDi: v._count.demandesIntervention,
      });
      // Colorier les lignes selon le statut
      if (v.statut === 'IMMOBILISE' || v.statut === 'ACCIDENTE') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      } else if (v.statut === 'EN_MAINTENANCE') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
      } else if (v.statut === 'DISPONIBLE') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      }
    }

    ws.autoFilter = { from: 'A1', to: 'L1' };
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ─── Rapport Historique Véhicule ─────────────────────────────────────────

  async genererHistoriqueVehicule(vehiculeId: number): Promise<Buffer> {
    const vehicule = await this.prisma.vehicule.findUnique({ where: { id: vehiculeId } });
    if (!vehicule) throw new Error('Véhicule introuvable');

    const [inspections, ordresTravail, demandesIntervention] = await Promise.all([
      this.prisma.inspection.findMany({
        where: { vehiculeId },
        orderBy: { dateInspection: 'desc' },
        include: { inspecteur: { select: { nom: true, prenom: true } } },
      }),
      this.prisma.ordresTravail.findMany({
        where: { vehiculeId },
        orderBy: { createdAt: 'desc' },
        include: { responsable: { select: { nom: true, prenom: true } } },
      }),
      this.prisma.demandeIntervention.findMany({
        where: { vehiculeId },
        orderBy: { createdAt: 'desc' },
        include: { declarant: { select: { nom: true, prenom: true } } },
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SOFARY GMAO';

    // Feuille info véhicule
    const wsInfo = wb.addWorksheet('Véhicule');
    wsInfo.addRow(['Champ', 'Valeur']);
    wsInfo.getRow(1).font = { bold: true };
    wsInfo.addRow(['N° Interne', vehicule.numeroInterne]);
    wsInfo.addRow(['Immatriculation', vehicule.immatriculation]);
    wsInfo.addRow(['Marque / Modèle', `${vehicule.marque} ${vehicule.modele}`]);
    wsInfo.addRow(['Statut', vehicule.statut]);
    wsInfo.addRow(['Km actuel', vehicule.kilometrage]);
    wsInfo.addRow(['Heures moteur', vehicule.heuresMoteur]);
    wsInfo.columns = [{ width: 20 }, { width: 30 }];

    // Feuille inspections
    const wsInsp = wb.addWorksheet('Inspections');
    wsInsp.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Statut', key: 'statut', width: 14 },
      { header: 'Note /20', key: 'note', width: 10 },
      { header: 'Inspecteur', key: 'inspecteur', width: 20 },
    ];
    wsInsp.getRow(1).font = { bold: true };
    for (const insp of inspections) {
      wsInsp.addRow({
        date: new Date(insp.dateInspection).toLocaleDateString('fr-FR'),
        type: insp.typeInspection,
        statut: insp.statut,
        note: insp.noteGlobale ?? '',
        inspecteur: `${insp.inspecteur.nom} ${insp.inspecteur.prenom}`,
      });
    }

    // Feuille OT
    const wsOt = wb.addWorksheet('Ordres de Travail');
    wsOt.columns = [
      { header: 'N° OT', key: 'numero', width: 16 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Statut', key: 'statut', width: 20 },
      { header: 'Date création', key: 'date', width: 14 },
      { header: 'Coût pièces', key: 'coutPieces', width: 14 },
      { header: 'Coût prestataire', key: 'coutPrest', width: 16 },
      { header: 'Responsable', key: 'responsable', width: 20 },
    ];
    wsOt.getRow(1).font = { bold: true };
    for (const ot of ordresTravail) {
      wsOt.addRow({
        numero: ot.numeroOT,
        type: ot.typeMaintenance,
        statut: ot.statut,
        date: new Date(ot.createdAt).toLocaleDateString('fr-FR'),
        coutPieces: Number(ot.coutPiecesTotal ?? 0),
        coutPrest: Number(ot.coutPrestataire ?? 0),
        responsable: `${ot.responsable.nom} ${ot.responsable.prenom}`,
      });
    }

    // Feuille DI
    const wsDi = wb.addWorksheet('Demandes Intervention');
    wsDi.columns = [
      { header: 'N° DI', key: 'numero', width: 16 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Priorité', key: 'priorite', width: 12 },
      { header: 'Statut', key: 'statut', width: 14 },
      { header: 'Déclarant', key: 'declarant', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
    ];
    wsDi.getRow(1).font = { bold: true };
    for (const di of demandesIntervention) {
      wsDi.addRow({
        numero: di.numeroDI,
        date: new Date(di.dateSignalement).toLocaleDateString('fr-FR'),
        priorite: di.priorite,
        statut: di.statut,
        declarant: `${di.declarant.nom} ${di.declarant.prenom}`,
        description: di.description,
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ─── Rapport mensuel maintenance ─────────────────────────────────────────

  async genererRapportMensuel(annee: number, mois: number): Promise<Buffer> {
    const debut = new Date(annee, mois - 1, 1);
    const fin = new Date(annee, mois, 0, 23, 59, 59);

    const [otPreventifs, otCorrectifs, inspections, piecesConsommees] = await Promise.all([
      this.prisma.ordresTravail.findMany({
        where: { typeMaintenance: 'PREVENTIVE', createdAt: { gte: debut, lte: fin } },
        include: { vehicule: { select: { numeroInterne: true, marque: true, modele: true } } },
      }),
      this.prisma.ordresTravail.findMany({
        where: { typeMaintenance: 'CORRECTIVE', createdAt: { gte: debut, lte: fin } },
        include: { vehicule: { select: { numeroInterne: true, marque: true, modele: true } } },
      }),
      this.prisma.inspection.count({ where: { createdAt: { gte: debut, lte: fin } } }),
      this.prisma.mouvementStock.findMany({
        where: { typeMouvement: 'SORTIE', createdAt: { gte: debut, lte: fin } },
        include: { piece: { select: { designation: true, reference: true } } },
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SOFARY GMAO';

    const wsSynthese = wb.addWorksheet('Synthèse');
    const nomMois = debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    wsSynthese.addRow([`Rapport mensuel de maintenance — ${nomMois}`]);
    wsSynthese.getRow(1).font = { bold: true, size: 14 };
    wsSynthese.addRow([]);
    wsSynthese.addRow(['Indicateur', 'Valeur']);
    wsSynthese.getRow(3).font = { bold: true };
    wsSynthese.addRow(['OT préventifs', otPreventifs.length]);
    wsSynthese.addRow(['OT correctifs', otCorrectifs.length]);
    wsSynthese.addRow(['Total OT', otPreventifs.length + otCorrectifs.length]);
    wsSynthese.addRow(['Inspections réalisées', inspections]);
    wsSynthese.addRow(['Pièces sorties (mouvements)', piecesConsommees.length]);
    const coutTotal = [...otPreventifs, ...otCorrectifs].reduce(
      (s, o) => s + Number(o.coutPrestataire ?? 0) + Number(o.coutPiecesTotal ?? 0), 0
    );
    wsSynthese.addRow(['Coût total maintenance (DA)', coutTotal]);
    wsSynthese.columns = [{ width: 30 }, { width: 16 }];

    // OT détail
    const wsOt = wb.addWorksheet('OT du mois');
    wsOt.columns = [
      { header: 'N° OT', key: 'numero', width: 16 },
      { header: 'Véhicule', key: 'vehicule', width: 24 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Statut', key: 'statut', width: 20 },
      { header: 'Coût total (DA)', key: 'cout', width: 16 },
    ];
    wsOt.getRow(1).font = { bold: true };
    for (const ot of [...otPreventifs, ...otCorrectifs]) {
      wsOt.addRow({
        numero: ot.numeroOT,
        vehicule: `${ot.vehicule.marque} ${ot.vehicule.modele} (${ot.vehicule.numeroInterne})`,
        type: ot.typeMaintenance,
        statut: ot.statut,
        cout: Number(ot.coutPrestataire ?? 0) + Number(ot.coutPiecesTotal ?? 0),
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ─── Rapport Stock ────────────────────────────────────────────────────────

  async genererEtatStock(): Promise<Buffer> {
    const pieces = await this.prisma.pieceStock.findMany({
      orderBy: { designation: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SOFARY GMAO';
    const ws = wb.addWorksheet('État du Stock');
    ws.columns = [
      { header: 'Référence',      key: 'reference',    width: 16 },
      { header: 'Désignation',    key: 'designation',  width: 30 },
      { header: 'Marque',         key: 'marque',       width: 14 },
      { header: 'Catégorie',      key: 'categorie',    width: 16 },
      { header: 'Qté dispo',      key: 'qteDispo',     width: 12 },
      { header: 'Qté minimum',    key: 'qteMin',       width: 12 },
      { header: 'Prix unitaire',  key: 'prix',         width: 14 },
      { header: 'Emplacement',    key: 'emplacement',  width: 16 },
      { header: 'Alerte',         key: 'alerte',       width: 10 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

    for (const p of pieces) {
      const enAlerte = p.quantiteDisponible <= p.quantiteMinimum;
      const row = ws.addRow({
        reference: p.reference,
        designation: p.designation,
        marque: p.marque ?? '',
        categorie: p.categorie ?? '',
        qteDispo: p.quantiteDisponible,
        qteMin: p.quantiteMinimum,
        prix: Number(p.prixUnitaire ?? 0),
        emplacement: p.emplacement ?? '',
        alerte: enAlerte ? 'ALERTE' : 'OK',
      });
      if (enAlerte) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        row.getCell('alerte').font = { color: { argb: 'FFB91C1C' }, bold: true };
      }
    }

    ws.autoFilter = { from: 'A1', to: 'I1' };
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
