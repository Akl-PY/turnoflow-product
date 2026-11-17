import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationEntity } from '../../entities/automation.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { Message } from '../../entities/message.entity';
import { Lead } from '../../entities/lead.entity';
import { Appointment } from '../../entities/appointment.entity';
import { Conversation } from '../../entities/conversation.entity';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutomationEntity,
      BusinessProfile,
      Message,
      Lead,
      Appointment,
      Conversation
    ])
  ],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService]
})
export class AutomationsModule {}
