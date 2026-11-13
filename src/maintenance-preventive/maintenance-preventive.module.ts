import { Module } from '@nestjs/common';
import { MaintenancePreventiveController } from './maintenance-preventive.controller';
import { MaintenancePreventiveService } from './maintenance-preventive.service';

@Module({
  controllers: [MaintenancePreventiveController],
  providers: [MaintenancePreventiveService],
  exports: [MaintenancePreventiveService],
})
export class MaintenancePreventiveModule {}
