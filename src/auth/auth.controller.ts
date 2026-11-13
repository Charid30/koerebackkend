import { Controller, Post, Get, Patch, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class ChangerMdpDto {
  @IsString() motDePasseActuel: string;
  @IsString() @MinLength(8) nouveauMotDePasse: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('id') userId: number) {
    return this.authService.logout(userId);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: any) {
    return this.authService.refreshTokens(user.id, user.email, user.role);
  }

  @Get('profil')
  profil(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  @Patch('changer-mot-de-passe')
  @HttpCode(HttpStatus.OK)
  changerMotDePasse(@CurrentUser('id') userId: number, @Body() dto: ChangerMdpDto) {
    return this.authService.changerMotDePasse(userId, dto.motDePasseActuel, dto.nouveauMotDePasse);
  }
}
