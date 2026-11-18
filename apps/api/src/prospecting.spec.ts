import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProspectingService } from './modules/prospecting/prospecting.service';
import { ProspectingFlowEntity } from './entities/prospecting-flow.entity';
import { Lead } from './entities/lead.entity';
import {
  FlowTriggerType,
  FlowStepAction,
  LeadStatus,
  LeadIntent,
  LeadPriority
} from '@turnoflow/shared';

describe('ProspectingService — Embudos y Flujos Guiados', () => {
  let service: ProspectingService;
  let flowRepo: jest.Mocked<Repository<ProspectingFlowEntity>>;
  let leadRepo: jest.Mocked<Repository<Lead>>;

  const mockOrgId = 'org-estetica-123';
  const otherOrgId = 'org-barberia-456';

  const mockFlow: ProspectingFlowEntity = {
    id: 'flow-laser-1',
    organizationId: mockOrgId,
    name: 'Embudo de Prospección Láser',
    description: 'Guía al cliente paso a paso desde consulta de precios hasta reserva',
    isActive: true,
    triggerType: FlowTriggerType.KEYWORD,
    triggerKeywords: ['precio', 'depilacion', 'laser', 'costo'],
    steps: [
      {
        id: 'step-1',
        name: 'Paso 1: Saludo y opciones',
        botResponse: '¡Hola! Qué gusto saludarte. Tenemos 2 tratamientos principales: 1) Depilación Láser Soprano, 2) Limpieza Facial Profunda. ¿Cuál te interesa?',
        action: FlowStepAction.NONE,
        branches: [
          {
            id: 'branch-laser',
            label: 'Opción 1: Láser',
            keywords: ['1', 'laser', 'depilacion', 'soprano'],
            nextStepId: 'step-2-laser'
          },
          {
            id: 'branch-facial',
            label: 'Opción 2: Facial',
            keywords: ['2', 'facial', 'limpieza'],
            nextStepId: 'step-2-facial'
          }
        ],
        fallbackResponse: 'Por favor indicame si te interesa 1 para Láser o 2 para Limpieza Facial.',
        isFinalStep: false
      },
      {
        id: 'step-2-laser',
        name: 'Paso 2 Láser: Elección de zona',
        botResponse: '¡Excelente! Nuestro láser es 100% indoloro. ¿En qué zona estás buscando: Axilas o Piernas?',
        action: FlowStepAction.SET_LEAD_INTEREST,
        actionPayload: {
          serviceName: 'Depilación Láser Soprano',
          leadStatus: LeadStatus.INTERESTED
        },
        branches: [
          {
            id: 'branch-axilas',
            label: 'Zona Axilas',
            keywords: ['axilas', 'axila'],
            nextStepId: 'step-3-axilas'
          }
        ],
        isFinalStep: false
      },
      {
        id: 'step-3-axilas',
        name: 'Paso 3: Oferta y Cierre',
        botResponse: '¡Genial! Axilas tiene una promo 2x1 a solo $15.000. ¿Te gustaría reservar tu sesión para este viernes o sábado?',
        action: FlowStepAction.SET_LEAD_STATUS,
        actionPayload: {
          leadStatus: LeadStatus.BOOKED,
          notes: 'Interesado en promo 2x1 axilas'
        },
        branches: [],
        isFinalStep: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: null as any
  };

  beforeEach(async () => {
    const flowsDatabase: ProspectingFlowEntity[] = [{ ...mockFlow }];
    const leadsDatabase: Lead[] = [
      {
        id: 'lead-1',
        organizationId: mockOrgId,
        name: 'Mariana Gomez',
        phone: '5491199998888',
        status: LeadStatus.NEW,
        intent: LeadIntent.HIGH,
        priority: LeadPriority.HOT,
        source: 'whatsapp',
        lastInteractionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: ''
      } as Lead
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectingService,
        {
          provide: getRepositoryToken(ProspectingFlowEntity),
          useValue: {
            find: jest.fn().mockImplementation(async ({ where }) => {
              return flowsDatabase.filter((f) => {
                let match = true;
                if (where.organizationId && f.organizationId !== where.organizationId) match = false;
                if (where.isActive !== undefined && f.isActive !== where.isActive) match = false;
                return match;
              });
            }),
            findOne: jest.fn().mockImplementation(async ({ where }) => {
              return flowsDatabase.find((f) => {
                let match = true;
                if (where.id && f.id !== where.id) match = false;
                if (where.organizationId && f.organizationId !== where.organizationId) match = false;
                if (where.isActive !== undefined && f.isActive !== where.isActive) match = false;
                return match;
              }) || null;
            }),
            create: jest.fn().mockImplementation((dto) => ({ id: 'new-flow-id', ...dto })),
            save: jest.fn().mockImplementation(async (entity) => entity),
            remove: jest.fn().mockImplementation(async (entity) => entity)
          }
        },
        {
          provide: getRepositoryToken(Lead),
          useValue: {
            findOne: jest.fn().mockImplementation(async ({ where }) => {
              return leadsDatabase.find(
                (l) => l.organizationId === where.organizationId && l.phone === where.phone
              ) || null;
            }),
            save: jest.fn().mockImplementation(async (entity) => entity)
          }
        }
      ]
    }).compile();

    service = module.get<ProspectingService>(ProspectingService);
    flowRepo = module.get(getRepositoryToken(ProspectingFlowEntity));
    leadRepo = module.get(getRepositoryToken(Lead));
  });

  describe('Disparadores Iniciales (Triggers)', () => {
    it('debe iniciar el embudo al detectar palabras clave iniciales ("precio")', async () => {
      const result = await service.evaluateMessage({
        organizationId: mockOrgId,
        userText: 'Hola, ¿qué precio tienen los tratamientos?',
        leadPhone: '5491199998888',
        isNewContact: false
      });

      expect(result.matched).toBe(true);
      expect(result.flowId).toBe('flow-laser-1');
      expect(result.stepId).toBe('step-1');
      expect(result.replyMessage).toContain('Láser Soprano');
      expect(result.isFinalStep).toBe(false);
    });

    it('no debe disparar el embudo de otra organización (Aislamiento Multi-tenancy)', async () => {
      const result = await service.evaluateMessage({
        organizationId: otherOrgId,
        userText: 'Hola, ¿qué precio tienen los tratamientos?',
        leadPhone: '5491199998888',
        isNewContact: false
      });

      expect(result.matched).toBe(false);
    });
  });

  describe('Seguidilla de Mensajes (Conversational Branching)', () => {
    it('debe avanzar al Paso 2 cuando el usuario responde a la opción 1 (Láser)', async () => {
      // Simular que la conversación ya está en step-1
      const result = await service.evaluateMessage({
        organizationId: mockOrgId,
        userText: 'Me interesa la opción 1, depilacion laser',
        conversationMetadata: {
          activeFlowId: 'flow-laser-1',
          currentStepId: 'step-1'
        },
        leadPhone: '5491199998888'
      });

      expect(result.matched).toBe(true);
      expect(result.stepId).toBe('step-2-laser');
      expect(result.replyMessage).toContain('Axilas o Piernas');
      expect(result.action).toBe(FlowStepAction.SET_LEAD_INTEREST);
      expect(result.actionPayload?.serviceName).toBe('Depilación Láser Soprano');

      // Verificar que actualizó el Lead
      expect(leadRepo.save).toHaveBeenCalled();
    });

    it('debe avanzar al Paso 3 (Cierre de Venta) cuando responde "axilas"', async () => {
      // Simular que está en step-2-laser
      const result = await service.evaluateMessage({
        organizationId: mockOrgId,
        userText: 'Quisiera hacerme en axilas',
        conversationMetadata: {
          activeFlowId: 'flow-laser-1',
          currentStepId: 'step-2-laser'
        },
        leadPhone: '5491199998888'
      });

      expect(result.matched).toBe(true);
      expect(result.stepId).toBe('step-3-axilas');
      expect(result.replyMessage).toContain('promo 2x1 a solo $15.000');
      expect(result.isFinalStep).toBe(true);
      expect(result.action).toBe(FlowStepAction.SET_LEAD_STATUS);
    });

    it('debe responder con fallbackResponse si el usuario escribe algo no contemplado en el paso', async () => {
      const result = await service.evaluateMessage({
        organizationId: mockOrgId,
        userText: '¿Venden comida para gatos?',
        conversationMetadata: {
          activeFlowId: 'flow-laser-1',
          currentStepId: 'step-1'
        },
        leadPhone: '5491199998888'
      });

      expect(result.matched).toBe(true);
      expect(result.stepId).toBe('step-1'); // Permanece en el mismo paso
      expect(result.replyMessage).toBe('Por favor indicame si te interesa 1 para Láser o 2 para Limpieza Facial.');
    });
  });

  describe('CRUD de Embudos', () => {
    it('debe permitir crear un nuevo embudo', async () => {
      const newFlow = await service.create(mockOrgId, {
        name: 'Embudo Uñas',
        triggerKeywords: ['uñas', 'semipermanente'],
        steps: [
          {
            id: 'u-1',
            name: 'Paso 1',
            botResponse: '¿Buscás manicuría tradicional o esculpidas?',
            branches: []
          }
        ]
      });

      expect(newFlow.name).toBe('Embudo Uñas');
      expect(flowRepo.save).toHaveBeenCalled();
    });

    it('debe alternar el estado activo/pausado del embudo', async () => {
      const toggled = await service.toggleActive(mockOrgId, 'flow-laser-1');
      expect(toggled.isActive).toBe(false);
    });
  });
});
