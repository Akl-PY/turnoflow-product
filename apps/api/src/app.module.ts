import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import {
  User,
  Organization,
  BusinessProfile,
  Lead,
  Appointment,
  Conversation,
  Message,
  AgentConfigEntity,
  AutomationEntity,
  AuditLog,
  Order
} from './entities';

import { AuthModule } from './modules/auth/auth.module';
import { BusinessModule } from './modules/business/business.module';
import { LeadsModule } from './modules/leads/leads.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { AiModule } from './modules/ai/ai.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { AgentsModule } from './modules/agents/agents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExportModule } from './modules/export/export.module';
import { OrdersModule } from './modules/orders/orders.module';
import { HealthController } from './modules/health/health.controller';

const databaseUrl = process.env.DATABASE_URL;
const isPostgres = !!databaseUrl && (databaseUrl.startsWith('postgres') || databaseUrl.startsWith('postgresql'));
const isDev = process.env.NODE_ENV !== 'production' || process.env.DATABASE_SYNC === 'true';
const useSsl = isPostgres && (databaseUrl?.includes('supabase') || process.env.DATABASE_SSL === 'true');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100
      }
    ]),
    TypeOrmModule.forRoot(
      isPostgres
        ? {
            type: 'postgres',
            url: databaseUrl,
            ssl: useSsl ? { rejectUnauthorized: false } : false,
            entities: [
              User,
              Organization,
              BusinessProfile,
              Lead,
              Appointment,
              Conversation,
              Message,
              AgentConfigEntity,
              AutomationEntity,
              AuditLog,
              Order
            ],
            synchronize: isDev,
            logging: false
          }
        : {
            type: 'sqlite',
            database: process.env.DATABASE_FILE || 'turnoflow.sqlite',
            entities: [
              User,
              Organization,
              BusinessProfile,
              Lead,
              Appointment,
              Conversation,
              Message,
              AgentConfigEntity,
              AutomationEntity,
              AuditLog,
              Order
            ],
            synchronize: isDev,
            logging: false
          }
    ),
    AuthModule,
    BusinessModule,
    LeadsModule,
    AppointmentsModule,
    ConversationsModule,
    AiModule,
    IntegrationsModule,
    AutomationsModule,
    AgentsModule,
    DashboardModule,
    ExportModule,
    OrdersModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
