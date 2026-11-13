import { PrismaClient, Role, StatutVehicule, TypeVehicule, TypeCarburant } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Utilisateurs
  const adminHash = await bcrypt.hash('Admin@2026', 12);
  const userHash = await bcrypt.hash('User@2026', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@koere.local' },
    update: {},
    create: {
      nom: 'Admin', prenom: 'KOERE', email: 'admin@koere.local',
      motDePasse: adminHash, role: Role.ADMIN, actif: true, tentativesConnexion: 0,
    },
  });

  const respParc = await prisma.user.upsert({
    where: { email: 'parc@koere.local' },
    update: {},
    create: {
      nom: 'Ouédraogo', prenom: 'Issa', email: 'parc@koere.local',
      motDePasse: userHash, role: Role.RESPONSABLE_PARC, actif: true, tentativesConnexion: 0,
    },
  });

  const meca = await prisma.user.upsert({
    where: { email: 'meca@koere.local' },
    update: {},
    create: {
      nom: 'Sawadogo', prenom: 'Ali', email: 'meca@koere.local',
      motDePasse: userHash, role: Role.MECANICIEN, actif: true, tentativesConnexion: 0,
    },
  });

  // Véhicules
  const v1 = await prisma.vehicule.upsert({
    where: { numeroInterne: 'VH-001' },
    update: {},
    create: {
      numeroInterne: 'VH-001', immatriculation: '11 A 0001 BF',
      marque: 'Toyota', modele: 'Land Cruiser', typeVehicule: TypeVehicule.VOITURE,
      annee: 2021, statut: StatutVehicule.DISPONIBLE, kilometrage: 45200,
      heuresMoteur: 1200, carburant: TypeCarburant.DIESEL,
      departement: 'Direction', couleur: 'Blanc',
    },
  });

  const v2 = await prisma.vehicule.upsert({
    where: { numeroInterne: 'VH-002' },
    update: {},
    create: {
      numeroInterne: 'VH-002', immatriculation: '11 A 0002 BF',
      marque: 'Mitsubishi', modele: 'L200', typeVehicule: TypeVehicule.CAMION,
      annee: 2020, statut: StatutVehicule.EN_MAINTENANCE, kilometrage: 78500,
      heuresMoteur: 2100, carburant: TypeCarburant.DIESEL,
      departement: 'Logistique', couleur: 'Gris',
    },
  });

  const v3 = await prisma.vehicule.upsert({
    where: { numeroInterne: 'VH-003' },
    update: {},
    create: {
      numeroInterne: 'VH-003', immatriculation: '11 A 0003 BF',
      marque: 'Nissan', modele: 'Patrol', typeVehicule: TypeVehicule.VOITURE,
      annee: 2022, statut: StatutVehicule.EN_CIRCULATION, kilometrage: 22800,
      heuresMoteur: 650, carburant: TypeCarburant.DIESEL,
      departement: 'Terrain', couleur: 'Blanc', conducteurHabituelId: meca.id,
    },
  });

  const v4 = await prisma.vehicule.upsert({
    where: { numeroInterne: 'VH-004' },
    update: {},
    create: {
      numeroInterne: 'VH-004', immatriculation: '11 A 0004 BF',
      marque: 'Caterpillar', modele: '320D', typeVehicule: TypeVehicule.ENGIN_TP,
      annee: 2019, statut: StatutVehicule.IMMOBILISE, kilometrage: 0,
      heuresMoteur: 4300, carburant: TypeCarburant.DIESEL,
      departement: 'Chantier', couleur: 'Jaune',
    },
  });

  // Plans de maintenance
  await prisma.planMaintenance.upsert({
    where: { id: 1 },
    update: {},
    create: {
      vehiculeId: v1.id, typeOperation: 'Vidange moteur + filtre à huile',
      frequenceKm: 5000, frequenceJours: 90,
      derniereExecutionKm: 40000, derniereExecutionDate: new Date('2026-05-15'),
      prochaineExecutionKm: 45000, prochaineExecutionDate: new Date('2026-08-13'),
      actif: true,
    },
  });

  await prisma.planMaintenance.upsert({
    where: { id: 2 },
    update: {},
    create: {
      vehiculeId: v2.id, typeOperation: 'Révision complète 80 000 km',
      frequenceKm: 80000, frequenceJours: null,
      derniereExecutionKm: null, derniereExecutionDate: null,
      prochaineExecutionKm: 80000, prochaineExecutionDate: new Date('2026-09-01'),
      actif: true,
    },
  });

  // Pièces en stock
  await prisma.pieceStock.upsert({
    where: { reference: 'FLT-HUI-001' },
    update: {},
    create: {
      reference: 'FLT-HUI-001', designation: 'Filtre à huile Toyota LC',
      marque: 'Toyota', categorie: 'Filtration',
      quantiteDisponible: 2, quantiteMinimum: 5, unite: 'unité', prixUnitaire: 8500,
    },
  });

  await prisma.pieceStock.upsert({
    where: { reference: 'FLT-AIR-001' },
    update: {},
    create: {
      reference: 'FLT-AIR-001', designation: 'Filtre à air universel',
      marque: 'Mann', categorie: 'Filtration',
      quantiteDisponible: 8, quantiteMinimum: 3, unite: 'unité', prixUnitaire: 12000,
    },
  });

  await prisma.pieceStock.upsert({
    where: { reference: 'HUI-MOT-001' },
    update: {},
    create: {
      reference: 'HUI-MOT-001', designation: 'Huile moteur 10W40 5L',
      marque: 'Total', categorie: 'Lubrifiants',
      quantiteDisponible: 1, quantiteMinimum: 10, unite: 'bidon', prixUnitaire: 22000,
    },
  });

  // DI + OT
  const di = await prisma.demandeIntervention.upsert({
    where: { numeroDI: 'DI-2026-001' },
    update: {},
    create: {
      numeroDI: 'DI-2026-001', vehiculeId: v2.id, declarantId: respParc.id,
      description: 'Fuite hydraulique constatée sous le véhicule. Tache d\'huile importante.',
      priorite: 'URGENTE', statut: 'PRISE_EN_CHARGE',
    },
  });

  await prisma.ordresTravail.upsert({
    where: { numeroOT: 'OT-2026-001' },
    update: {},
    create: {
      numeroOT: 'OT-2026-001', diId: di.id, vehiculeId: v2.id,
      responsableId: admin.id, typeMaintenance: 'CORRECTIVE',
      statut: 'EN_COURS', description: 'Réparation fuite hydraulique',
      datePlanifiee: new Date('2026-09-01'),
    },
  });

  await prisma.ordresTravail.upsert({
    where: { numeroOT: 'OT-2026-002' },
    update: {},
    create: {
      numeroOT: 'OT-2026-002', vehiculeId: v1.id,
      responsableId: admin.id, typeMaintenance: 'PREVENTIVE',
      statut: 'PLANIFIE', description: 'Vidange + filtre 45 000 km',
      datePlanifiee: new Date('2026-09-05'),
    },
  });

  console.log('Seed OK — base de données peuplée avec des données de test.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
