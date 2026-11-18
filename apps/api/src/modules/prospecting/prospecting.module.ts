import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProspectingFlowEntity } from '../../entities/prospecting-flow.entity';
import { Lead } from '../../entities/lead.entity';
import { ProspectingService } from './prospecting.service';
import { ProspectingController } from './prospecting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProspectingFlowEntity, Lead])],
  providers: [ProspectingService],
  controllers: [ProspectingController],
  exports: [ProspectingService]
})
export class ProspectingModule {}
