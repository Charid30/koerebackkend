import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatutOT } from '@prisma/client';

export class UpdateStatutOtDto {
  @IsEnum(StatutOT)
  statut: StatutOT;

  @IsString() @IsOptional()
  notesControle?: string;
}
