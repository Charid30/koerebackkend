import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { VehiculesService } from './vehicules.service';
import { CreateVehiculeDto } from './dto/create-vehicule.dto';
import { UpdateVehiculeDto } from './dto/update-vehicule.dto';
import { FilterVehiculeDto } from './dto/filter-vehicule.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('vehicules')
export class VehiculesController {
  constructor(private readonly vehiculesService: VehiculesService) {}

  @Get()
  findAll(@Query() filters: FilterVehiculeDto) {
    return this.vehiculesService.findAll(filters);
  }

  @Get('entites')
  findEntites() {
    return this.vehiculesService.findEntites();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiculesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC)
  create(@Body() dto: CreateVehiculeDto) {
    return this.vehiculesService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehiculeDto) {
    return this.vehiculesService.update(id, dto);
  }

  @Patch(':id/statut')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE)
  updateStatut(@Param('id', ParseIntPipe) id: number, @Body('statut') statut: string) {
    return this.vehiculesService.updateStatut(id, statut);
  }

  @Get(':id/historique')
  findHistorique(@Param('id', ParseIntPipe) id: number) {
    return this.vehiculesService.findHistorique(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiculesService.remove(id);
  }
}
