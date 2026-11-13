import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  findAll(
    @Query('vehiculeId') vehiculeId?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.inspectionsService.findAll(vehiculeId, +page, +limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inspectionsService.findOne(id);
  }

  @Post()
  @Roles(Role.CHAUFFEUR, Role.MECANICIEN, Role.RESPONSABLE_MAINTENANCE, Role.ADMIN)
  create(@Body() dto: CreateInspectionDto, @CurrentUser('id') userId: number) {
    return this.inspectionsService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { notes?: string; statut?: string },
  ) {
    return this.inspectionsService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inspectionsService.remove(id);
  }
}
