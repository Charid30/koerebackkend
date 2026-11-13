import { IsString, IsEnum, IsOptional, IsInt, IsDateString, IsNotEmpty, Min } from 'class-validator';
import { TypeVehicule, TypeCarburant, StatutVehicule } from '@prisma/client';

export class CreateVehiculeDto {
  @IsString() @IsNotEmpty()
  numeroInterne: string;

  @IsString() @IsNotEmpty()
  immatriculation: string;

  @IsString() @IsNotEmpty()
  marque: string;

  @IsString() @IsNotEmpty()
  modele: string;

  @IsEnum(TypeVehicule)
  typeVehicule: TypeVehicule;

  @IsInt() @IsOptional()
  annee?: number;

  @IsString() @IsOptional()
  entite?: string;

  @IsString() @IsOptional()
  departement?: string;

  @IsString() @IsOptional()
  siteGeographique?: string;

  @IsInt() @IsOptional()
  conducteurHabituelId?: number;

  @IsInt() @Min(0) @IsOptional()
  kilometrage?: number;

  @IsInt() @Min(0) @IsOptional()
  heuresMoteur?: number;

  @IsDateString() @IsOptional()
  dateMiseEnService?: string;

  @IsDateString() @IsOptional()
  dateAcquisition?: string;

  @IsString() @IsOptional()
  numeroSerie?: string;

  @IsString() @IsOptional()
  couleur?: string;

  @IsEnum(TypeCarburant) @IsOptional()
  carburant?: TypeCarburant;

  @IsEnum(StatutVehicule) @IsOptional()
  statut?: StatutVehicule;

  @IsString() @IsOptional()
  notes?: string;
}
