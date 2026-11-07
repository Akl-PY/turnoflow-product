import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('TurnoFlowBootstrap');

  // Hardening de Seguridad: Validación mandatoria de JWT_SECRET en Producción
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultSecrets = [
    'turnoflow-super-secret-key-32chars-min',
    'change_me_to_a_secure_32_characters_random_string_now',
    'reemplazar_con_secreto_criptografico_de_al_menos_32_caracteres_aleatorios'
  ];

  if (isProduction) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim().length < 32 || defaultSecrets.includes(jwtSecret)) {
      throw new Error(
        'FATAL: En entorno de producción (NODE_ENV=production), la variable JWT_SECRET debe estar configurada con al menos 32 caracteres criptográficos seguros y no puede ser el valor por defecto.'
      );
    }
  }

  const app = await NestFactory.create(AppModule);

  // Prefijo global de API
  app.setGlobalPrefix('api');

  // Habilitar CORS para cliente Expo Web y Mobile
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  });

  // Validaciones globales de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false
    })
  );

  // Configuración de Documentación Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TurnoFlow AI — API & AI Agent Engine')
    .setDescription(
      'Documentación oficial de endpoints para la plataforma TurnoFlow AI. Gestiona organizaciones, agentes especializados, CRM de prospectos, agendamiento y webhooks de WhatsApp/n8n.'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 TurnoFlow AI Engine corriendo en: http://localhost:${port}/api`);
  logger.log(`📑 Documentación Swagger disponible en: http://localhost:${port}/docs`);
}

bootstrap();
