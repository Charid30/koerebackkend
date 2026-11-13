import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AmdecService } from './amdec.service';
import { CreateAmdecDto } from './dto/create-amdec.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('amdec')
export class AmdecController {
  constructor(private readonly amdecService: AmdecService) {}

  @Get('vehicule/:vehiculeId')
  findByVehicule(@Param('vehiculeId', ParseIntPipe) vehiculeId: number) {
    return this.amdecService.findByVehicule(vehiculeId);
  }

  @Get('vehicule/:vehiculeId/matrice')
  getMatrice(@Param('vehiculeId', ParseIntPipe) vehiculeId: number) {
    return this.amdecService.getMatriceCriticite(vehiculeId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  create(@Body() dto: CreateAmdecDto) {
    return this.amdecService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateAmdecDto>) {
    return this.amdecService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.amdecService.remove(id);
  }
}
