import { Module } from '@nestjs/common';
import { OrdresTravauxController } from './ordres-travail.controller';
import { OrdresTravauxService } from './ordres-travail.service';

@Module({
  controllers: [OrdresTravauxController],
  providers: [OrdresTravauxService],
  exports: [OrdresTravauxService],
})
export class OrdresTravauxModule {}
