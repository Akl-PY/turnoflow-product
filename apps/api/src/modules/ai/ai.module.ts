import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { Lead } from '../../entities/lead.entity';
import { Appointment } from '../../entities/appointment.entity';
import { Conversation } from '../../entities/conversation.entity';
import { AgentConfigEntity } from '../../entities/agent-config.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { MockAiProvider } from './providers/mock.provider';
import { ReceptionistAgent } from './agents/receptionist.agent';
import { LeadClassifierAgent } from './agents/lead-classifier.agent';
import { FollowUpAgent } from './agents/follow-up.agent';
import { BookingAgent } from './agents/booking.agent';
import { SupervisorAgent } from './agents/supervisor.agent';

@Module({
  imports: [
    IntegrationsModule,
    TypeOrmModule.forFeature([
      BusinessProfile,
      Lead,
      Appointment,
      Conversation,
      AgentConfigEntity
    ])
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AnthropicProvider,
    OpenAiProvider,
    GeminiProvider,
    MockAiProvider,
    ReceptionistAgent,
    LeadClassifierAgent,
    FollowUpAgent,
    BookingAgent,
    SupervisorAgent
  ],
  exports: [AiService]
})
export class AiModule {}
