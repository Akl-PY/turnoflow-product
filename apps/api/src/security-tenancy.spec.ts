import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeadsService } from './modules/leads/leads.service';
import { ConversationsService } from './modules/conversations/conversations.service';
import { Lead } from './entities/lead.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AiService } from './modules/ai/ai.service';
import { NotFoundException } from '@nestjs/common';

describe('TurnoFlow AI — Aislamiento Multi-Tenant y Seguridad de Webhooks', () => {
  let leadsService: LeadsService;
  let conversationsService: ConversationsService;

  const orgA = 'org-beauty-salon-a';
  const orgB = 'org-hair-studio-b';

  const mockLeadA = {
    id: 'lead-100',
    organizationId: orgA,
    name: 'Cliente Salon A',
    phone: '+5491111111111',
    requestedService: 'Limpieza Facial'
  };

  const mockLeadRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.organizationId === orgA && where.id === 'lead-100') {
        return Promise.resolve(mockLeadA);
      }
      return Promise.resolve(null);
    }),
    find: jest.fn().mockImplementation(({ where }) => {
      if (where.organizationId === orgA) {
        return Promise.resolve([mockLeadA]);
      }
      return Promise.resolve([]);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockLeadA])
    })
  };

  const mockConvRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({ id: 'conv-1', ...dto })),
    save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'conv-1', ...dto }))
  };

  const mockMsgRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.externalMessageId === 'already-processed-msg-id') {
        return Promise.resolve({ id: 'msg-existing-1', externalMessageId: 'already-processed-msg-id' });
      }
      return Promise.resolve(null);
    }),
    create: jest.fn().mockImplementation((dto) => ({ id: 'msg-new', ...dto })),
    save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'msg-new', ...dto }))
  };

  const mockAiService = {
    processIncomingMessage: jest.fn().mockResolvedValue({
      replyText: 'Respuesta simulada',
      toolExecutions: [],
      handoffToHuman: false
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        ConversationsService,
        { provide: getRepositoryToken(Lead), useValue: mockLeadRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConvRepo },
        { provide: getRepositoryToken(Message), useValue: mockMsgRepo },
        { provide: AiService, useValue: mockAiService }
      ]
    }).compile();

    leadsService = module.get<LeadsService>(LeadsService);
    conversationsService = module.get<ConversationsService>(ConversationsService);
  });

  describe('1. Aislamiento Estricto entre Organizaciones (Multi-Tenancy)', () => {
    it('Organización A puede acceder a su propio lead', async () => {
      const lead = await leadsService.findOne(orgA, 'lead-100');
      expect(lead).toBeDefined();
      expect(lead.id).toBe('lead-100');
    });

    it('Organización B NO puede acceder al lead de Organización A (Throws NotFoundException)', async () => {
      await expect(leadsService.findOne(orgB, 'lead-100')).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Idempotencia de Webhooks y Descarte de Duplicados', () => {
    it('debe ignorar mensajes entrantes con messageId ya procesado previamente', async () => {
      const result = await conversationsService.handleIncomingMessage({
        channel: 'whatsapp',
        senderPhone: '+5491122334455',
        senderName: 'Test Duplicado',
        messageText: 'Hola de nuevo',
        externalMessageId: 'already-processed-msg-id',
        organizationId: orgA
      });

      expect(result.replyMessage).toBe('Mensaje ya procesado.');
      expect(mockAiService.processIncomingMessage).not.toHaveBeenCalled();
    });
  });

  describe('3. Verificación Criptográfica de Meta X-Hub-Signature-256', () => {
    it('debe validar o rechazar según la cabecera SHA256 recibida', () => {
      process.env.WHATSAPP_APP_SECRET = 'test_secret_12345';
      const payload = JSON.stringify({ test: 'data' });
      const invalidCheck = conversationsService.verifyMetaSignature(payload, 'sha256=invalidhashvalue');
      expect(invalidCheck).toBe(false);
    });
  });

  describe('4. Tokens de Verificación de Webhook Únicos por Organización (Multi-Tenant)', () => {
    it('debe generar tokens únicos e irrepetibles para cada tenant', () => {
      const tokenA = conversationsService.getTenantVerifyToken(orgA);
      const tokenB = conversationsService.getTenantVerifyToken(orgB);

      expect(tokenA).toBeDefined();
      expect(tokenB).toBeDefined();
      expect(tokenA.startsWith('tf_sec_')).toBe(true);
      expect(tokenB.startsWith('tf_sec_')).toBe(true);
      expect(tokenA).not.toBe(tokenB); // Tenant A y Tenant B tienen tokens totalmente distintos
    });
  });
});
