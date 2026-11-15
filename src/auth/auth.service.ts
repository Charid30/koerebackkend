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
import { SessionsService } from './sessions.service';

const MAX_TENTATIVES = 5;
const BLOCAGE_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private sessions: SessionsService,
  ) {}

  async login(dto: LoginDto, userAgent?: string) {
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

    // Une nouvelle session par connexion : les autres appareils restent connectés.
    const sid = this.sessions.nouvelId();
    const tokens = await this.genererTokens(user.id, user.email, user.role, sid);
    await this.sessions.creer(sid, user.id, tokens.refreshToken, this.expiration(tokens.refreshToken), userAgent);

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

  /** Ne ferme que la session de cet appareil (ou toutes, pour un ancien jeton sans session). */
  async logout(userId: number, sid?: string) {
    if (sid) await this.sessions.supprimer(sid);
    else await this.sessions.supprimerToutes(userId);
    return { message: 'Déconnexion réussie' };
  }

  /**
   * Nouveau jeton d'accès. Si `refreshTokenConserve` est fourni (ancienne appli mobile,
   * qui n'enregistre pas le nouveau refresh token), on le renvoie tel quel sans rotation.
   */
  async refreshTokens(userId: number, email: string, role: string, sid: string, refreshTokenConserve?: string) {
    const tokens = await this.genererTokens(userId, email, role as any, sid);
    if (refreshTokenConserve) {
      await this.sessions.marquerUtilisee(sid);
      return { accessToken: tokens.accessToken, refreshToken: refreshTokenConserve };
    }
    await this.sessions.renouveler(sid, tokens.refreshToken, this.expiration(tokens.refreshToken));
    return tokens;
  }

  async getProfile(userId: number) {
    return this.usersService.findOne(userId);
  }

  async changerMotDePasse(userId: number, motDePasseActuel: string, nouveauMotDePasse: string, sid?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    const valide = await bcrypt.compare(motDePasseActuel, user.motDePasse);
    if (!valide) throw new UnauthorizedException('Mot de passe actuel incorrect');
    const hash = await bcrypt.hash(nouveauMotDePasse, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { motDePasse: hash } });
    // Par sécurité, les autres appareils doivent se reconnecter avec le nouveau mot de passe.
    await this.sessions.supprimerToutes(userId, sid);
    return { message: 'Mot de passe modifié avec succès' };
  }

  /** Date d'expiration lue dans le jeton lui-même (durée JWT_REFRESH_EXPIRES_IN). */
  private expiration(refreshToken: string): Date {
    const { exp } = this.jwtService.decode(refreshToken) as { exp: number };
    return new Date(exp * 1000);
  }

  private async genererTokens(userId: number, email: string, role: string, sid: string) {
    const payload = { sub: userId, email, role, sid };

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
