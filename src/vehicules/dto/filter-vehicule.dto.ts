import { IsEnum, IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StatutVehicule, TypeVehicule } from '@prisma/client';

export class FilterVehiculeDto {
  @IsEnum(StatutVehicule) @IsOptional()
  statut?: StatutVehicule;

  @IsEnum(TypeVehicule) @IsOptional()
  typeVehicule?: TypeVehicule;

  @IsString() @IsOptional()
  departement?: string;

  @IsString() @IsOptional()
  search?: string;

  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  page?: number = 1;

  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  limit?: number = 20;
}
