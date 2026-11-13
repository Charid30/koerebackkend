import { IsString, IsEmail, IsEnum, IsOptional, MinLength, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString() @IsNotEmpty()
  nom: string;

  @IsString() @IsNotEmpty()
  prenom: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(8)
  motDePasse: string;

  @IsEnum(Role)
  role: Role;

  @IsString() @IsOptional()
  telephone?: string;

  @IsString() @IsOptional()
  departement?: string;
}
