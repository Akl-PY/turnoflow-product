import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import * as net from 'net';

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

const entities = [
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
];

function probeTcp(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    try {
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

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
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const logger = new Logger('TypeOrmModule');
        let databaseUrl = process.env.DATABASE_URL;
        const databaseType = (process.env.DATABASE_TYPE || '').toLowerCase();
        const isDev = process.env.NODE_ENV !== 'production' || process.env.DATABASE_SYNC === 'true';
        const databaseFile = process.env.DATABASE_FILE || 'turnoflow.sqlite';

        // 1. Si se define explícitamente SQLite, usar SQLite directo
        if (databaseType === 'sqlite') {
          logger.log(`💾 Base de datos SQLite activa: ${databaseFile}`);
          return {
            type: 'sqlite',
            database: databaseFile,
            entities,
            synchronize: isDev,
            logging: false
          };
        }

        const isPostgres = !!databaseUrl && (databaseUrl.startsWith('postgres') || databaseUrl.startsWith('postgresql'));

        if (isPostgres) {
          try {
            const parsed = new URL(databaseUrl!);
            let host = parsed.hostname;
            const port = parseInt(parsed.port || '5432', 10);

            // Sondeo de conectividad de red preventiva
            let canReach = await probeTcp(host, port, 1500);

            // Si falla y el host es localhost dentro de un contenedor Docker, probar servicio "postgres"
            if (!canReach && (host === 'localhost' || host === '127.0.0.1')) {
              const canReachDockerService = await probeTcp('postgres', 5432, 1000);
              if (canReachDockerService) {
                logger.log('🐳 Redireccionando host PostgreSQL de "localhost" a servicio Docker "postgres"');
                parsed.hostname = 'postgres';
                databaseUrl = parsed.toString();
                canReach = true;
              }
            }

            if (!canReach) {
              if (isDev || databaseType !== 'postgres') {
                logger.warn(
                  `⚠️ No se pudo conectar a PostgreSQL en ${host}:${port} (ECONNREFUSED). Activando fallback automático a SQLite (${databaseFile}) para no interrumpir el arranque.`
                );
                return {
                  type: 'sqlite',
                  database: databaseFile,
                  entities,
                  synchronize: isDev,
                  logging: false
                };
              } else {
                logger.warn(
                  `⚠️ PostgreSQL en ${host}:${port} no respondió al sondeo inicial. Iniciando con reintentos para producción...`
                );
              }
            }
          } catch {
            // Continuar con conexión estándar en caso de URLs complejas
          }

          const useSsl = databaseUrl?.includes('supabase') || process.env.DATABASE_SSL === 'true';
          logger.log(`🐘 Conectando a PostgreSQL...`);
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: useSsl ? { rejectUnauthorized: false } : false,
            entities,
            synchronize: isDev,
            logging: false,
            retryAttempts: 20,
            retryDelay: 3000
          };
        }

        // Configuración por defecto: SQLite portable
        logger.log(`💾 Base de datos SQLite inicializada: ${databaseFile}`);
        return {
          type: 'sqlite',
          database: databaseFile,
          entities,
          synchronize: isDev,
          logging: false
        };
      }
    }),
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
