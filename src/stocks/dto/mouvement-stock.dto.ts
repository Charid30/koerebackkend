import { IsInt, IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { TypeMouvement } from '@prisma/client';

export class MouvementStockDto {
  @IsInt()
  pieceId: number;

  @IsEnum(TypeMouvement)
  typeMouvement: TypeMouvement;

  @IsInt() @Min(1)
  quantite: number;

  @IsNumber() @IsOptional()
  prixUnitaire?: number;

  @IsString() @IsOptional()
  motif?: string;
}
