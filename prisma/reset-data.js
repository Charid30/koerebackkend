/**
 * reset-data.js — vide toutes les tables sauf `users`
 * Usage : node prisma/reset-data.js
 * Doit être exécuté depuis la racine du Backend avec DATABASE_URL définie.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABLES = [
  // Feuilles en premier (pas de dépendants), parents en dernier
  'audit_logs',
  'notifications',
  'ot_pieces',
  'ot_photos',
  'ot_mecaniciens',
  'ordres_travail',
  'di_photos',
  'demandes_intervention',
  'inspection_items',
  'inspections',
  'releves_kilometriques',
  'amdec_analyses',
  'plans_maintenance',
  'mouvements_stock',
  'pieces_stock',
  'vehicules',
];

async function main() {
  console.log('Désactivation des contraintes FK...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
    console.log(`  ✓ ${table}`);
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  console.log('\nBase de données réinitialisée. Comptes utilisateurs conservés.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
