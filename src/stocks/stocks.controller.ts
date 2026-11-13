import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StocksService } from './stocks.service';
import { CreatePieceDto } from './dto/create-piece.dto';
import { MouvementStockDto } from './dto/mouvement-stock.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('pieces')
  @Roles(Role.ADMIN, Role.DIRECTION)
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.stocksService.findAllPieces(+page, +limit);
  }

  @Get('pieces/alertes')
  @Roles(Role.ADMIN, Role.DIRECTION)
  getPiecesEnAlerte() {
    return this.stocksService.findPiecesEnAlerte();
  }

  @Get('pieces/:id')
  @Roles(Role.ADMIN, Role.DIRECTION)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stocksService.findOnePiece(id);
  }

  @Get('pieces/:id/mouvements')
  @Roles(Role.ADMIN, Role.DIRECTION)
  getMouvements(@Param('id', ParseIntPipe) id: number) {
    return this.stocksService.getMouvements(id);
  }

  @Post('pieces')
  @Roles(Role.ADMIN, Role.DIRECTION)
  createPiece(@Body() dto: CreatePieceDto) {
    return this.stocksService.createPiece(dto);
  }

  @Patch('pieces/:id')
  @Roles(Role.ADMIN, Role.DIRECTION)
  updatePiece(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreatePieceDto>) {
    return this.stocksService.updatePiece(id, dto);
  }

  @Delete('pieces/:id')
  @Roles(Role.ADMIN, Role.DIRECTION)
  removePiece(@Param('id', ParseIntPipe) id: number) {
    return this.stocksService.removePiece(id);
  }

  @Post('mouvements')
  @Roles(Role.ADMIN, Role.DIRECTION)
  enregistrerMouvement(@Body() dto: MouvementStockDto, @CurrentUser('id') userId: number) {
    return this.stocksService.enregistrerMouvement(dto, userId);
  }
}
