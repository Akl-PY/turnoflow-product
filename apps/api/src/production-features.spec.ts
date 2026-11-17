import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationsService } from './modules/conversations/conversations.service';
import { ConversationsController } from './modules/conversations/conversations.controller';
import { BusinessService } from './modules/business/business.service';
import { AutomationsService } from './modules/automations/automations.service';
import { AiService } from './modules/ai/ai.service';
import { IntegrationsService } from './modules/integrations/integrations.service';
import { ScalinkyService } from './modules/integrations/scalinky.service';
import { ReceptionistAgent } from './modules/ai/agents/receptionist.agent';
import { BookingAgent } from './modules/ai/agents/booking.agent';
import { LeadClassifierAgent } from './modules/ai/agents/lead-classifier.agent';
import { FollowUpAgent } from './modules/ai/agents/follow-up.agent';
import { SupervisorAgent } from './modules/ai/agents/supervisor.agent';
import { AnthropicProvider } from './modules/ai/providers/anthropic.provider';
import { OpenAiProvider } from './modules/ai/providers/openai.provider';
import { GeminiProvider } from './modules/ai/providers/gemini.provider';
import { MockAiProvider } from './modules/ai/providers/mock.provider';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { BusinessProfile } from './entities/business-profile.entity';
import { Lead } from './entities/lead.entity';
import { Appointment } from './entities/appointment.entity';
import { AgentConfigEntity } from './entities/agent-config.entity';
import { AutomationEntity } from './entities/automation.entity';
import { ConversationStatus, AgentRoleType } from '@turnoflow/shared';

