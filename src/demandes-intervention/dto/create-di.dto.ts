import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum Priorite { FAIBLE = 'FAIBLE', NORMALE = 'NORMALE', URGENTE = 'URGENTE', CRITIQUE = 'CRITIQUE' }

export class CreateDiDto {
  @Type(() => Number) @IsInt()
  vehiculeId: number;

  @IsString()
  description: string;

  @IsEnum(Priorite) @IsOptional()
  priorite?: Priorite;

  @IsString() @IsOptional()
  localisation?: string;
}
