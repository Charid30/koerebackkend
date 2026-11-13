import { Module } from '@nestjs/common';
import { AmdecController } from './amdec.controller';
import { AmdecService } from './amdec.service';

@Module({
  controllers: [AmdecController],
  providers: [AmdecService],
})
export class AmdecModule {}
