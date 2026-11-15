import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Le mot de passe ne se change que par « réinitialiser » (contrôlé) ou « Mon profil »
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['email', 'motDePasse'] as const)) {}
