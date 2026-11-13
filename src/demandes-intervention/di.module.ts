import { Module } from '@nestjs/common';
import { DemandesInterventionController } from './di.controller';
import { DemandesInterventionService } from './di.service';

@Module({
  controllers: [DemandesInterventionController],
  providers: [DemandesInterventionService],
  exports: [DemandesInterventionService],
})
export class DemandesInterventionModule {}
