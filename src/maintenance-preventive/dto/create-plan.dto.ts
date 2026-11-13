import { IsInt, IsString, IsOptional, IsDateString, IsEnum, Min } from 'class-validator';

export enum TypePlanMaintenance {
  PERIODIQUE = 'PERIODIQUE',
  GENERALE   = 'GENERALE',
}

export class CreatePlanDto {
  @IsInt()
  vehiculeId: number;

  @IsEnum(TypePlanMaintenance)
  typePlan: TypePlanMaintenance;

  @IsString() @IsOptional()
  description?: string;

  // PERIODIQUE — km au dernier entretien (seuil fixe 10 000 km)
  @IsInt() @IsOptional() @Min(0)
  derniereExecutionKm?: number;

  // GENERALE — intervalle en mois + date du dernier entretien
  @IsInt() @IsOptional() @Min(1)
  frequenceMois?: number;

  @IsDateString() @IsOptional()
  derniereExecutionDate?: string;
}
