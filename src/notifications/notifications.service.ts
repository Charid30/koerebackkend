import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypeNotification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findMesNotifications(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total, nonLues] = await Promise.all([
      this.prisma.notification.findMany({
        where: { destinataireId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { destinataireId: userId } }),
      this.prisma.notification.count({ where: { destinataireId: userId, lu: false } }),
    ]);

    return { data, total, nonLues, page, limit };
  }

  async marquerLu(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id, destinataireId: userId },
      data: { lu: true },
    });
  }

  async marquerToutLu(userId: number) {
    return this.prisma.notification.updateMany({
      where: { destinataireId: userId, lu: false },
      data: { lu: true },
    });
  }

  async envoyer(destinataireId: number, type: TypeNotification, titre: string, message: string, lien?: string) {
    return this.prisma.notification.create({
      data: { destinataireId, type, titre, message, lien },
    });
  }

  async envoyerARole(role: string, type: TypeNotification, titre: string, message: string, lien?: string) {
    const users = await this.prisma.user.findMany({ where: { role: role as any, actif: true }, select: { id: true } });
    await this.prisma.notification.createMany({
      data: users.map((u) => ({ destinataireId: u.id, type, titre, message, lien })),
    });
  }
}
