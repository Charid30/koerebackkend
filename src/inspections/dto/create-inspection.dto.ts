import { IsInt, IsNumber, IsEnum, IsOptional, IsDateString, IsString, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { TypeInspection, ResultatItem } from '@prisma/client';

class InspectionItemDto {
  @IsString() @IsNotEmpty()
  categorie: string;

  @IsString() @IsNotEmpty()
  libelle: string;

  @IsEnum(ResultatItem)
  resultat: ResultatItem;

  @IsString() @IsOptional()
  observation?: string;

  @IsString() @IsOptional()
  photoUrl?: string;
}

export class CreateInspectionDto {
  @IsInt()
  vehiculeId: number;

  @IsEnum(TypeInspection) @IsOptional()
  typeInspection?: TypeInspection;

  @IsDateString()
  dateInspection: string;

  @IsInt() @IsOptional()
  kilometrageReleve?: number;

  @IsInt() @IsOptional()
  heuresMoteurReleve?: number;

  @IsNumber() @IsOptional()
  noteGlobale?: number;

  @IsString() @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionItemDto)
  items: InspectionItemDto[];
}
