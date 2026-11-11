import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { Lead } from '../../entities/lead.entity';
import { Appointment } from '../../entities/appointment.entity';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { AgentConfigEntity } from '../../entities/agent-config.entity';
import { ScalinkyService } from '../integrations/scalinky.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { MockAiProvider } from './providers/mock.provider';
import { ReceptionistAgent } from './agents/receptionist.agent';
import { LeadClassifierAgent, LeadClassifierOutput } from './agents/lead-classifier.agent';
import { FollowUpAgent, FollowUpEvaluation } from './agents/follow-up.agent';
import { BookingAgent } from './agents/booking.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import {
  AiProviderInterface,
  ChatMessage,
  CompletionResponse,
  ToolCall
} from './interfaces/ai-provider.interface';
import {
  AgentRoleType,
  AIProviderType,
  ConversationStatus,
  LeadStatus,
  LeadIntent,
  LeadPriority,
  AppointmentStatus,
  ToolExecutionRecord,
  MessageSender
} from '@turnoflow/shared';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  // Caché de Enfriamiento (Circuit Breaker con TTL de 30 minutos)
  private readonly providerCooldowns = new Map<string, { reason: string; blockedUntil: number }>();

  isProviderCoolingDown(providerName: string): boolean {
    const key = providerName.toLowerCase();
    const entry = this.providerCooldowns.get(key);
    if (!entry) return false;
    if (Date.now() > entry.blockedUntil) {
      this.providerCooldowns.delete(key);
      this.logger.log(`[AI CIRCUIT BREAKER] Proveedor ${providerName} ha salido del período de enfriamiento (30 min). Reactivando.`);
      return false;
    }
    return true;
  }

  markProviderCooldown(providerName: string, reason: string, durationMinutes = 30): void {
    const key = providerName.toLowerCase();
    const blockedUntil = Date.now() + durationMinutes * 60 * 1000;
    this.providerCooldowns.set(key, { reason, blockedUntil });
    this.logger.warn(
      `[AI CIRCUIT BREAKER] Proveedor ${providerName} bloqueado en memoria por ${durationMinutes} minutos. Razón: ${reason}. Se omitirá en los próximos mensajes.`
    );
  }

  constructor(
    @InjectRepository(BusinessProfile)
    private readonly businessProfileRepo: Repository<BusinessProfile>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(AgentConfigEntity)
    private readonly agentConfigRepo: Repository<AgentConfigEntity>,
    private readonly anthropicProvider: AnthropicProvider,
    private readonly openAiProvider: OpenAiProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly mockAiProvider: MockAiProvider,
    private readonly receptionistAgent: ReceptionistAgent,
    private readonly leadClassifierAgent: LeadClassifierAgent,
    private readonly followUpAgent: FollowUpAgent,
    private readonly bookingAgent: BookingAgent,
    private readonly supervisorAgent: SupervisorAgent,
    @Optional()
    private readonly scalinkyService?: ScalinkyService,
    @Optional()
    @InjectRepository(Message)
    private readonly messageRepo?: Repository<Message>
  ) {}

  getProvider(providerType?: AIProviderType | string): AiProviderInterface {
    const configured = (providerType || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const hasOpenAiCompatible = !!(
      process.env.OPENAI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY
    );
    const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

    if (configured === 'openai' || configured === 'openrouter' || configured === 'groq') {
      if (this.isProviderCoolingDown('openai')) {
        this.logger.warn('[CIRCUIT BREAKER] OpenAI/Groq en enfriamiento de 30m por cuota. Conmutando a Gemini.');
        if (hasGemini && !this.isProviderCoolingDown('gemini')) return this.geminiProvider;
        return this.mockAiProvider;
      }
      if (!hasOpenAiCompatible) {
        if (hasGemini && !this.isProviderCoolingDown('gemini')) return this.geminiProvider;
        return this.mockAiProvider;
      }
      return this.openAiProvider;
    }

    if (configured === 'gemini') {
      if (this.isProviderCoolingDown('gemini')) {
        this.logger.warn('[CIRCUIT BREAKER] Gemini en enfriamiento de 30m por cuota. Conmutando a OpenAI/Groq/OpenRouter.');
        if (hasOpenAiCompatible && !this.isProviderCoolingDown('openai')) return this.openAiProvider;
        if (hasAnthropic) return this.anthropicProvider;
        return this.mockAiProvider;
      }
      if (!hasGemini) {
        if (hasOpenAiCompatible && !this.isProviderCoolingDown('openai')) return this.openAiProvider;
        return this.mockAiProvider;
      }
      return this.geminiProvider;
    }

    if (configured === 'mock') {
      return this.mockAiProvider;
    }

    if (!hasAnthropic || this.isProviderCoolingDown('anthropic')) {
      if (hasGemini && !this.isProviderCoolingDown('gemini')) return this.geminiProvider;
      if (hasOpenAiCompatible && !this.isProviderCoolingDown('openai')) return this.openAiProvider;
      return this.mockAiProvider;
    }
    return this.anthropicProvider;
  }

  getProviderHealth(): {
    activeProvider: string;
    geminiStatus: 'HEALTHY' | 'COOLDOWN_30M';
    openAiStatus: 'HEALTHY' | 'COOLDOWN_30M';
    hasBackup: boolean;
  } {
    const isGeminiCooling = this.isProviderCoolingDown('gemini');
    const isOpenAiCooling = this.isProviderCoolingDown('openai');
    const hasBackup = !!(
      process.env.OPENAI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY
    );

    return {
      activeProvider: isGeminiCooling
        ? hasBackup
          ? 'openai_groq_backup'
          : 'knowledge_engine'
        : 'gemini_flash',
      geminiStatus: isGeminiCooling ? 'COOLDOWN_30M' : 'HEALTHY',
      openAiStatus: isOpenAiCooling ? 'COOLDOWN_30M' : 'HEALTHY',
      hasBackup
    };
  }

  async transcribeAudioBase64(base64Data: string, mimeType = 'audio/ogg'): Promise<string | null> {
    const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const cleanKey = rawKey.replace(/^['"]|['"]$/g, '').trim();
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '').trim();

    if (!cleanBase64) return null;

    // 1. Intentar con Gemini Multimodal nativo
    if (cleanKey) {
      const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
          const res = await axios.post(
            url,
            {
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: 'Transcribe este mensaje de audio en español de forma literal, exacta y completa. Devuelve ÚNICAMENTE lo que dice la persona en el audio, sin introducciones, sin comentarios y sin comillas.'
                    },
                    {
                      inlineData: {
                        mimeType,
                        data: cleanBase64
                      }
                    }
                  ]
                }
              ]
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 15000
            }
          );

          const candidate = res.data?.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            this.logger.log(`[AUDIO TRANSCRITO CON ${model}]: "${text.trim()}"`);
            return text.trim();
          }
        } catch (err: any) {
          this.logger.warn(`Transcripción con Gemini ${model} falló: ${err?.message}`);
        }
      }
    }

    // 2. Intentar con Groq Whisper si hay clave
    const groqKey = (process.env.GROQ_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    if (groqKey && typeof FormData !== 'undefined') {
      try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        const form = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        form.append('file', blob, 'audio.ogg');
        form.append('model', 'whisper-large-v3-turbo');
        form.append('language', 'es');

        const res = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
          headers: {
            Authorization: `Bearer ${groqKey}`
          },
          timeout: 15000
        });

        if (res.data?.text?.trim()) {
          this.logger.log(`[AUDIO TRANSCRITO CON GROQ WHISPER]: "${res.data.text.trim()}"`);
          return res.data.text.trim();
        }
      } catch (err: any) {
        this.logger.warn(`Transcripción con Groq Whisper falló: ${err?.message}`);
      }
    }

    // 3. Intentar con OpenAI Whisper si hay clave
    const openAiKey = (process.env.OPENAI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    if (openAiKey && typeof FormData !== 'undefined') {
      try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        const form = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        form.append('file', blob, 'audio.ogg');
        form.append('model', 'whisper-1');
        form.append('language', 'es');

        const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
          headers: {
            Authorization: `Bearer ${openAiKey}`
          },
          timeout: 15000
        });

        if (res.data?.text?.trim()) {
          this.logger.log(`[AUDIO TRANSCRITO CON OPENAI WHISPER]: "${res.data.text.trim()}"`);
          return res.data.text.trim();
        }
      } catch (err: any) {
        this.logger.warn(`Transcripción con OpenAI Whisper falló: ${err?.message}`);
      }
    }

    return null;
  }

  async getDefaultProfile(): Promise<BusinessProfile | null> {
    return this.businessProfileRepo.findOne({ where: {} });
  }

  async processIncomingMessage(params: {
    organizationId: string;
    conversationId: string;
    userText: string;
    overrideProvider?: AIProviderType;
    overrideModel?: string;
  }): Promise<{
    replyText: string;
    toolExecutions: ToolExecutionRecord[];
    handoffToHuman: boolean;
    handoffReason?: string;
  }> {
    const { organizationId, conversationId, userText, overrideProvider, overrideModel } = params;

    // 0. Interceptar amablemente mensajes de audio / notas de voz de WhatsApp
    if (
      userText === '[Nota de voz / Audio]' ||
      userText.toLowerCase().trim() === '[nota de voz / audio]'
    ) {
      return {
        replyText:
          '¡Hola! He recibido tu mensaje de audio 🎙️. En este momento el equipo está ocupado atendiendo; para darte respuesta o coordinar tu turno de inmediato, ¿podrías indicarme por texto qué servicio necesitas o para qué fecha buscas turno? ¡Muchas gracias!',
        toolExecutions: [],
        handoffToHuman: false
      };
    }

    // 1. Sanitización con Supervisor
    const securityCheck = this.supervisorAgent.sanitizeInput(userText);
    if (!securityCheck.isSafe) {
      return {
        replyText: 'Lo siento, no puedo procesar ese tipo de instrucciones. ¿En qué servicio o tratamiento te gustaría que te oriente?',
        toolExecutions: [],
        handoffToHuman: false
      };
    }

    // 2. Obtener perfil de negocio
    let profile = await this.businessProfileRepo.findOne({ where: { organizationId } });
    if (!profile) {
      profile = await this.businessProfileRepo.findOne({ where: {} });
      if (!profile) {
        profile = await this.createDefaultProfile(organizationId);
      }
    }

    // 3. Determinar rol activo
    const activeRole = this.supervisorAgent.determineActiveRole(userText);
    const provider = this.getProvider(overrideProvider);

    // 4. Preparar contexto y herramientas según el rol
    const tools =
      activeRole === AgentRoleType.BOOKING
        ? this.bookingAgent.getToolDefinitions()
        : this.receptionistAgent.getToolDefinitions();

    const scalinkySlug = this.extractScalinkySlug(profile);
    let scalinkyInfo = '';

    if (scalinkySlug && this.scalinkyService) {
      try {
        const isHealthy = await this.scalinkyService.isHealthy();
        if (isHealthy) {
          const scServices = await this.scalinkyService.getServices(scalinkySlug);
          if (scServices.length > 0) {
            const scStaff = await this.scalinkyService.getStaff(scalinkySlug);
            const staffListStr = scStaff.map((s) => s.name).join(', ');
            const servListStr = scServices
              .map((s) => `- ${s.name}: $${s.price} (Duración: ${s.duration_minutes} min)`)
              .join('\n');
            scalinkyInfo = `\n\nSISTEMA DE TURNOS Y PRECIOS EN VIVO (Scalinky - Negocio: ${scalinkySlug}):
Profesionales activos: ${staffListStr || 'Staff del salón'}
Servicios y Precios vigentes:
${servListStr}
(IMPORTANTE: Utiliza SIEMPRE estos precios y servicios para responder y cotizar al cliente).`;
          }
        }
      } catch (err: any) {
        this.logger.warn(`No se pudo precargar catálogo Scalinky: ${err.message}`);
      }
    }

    const dayNames: Record<string, string> = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    const hoursList =
      Array.isArray(profile.businessHours) && profile.businessHours.length > 0
        ? profile.businessHours
            .map((h) => `${dayNames[h.day] || h.day}: ${h.isOpen ? `${h.open} a ${h.close} hs` : 'Cerrado'}`)
            .join(' | ')
        : 'Lunes a Viernes de 09:00 a 20:00 hs, Sábados de 09:00 a 18:00 hs (Domingos cerrado)';

    const servicesSummary =
      Array.isArray(profile.services) && profile.services.length > 0
        ? profile.services
            .map((s) => `- ${s.name}: $${s.price} ${s.currency || profile.currency || 'USD'} (${s.durationMinutes || 60} min)`)
            .join('\n')
        : 'Consultar mediante herramienta get_services';

    const now = new Date();
    const timeZone = profile.timezone || 'America/Argentina/Buenos_Aires';
    let dateFormatted = now.toISOString().split('T')[0];
    let timeFormatted = '12:00';
    try {
      dateFormatted = now.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone
      });
      timeFormatted = now.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      });
    } catch {
      // Ignorar si falla formato localizado
    }
    const isoDate = now.toISOString().split('T')[0];

    const systemPrompt = `Eres el Asistente Inteligente de Recepción y Ventas de ${profile.businessName}.
Rubro: ${profile.vertical}.
Ubicación: ${profile.location}.
Horarios de Atención: ${hoursList}.
Zona Horaria: ${timeZone}.
FECHA ACTUAL: ${dateFormatted} (${isoDate}). HORA ACTUAL: ${timeFormatted} hs.
Moneda: ${profile.currency}.
Política de Cancelación: ${profile.cancellationPolicy}.
Servicios del Negocio:
${servicesSummary}
${scalinkyInfo}

REGLAS ESTRICTAS DE CONVERSACIÓN:
1. MANTÉN EL HILO DE LA CONVERSACIÓN: Si el cliente ya mencionó o preguntó por un servicio específico (ej. "puesta a punto", "limpieza general", etc.) en mensajes anteriores, NO le vuelvas a preguntar qué servicio necesita. Usa ese servicio directamente para cotizar o verificar disponibilidad.
2. CÁLCULO DE FECHAS: Cuando el cliente diga "mañana", "hoy", "este viernes", calcula la fecha exacta en base a la FECHA ACTUAL (${isoDate}).
3. NO SALUDES REPETIDAMENTE: Si la conversación ya está en curso (hay mensajes previos en el historial), NO vuelvas a decir "¡Hola!" o "Bienvenido/a". Responde de forma directa, ágil y conversacional como un humano en WhatsApp.
4. CONSULTA DE DISPONIBILIDAD: Para verificar turnos libres, llama SIEMPRE a la herramienta 'check_availability' con la fecha calculada (YYYY-MM-DD) y el nombre del servicio.
5. NO INVENTES: No inventes precios ni servicios que no estén en la lista.
6. ATENCIÓN HUMANA: Si el cliente solicita explícitamente hablar con una persona, recepcionista o dueño, o expresa un reclamo urgente: utiliza SIEMPRE la herramienta handoff_to_human y confírmale de forma amable que ya avisaste al equipo humano y que le responderán a la brevedad.`;

    const historyMessages: ChatMessage[] = [];

    if (this.messageRepo && conversationId) {
      try {
        const dbMessages = await this.messageRepo.find({
          where: { conversationId },
          order: { createdAt: 'DESC' },
          take: 12
        });
        dbMessages.reverse();

        for (const m of dbMessages) {
          if (!m.content || !m.content.trim()) continue;
          // Si el mensaje en base de datos es exactamente el mensaje de usuario que acaba de llegar, omitirlo para no duplicarlo
          if (
            m.sender === MessageSender.USER &&
            m.content.trim() === userText.trim() &&
            m === dbMessages[dbMessages.length - 1]
          ) {
            continue;
          }

          historyMessages.push({
            role: m.sender === MessageSender.USER ? 'user' : 'assistant',
            content: m.content
          });
        }
      } catch (err: any) {
        this.logger.warn(`No se pudo cargar historial de conversación: ${err.message}`);
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: userText }
    ];

    const toolExecutions: ToolExecutionRecord[] = [];
    let handoffToHuman = false;
    let handoffReason: string | undefined;
    let iterations = 0;
    const maxIterations = 5;
    let activeProvider = provider;

    while (iterations < maxIterations) {
      iterations++;
      let response: CompletionResponse;

      try {
        response = await activeProvider.chatCompletion(messages, {
          model: overrideModel,
          tools,
          temperature: 0.2,
          maxTokens: 1000
        });
      } catch (err: any) {
        const errMsg = (err?.message || '').toLowerCase();
        const isQuotaOrLimit =
          errMsg.includes('quota') ||
          errMsg.includes('429') ||
          errMsg.includes('rate') ||
          errMsg.includes('limit') ||
          errMsg.includes('exhausted') ||
          errMsg.includes('no longer available') ||
          errMsg.includes('not found');

        // Si fue error de cuota o rate limit, marcar el proveedor en enfriamiento por 30 minutos (Redis/Memoria)
        if (isQuotaOrLimit) {
          this.markProviderCooldown(activeProvider.providerName, err.message, 30);
        }

        const candidates = [
          this.openAiProvider,
          this.geminiProvider,
          this.anthropicProvider
        ].filter((p) => p !== activeProvider && !this.isProviderCoolingDown(p.providerName));

        let failedOver = false;
        for (const nextProvider of candidates) {
          try {
            this.logger.warn(
              `[AI FAILOVER EN CALIENTE] Conmutando de inmediato a ${nextProvider.providerName} para responder al cliente...`
            );
            response = await nextProvider.chatCompletion(messages, {
              model: overrideModel,
              tools,
              temperature: 0.2,
              maxTokens: 1000
            });
            activeProvider = nextProvider;
            failedOver = true;
            break;
          } catch (nextErr: any) {
            this.logger.warn(`Failover con ${nextProvider.providerName} falló: ${nextErr.message}`);
          }
        }

        if (!failedOver) {
          this.logger.warn(
            `[INTELLIGENT KNOWLEDGE FALLBACK] Modelos de IA no disponibles. Generando respuesta contextual inmediata basada en el catálogo y servicios de ${profile.businessName}.`
          );
          response = this.generateKnowledgeBasedFallback(userText, profile, activeRole);
        }
      }

      if (!response.toolCalls || response.toolCalls.length === 0) {
        // Verificación de grounding de salida
        const knownPrices = (profile.services || []).map((s) => s.price);
        const grounding = this.supervisorAgent.verifyGrounding(response.content, knownPrices);
        if (!grounding.isGrounded) {
          this.logger.warn(`Grounding violation: ${grounding.violation}`);
        }

        let finalContent = (response.content || '').trim();

        // Si la IA ejecutó herramientas pero no devolvió texto final, sintetizar la respuesta
        if (!finalContent && toolExecutions.length > 0) {
          const lastTool = toolExecutions[toolExecutions.length - 1];
          const toolRes = lastTool.result as any;
          if (lastTool.toolName.includes('availability') && toolRes?.availableSlots) {
            const slots = toolRes.availableSlots;
            finalContent = slots.length > 0
              ? `Para el ${toolRes.date || 'día solicitado'} tenemos turnos disponibles a las ${slots.slice(0, 6).join(', ')} hs. ¿Te gustaría reservar alguno de esos horarios?`
              : `Para el ${toolRes.date || 'día solicitado'} no tenemos horarios disponibles. ¿Te gustaría consultar para otro día?`;
          }
        }

        if (!finalContent) {
          finalContent = '¿Deseas que coordinemos un turno o verifiquemos los horarios disponibles?';
        }

        const textLower = finalContent.toLowerCase();
        const humanTransferPatterns = [
          'recepcionista te responderá',
          'persona te responderá',
          'humano te responderá',
          'humana te responderá',
          'asesor se comunicará',
          'equipo se comunicará',
          'comunicará contigo a la brevedad',
          'comunicará con vos a la brevedad',
          'te paso con una persona',
          'te comunico con un asesor',
          'te comunico con una recepcionista'
        ];
        if (!handoffToHuman && humanTransferPatterns.some((pattern) => textLower.includes(pattern))) {
          handoffToHuman = true;
          handoffReason = 'Promesa de atención humana en la respuesta';
          await this.conversationRepo.update(conversationId, {
            status: ConversationStatus.HUMAN_TAKEOVER
          });
        }

        return {
          replyText: finalContent,
          toolExecutions,
          handoffToHuman,
          handoffReason
        };
      }

      // Procesar Tool Calls
      messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls
      });

      for (const tc of response.toolCalls) {
        const result = await this.executeTool(organizationId, tc, profile);
        toolExecutions.push({
          toolName: tc.name,
          arguments: tc.arguments,
          result: result.data,
          success: result.success,
          timestamp: new Date().toISOString()
        });

        if (tc.name === 'handoff_to_human') {
          handoffToHuman = true;
          handoffReason = (tc.arguments.reason as string) || 'Solicitud de operador o caso especial';
          await this.conversationRepo.update(conversationId, {
            status: ConversationStatus.HUMAN_TAKEOVER
          });
        }

        messages.push({
          role: 'tool',
          name: tc.name,
          toolCallId: tc.id,
          content: JSON.stringify(result.data)
        });
      }
    }

    return {
      replyText: 'He tomado nota de tu consulta. ¿Deseas que te reservemos un horario para esta semana?',
      toolExecutions,
      handoffToHuman,
      handoffReason
    };
  }

  private extractScalinkySlug(profile: BusinessProfile): string | null {
    if ((profile as any)?.scalinkySlug) {
      return (profile as any).scalinkySlug;
    }
    if (profile?.specialInstructions) {
      try {
        const parsed = JSON.parse(profile.specialInstructions);
        if (parsed?.scalinkySlug && typeof parsed.scalinkySlug === 'string' && parsed.scalinkySlug.trim()) {
          return parsed.scalinkySlug.trim();
        }
      } catch {
        // No es JSON
      }
    }
    return null;
  }

  private async executeTool(
    organizationId: string,
    toolCall: ToolCall,
    profile: BusinessProfile
  ): Promise<{ success: boolean; data: any }> {
    const { name, arguments: args } = toolCall;

    switch (name) {
      case 'get_services': {
        const category = args.category as string;
        let list: any[] = [];
        const scalinkySlug = this.extractScalinkySlug(profile);

        if (scalinkySlug && this.scalinkyService) {
          try {
            const scServices = await this.scalinkyService.getServices(scalinkySlug);
            if (scServices.length > 0) {
              list = scServices.map((s) => ({
                id: s.service_id,
                name: s.name,
                price: s.price,
                currency: profile.currency || 'USD',
                durationMinutes: s.duration_minutes,
                description: s.description || s.name,
                category: 'General',
                source: 'scalinky'
              }));
            }
          } catch {
            // Silencioso
          }
        }

        if (list.length === 0) {
          list = profile.services || [];
          if (category) {
            list = list.filter((s) => s.category?.toLowerCase() === category.toLowerCase());
          }
        }
        return { success: true, data: list };
      }

      case 'get_service_price': {
        const query = ((args.serviceName as string) || '').toLowerCase();
        const scalinkySlug = this.extractScalinkySlug(profile);

        if (scalinkySlug && this.scalinkyService) {
          try {
            const scServices = await this.scalinkyService.getServices(scalinkySlug);
            const scFound = scServices.find((s) => s.name.toLowerCase().includes(query));
            if (scFound) {
              return {
                success: true,
                data: {
                  name: scFound.name,
                  price: scFound.price,
                  currency: profile.currency || 'USD',
                  durationMinutes: scFound.duration_minutes,
                  description: scFound.description || scFound.name,
                  source: 'scalinky'
                }
              };
            }
          } catch {
            // Silencioso
          }
        }

        const found = (profile.services || []).find((s) =>
          s.name.toLowerCase().includes(query)
        );
        if (found) {
          return {
            success: true,
            data: {
              name: found.name,
              price: found.price,
              currency: found.currency,
              durationMinutes: found.durationMinutes,
              description: found.description,
              source: 'panel'
            }
          };
        }
        return { success: false, data: { error: `Servicio "${args.serviceName}" no encontrado en el catálogo.` } };
      }

      case 'get_business_hours': {
        const hours =
          Array.isArray(profile.businessHours) && profile.businessHours.length > 0
            ? profile.businessHours
            : [
                { day: 'monday', open: '09:00', close: '20:00', isOpen: true },
                { day: 'tuesday', open: '09:00', close: '20:00', isOpen: true },
                { day: 'wednesday', open: '09:00', close: '20:00', isOpen: true },
                { day: 'thursday', open: '09:00', close: '20:00', isOpen: true },
                { day: 'friday', open: '09:00', close: '20:00', isOpen: true },
                { day: 'saturday', open: '09:00', close: '18:00', isOpen: true },
                { day: 'sunday', open: '00:00', close: '00:00', isOpen: false }
              ];
        return { success: true, data: hours };
      }

      case 'get_business_location': {
        return {
          success: true,
          data: {
            location: profile.location,
            mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(profile.location)}`
          }
        };
      }

      case 'search_knowledge_base': {
        const q = ((args.query as string) || '').toLowerCase();
        const faqs = (profile.faqs || []).filter(
          (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
        );
        return {
          success: true,
          data: {
            faqs,
            cancellationPolicy: profile.cancellationPolicy,
            generalInfo: profile.description
          }
        };
      }

      case 'create_lead': {
        const lead = this.leadRepo.create({
          organizationId,
          name: (args.name as string) || 'Cliente',
          phone: (args.phone as string) || '',
          requestedService: args.service as string,
          notes: args.notes as string,
          status: LeadStatus.NEW,
          intent: LeadIntent.HIGH,
          priority: LeadPriority.HOT,
          source: 'whatsapp'
        });
        const saved = await this.leadRepo.save(lead);
        return { success: true, data: { leadId: saved.id, status: 'saved' } };
      }

      case 'check_availability':
      case 'check_available_slots': {
        const date = (args.date as string) || new Date().toISOString().split('T')[0];
        let slots = await this.calculateAvailableSlots(organizationId, date);

        const slug = this.extractScalinkySlug(profile);
        if (slug && this.scalinkyService) {
          try {
            const staffList = await this.scalinkyService.getStaff(slug);
            const serviceList = await this.scalinkyService.getServices(slug);
            if (staffList.length > 0 && serviceList.length > 0) {
              const staffId = staffList[0].staff_id;
              const serviceId = (args.serviceId as string) || serviceList[0].service_id;
              const possibilities = await this.scalinkyService.getPossibilities(slug, staffId, serviceId);
              const dayMatch = possibilities.find((p) => p.date === date);
              if (dayMatch && dayMatch.items.length > 0) {
                const scalinkySlots = dayMatch.items.flatMap((it) => it.slots);
                if (scalinkySlots.length > 0) {
                  slots = scalinkySlots;
                }
              }
            }
          } catch (e: any) {
            this.logger.warn(`Scalinky availability check notice: ${e.message}`);
          }
        }

        return {
          success: true,
          data: {
            date,
            isAvailable: slots.length > 0,
            availableSlots: slots
          }
        };
      }

      case 'confirm_appointment': {
        const startTime = new Date(args.startTime as string);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hora estándar

        let scalinkyBooking: any = null;
        const slug = this.extractScalinkySlug(profile);
        if (slug && this.scalinkyService) {
          try {
            const staffList = await this.scalinkyService.getStaff(slug);
            const serviceList = await this.scalinkyService.getServices(slug);
            if (staffList.length > 0 && serviceList.length > 0) {
              const staffId = staffList[0].staff_id;
              const serviceId = (args.serviceId as string) || serviceList[0].service_id;
              const dateStr = startTime.toISOString().split('T')[0];
              const possibilities = await this.scalinkyService.getPossibilities(slug, staffId, serviceId);
              const dayMatch = possibilities.find((p) => p.date === dateStr);
              const availId = dayMatch?.items[0]?.availability_id;

              if (availId) {
                const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
                const endTimeStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
                scalinkyBooking = await this.scalinkyService.bookAppointment(slug, {
                  service_id: serviceId,
                  availability_id: availId,
                  startAt: timeStr,
                  endAt: endTimeStr,
                  date: dateStr,
                  customerName: args.customerName as string,
                  customerPhone: args.customerPhone as string,
                  status: 'booked'
                });
              }
            }
          } catch (e: any) {
            this.logger.warn(`Scalinky appointment booking notice: ${e.message}`);
          }
        }

        const appointment = this.appointmentRepo.create({
          organizationId,
          customerName: args.customerName as string,
          customerPhone: args.customerPhone as string,
          serviceId: (args.serviceId as string) || 'srv-default',
          serviceName: (args.serviceId as string) || 'Tratamiento Estético',
          startTime,
          endTime,
          status: AppointmentStatus.CONFIRMED,
          notes: args.notes as string
        });
        const saved = await this.appointmentRepo.save(appointment);
        return {
          success: true,
          data: {
            appointmentId: saved.id,
            status: 'CONFIRMED',
            startTime: saved.startTime.toISOString(),
            serviceName: saved.serviceName,
            scalinky: scalinkyBooking
          }
        };
      }

      case 'handoff_to_human': {
        return {
          success: true,
          data: {
            handoffTriggered: true,
            reason: args.reason
          }
        };
      }

      default:
        return { success: false, data: { error: `Herramienta desconocida: ${name}` } };
    }
  }

  async classifyLead(userText: string, providerType?: AIProviderType): Promise<LeadClassifierOutput> {
    const provider = this.getProvider(providerType);
    const messages: ChatMessage[] = [
      { role: 'system', content: this.leadClassifierAgent.getSystemPrompt() },
      { role: 'user', content: userText }
    ];

    const response = await provider.chatCompletion(messages, {
      temperature: 0.1,
      maxTokens: 500
    });

    return this.leadClassifierAgent.parseResult(response.content);
  }

  async evaluateFollowUp(leadContext: string, providerType?: AIProviderType): Promise<FollowUpEvaluation> {
    const provider = this.getProvider(providerType);
    const messages: ChatMessage[] = [
      { role: 'system', content: this.followUpAgent.getSystemPrompt() },
      { role: 'user', content: leadContext }
    ];

    const response = await provider.chatCompletion(messages, {
      temperature: 0.2,
      maxTokens: 500
    });

    return this.followUpAgent.parseResult(response.content);
  }

  private async calculateAvailableSlots(organizationId: string, dateStr: string): Promise<string[]> {
    // Franjas de ejemplo entre 09:00 y 18:00
    const candidateSlots = ['10:00', '11:30', '14:00', '15:30', '17:00'];
    const existing = await this.appointmentRepo.find({
      where: { organizationId, status: AppointmentStatus.CONFIRMED }
    });

    const bookedHours = existing.map((a) => {
      const d = new Date(a.startTime);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    });

    return candidateSlots.filter((slot) => !bookedHours.includes(slot));
  }

  private async createDefaultProfile(organizationId: string): Promise<BusinessProfile> {
    const profile = this.businessProfileRepo.create({
      organizationId,
      businessName: 'TurnoFlow Beauty Studio',
      description: 'Centro de estética integral y cuidado personal',
      location: 'Av. Santa Fe 2450, Piso 3, Recoleta, Buenos Aires',
      contactPhone: '+5491133445566',
      contactEmail: 'contacto@turnoflowstudio.com',
      currency: 'USD',
      cancellationPolicy: 'Cancelaciones con al menos 24 horas de antelación sin cargo.',
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
          description: 'Curvatura natural con keratina y tinte negro',
          price: 35,
          currency: 'USD',
          durationMinutes: 50,
          isActive: true
        },
        {
          id: 'srv-004',
          name: 'Manicura Rusa',
          category: 'Uñas',
          description: 'Tratamiento de cutículas torno y esmaltado premium',
          price: 28,
          currency: 'USD',
          durationMinutes: 60,
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
          question: '¿Qué medios de pago aceptan?',
          answer: 'Efectivo, tarjetas de débito/crédito y transferencias bancarias.'
        },
        {
          id: 'faq-002',
          question: '¿Tienen estacionamiento?',
          answer: 'Sí, contamos con convenio con el estacionamiento de Santa Fe 2480 a 30 metros.'
        }
      ]
    });
    return this.businessProfileRepo.save(profile);
  }

  private generateKnowledgeBasedFallback(
    userText: string,
    profile: BusinessProfile,
    role: AgentRoleType
  ): CompletionResponse {
    const textLower = userText.toLowerCase().trim();
    const services = Array.isArray(profile.services) ? profile.services : [];
    const currency = profile.currency || 'USD';

    // 1. Coincidencia con servicio específico
    const matchedService = services.find(
      (s) =>
        textLower.includes(s.name.toLowerCase()) ||
        s.name
          .toLowerCase()
          .split(' ')
          .some((word) => word.length > 4 && textLower.includes(word))
    );

    if (matchedService) {
      return {
        content: `El servicio de ${matchedService.name} tiene un valor de $${matchedService.price} ${currency} (${matchedService.durationMinutes || 60} min). ${matchedService.description ? matchedService.description + '. ' : ''}¿Te gustaría que verifiquemos disponibilidad para agendar tu turno?`,
        usage: { inputTokens: 0, outputTokens: 0 }
      };
    }

    // 2. Consulta de lista de servicios o precios
    if (
      textLower.includes('precio') ||
      textLower.includes('servicio') ||
      textLower.includes('cuanto') ||
      textLower.includes('cuánto') ||
      textLower.includes('vendes') ||
      textLower.includes('haces') ||
      textLower.includes('ofrecen') ||
      textLower.includes('costo')
    ) {
      const topServices = services
        .slice(0, 6)
        .map((s) => `• ${s.name}: $${s.price} ${currency}`)
        .join('\n');
      return {
        content: `En ${profile.businessName} te ofrecemos los siguientes servicios principales:\n\n${topServices}\n\n¿Te interesa consultar o agendar alguno en particular?`,
        usage: { inputTokens: 0, outputTokens: 0 }
      };
    }

    // 3. Consulta de horarios o ubicación
    if (
      textLower.includes('horario') ||
      textLower.includes('dias') ||
      textLower.includes('días') ||
      textLower.includes('hora') ||
      textLower.includes('donde') ||
      textLower.includes('dónde') ||
      textLower.includes('ubicacion') ||
      textLower.includes('ubicación')
    ) {
      return {
        content: `Estamos disponibles de Lunes a Sábados. ${profile.location ? `Nuestra ubicación es ${profile.location}. ` : ''}¿En qué horario te gustaría coordinar tu atención?`,
        usage: { inputTokens: 0, outputTokens: 0 }
      };
    }

    // 4. Consulta de turnos / disponibilidad
    if (
      textLower.includes('turno') ||
      textLower.includes('agendar') ||
      textLower.includes('cita') ||
      textLower.includes('mañana') ||
      textLower.includes('hoy') ||
      textLower.includes('disponib')
    ) {
      return {
        content: `Con gusto coordinamos tu turno en ${profile.businessName}. ¿Qué servicio necesitas y en qué día y rango de horario prefieres?`,
        usage: { inputTokens: 0, outputTokens: 0 }
      };
    }

    // 5. Saludo o respuesta general
    return {
      content: `¡Hola! Bienvenido/a a ${profile.businessName}. Con gusto te ayudo con información de nuestros servicios, precios y coordinación de turnos. ¿En qué te puedo orientar hoy?`,
      usage: { inputTokens: 0, outputTokens: 0 }
    };
  }
}
