/**
 * Crée (ou met à jour) un compte administrateur, sans rien écrire en dur dans le code.
 *
 *   ADMIN_EMAIL=moi@exemple.com ADMIN_PASSWORD='...' node prisma/creer-admin.js
 *
 * En production (Docker) :
 *   docker compose exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... api node prisma/creer-admin.js
 *
 * Si le compte existe déjà, son mot de passe est remplacé et le compte réactivé.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const motDePasse = process.env.ADMIN_PASSWORD || '';
  const prenom = process.env.ADMIN_PRENOM || 'SOFARY';
  const nom = process.env.ADMIN_NOM || 'Administrateur';

  if (!email || !email.includes('@')) throw new Error('ADMIN_EMAIL manquant ou invalide');
  if (motDePasse.length < 8) throw new Error('ADMIN_PASSWORD doit contenir au moins 8 caractères');

  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(motDePasse, 12);
    const user = await prisma.user.upsert({
      where: { email },
      update: { motDePasse: hash, role: 'ADMIN', actif: true, tentativesConnexion: 0, blocqueJusquA: null },
      create: { email, prenom, nom, motDePasse: hash, role: 'ADMIN', actif: true, tentativesConnexion: 0 },
    });
    console.log(`Compte administrateur prêt : ${user.email} (id ${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(`Échec : ${e.message}`);
  process.exit(1);
});
