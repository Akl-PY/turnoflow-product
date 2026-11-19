import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { ScalinkyService } from './scalinky.service';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { Organization } from '../../entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Organization])
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ScalinkyService],
  exports: [IntegrationsService, ScalinkyService]
})
export class IntegrationsModule {}
