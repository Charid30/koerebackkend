import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

const MAX_TENTATIVES = 5;
const BLOCAGE_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.actif) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Vérifier blocage compte
    if (user.blocqueJusquA && user.blocqueJusquA > new Date()) {
      const minutesRestantes = Math.ceil((user.blocqueJusquA.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(`Compte bloqué. Réessayez dans ${minutesRestantes} minute(s)`);
    }

    const mdpValide = await bcrypt.compare(dto.motDePasse, user.motDePasse);

    if (!mdpValide) {
      const tentatives = user.tentativesConnexion + 1;
      const bloque = tentatives >= MAX_TENTATIVES;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          tentativesConnexion: tentatives,
          blocqueJusquA: bloque
            ? new Date(Date.now() + BLOCAGE_MINUTES * 60000)
            : null,
        },
      });

      if (bloque) {
        throw new ForbiddenException(`Trop de tentatives. Compte bloqué ${BLOCAGE_MINUTES} minutes`);
      }

      throw new UnauthorizedException('Identifiants invalides');
    }

    // Connexion réussie : réinitialiser les tentatives
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        tentativesConnexion: 0,
        blocqueJusquA: null,
        derniereConnexion: new Date(),
      },
    });

    const tokens = await this.genererTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(userId: number) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Déconnexion réussie' };
  }

  async refreshTokens(userId: number, email: string, role: string) {
    const tokens = await this.genererTokens(userId, email, role as any);
    await this.usersService.updateRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  async getProfile(userId: number) {
    return this.usersService.findOne(userId);
  }

  async changerMotDePasse(userId: number, motDePasseActuel: string, nouveauMotDePasse: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    const valide = await bcrypt.compare(motDePasseActuel, user.motDePasse);
    if (!valide) throw new UnauthorizedException('Mot de passe actuel incorrect');
    const hash = await bcrypt.hash(nouveauMotDePasse, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { motDePasse: hash } });
    return { message: 'Mot de passe modifié avec succès' };
  }

  private async genererTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.secret'),
        expiresIn: this.config.get('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
