import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { Role, StatutOT } from '@prisma/client';
import { OrdresTravauxService } from './ordres-travail.service';
import { CreateOtDto } from './dto/create-ot.dto';
import { UpdateStatutOtDto } from './dto/update-statut-ot.dto';
import { UpdateCoutsOtDto } from './dto/update-couts-ot.dto';
import { UpdateTravauxOtDto } from './dto/update-travaux-ot.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ordres-travail')
export class OrdresTravauxController {
  constructor(private readonly otService: OrdresTravauxService) {}

  @Get()
  findAll(
    @Query('statut') statut?: StatutOT,
    @Query('vehiculeId') vehiculeId?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.otService.findAll(statut, vehiculeId ? +vehiculeId : undefined, +page, +limit);
  }

  /** Mécaniciens actifs qu'on peut affecter à un OT */
  @Get('mecaniciens')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  mecaniciens() {
    return this.otService.listerMecaniciens();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.otService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  create(@Body() dto: CreateOtDto, @CurrentUser('id') userId: number) {
    return this.otService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { typeMaintenance?: string; datePlanifiee?: string; prestatireExterne?: string; description?: string },
  ) {
    return this.otService.update(id, data);
  }

  @Patch(':id/statut')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN)
  updateStatut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatutOtDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.otService.updateStatut(id, dto, userId);
  }

  @Post(':id/mecaniciens/:mecanicienId')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  affecterMecanicien(
    @Param('id', ParseIntPipe) id: number,
    @Param('mecanicienId', ParseIntPipe) mecanicienId: number,
  ) {
    return this.otService.affecterMecanicien(id, mecanicienId);
  }

  @Patch(':id/couts')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE, Role.RESPONSABLE_PARC)
  updateCouts(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCoutsOtDto) {
    return this.otService.updateCouts(id, body);
  }

  @Delete(':id/mecaniciens/:mecanicienId')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  retirerMecanicien(
    @Param('id', ParseIntPipe) id: number,
    @Param('mecanicienId', ParseIntPipe) mecanicienId: number,
  ) {
    return this.otService.retirerMecanicien(id, mecanicienId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.otService.remove(id);
  }

  @Patch(':id/mecaniciens/:mecanicienId/travaux')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN)
  updateTravaux(
    @Param('id', ParseIntPipe) id: number,
    @Param('mecanicienId', ParseIntPipe) mecanicienId: number,
    @Body() body: UpdateTravauxOtDto,
    @CurrentUser() acteur: { id: number; role: Role },
  ) {
    // Un mécanicien ne remplit que son propre compte rendu
    if (acteur.role === Role.MECANICIEN && acteur.id !== mecanicienId) {
      throw new ForbiddenException('Vous ne pouvez saisir que vos propres travaux');
    }
    return this.otService.updateMecanicienTravaux(id, mecanicienId, body);
  }
}
