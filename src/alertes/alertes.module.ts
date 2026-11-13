import { Module } from '@nestjs/common';
import { AlertesService } from './alertes.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [AlertesService],
})
export class AlertesModule {}
