import { IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

/** Saisie des coûts d'un OT : seuls ces champs peuvent être modifiés. */
export class UpdateCoutsOtDto {
  @IsNumber() @Min(0) @IsOptional()
  coutPrestataire?: number;

  @IsNumber() @Min(0) @IsOptional()
  coutPiecesTotal?: number;

  @IsNumber() @Min(0) @IsOptional()
  heuresInternesTotal?: number;

  @IsString() @MaxLength(200) @IsOptional()
  prestatireExterne?: string;
}
