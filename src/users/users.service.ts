import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SELECT_SAFE = {
  id: true, nom: true, prenom: true, email: true,
  telephone: true, role: true, departement: true, actif: true,
  derniereConnexion: true, createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take: limit, select: SELECT_SAFE, orderBy: { nom: 'asc' } }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT_SAFE });
    if (!user) throw new NotFoundException(`Utilisateur #${id} introuvable`);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email déjà utilisé');

    const hash = await bcrypt.hash(dto.motDePasse, 12);
    return this.prisma.user.create({
      data: { ...dto, motDePasse: hash },
      select: SELECT_SAFE,
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if ((dto as any).motDePasse) {
      data.motDePasse = await bcrypt.hash((dto as any).motDePasse, 12);
    }
    return this.prisma.user.update({ where: { id }, data, select: SELECT_SAFE });
  }

  async resetMotDePasse(id: number, nouveauMotDePasse: string) {
    await this.findOne(id);
    const hash = await bcrypt.hash(nouveauMotDePasse, 12);
    await this.prisma.user.update({ where: { id }, data: { motDePasse: hash, tentativesConnexion: 0, blocqueJusquA: null } });
    return { message: 'Mot de passe réinitialisé' };
  }

  async toggleActif(id: number) {
    const user = await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { actif: !(user as any).actif },
      select: SELECT_SAFE,
    });
  }

  async updateRefreshToken(id: number, token: string | null) {
    const hash = token ? await bcrypt.hash(token, 10) : null;
    await this.prisma.user.update({ where: { id }, data: { refreshToken: hash } });
  }
}
