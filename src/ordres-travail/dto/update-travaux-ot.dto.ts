import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Compte rendu d'un mécanicien sur un OT. */
export class UpdateTravauxOtDto {
  @IsNumber() @Min(0) @IsOptional()
  tempsPasse?: number;

  @IsString() @IsOptional()
  diagnostic?: string;

  @IsString() @IsOptional()
  travauxEffectues?: string;
}
