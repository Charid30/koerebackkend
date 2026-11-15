import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import envConfig from './config/env.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiculesModule } from './vehicules/vehicules.module';
import { InspectionsModule } from './inspections/inspections.module';
import { OrdresTravauxModule } from './ordres-travail/ordres-travail.module';
import { MaintenancePreventiveModule } from './maintenance-preventive/maintenance-preventive.module';
import { StocksModule } from './stocks/stocks.module';
import { AmdecModule } from './amdec/amdec.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AlertesModule } from './alertes/alertes.module';
import { DemandesInterventionModule } from './demandes-intervention/di.module';
import { RapportsModule } from './rapports/rapports.module';
import { UploadModule } from './upload/upload.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      envFilePath: '.env',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiculesModule,
    InspectionsModule,
    OrdresTravauxModule,
    MaintenancePreventiveModule,
    StocksModule,
    AmdecModule,
    NotificationsModule,
    DashboardModule,
    AlertesModule,
    DemandesInterventionModule,
    RapportsModule,
    UploadModule,
  ],
  providers: [
    // Guards appliqués globalement — pas besoin de @UseGuards dans les controllers
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Journal des actions (création, modification, suppression) : la classe existait mais n'était pas branchée
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
