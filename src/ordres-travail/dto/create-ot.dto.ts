import { IsInt, IsEnum, IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { TypeMaintenance } from '@prisma/client';

export class CreateOtDto {
  @IsInt() @IsOptional()
  diId?: number;

  @IsInt()
  vehiculeId: number;

  @IsEnum(TypeMaintenance)
  typeMaintenance: TypeMaintenance;

  @IsString() @IsOptional()
  description?: string;

  @IsDateString() @IsOptional()
  datePlanifiee?: string;

  @IsString() @IsOptional()
  prestatireExterne?: string;

  @IsNumber() @IsOptional()
  coutPrestataire?: number;
}
