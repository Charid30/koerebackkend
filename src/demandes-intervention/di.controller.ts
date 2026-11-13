import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { DemandesInterventionService } from './di.service';
import { CreateDiDto } from './dto/create-di.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('demandes-intervention')
export class DemandesInterventionController {
  constructor(private readonly svc: DemandesInterventionService) {}

  @Get()
  findAll(
    @Query('vehiculeId') vehiculeId?: string,
    @Query('statut') statut?: string,
    @Query('priorite') priorite?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(
      vehiculeId ? Number(vehiculeId) : undefined,
      statut,
      priorite,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN, Role.CHAUFFEUR)
  create(@Body() dto: CreateDiDto, @CurrentUser() user: any) {
    return this.svc.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { description?: string; priorite?: string; localisation?: string },
  ) {
    return this.svc.update(id, data);
  }

  @Patch(':id/statut')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE)
  updateStatut(@Param('id', ParseIntPipe) id: number, @Body('statut') statut: string) {
    return this.svc.updateStatut(id, statut);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
