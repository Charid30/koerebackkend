import { Injectable } from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sessions de connexion : une ligne par appareil connecté.
 * Chaque refresh token porte l'identifiant de sa session (`sid`) ; on ne stocke que son empreinte.
 */
/** Durée pendant laquelle le refresh token précédent reste accepté. */
const DELAI_GRACE_MS = 10 * 60 * 1000;

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  nouvelId(): string {
    return randomUUID();
  }

  private empreinte(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async creer(id: string, userId: number, refreshToken: string, expiresAt: Date, userAgent?: string) {
    // Ménage : on profite de la connexion pour retirer les sessions expirées de l'utilisateur.
    await this.prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
    await this.prisma.session.create({
      data: {
        id,
        userId,
        tokenHash: this.empreinte(refreshToken),
        expiresAt,
        userAgent: userAgent?.slice(0, 255),
      },
    });
  }

  /**
   * Vérifie qu'un refresh token correspond à une session active de cet utilisateur.
   * Le jeton précédent reste accepté pendant DELAI_GRACE_MS après une rotation :
   * deux onglets qui renouvellent en même temps, ou une réponse perdue en route,
   * ne doivent pas déconnecter l'utilisateur.
   */
  async verifier(id: string, userId: number, refreshToken: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session || session.userId !== userId || session.expiresAt < new Date()) return false;
    const recu = this.empreinte(refreshToken);
    if (this.egal(session.tokenHash, recu)) return true;
    const recente = session.rotatedAt && Date.now() - session.rotatedAt.getTime() < DELAI_GRACE_MS;
    return !!(recente && session.previousTokenHash && this.egal(session.previousTokenHash, recu));
  }

  private egal(a: string, b: string): boolean {
    const x = Buffer.from(a, 'hex');
    const y = Buffer.from(b, 'hex');
    return x.length === y.length && timingSafeEqual(x, y);
  }

  /** Rotation : le nouveau refresh token remplace l'ancien, qui reste valable quelques minutes. */
  async renouveler(id: string, refreshToken: string, expiresAt: Date) {
    const session = await this.prisma.session.findUnique({ where: { id }, select: { tokenHash: true } });
    const nouveau = this.empreinte(refreshToken);
    await this.prisma.session.update({
      where: { id },
      data: {
        tokenHash: nouveau,
        // Même jeton (émis dans la même seconde) : on garde l'ancien « précédent »
        ...(session && session.tokenHash !== nouveau
          ? { previousTokenHash: session.tokenHash, rotatedAt: new Date() }
          : {}),
        expiresAt,
        lastUsedAt: new Date(),
      },
    });
  }

  /** Renouvellement sans rotation (anciennes applications mobiles) : on note juste l'activité. */
  async marquerUtilisee(id: string) {
    await this.prisma.session.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }

  async supprimer(id: string) {
    await this.prisma.session.deleteMany({ where: { id } });
  }

  /** Déconnecte tous les appareils d'un utilisateur, sauf éventuellement la session courante. */
  async supprimerToutes(userId: number, saufId?: string) {
    await this.prisma.session.deleteMany({
      where: { userId, ...(saufId ? { id: { not: saufId } } : {}) },
    });
  }
}
