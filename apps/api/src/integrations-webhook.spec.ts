import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from './modules/integrations/integrations.controller';
import { IntegrationsService } from './modules/integrations/integrations.service';
import { ScalinkyService } from './modules/integrations/scalinky.service';
import { BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('IntegrationsController — Outbound WhatsApp Webhook', () => {
  let controller: IntegrationsController;
  let service: IntegrationsService;

  const mockSendOutbound = jest.fn();
  const mockValidateKey = jest.fn();
  const mockGetCredentials = jest.fn();

  beforeEach(async () => {
    mockSendOutbound.mockReset();
    mockValidateKey.mockReset();
    mockGetCredentials.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: IntegrationsService,
          useValue: {
            sendOutboundWebhookMessage: mockSendOutbound,
            validateAndResolveOrgFromKey: mockValidateKey,
            getOrgWebhookCredentials: mockGetCredentials,
            getStatus: jest.fn(),
            sendWhatsAppMessage: jest.fn()
          }
        },
        {
          provide: ScalinkyService,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue(true)
          }
        }
      ]
    }).compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
    service = module.get<IntegrationsService>(IntegrationsService);
  });

  it('debe devolver la información de documentación y curl del webhook en getWebhookInfo()', () => {
    const info = controller.getWebhookInfo();
    expect(info.status).toBe('active');
    expect(info.endpoints).toBeDefined();
    expect(info.exampleCurl).toContain('/api/integrations/outbound-webhook');
    expect(info.authentication.defaultApiKey).toBe('turnoflow-webhook-secret-2026');
  });

  it('debe rechazar solicitudes sin autenticación (401 Unauthorized)', async () => {
    await expect(
      controller.handleOutboundWebhook(
        {},
        { to: '+5493547464266', message: 'Hola' },
        {},
        {}
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debe rechazar solicitudes con clave no autorizada', async () => {
    mockValidateKey.mockResolvedValue(null);

    await expect(
      controller.handleOutboundWebhook(
        {},
        { to: '+5493547464266', message: 'Hola' },
        { 'x-api-key': 'clave-inventada-o-falsa' },
        {}
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debe procesar el envío de mensaje con Master API key válida por header x-api-key', async () => {
    mockSendOutbound.mockResolvedValue({
      success: true,
      messageId: 'msg-wa-1234',
      to: '+5493547464266',
      organizationId: 'org-test',
      loggedToChat: true
    });

    const result = await controller.handleOutboundWebhook(
      {},
      {
        to: '+5493547464266',
        message: 'Tu turno está listo',
        appName: 'Mi CRM Externo'
      },
      { 'x-api-key': 'turnoflow-webhook-secret-2026' },
      {}
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-wa-1234');
    expect(mockSendOutbound).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+5493547464266',
        text: 'Tu turno está listo',
        appName: 'Mi CRM Externo'
      })
    );
  });

  it('debe procesar el envío con API Key exclusiva de organización (Multi-Tenant)', async () => {
    mockValidateKey.mockResolvedValue('org-empresa-123');
    mockSendOutbound.mockResolvedValue({
      success: true,
      messageId: 'msg-wa-org-123',
      to: '+5493547464266',
      organizationId: 'org-empresa-123',
      loggedToChat: true
    });

    const result = await controller.handleOutboundWebhook(
      {},
      {
        to: '+5493547464266',
        message: 'Aviso exclusivo de mi empresa',
        appName: 'Mi Negocio App'
      },
      { 'x-api-key': 'tf_sec_empresa123_abc123' },
      {}
    );

    expect(result.success).toBe(true);
    expect(mockSendOutbound).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-empresa-123',
        text: 'Aviso exclusivo de mi empresa'
      })
    );
  });

  it('debe bloquear con ForbiddenException (403) si una clave intenta enviar a nombre de otra empresa', async () => {
    mockValidateKey.mockResolvedValue('org-empresa-A');

    await expect(
      controller.handleOutboundWebhook(
        {},
        {
          to: '+5493547464266',
          message: 'Intento de vulnerar otra empresa',
          organizationId: 'org-empresa-B-ajena'
        },
        { 'x-api-key': 'tf_sec_empresaA_secret' },
        {}
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe soportar aliases flexibles (phone y text en vez de to y message)', async () => {
    mockSendOutbound.mockResolvedValue({
      success: true,
      messageId: 'msg-wa-5678',
      to: '+5493547111222',
      organizationId: 'org-test',
      loggedToChat: true
    });

    const result = await controller.handleOutboundWebhook(
      {},
      {
        phone: '+5493547111222',
        text: 'Notificación desde otra app',
        apiKey: 'turnoflow-webhook-secret-2026'
      },
      {},
      {}
    );

    expect(result.success).toBe(true);
    expect(mockSendOutbound).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+5493547111222',
        text: 'Notificación desde otra app'
      })
    );
  });

  it('debe lanzar BadRequestException si falta el destinatario o el mensaje', async () => {
    await expect(
      controller.handleOutboundWebhook(
        {},
        { message: 'Sin número' },
        { 'x-api-key': 'turnoflow-webhook-secret-2026' },
        {}
      )
    ).rejects.toThrow(BadRequestException);
  });
});
