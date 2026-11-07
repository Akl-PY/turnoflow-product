import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationEntity } from '../../entities/automation.entity';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AutomationEntity])],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService]
})
export class AutomationsModule {}
