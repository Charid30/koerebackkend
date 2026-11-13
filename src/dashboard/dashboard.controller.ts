import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE, Role.DIRECTION)
  getData() {
    return this.dashboardService.getData();
  }
}
