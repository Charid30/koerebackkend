import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    const auditableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!auditableMethods.includes(method)) return next.handle();
    // Connexion, déconnexion et rafraîchissement de jeton : pas d'intérêt métier, beaucoup de bruit
    if (url.includes('/auth/')) return next.handle();

    return next.handle().pipe(
      tap(async () => {
        try {
          const entite = url.split('/')[2] ?? 'unknown';
          await this.prisma.auditLog.create({
            data: {
              utilisateurId: user?.id ?? null,
              action: method,
              entite,
              entiteId: Number(request.params?.id) || null,
              ipAddress: (request.headers['x-forwarded-for'] as string) ?? ip,
              userAgent: headers['user-agent'] ?? null,
            },
          });
        } catch {
          // L'audit log ne doit jamais bloquer la requête
        }
      }),
    );
  }
}
