import { Controller, Get, Post, Put, Patch, Param, Body, Query, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';

class ResetMdpDto {
  @IsString() @MinLength(8) nouveauMotDePasse: string;
}
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const ROLE_SUBORDONNES: Partial<Record<Role, Role[]>> = {
  [Role.ADMIN]:                   [Role.ADMIN, Role.DIRECTION, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN, Role.CHAUFFEUR],
  [Role.DIRECTION]:               [Role.RESPONSABLE_PARC],
  [Role.RESPONSABLE_PARC]:        [Role.RESPONSABLE_MAINTENANCE],
  [Role.RESPONSABLE_MAINTENANCE]: [Role.MECANICIEN],
  [Role.MECANICIEN]:              [Role.CHAUFFEUR],
};

const ROLES_ADMIN = [Role.ADMIN, Role.DIRECTION, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN];

@Roles(...ROLES_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser('role') creatorRole: Role) {
    const autorises = ROLE_SUBORDONNES[creatorRole] ?? [];
    if (!autorises.includes(dto.role as Role)) {
      throw new ForbiddenException(`Vous ne pouvez pas créer un utilisateur avec le rôle ${dto.role}`);
    }
    return this.usersService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/toggle-actif')
  toggleActif(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleActif(id);
  }

  @Patch(':id/reset-mot-de-passe')
  resetMotDePasse(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetMdpDto) {
    return this.usersService.resetMotDePasse(id, dto.nouveauMotDePasse);
  }
}
