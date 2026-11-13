import { Injectable } from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sessions de connexion : une ligne par appareil connecté.
 * Chaque refresh token porte l'identifiant de sa session (`sid`) ; on ne stocke que son empreinte.
 */
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

  /** Vérifie qu'un refresh token correspond bien à une session active de cet utilisateur. */
  async verifier(id: string, userId: number, refreshToken: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session || session.userId !== userId || session.expiresAt < new Date()) return false;
    const attendu = Buffer.from(session.tokenHash, 'hex');
    const recu = Buffer.from(this.empreinte(refreshToken), 'hex');
    return attendu.length === recu.length && timingSafeEqual(attendu, recu);
  }

  /** Rotation : le nouveau refresh token remplace l'ancien dans la même session. */
  async renouveler(id: string, refreshToken: string, expiresAt: Date) {
    await this.prisma.session.update({
      where: { id },
      data: { tokenHash: this.empreinte(refreshToken), expiresAt, lastUsedAt: new Date() },
    });
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
