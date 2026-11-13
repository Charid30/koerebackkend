import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionsService } from '../sessions.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private sessions: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: number; sid?: string }) {
    const authHeader = req.get('Authorization');
    const refreshToken = authHeader?.replace('Bearer ', '').trim();

    if (!refreshToken) throw new UnauthorizedException();

    // Les jetons émis avant les sessions n'ont pas de `sid` : il faut se reconnecter.
    if (!payload.sid) throw new UnauthorizedException('Session expirée');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.actif) throw new UnauthorizedException();

    const valide = await this.sessions.verifier(payload.sid, user.id, refreshToken);
    if (!valide) throw new UnauthorizedException('Session expirée ou révoquée');

    return { id: user.id, email: user.email, role: user.role, sid: payload.sid };
  }
}
