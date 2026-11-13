import { Controller, Get, Patch, Param, Query, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMes(@CurrentUser('id') userId: number, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.notificationsService.findMesNotifications(userId, +page, +limit);
  }

  @Patch(':id/lire')
  marquerLu(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.notificationsService.marquerLu(id, userId);
  }

  @Patch('tout-lire')
  marquerToutLu(@CurrentUser('id') userId: number) {
    return this.notificationsService.marquerToutLu(userId);
  }
}
