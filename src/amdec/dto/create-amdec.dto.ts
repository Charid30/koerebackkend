import { IsInt, IsString, IsOptional, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateAmdecDto {
  @IsInt()
  vehiculeId: number;

  @IsString() @IsNotEmpty()
  composant: string;

  @IsString() @IsNotEmpty()
  modeDefaillance: string;

  @IsString() @IsNotEmpty()
  effet: string;

  @IsString() @IsNotEmpty()
  cause: string;

  @IsInt() @Min(1) @Max(5)
  frequence: number;

  @IsInt() @Min(1) @Max(5)
  gravite: number;

  @IsInt() @Min(1) @Max(5)
  detectabilite: number;

  @IsString() @IsOptional()
  actionsRecommandees?: string;
}
