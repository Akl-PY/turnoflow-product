import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  OnModuleInit,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { Lead } from '../../entities/lead.entity';
import { Appointment } from '../../entities/appointment.entity';
import { AgentConfigEntity } from '../../entities/agent-config.entity';
import { AutomationEntity } from '../../entities/automation.entity';
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

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(BusinessProfile)
    private readonly businessProfileRepo: Repository<BusinessProfile>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(AgentConfigEntity)
    private readonly agentRepo: Repository<AgentConfigEntity>,
    @InjectRepository(AutomationEntity)
    private readonly autoRepo: Repository<AutomationEntity>,
    private readonly jwtService: JwtService
  ) {}

  async onModuleInit() {
    try {
      const adminEmail = 'admin@turnoflow.com';
      const existingAdmin = await this.userRepo.findOne({ where: { email: adminEmail } });
      if (!existingAdmin) {
        this.logger.log('🌱 Base de datos sin administrador inicial. Ejecutando auto-seed inicial...');

        let org = await this.orgRepo.findOne({ where: { slug: 'mi-negocio' } });
        if (!org) {
          org = this.orgRepo.create({
            name: 'Mi Negocio',
            slug: 'mi-negocio'
          });
          org = await this.orgRepo.save(org);
        }

        const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'TurnoFlow2026!';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(initialPassword, salt);

        const adminUser = this.userRepo.create({
          email: adminEmail,
          passwordHash,
          fullName: 'Administrador TurnoFlow',
          role: UserRole.ADMIN,
          organizationId: org.id
        });
        await this.userRepo.save(adminUser);

        await this.provisionOrganizationResources(org.id, 'Mi Negocio', false);
        this.logger.log(`✅ Auto-seed completado: ${adminEmail} (${org.name})`);
      } else {
        // Asegurar que la organización del admin tenga su perfil, agentes y automatizaciones sembradas
        await this.provisionOrganizationResources(
          existingAdmin.organizationId,
          'Mi Negocio',
          false
        );
      }
    } catch (error) {
      this.logger.warn(`Auto-seed omitido o pendiente de conexión: ${(error as Error).message}`);
    }
  }

  async provisionOrganizationResources(
    organizationId: string,
    businessName: string,
    includeDemoData = false
  ) {
    // 1. Perfil de Negocio limpio y universal (sin datos demo hardcodeados)
    let profile = await this.businessProfileRepo.findOne({ where: { organizationId } });
    if (!profile) {
      profile = this.businessProfileRepo.create({
        organizationId,
        businessName: businessName || 'Mi Negocio',
        description: 'Atención al cliente, ventas y gestión de turnos',
        vertical: BusinessVertical.OTHER,
        location: 'Dirección a configurar',
        timezone: 'America/Argentina/Buenos_Aires',
        contactPhone: '',
        contactEmail: '',
        currency: 'USD',
        cancellationPolicy: 'Consultar políticas comerciales del negocio.',
        services: [],
        businessHours: [
          { day: 'monday', open: '09:00', close: '19:00', isOpen: true },
          { day: 'tuesday', open: '09:00', close: '19:00', isOpen: true },
          { day: 'wednesday', open: '09:00', close: '19:00', isOpen: true },
          { day: 'thursday', open: '09:00', close: '20:00', isOpen: true },
          { day: 'friday', open: '09:00', close: '20:00', isOpen: true },
          { day: 'saturday', open: '09:00', close: '18:00', isOpen: true },
          { day: 'sunday', open: '00:00', close: '00:00', isOpen: false }
        ],
        faqs: []
      });
      await this.businessProfileRepo.save(profile);
    }

    // 2. Los 5 Agentes Especializados
    const agentsCount = await this.agentRepo.count({ where: { organizationId } });
    if (agentsCount === 0) {
      const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
      const defaultProvider = hasGemini ? AIProviderType.GEMINI : AIProviderType.ANTHROPIC;
      const defaultModel = hasGemini ? 'gemini-2.5-flash' : 'claude-3-5-sonnet-20241022';

      const defaultAgents = [
        {
          role: AgentRoleType.RECEPTIONIST,
          name: 'Reception Agent (Atención 24/7)',
          isActive: true,
          provider: defaultProvider,
          model: defaultModel,
          temperature: 0.2,
          maxTokens: 1000,
          systemPrompt:
            'Recepcionista cálido y profesional enfocado en responder dudas de servicios, precios y guiar a turnos.',
          allowedTools: [
            'search_knowledge_base',
            'get_services',
            'get_service_price',
            'get_business_hours',
            'get_business_location',
            'create_lead',
            'check_availability',
            'handoff_to_human'
          ],
          handoffKeywords: ['humano', 'operador', 'persona', 'queja', 'reclamo']
        },
        {
          role: AgentRoleType.LEAD_INTELLIGENCE,
          name: 'Lead Intelligence Agent',
          isActive: true,
          provider: defaultProvider,
          model: hasGemini ? 'gemini-2.5-flash' : 'claude-3-5-haiku-20241022',
          temperature: 0.1,
          maxTokens: 500,
          systemPrompt:
            'Clasificador de intención, urgencia y prioridad de compra con salida estructurada JSON.',
          allowedTools: [],
          handoffKeywords: []
        },
        {
          role: AgentRoleType.BOOKING,
          name: 'Booking Agent (Agenda & Citas)',
          isActive: true,
          provider: defaultProvider,
          model: defaultModel,
          temperature: 0.1,
          maxTokens: 800,
          systemPrompt:
            'Especialista en verificar disponibilidad exacta y confirmar reservas en Google Calendar sin alucinaciones.',
          allowedTools: ['check_available_slots', 'confirm_appointment', 'cancel_appointment'],
          handoffKeywords: []
        },
        {
          role: AgentRoleType.FOLLOW_UP,
          name: 'Follow-Up Agent (Recontacto)',
          isActive: true,
          provider: defaultProvider,
          model: defaultModel,
          temperature: 0.2,
          maxTokens: 600,
          systemPrompt:
            'Generador de mensajes de reactivación personalizados respetando horario y sin promociones falsas.',
          allowedTools: [],
          handoffKeywords: []
        },
        {
          role: AgentRoleType.SUPERVISOR,
          name: 'Supervisor / Orchestrator',
          isActive: true,
          provider: defaultProvider,
          model: defaultModel,
          temperature: 0.1,
          maxTokens: 1000,
          systemPrompt:
            'Orquestador central, control de acceso de herramientas y guardrails de seguridad.',
          allowedTools: [],
          handoffKeywords: []
        }
      ];
      await this.agentRepo.save(
        defaultAgents.map((a) => this.agentRepo.create({ ...a, organizationId }))
      );
    }

    // 3. Los 5 Workflows de Automatización n8n
    const autoCount = await this.autoRepo.count({ where: { organizationId } });
    if (autoCount === 0) {
      const defaultAutos = [
        {
          name: 'Recepción y Respuesta WhatsApp',
          type: 'incoming-messages',
          isActive: true,
          status: 'healthy',
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0
        },
        {
          name: 'Captura y Clasificación de Leads',
          type: 'lead-management',
          isActive: true,
          status: 'healthy',
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0
        },
        {
          name: 'Seguimiento Automático de Interesados',
          type: 'follow-up',
          isActive: true,
          status: 'healthy',
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0
        },
        {
          name: 'Gestión y Confirmación de Reservas',
          type: 'booking',
          isActive: true,
          status: 'healthy',
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0
        },
        {
          name: 'Transferencia a Atención Humana',
          type: 'handoff',
          isActive: true,
          status: 'healthy',
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0
        }
      ];
      await this.autoRepo.save(
        defaultAutos.map((d) =>
          this.autoRepo.create({ ...d, organizationId, lastRunAt: new Date() })
        )
      );
    }

    // 4. Leads y Citas de ejemplo si se solicita
    if (includeDemoData) {
      const leadsCount = await this.leadRepo.count({ where: { organizationId } });
      if (leadsCount === 0) {
        const demoLeads = [
          {
            organizationId,
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
            organizationId,
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
            organizationId,
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
            organizationId,
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
        await this.leadRepo.save(demoLeads.map((l) => this.leadRepo.create(l)));
      }

      const aptCount = await this.appointmentRepo.count({ where: { organizationId } });
      if (aptCount === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(11, 0, 0, 0);

        const afterTomorrow = new Date();
        afterTomorrow.setDate(afterTomorrow.getDate() + 2);
        afterTomorrow.setHours(15, 30, 0, 0);

        const demoApts = [
          {
            organizationId,
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
            organizationId,
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
        await this.appointmentRepo.save(demoApts.map((a) => this.appointmentRepo.create(a)));
      }
    }
  }

  async register(params: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
  }) {
    const cleanEmail = params.email.toLowerCase().trim();
    const existing = await this.userRepo.findOne({ where: { email: cleanEmail } });
    if (existing) {
      throw new BadRequestException('El correo electrónico ya está registrado.');
    }

    // 1. Crear Organización
    const slug =
      params.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-') +
      '-' +
      Math.random().toString(36).substring(2, 6);

    const org = this.orgRepo.create({
      name: params.businessName,
      slug
    });
    const savedOrg = await this.orgRepo.save(org);

    // 2. Crear Usuario Administrador
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);

    const user = this.userRepo.create({
      email: cleanEmail,
      passwordHash,
      fullName: params.fullName,
      role: UserRole.ADMIN,
      organizationId: savedOrg.id
    });
    const savedUser = await this.userRepo.save(user);

    // 3. Aprovisionar Perfil de Negocio, 5 Agentes, 5 Automatizaciones y Datos Iniciales
    await this.provisionOrganizationResources(savedOrg.id, params.businessName, true);

    const token = this.generateToken(savedUser, savedOrg.name);
    return {
      accessToken: token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.fullName,
        role: savedUser.role,
        organizationId: savedOrg.id,
        organizationName: savedOrg.name
      }
    };
  }

  async provisionBuyerAccount(params: {
    email: string;
    fullName: string;
    businessName?: string;
    initialPassword?: string;
  }) {
    const cleanEmail = params.email.toLowerCase().trim();
    const temporaryPassword =
      params.initialPassword || process.env.ADMIN_INITIAL_PASSWORD || 'TurnoFlow2026!';
    const dashboardUrl =
      process.env.CLIENT_DASHBOARD_URL ||
      'https://turnoflow-product-clientturnoflow-p.vercel.app/login';

    const existing = await this.userRepo.findOne({
      where: { email: cleanEmail },
      relations: ['organization']
    });

    if (existing) {
      return {
        email: existing.email,
        temporaryPassword,
        dashboardUrl,
        organizationId: existing.organizationId,
        organizationName: existing.organization?.name || 'Mi Salón'
      };
    }

    const businessTitle = params.businessName?.trim() || `Salón de ${params.fullName.trim()}`;
    await this.register({
      email: cleanEmail,
      password: temporaryPassword,
      fullName: params.fullName.trim(),
      businessName: businessTitle
    });

    return {
      email: cleanEmail,
      temporaryPassword,
      dashboardUrl,
      organizationName: businessTitle
    };
  }

  async login(email: string, password: string) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.organization', 'org')
      .where('LOWER(user.email) = :email', { email: cleanEmail })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const organizationName = user.organization?.name || 'TurnoFlow Beauty Studio';
    const token = this.generateToken(user, organizationName);
    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName
      }
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['organization']
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization?.name || 'TurnoFlow Beauty Studio'
    };
  }

  private generateToken(user: User, organizationName?: string): string {
    const payload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: organizationName || 'TurnoFlow Beauty Studio'
    };
    return this.jwtService.sign(payload);
  }
}
