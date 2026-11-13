import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MaintenancePreventiveService } from './maintenance-preventive.service';
import { CreatePlanDto, TypePlanMaintenance } from './dto/create-plan.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('maintenance-preventive')
export class MaintenancePreventiveController {
  constructor(private readonly service: MaintenancePreventiveService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('periodique')
  findPeriodique() { return this.service.findByType(TypePlanMaintenance.PERIODIQUE); }

  @Get('generale')
  findGenerale() { return this.service.findByType(TypePlanMaintenance.GENERALE); }

  @Get('alertes')
  findAlertes() { return this.service.findAlertes(); }

  @Get('rappels')
  findRappels() { return this.service.findRappelsBimensuels(); }

  @Get('vehicule/:vehiculeId')
  findByVehicule(@Param('vehiculeId', ParseIntPipe) vehiculeId: number) {
    return this.service.findByVehicule(vehiculeId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE, Role.RESPONSABLE_PARC)
  create(@Body() dto: CreatePlanDto) {
    return this.service.create(dto);
  }

  @Patch(':id/execution')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN)
  enregistrerExecution(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { kilometrage?: number },
  ) {
    return this.service.enregistrerExecution(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  desactiver(@Param('id', ParseIntPipe) id: number) {
    return this.service.desactiver(id);
  }
}
