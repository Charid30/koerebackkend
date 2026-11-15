import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Ouvert à tous les rôles connectés : le frontend a une vue dédiée pour
  // les mécaniciens et les chauffeurs, qui recevaient jusqu'ici une erreur 403.
  @Get()
  getData() {
    return this.dashboardService.getData();
  }
}
