import { IsString, IsOptional, IsInt, IsNumber, Min, IsNotEmpty } from 'class-validator';

export class CreatePieceDto {
  @IsString() @IsNotEmpty()
  reference: string;

  @IsString() @IsNotEmpty()
  designation: string;

  @IsString() @IsOptional()
  marque?: string;

  @IsString() @IsOptional()
  categorie?: string;

  @IsInt() @Min(0) @IsOptional()
  quantiteDisponible?: number;

  @IsInt() @Min(0) @IsOptional()
  quantiteMinimum?: number;

  @IsString() @IsOptional()
  unite?: string;

  @IsString() @IsOptional()
  emplacement?: string;

  @IsNumber() @IsOptional()
  prixUnitaire?: number;

  @IsString() @IsOptional()
  notes?: string;
}
