import { Controller, Get, Param, Query, ParseIntPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { RapportsService } from './rapports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('rapports')
export class RapportsController {
  constructor(private readonly svc: RapportsService) {}

  @Get('etat-parc')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE, Role.DIRECTION)
  async etatParc(@Res() res: Response) {
    const buffer = await this.svc.genererEtatParc();
    const filename = `etat-parc-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('vehicule/:id')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE)
  async historiqueVehicule(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.svc.genererHistoriqueVehicule(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="historique-vehicule-${id}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('mensuel')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE, Role.DIRECTION)
  async rapportMensuel(
    @Query('annee') annee: string,
    @Query('mois') mois: string,
    @Res() res: Response,
  ) {
    const a = Number(annee) || new Date().getFullYear();
    const m = Number(mois) || new Date().getMonth() + 1;
    const buffer = await this.svc.genererRapportMensuel(a, m);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rapport-mensuel-${a}-${String(m).padStart(2,'0')}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('stock')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE)
  async etatStock(@Res() res: Response) {
    const buffer = await this.svc.genererEtatStock();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="etat-stock-${new Date().toISOString().slice(0,10)}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
