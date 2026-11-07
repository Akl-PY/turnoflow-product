import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
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
import {
  UserRole,
  BusinessVertical,
  LeadStatus,
  LeadIntent,
  LeadPriority,
  AppointmentStatus,
  AgentRoleType,
  AIProviderType
} from '@turnoflow/shared';

const databaseUrl = process.env.DATABASE_URL;
const isPostgres = !!databaseUrl && (databaseUrl.startsWith('postgres') || databaseUrl.startsWith('postgresql'));
const useSsl = isPostgres && (databaseUrl?.includes('supabase') || process.env.DATABASE_SSL === 'true');

export const AppDataSource = new DataSource(
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
        synchronize: true
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
        synchronize: true
      }
);

async function runSeed() {
  console.log('🌱 Iniciando sembrado de datos en TurnoFlow AI...');
  await AppDataSource.initialize();

  const orgRepo = AppDataSource.getRepository(Organization);
  const userRepo = AppDataSource.getRepository(User);
  const profileRepo = AppDataSource.getRepository(BusinessProfile);
  const leadRepo = AppDataSource.getRepository(Lead);
  const appointmentRepo = AppDataSource.getRepository(Appointment);
  const agentRepo = AppDataSource.getRepository(AgentConfigEntity);
  const autoRepo = AppDataSource.getRepository(AutomationEntity);

  // 1. Crear Organización Principal
  let org = await orgRepo.findOne({ where: { slug: 'turnoflow-beauty-studio' } });
  if (!org) {
    org = orgRepo.create({
      name: 'TurnoFlow Beauty Studio',
      slug: 'turnoflow-beauty-studio'
    });
    org = await orgRepo.save(org);
    console.log(`✅ Organización creada: ${org.name}`);
  }

  // 2. Crear Usuario Administrador
  let user = await userRepo.findOne({ where: { email: 'admin@turnoflow.com' } });
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TurnoFlow2026!', salt);

    user = userRepo.create({
      email: 'admin@turnoflow.com',
      passwordHash,
      fullName: 'Administrador TurnoFlow',
      role: UserRole.ADMIN,
      organizationId: org.id
    });
    await userRepo.save(user);
    console.log('✅ Usuario admin creado: admin@turnoflow.com / TurnoFlow2026!');
  }

  // 3. Crear Perfil de Negocio
  let profile = await profileRepo.findOne({ where: { organizationId: org.id } });
  if (!profile) {
    profile = profileRepo.create({
      organizationId: org.id,
      businessName: 'TurnoFlow Beauty Studio',
      description: 'Centro de estética integral especializado en cuidado facial, uñas y tratamientos de pestañas.',
      vertical: BusinessVertical.BEAUTY_SALON,
      location: 'Av. Santa Fe 2450, Piso 3, Recoleta, Buenos Aires',
      contactPhone: '+5491133445566',
      contactEmail: 'contacto@turnoflowstudio.com',
      currency: 'USD',
      cancellationPolicy: 'Cancelaciones con al menos 24 horas de antelación sin cargo. Dentro de las 24 horas se retiene la seña.',
      services: [
        {
          id: 'srv-001',
          name: 'Limpieza Facial Profunda',
          category: 'Facial',
          description: 'Higiene con punta de diamante extracción e hidratación profunda',
          price: 45,
          currency: 'USD',
          durationMinutes: 60,
          isActive: true
        },
        {
          id: 'srv-002',
          name: 'Lifting de Pestañas + Tinte',
          category: 'Mirada',
          description: 'Curvatura natural de pestañas con keratina y tinte negro',
          price: 35,
          currency: 'USD',
          durationMinutes: 50,
          isActive: true
        },
        {
          id: 'srv-003',
          name: 'Perfilado y Laminado de Cejas',
          category: 'Mirada',
          description: 'Diseño según morfología facial fijación y nutrición botox',
          price: 30,
          currency: 'USD',
          durationMinutes: 45,
          isActive: true
        },
        {
          id: 'srv-004',
          name: 'Manicura Rusa con Esmaltado Semipermanente',
          category: 'Uñas',
          description: 'Tratamiento de cutículas torno y esmaltado premium larga duración',
          price: 28,
          currency: 'USD',
          durationMinutes: 60,
          isActive: true
        },
        {
          id: 'srv-005',
          name: 'Depilación Láser Definitiva Diodo - Zona Completa',
          category: 'Depilación',
          description: 'Sesión piernas completas axilas y cavado sistema indoloro',
          price: 85,
          currency: 'USD',
          durationMinutes: 45,
          isActive: true
        }
      ],
      businessHours: [
        { day: 'monday', open: '09:00', close: '19:00', isOpen: true },
        { day: 'tuesday', open: '09:00', close: '19:00', isOpen: true },
        { day: 'wednesday', open: '09:00', close: '19:00', isOpen: true },
        { day: 'thursday', open: '09:00', close: '20:00', isOpen: true },
        { day: 'friday', open: '09:00', close: '20:00', isOpen: true },
        { day: 'saturday', open: '09:00', close: '18:00', isOpen: true },
        { day: 'sunday', open: '00:00', close: '00:00', isOpen: false }
      ],
      faqs: [
        {
          id: 'faq-001',
          question: '¿Cuáles son los medios de pago aceptados?',
          answer: 'Efectivo, tarjetas de débito/crédito Visa y Mastercard, transferencias bancarias y Mercado Pago.'
        },
        {
          id: 'faq-002',
          question: '¿Tienen estacionamiento en la zona?',
          answer: 'Sí, contamos con 50% de descuento en el garaje de Av. Santa Fe 2480 a solo 30 metros.'
        },
        {
          id: 'faq-003',
          question: '¿Se requiere seña previa para agendar turno?',
          answer: 'Para tu primer turno solicitamos una seña del 30% del valor del servicio que se descuenta luego del total.'
        }
      ]
    });
    await profileRepo.save(profile);
    console.log('✅ Perfil comercial y catálogo de servicios sembrado.');
  }

  // 4. Sembrar Leads de Demostración
  const leadsCount = await leadRepo.count({ where: { organizationId: org.id } });
  if (leadsCount === 0) {
    const demoLeads = [
      {
        organizationId: org.id,
        name: 'Camila Gómez',
        phone: '+5491144556677',
        requestedService: 'Limpieza Facial Profunda',
        status: LeadStatus.NEW,
        intent: LeadIntent.HIGH,
        priority: LeadPriority.HOT,
        source: 'whatsapp',
        notes: 'Preguntó disponibilidad para este jueves por la tarde'
      },
      {
        organizationId: org.id,
        name: 'Mariana Rossi',
        phone: '+5491122334455',
        requestedService: 'Lifting de Pestañas + Tinte',
        status: LeadStatus.CONTACTED,
        intent: LeadIntent.MEDIUM,
        priority: LeadPriority.WARM,
        source: 'whatsapp',
        notes: 'Consulta si incluye tinte de pestañas'
      },
      {
        organizationId: org.id,
        name: 'Lucía Fernández',
        phone: '+5491188990011',
        requestedService: 'Manicura Rusa con Esmaltado Semipermanente',
        status: LeadStatus.BOOKED,
        intent: LeadIntent.HIGH,
        priority: LeadPriority.HOT,
        source: 'whatsapp',
        notes: 'Turno confirmado en Google Calendar'
      },
      {
        organizationId: org.id,
        name: 'Sofía Martínez',
        phone: '+5491155667788',
        requestedService: 'Depilación Láser Definitiva Diodo',
        status: LeadStatus.INTERESTED,
        intent: LeadIntent.MEDIUM,
        priority: LeadPriority.WARM,
        source: 'whatsapp',
        notes: 'Preguntó por contraindicaciones en piel sensible'
      }
    ];
    await leadRepo.save(demoLeads.map((l) => leadRepo.create(l)));
    console.log('✅ Leads de muestra insertados.');
  }

  // 5. Sembrar Citas de Demostración
  const aptCount = await appointmentRepo.count({ where: { organizationId: org.id } });
  if (aptCount === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);

    const afterTomorrow = new Date();
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    afterTomorrow.setHours(15, 30, 0, 0);

    const demoApts = [
      {
        organizationId: org.id,
        customerName: 'Lucía Fernández',
        customerPhone: '+5491188990011',
        serviceId: 'srv-004',
        serviceName: 'Manicura Rusa con Esmaltado Semipermanente',
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        status: AppointmentStatus.CONFIRMED,
        notes: 'Esmaltado en tono nude'
      },
      {
        organizationId: org.id,
        customerName: 'Valentina López',
        customerPhone: '+5491166778899',
        serviceId: 'srv-002',
        serviceName: 'Lifting de Pestañas + Tinte',
        startTime: afterTomorrow,
        endTime: new Date(afterTomorrow.getTime() + 50 * 60 * 1000),
        status: AppointmentStatus.CONFIRMED,
        notes: 'Primera vez que asiste'
      }
    ];
    await appointmentRepo.save(demoApts.map((a) => appointmentRepo.create(a)));
    console.log('✅ Citas de muestra insertadas.');
  }

  // 6. Sembrar Agentes
  const agentsCount = await agentRepo.count({ where: { organizationId: org.id } });
  if (agentsCount === 0) {
    const defaultAgents = [
      {
        role: AgentRoleType.RECEPTIONIST,
        name: 'Reception Agent (Atención 24/7)',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.2,
        maxTokens: 1000,
        systemPrompt: 'Recepcionista cálido y profesional enfocado en responder dudas de servicios, precios y guiar a turnos.',
        allowedTools: ['search_knowledge_base', 'get_services', 'get_service_price', 'get_business_hours', 'get_business_location', 'create_lead', 'check_availability', 'handoff_to_human'],
        handoffKeywords: ['humano', 'operador', 'persona', 'queja', 'reclamo']
      },
      {
        role: AgentRoleType.LEAD_INTELLIGENCE,
        name: 'Lead Intelligence Agent',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-haiku-20241022',
        temperature: 0.1,
        maxTokens: 500,
        systemPrompt: 'Clasificador de intención, urgencia y prioridad de compra con salida estructurada JSON.',
        allowedTools: [],
        handoffKeywords: []
      },
      {
        role: AgentRoleType.BOOKING,
        name: 'Booking Agent (Agenda & Citas)',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.1,
        maxTokens: 800,
        systemPrompt: 'Especialista en verificar disponibilidad exacta y confirmar reservas en Google Calendar sin alucinaciones.',
        allowedTools: ['check_available_slots', 'confirm_appointment', 'cancel_appointment'],
        handoffKeywords: []
      },
      {
        role: AgentRoleType.FOLLOW_UP,
        name: 'Follow-Up Agent (Recontacto)',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.2,
        maxTokens: 600,
        systemPrompt: 'Generador de mensajes de reactivación personalizados respetando horario y sin promociones falsas.',
        allowedTools: [],
        handoffKeywords: []
      },
      {
        role: AgentRoleType.SUPERVISOR,
        name: 'Supervisor / Orchestrator',
        isActive: true,
        provider: AIProviderType.ANTHROPIC,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.1,
        maxTokens: 1000,
        systemPrompt: 'Orquestador central, control de acceso de herramientas y guardrails de seguridad.',
        allowedTools: [],
        handoffKeywords: []
      }
    ];
    await agentRepo.save(defaultAgents.map((a) => agentRepo.create({ ...a, organizationId: org.id })));
    console.log('✅ Agentes especializados sembrados.');
  }

  // 7. Sembrar Automatizaciones n8n
  const autoCount = await autoRepo.count({ where: { organizationId: org.id } });
  if (autoCount === 0) {
    const defaultAutos = [
      {
        name: 'Recepción y Respuesta WhatsApp',
        type: 'incoming-messages',
        isActive: true,
        status: 'healthy',
        totalRuns: 142,
        successRuns: 141,
        failedRuns: 1
      },
      {
        name: 'Captura y Clasificación de Leads',
        type: 'lead-management',
        isActive: true,
        status: 'healthy',
        totalRuns: 89,
        successRuns: 89,
        failedRuns: 0
      },
      {
        name: 'Seguimiento Automático de Interesados',
        type: 'follow-up',
        isActive: true,
        status: 'healthy',
        totalRuns: 34,
        successRuns: 33,
        failedRuns: 1
      },
      {
        name: 'Gestión y Confirmación de Reservas',
        type: 'booking',
        isActive: true,
        status: 'healthy',
        totalRuns: 56,
        successRuns: 56,
        failedRuns: 0
      },
      {
        name: 'Transferencia a Atención Humana',
        type: 'handoff',
        isActive: true,
        status: 'healthy',
        totalRuns: 12,
        successRuns: 12,
        failedRuns: 0
      }
    ];
    await autoRepo.save(defaultAutos.map((d) => autoRepo.create({ ...d, organizationId: org.id, lastRunAt: new Date() })));
    console.log('✅ Workflows de automatización sembrados.');
  }

  console.log('🎉 Sembrado completado exitosamente.');
  await AppDataSource.destroy();
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('❌ Error durante el seed:', err);
    process.exit(1);
  });
}