describe('TurnoFlow AI — Suite de Producción (Anti-Ráfaga, Excluidos, Ventas, Reglas de Grupos, Resumen y Agenda)', () => {
  let conversationsService: ConversationsService;
  let conversationsController: ConversationsController;
  let businessService: BusinessService;
  let automationsService: AutomationsService;
  let aiService: AiService;

  const orgId = 'org-production-test';

  // Base de datos en memoria simulada para pruebas integrales reales
  let dbProfile: BusinessProfile;
  let dbConversations: Conversation[] = [];
  let dbMessages: Message[] = [];
  let dbLeads: Lead[] = [];
  let dbAppointments: Appointment[] = [];

  const mockProfileRepo = {
    findOne: jest.fn().mockImplementation(() => Promise.resolve(dbProfile)),
    find: jest.fn().mockImplementation(() => Promise.resolve([dbProfile])),
    create: jest.fn().mockImplementation((dto) => ({ id: 'prof-1', ...dto })),
    save: jest.fn().mockImplementation((dto) => {
      dbProfile = { ...dbProfile, ...dto };
      return Promise.resolve(dbProfile);
    })
  };

  const mockConvRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (Array.isArray(where)) {
        for (const cond of where) {
          const found = dbConversations.find(
            (c) =>
              (!cond.id || c.id === cond.id) &&
              (!cond.channelConversationId || c.channelConversationId === cond.channelConversationId)
          );
          if (found) return Promise.resolve(found);
        }
        return Promise.resolve(null);
      }
      const found = dbConversations.find((c) => (!where?.id || c.id === where.id));
      return Promise.resolve(found || null);
    }),
    find: jest.fn().mockImplementation(() => Promise.resolve([...dbConversations])),
    count: jest.fn().mockImplementation(() => Promise.resolve(dbConversations.length)),
    create: jest.fn().mockImplementation((dto) => ({
      id: `conv-${dbConversations.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dto
    })),
    save: jest.fn().mockImplementation((dto) => {
      const idx = dbConversations.findIndex((c) => c.id === dto.id);
      if (idx >= 0) {
        dbConversations[idx] = { ...dbConversations[idx], ...dto };
        return Promise.resolve(dbConversations[idx]);
      }
      const created = { id: dto.id || `conv-${dbConversations.length + 1}`, ...dto };
      dbConversations.push(created);
      return Promise.resolve(created);
    }),
    update: jest.fn().mockImplementation((id, partial) => {
      const idx = dbConversations.findIndex((c) => c.id === id);
      if (idx >= 0) {
        dbConversations[idx] = { ...dbConversations[idx], ...partial };
      }
      return Promise.resolve({ affected: 1 });
    }),
    createQueryBuilder: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockImplementation(() => {
        let count = 0;
        dbConversations = dbConversations.map((c) => {
          if (
            c.status === ConversationStatus.HUMAN_TAKEOVER &&
            (c.assignedAgent as any) !== 'EXCLUDED_PERMANENT'
          ) {
            count++;
            return { ...c, status: ConversationStatus.AI_HANDLED };
          }
          return c;
        });
        return Promise.resolve({ affected: count });
      })
    }))
  };

  const mockMsgRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockImplementation(() => Promise.resolve([...dbMessages])),
    count: jest.fn().mockImplementation(() => Promise.resolve(dbMessages.length)),
    create: jest.fn().mockImplementation((dto) => ({
      id: `msg-${dbMessages.length + 1}`,
      createdAt: new Date(),
      ...dto
    })),
    save: jest.fn().mockImplementation((dto) => {
      dbMessages.push(dto);
      return Promise.resolve(dto);
    })
  };

  const mockLeadRepo = {
    findOne: jest.fn().mockImplementation(() => Promise.resolve(dbLeads[0] || null)),
    find: jest.fn().mockImplementation(() => Promise.resolve([...dbLeads])),
    count: jest.fn().mockImplementation(() => Promise.resolve(dbLeads.length)),
    create: jest.fn().mockImplementation((dto) => ({ id: `lead-${dbLeads.length + 1}`, ...dto })),
    save: jest.fn().mockImplementation((dto) => {
      const idx = dbLeads.findIndex((l) => l.id === dto.id);
      if (idx >= 0) {
        dbLeads[idx] = { ...dbLeads[idx], ...dto };
        return Promise.resolve(dbLeads[idx]);
      }
      dbLeads.push(dto);
      return Promise.resolve(dto);
    })
  };

  const mockApptRepo = {
    find: jest.fn().mockImplementation(() => Promise.resolve([...dbAppointments])),
    count: jest.fn().mockImplementation(() => Promise.resolve(dbAppointments.length)),
    create: jest.fn().mockImplementation((dto) => ({ id: `apt-${dbAppointments.length + 1}`, ...dto })),
    save: jest.fn().mockImplementation((dto) => {
      dbAppointments.push(dto);
      return Promise.resolve(dto);
    })
  };

  const mockIntegrationsService = {
    sendQRWhatsAppMessage: jest.fn().mockResolvedValue({ success: true, messageId: 'wa-msg-1' }),
    sendWhatsAppToGroupOrContact: jest.fn().mockResolvedValue({
      success: true,
      resolvedTarget: '120363000111222@g.us',
      messageId: 'wa-grp-1'
    }),
    fetchWhatsAppGroups: jest.fn().mockResolvedValue([
      { id: '120363000111222@g.us', subject: 'Comprobantes General', size: 5 },
      { id: '120363000999888@g.us', subject: 'Ventas Grandes Bombas', size: 3 }
    ]),
    isBotSentMessage: jest.fn().mockReturnValue(false),
    fetchEvolutionRecentMessages: jest.fn().mockResolvedValue([])
  };

  beforeEach(async () => {
    dbConversations = [];
    dbMessages = [];
    dbLeads = [];
    dbAppointments = [];
    dbProfile = {
      id: 'prof-1',
      organizationId: orgId,
      businessName: 'CrystalPool Mantenimiento & Bombas',
      description: 'Venta de bombas, filtros, insumos y mantenimiento de piscinas',
      vertical: 'OTHER' as any,
      location: 'Zona Norte, Córdoba',
      timezone: 'America/Argentina/Buenos_Aires',
      contactPhone: '+5493510001111',
      contactEmail: 'admin@crystalpool.com',
      currency: 'ARS',
      cancellationPolicy: 'Garantía de 6 meses en bombas.',
      services: [
        {
          id: 'srv-1',
          name: 'Bomba Autocebante 1HP',
          category: 'Producto',
          description: 'Bomba para piscina hasta 60.000 litros',
          price: 85000,
          currency: 'ARS',
          durationMinutes: 15,
          isActive: true
        }
      ],
      businessHours: [
        { day: 'monday', open: '09:00', close: '18:00', isOpen: true },
        { day: 'sunday', open: '00:00', close: '00:00', isOpen: false }
      ],
      faqs: [],
      specialInstructions: JSON.stringify({
        bookingEnabled: true,
        businessMode: 'HYBRID',
        forwardingRules: [
          {
            id: 'r-all',
            name: 'Todos los comprobantes',
            triggerType: 'ALL_RECEIPTS',
            minAmount: 0,
            keyword: '',
            targetGroupOrPhone: 'Comprobantes General',
            includeImage: true,
            isActive: true
          },
          {
            id: 'r-high-bomba',
            name: 'Comprobantes >= $50k de Bombas',
            triggerType: 'RECEIPT_CONDITION',
            minAmount: 50000,
            keyword: 'bomba',
            targetGroupOrPhone: 'Ventas Grandes Bombas',
            includeImage: true,
            isActive: true
          }
        ]
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        ConversationsService,
        BusinessService,
        AutomationsService,
        AiService,
        ReceptionistAgent,
        BookingAgent,
        LeadClassifierAgent,
        FollowUpAgent,
        SupervisorAgent,
        AnthropicProvider,
        OpenAiProvider,
        GeminiProvider,
        MockAiProvider,
        ScalinkyService,
        { provide: IntegrationsService, useValue: mockIntegrationsService },
        { provide: getRepositoryToken(BusinessProfile), useValue: mockProfileRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConvRepo },
        { provide: getRepositoryToken(Message), useValue: mockMsgRepo },
        { provide: getRepositoryToken(Lead), useValue: mockLeadRepo },
        { provide: getRepositoryToken(Appointment), useValue: mockApptRepo },
        { provide: getRepositoryToken(AgentConfigEntity), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(AutomationEntity), useValue: { find: jest.fn(), findOne: jest.fn() } }
      ]
    }).compile();

    conversationsService = module.get<ConversationsService>(ConversationsService);
    conversationsController = module.get<ConversationsController>(ConversationsController);
    businessService = module.get<BusinessService>(BusinessService);
    automationsService = module.get<AutomationsService>(AutomationsService);
    aiService = module.get<AiService>(AiService);
  });

  it('1. [ANTI-RÁFAGA 3.5s] Agrupa múltiples mensajes consecutivos del mismo cliente en una sola consulta', async () => {
    const msg1 = await conversationsController.handleQRWhatsAppWebhook(orgId, {
      event: 'messages.upsert',
      instance: 'tf_test',
      data: {
        key: { remoteJid: '5493547466056@s.whatsapp.net', fromMe: false, id: 'm-burst-1' },
        pushName: 'Franz',
        message: { conversation: 'Hola' }
      }
    });

    const msg2 = await conversationsController.handleQRWhatsAppWebhook(orgId, {
      event: 'messages.upsert',
      instance: 'tf_test',
      data: {
        key: { remoteJid: '5493547466056@s.whatsapp.net', fromMe: false, id: 'm-burst-2' },
        pushName: 'Franz',
        message: { conversation: 'Tenés la bomba de 1HP?' }
      }
    });

    const msg3 = await conversationsController.handleQRWhatsAppWebhook(orgId, {
      event: 'messages.upsert',
      instance: 'tf_test',
      data: {
        key: { remoteJid: '5493547466056@s.whatsapp.net', fromMe: false, id: 'm-burst-3' },
        pushName: 'Franz',
        message: { conversation: 'Cuánto sale con envío?' }
      }
    });

    expect((msg1 as any).status).toBe('queued_in_anti_burst_buffer');
    expect((msg1 as any).bufferedMessages).toBe(1);
    expect((msg2 as any).bufferedMessages).toBe(2);
    expect((msg3 as any).bufferedMessages).toBe(3);
  });

  it('2. [EXCLUIDOS PERMANENTES] No responde jamás a proveedores/familiares excluidos ni los reactiva en Reset All', async () => {
    await conversationsService.addExcludedPhone(orgId, '+5491199998888', 'Proveedor Cloro');
    const isExcl = await conversationsService.isPhoneExcluded(orgId, '5491199998888');
    expect(isExcl).toBe(true);

    const res = await conversationsService.handleIncomingMessage({
      channel: 'whatsapp_qr',
      senderPhone: '+5491199998888',
      senderName: 'Proveedor',
      messageText: 'Te dejé la factura del cloro',
      organizationId: orgId
    });

    // No debe responder con IA
    expect(res.replyMessage).toBe('');
    expect(res.handoffToHuman).toBe(true);

    // Aunque el dueño toque "Reactivar Todos a Modo IA", el proveedor sigue excluido
    await conversationsService.resetAllToAi(orgId);
    const conv = await conversationsService.findByPhone(orgId, '+5491199998888');
    expect((conv?.assignedAgent as any)).toBe('EXCLUDED_PERMANENT');
    expect(conv?.status).toBe(ConversationStatus.HUMAN_TAKEOVER);
  });

  it('3. [PEDIDOS Y VENTAS] Registra, lista y actualiza el estado de pedidos de clientes', async () => {
    const created = await businessService.createSalesOrder(orgId, {
      customerName: 'Franz',
      customerPhone: '+5493547466056',
      itemsSummary: '1x Bomba Autocebante 1HP',
      totalAmount: 85000,
      deliveryMethod: 'Envío a domicilio',
      paymentMethod: 'Transferencia'
    });

    expect(created.id).toBeDefined();
    expect(created.status).toBe('PENDIENTE');

    const orders = await businessService.getSalesOrders(orgId);
    expect(orders.length).toBe(1);
    expect(orders[0].totalAmount).toBe(85000);

    const updated = await businessService.updateSalesOrderStatus(orgId, created.id, 'PAGADO');
    expect(updated.status).toBe('PAGADO');
  });

  it('4. [REENVÍO CONDICIONAL DE COMPROBANTES A GRUPOS] Enruta según monto y producto hablado en el chat', async () => {
    // Caso A: Comprobante de $85.000 cuando el cliente hablaba de una "bomba"
    // Debe coincidir TANTO con "Comprobantes General" COMO con "Ventas Grandes Bombas" (>= $50.000 y palabra "bomba")
    const targetsHighBomba = await aiService.resolveForwardingTargetsForEvent({
      profile: dbProfile,
      eventType: 'RECEIPT',
      senderName: 'Franz',
      senderPhone: '+5493547466056',
      detectedAmount: 85000,
      captionOrMessage: 'Acá te paso el comprobante',
      analysisText: 'Transferencia MercadoPago por $85000',
      recentChatContext: 'Quiero comprar la bomba autocebante de 1HP'
    });

    expect(targetsHighBomba.length).toBe(2);
    expect(targetsHighBomba.map((t) => t.targetGroupOrPhone)).toContain('Comprobantes General');
    expect(targetsHighBomba.map((t) => t.targetGroupOrPhone)).toContain('Ventas Grandes Bombas');

    // Caso B: Comprobante chico de $12.000 por "cloro"
    // Solo debe ir a "Comprobantes General" y NO a "Ventas Grandes Bombas"
    const targetsSmallCloro = await aiService.resolveForwardingTargetsForEvent({
      profile: dbProfile,
      eventType: 'RECEIPT',
      senderName: 'María',
      senderPhone: '+5493512223333',
      detectedAmount: 12000,
      captionOrMessage: 'Pago de cloro',
      analysisText: 'Transferencia por $12000',
      recentChatContext: 'Pote de cloro granulado'
    });

    expect(targetsSmallCloro.length).toBe(1);
    expect(targetsSmallCloro[0].targetGroupOrPhone).toBe('Comprobantes General');
  });

  it('5. [AUTOMATIZACIONES REALES Y COMANDO /RESUMEN] Alterna interruptores en vivo y genera el Resumen Ejecutivo', async () => {
    const listBefore = await automationsService.findAll(orgId);
    expect(listBefore.length).toBe(5);
    expect(listBefore.find((a) => a.id === 'visionReceipts')?.isActive).toBe(true);

    const toggled = await automationsService.toggle(orgId, 'visionReceipts');
    expect(toggled.isActive).toBe(false);

    const summary = await conversationsService.sendOwnerExecutiveSummary(orgId, '+5493510001111');
    expect(summary.sent).toBe(true);
    expect(summary.summaryText).toContain('CrystalPool Mantenimiento & Bombas');
    expect(summary.summaryText).toContain('Chats Activos:');
    expect(summary.summaryText).toContain('Pedidos / Ventas:');
  });

  it('6. [ESCUELA DE TAEKWONDO / CLASES DE PRUEBA] Controla máximo 2 clases de prueba por turno por día y sugiere próximas fechas al llenarse', async () => {
    // 1. Dar de alta el turno/servicio de Clase de Prueba de Taekwondo con máx. 2 alumnos de prueba por turno por día
    await businessService.addService(orgId, {
      name: 'Clase de Prueba Taekwondo',
      category: 'Servicio',
      description: 'Clase inicial obligatoria para nuevos alumnos',
      price: 0,
      durationMinutes: 60,
      maxCapacityPerSlot: 2,
      specificSlots: ['18:00', '19:30'],
      requiresTrialFirst: true
    });

    // 2. Consultar disponibilidad inicial el Miércoles 2026-11-18 -> ambos turnos (18:00 y 19:30) tienen 2 cupos libres
    const initialEval = await aiService.evaluateDayCapacityAndSlots(
      orgId,
      '2026-11-18',
      dbProfile,
      'Clase de Prueba Taekwondo'
    );
    expect(initialEval.maxCapacityPerSlot).toBe(2);
    expect(initialEval.availableSlots).toEqual(['18:00', '19:30']);
    expect(initialEval.fullSlots).toEqual([]);

    // 3. Se agenda el Alumno 1 de prueba en el turno de las 18:00 del 2026-11-18
    await mockApptRepo.save(
      mockApptRepo.create({
        organizationId: orgId,
        customerName: 'Alumno 1',
        customerPhone: '+5491111111111',
        serviceId: 'Clase de Prueba Taekwondo',
        serviceName: 'Clase de Prueba Taekwondo',
        startTime: new Date('2026-11-18T18:00:00Z'),
        endTime: new Date('2026-11-18T19:00:00Z'),
        status: 'CONFIRMED'
      })
    );

    // Con 1 clase de prueba agendada, el turno de las 18:00 TODAVÍA tiene 1 cupo disponible (1/2)
    const afterOneEval = await aiService.evaluateDayCapacityAndSlots(
      orgId,
      '2026-11-18',
      dbProfile,
      'Clase de Prueba Taekwondo'
    );
    expect(afterOneEval.availableSlots).toContain('18:00');
    expect(afterOneEval.slotDetails.find((s) => s.slot === '18:00')?.remaining).toBe(1);
    expect(afterOneEval.fullSlots).toEqual([]);

    // 4. Se agenda el Alumno 2 de prueba en el mismo turno de las 18:00 del 2026-11-18 (llega al tope de 2/2)
    await mockApptRepo.save(
      mockApptRepo.create({
        organizationId: orgId,
        customerName: 'Alumno 2',
        customerPhone: '+5491122222222',
        serviceId: 'Clase de Prueba Taekwondo',
        serviceName: 'Clase de Prueba Taekwondo',
        startTime: new Date('2026-11-18T18:00:00Z'),
        endTime: new Date('2026-11-18T19:00:00Z'),
        status: 'CONFIRMED'
      })
    );

    // 5. Ahora un 3er alumno quiere empezar en el turno de las 18:00 el 2026-11-18:
    // El sistema detecta que el turno de las 18:00 ya tiene 2/2 clases de prueba ese día (COMPLETO)
    const afterTwoEval = await aiService.evaluateDayCapacityAndSlots(
      orgId,
      '2026-11-18',
      dbProfile,
      'Clase de Prueba Taekwondo'
    );
    expect(afterTwoEval.availableSlots).not.toContain('18:00');
    expect(afterTwoEval.availableSlots).toEqual(['19:30']); // El de 19:30 sí sigue libre ese día
    expect(afterTwoEval.fullSlots).toContain('18:00');
    expect(afterTwoEval.slotDetails.find((s) => s.slot === '18:00')?.isFull).toBe(true);

    // 6. Y calcula automáticamente las próximas fechas donde el turno de las 18:00 sí tiene cupos de prueba libres
    const nextDates = await aiService.calculateNextAvailableDatesForService(
      orgId,
      '2026-11-18',
      dbProfile,
      'Clase de Prueba Taekwondo',
      afterTwoEval.fullSlots
    );
    expect(nextDates.byShift['18:00'].length).toBeGreaterThan(0);
    expect(nextDates.byShift['18:00'][0].date).toBe('2026-11-19');
    expect(nextDates.byShift['18:00'][0].remainingSpots).toBe(2);
  });

  it('7. [SEGMENTACIÓN PREVIA DE NÚMEROS] Separa Gente Nueva, Ya se Comunicó y Clientes/Estudiantes Actuales e inyecta su regla de contexto antes de responder', async () => {
    // Configurar reglas de contexto diferenciadas en el perfil
    await businessService.updateProfile(orgId, {
      specialInstructions: JSON.stringify({
        contactSegmentContexts: {
          newContactContext: 'REGLA_NUEVO: Bienvenida + ofrecer clase de prueba inicial.',
          returningContactContext: 'REGLA_RECURRENTE: Ya escribió antes, retomar consulta sin repetir todo.',
          existingCustomerContext: 'REGLA_ALUMNO: Ya es estudiante actual, ayudarlo con cuota mensual o cambio de turno.'
        },
        existingCustomerPhones: ['+5491177776666']
      })
    });

    const spyAiProcess = jest.spyOn(aiService, 'processIncomingMessage');

    // A) Primer mensaje de un número completamente nuevo -> NEW_CONTACT
    const res1: any = await conversationsService.handleIncomingMessage({
      channel: 'whatsapp_qr',
      senderPhone: '+5491155554444',
      senderName: 'Lucas Nuevo',
      messageText: 'Hola, quiero info de clases',
      organizationId: orgId
    });
    expect(res1.contactSegment).toBe('NEW_CONTACT');
    expect(spyAiProcess).toHaveBeenLastCalledWith(
      expect.objectContaining({
        senderPhone: '+5491155554444',
        contactSegment: 'NEW_CONTACT',
        hadPriorUserMessages: false
      })
    );

    // B) Segundo mensaje del mismo número -> ya envió mensajes antes -> RETURNING_CONTACT
    const res2: any = await conversationsService.handleIncomingMessage({
      channel: 'whatsapp_qr',
      senderPhone: '+5491155554444',
      senderName: 'Lucas Nuevo',
      messageText: 'Qué horarios tienen a la tarde?',
      organizationId: orgId
    });
    expect(res2.contactSegment).toBe('RETURNING_CONTACT');
    expect(spyAiProcess).toHaveBeenLastCalledWith(
      expect.objectContaining({
        senderPhone: '+5491155554444',
        contactSegment: 'RETURNING_CONTACT',
        hadPriorUserMessages: true
      })
    );

    // C) Número que ya es estudiante/cliente actual -> EXISTING_CUSTOMER
    const res3: any = await conversationsService.handleIncomingMessage({
      channel: 'whatsapp_qr',
      senderPhone: '+5491177776666',
      senderName: 'Sofía Alumna',
      messageText: 'Hola! Este mes puedo pasarme al turno de las 19:30?',
      organizationId: orgId
    });
    expect(res3.contactSegment).toBe('EXISTING_CUSTOMER');

    // D) Marcar dinámicamente a Lucas como Cliente/Estudiante desde Chats -> pasa a EXISTING_CUSTOMER
    await conversationsService.setCustomerPhoneFlag(orgId, '+5491155554444', true);
    const segmentAfterMark = await aiService.resolveContactSegment({
      organizationId: orgId,
      senderPhone: '+5491155554444',
      hadPriorUserMessages: true
    });
    expect(segmentAfterMark).toBe('EXISTING_CUSTOMER');

    // Verificar también que findAll devuelve la etiqueta contactSegment para la UI
    const convsList: any[] = await conversationsService.findAll(orgId);
    expect(convsList.every((c) => ['NEW_CONTACT', 'RETURNING_CONTACT', 'EXISTING_CUSTOMER'].includes(c.contactSegment))).toBe(true);

    spyAiProcess.mockRestore();
  });
});
