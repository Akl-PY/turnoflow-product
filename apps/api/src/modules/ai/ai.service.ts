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
import { ScalinkyService, ScalinkyCachedSnapshot } from '../integrations/scalinky.service';
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

  async analyzeImageBase64(
    base64Data: string,
    mimeType = 'image/jpeg',
    caption = '',
    businessName = 'nuestro negocio'
  ): Promise<{
    analysisText: string;
    isPaymentReceipt: boolean;
    detectedAmount: number;
    receiptSummary?: string;
  } | null> {
    const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const cleanKey = rawKey.replace(/^['"]|['"]$/g, '').trim();
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '').trim();

    if (!cleanBase64 || !cleanKey) return null;

    const promptText = `Analiza esta imagen enviada por un cliente por WhatsApp a "${businessName}".${
      caption ? ` El cliente acompañó la imagen con el mensaje: "${caption}".` : ''
    }
Determina primero si es un COMPROBANTE DE PAGO / TRANSFERENCIA BANCARIA.
- Si ES un comprobante de pago o transferencia:
  1) Comienza tu respuesta EXACTAMENTE con "[COMPROBANTE][MONTO:XXXX]" donde XXXX es el monto numérico sin puntos de miles (ej. [COMPROBANTE][MONTO:50000]). Si no se distingue el monto, pon [COMPROBANTE][MONTO:0].
  2) A continuación detalla: Monto, Fecha/Hora, Emisor, Destinatario, Banco/Billetera, Motivo/Concepto y Número de operación.
- Si NO es un comprobante (por ejemplo: foto de un producto que busca comprar, un equipo o instalación rota, una consulta técnica o visual), responde comenzando con "[CONSULTA_VISUAL]" y describe con precisión qué se observa en la imagen para que el asistente comercial pueda asesorar al cliente.`;

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
                  { text: promptText },
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
            timeout: 18000
          }
        );

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          const isReceipt = text.startsWith('[COMPROBANTE]') || text.toLowerCase().includes('comprobante de');
          let detectedAmount = 0;
          const montoTagMatch = text.match(/\[MONTO:\s*([\d.,]+)\]/i);
          if (montoTagMatch?.[1]) {
            const normalizedNum = montoTagMatch[1].replace(/,/g, '.');
            detectedAmount = parseFloat(normalizedNum) || 0;
          } else if (isReceipt) {
            const fallbackMoney = text.match(/\$\s*([\d.]+)/);
            if (fallbackMoney?.[1]) {
              detectedAmount = parseFloat(fallbackMoney[1].replace(/\./g, '')) || 0;
            }
          }

          const cleanAnalysis = text
            .replace(/^\[COMPROBANTE\]\s*/i, '')
            .replace(/\[MONTO:\s*[\d.,]+\]\s*/i, '')
            .replace(/^\[CONSULTA_VISUAL\]\s*/i, '')
            .trim();
          this.logger.log(
            `[IMAGEN ANALIZADA CON ${model}] Comprobante=${isReceipt} Monto=${detectedAmount}: "${cleanAnalysis.substring(0, 120)}"`
          );
          return {
            analysisText: cleanAnalysis,
            isPaymentReceipt: isReceipt,
            detectedAmount,
            receiptSummary: isReceipt ? cleanAnalysis : undefined
          };
        }
      } catch (err: any) {
        this.logger.warn(`Análisis de imagen con Gemini ${model} falló: ${err?.message}`);
      }
    }

    return null;
  }

  /**
   * Evalúa tanto las Reglas Visuales de Reenvío (`forwardingRules`) como las
   * Instrucciones Personalizadas en Lenguaje Natural (`customForwardingInstructions`)
   * para decidir a qué grupo(s) de WhatsApp o número(s) se debe reenviar un comprobante o aviso.
   */
  async resolveForwardingTargetsForEvent(params: {
    profile: BusinessProfile;
    eventType: 'RECEIPT' | 'ORDER' | 'MESSAGE';
    senderName: string;
    senderPhone: string;
    detectedAmount?: number;
    captionOrMessage?: string;
    analysisText?: string;
    recentChatContext?: string;
    availableGroups?: Array<{ id: string; subject: string }>;
  }): Promise<Array<{ targetGroupOrPhone: string; ruleLabel: string; includeImage: boolean }>> {
    const customSettings = this.extractCustomAiSettings(params.profile);
    const rules = Array.isArray(customSettings.forwardingRules) ? customSettings.forwardingRules : [];
    const nlInstructions = (customSettings.customForwardingInstructions || '').trim();

    const matchedTargets = new Map<
      string,
      { targetGroupOrPhone: string; ruleLabel: string; includeImage: boolean }
    >();

    const amount = Number(params.detectedAmount) || 0;
    const combinedContext = `${params.captionOrMessage || ''} ${params.analysisText || ''} ${
      params.recentChatContext || ''
    }`.toLowerCase();

    // 1. Evaluar Reglas Estructuradas configuradas en el panel
    for (const rule of rules) {
      if (rule.isActive === false || !rule.targetGroupOrPhone) continue;
      const target = String(rule.targetGroupOrPhone).trim();
      if (!target) continue;

      const trigger = rule.triggerType || 'ALL_RECEIPTS';
      if (params.eventType === 'RECEIPT' && !['ALL_RECEIPTS', 'RECEIPT_CONDITION'].includes(trigger)) {
        continue;
      }
      if (params.eventType === 'ORDER' && trigger !== 'NEW_ORDER') {
        continue;
      }

      // Verificar condición de monto mínimo
      if (rule.minAmount && Number(rule.minAmount) > 0) {
        if (amount < Number(rule.minAmount)) {
          continue;
        }
      }

      // Verificar condición de monto máximo
      if (rule.maxAmount && Number(rule.maxAmount) > 0) {
        if (amount > Number(rule.maxAmount)) {
          continue;
        }
      }

      // Verificar condición de palabra clave / producto / concepto (ej. "bomba", "mantenimiento", "seña")
      if (rule.keyword && String(rule.keyword).trim()) {
        const keywords = String(rule.keyword)
          .toLowerCase()
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);
        const matchesKeyword = keywords.some((kw) => combinedContext.includes(kw));
        if (!matchesKeyword) {
          continue;
        }
      }

      matchedTargets.set(target.toLowerCase(), {
        targetGroupOrPhone: target,
        ruleLabel: rule.name || (trigger === 'ALL_RECEIPTS' ? 'Todos los Comprobantes' : 'Regla Personalizada'),
        includeImage: rule.includeImage !== false
      });
    }

    // 2. Evaluar Instrucciones Personalizadas en Lenguaje Natural (`customForwardingInstructions`)
    if (nlInstructions) {
      const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
      const cleanKey = rawKey.replace(/^['"]|['"]$/g, '').trim();
      const groupsStr =
        params.availableGroups && params.availableGroups.length > 0
          ? params.availableGroups.map((g) => `"${g.subject}" (ID: ${g.id})`).join(', ')
          : 'Usa el nombre del grupo o número mencionado en las instrucciones';

      if (cleanKey && !this.isProviderCoolingDown('gemini')) {
        try {
          const evalPrompt = `Eres un motor de enrutamiento de WhatsApp.
INSTRUCCIONES DEL USUARIO:
"""
${nlInstructions}
"""

GRUPOS DE WHATSAPP DISPONIBLES EN LA CUENTA:
${groupsStr}

EVENTO ACTUAL:
- Tipo: ${params.eventType === 'RECEIPT' ? 'COMPROBANTE DE PAGO RECIBIDO' : params.eventType}
- Contacto que lo envió: ${params.senderName} (+${params.senderPhone.replace(/\D/g, '')})
- Monto detectado: $${amount}
- Detalle del comprobante / mensaje: ${params.analysisText || params.captionOrMessage || ''}
- Contexto previo de la conversación (qué producto o servicio hablaba): ${params.recentChatContext || 'Sin contexto previo'}

Según las INSTRUCCIONES DEL USUARIO, ¿a qué grupos o números se debe reenviar este evento ahora mismo?
Responde ÚNICAMENTE con un JSON válido con el formato:
[{"target": "nombre del grupo o ID @g.us o teléfono", "label": "motivo de la regla aplicada"}]
Si ninguna regla aplica, devuelve [].`;

          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
          const res = await axios.post(
            url,
            {
              contents: [{ role: 'user', parts: [{ text: evalPrompt }] }]
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
          );

          const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = rawText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsedList = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsedList)) {
              for (const item of parsedList) {
                if (item?.target && String(item.target).trim()) {
                  const t = String(item.target).trim();
                  if (!matchedTargets.has(t.toLowerCase())) {
                    matchedTargets.set(t.toLowerCase(), {
                      targetGroupOrPhone: t,
                      ruleLabel: item.label || 'Instrucción Personalizada',
                      includeImage: true
                    });
                  }
                }
              }
            }
          }
        } catch (err: any) {
          this.logger.warn(`Evaluación IA de instrucciones de reenvío omitida: ${err.message}`);
        }
      }
    }

    return Array.from(matchedTargets.values());
  }

  private extractCustomAiSettings(profile: BusinessProfile): {
    businessMode: 'HYBRID' | 'SALES' | 'BOOKING' | 'INFO';
    assistantName: string;
    assistantTone: string;
    customContext: string;
    paymentInfo: string;
    shippingOrDeliveryInfo: string;
    customForwardingInstructions: string;
    forwardingRules: any[];
    contactSegmentContexts: {
      newContactContext: string;
      returningContactContext: string;
      existingCustomerContext: string;
    };
    existingCustomerPhones: string[];
    salesOrders: any[];
  } {
    const defaults = {
      businessMode: 'HYBRID' as const,
      assistantName: `Asistente de ${profile.businessName}`,
      assistantTone: 'Cercano, amable, resolutivo y profesional (voseo natural)',
      customContext: '',
      paymentInfo: '',
      shippingOrDeliveryInfo: '',
      customForwardingInstructions: '',
      forwardingRules: [] as any[],
      contactSegmentContexts: {
        newContactContext: '',
        returningContactContext: '',
        existingCustomerContext: ''
      },
      existingCustomerPhones: [] as string[],
      salesOrders: [] as any[]
    };

    if (profile?.specialInstructions) {
      try {
        const parsed = JSON.parse(profile.specialInstructions);
        const seg = parsed.contactSegmentContexts || {};
        return {
          businessMode: parsed.businessMode || (parsed.bookingEnabled === false ? 'SALES' : 'HYBRID'),
          assistantName: parsed.assistantName || defaults.assistantName,
          assistantTone: parsed.assistantTone || defaults.assistantTone,
          customContext: parsed.customContext || '',
          paymentInfo: parsed.paymentInfo || '',
          shippingOrDeliveryInfo: parsed.shippingOrDeliveryInfo || '',
          customForwardingInstructions: parsed.customForwardingInstructions || '',
          forwardingRules: Array.isArray(parsed.forwardingRules) ? parsed.forwardingRules : [],
          contactSegmentContexts: {
            newContactContext: seg.newContactContext || '',
            returningContactContext: seg.returningContactContext || '',
            existingCustomerContext: seg.existingCustomerContext || ''
          },
          existingCustomerPhones: Array.isArray(parsed.existingCustomerPhones)
            ? parsed.existingCustomerPhones.map((p: any) => String(p).trim()).filter(Boolean)
            : [],
          salesOrders: Array.isArray(parsed.salesOrders) ? parsed.salesOrders : []
        };
      } catch {
        // Si specialInstructions era texto plano libre, usarlo como customContext
        return {
          ...defaults,
          customContext: profile.specialInstructions
        };
      }
    }

    return defaults;
  }

  private normalizePhoneDigits(phone?: string): string {
    return (phone || '').replace(/\D/g, '');
  }

  private phonesMatch(phoneA?: string, phoneB?: string): boolean {
    const dA = this.normalizePhoneDigits(phoneA);
    const dB = this.normalizePhoneDigits(phoneB);
    if (!dA || !dB) return false;
    if (dA === dB) return true;
    if (dA.length >= 8 && dB.length >= 8) {
      return dA.slice(-8) === dB.slice(-8);
    }
    return false;
  }

  public async resolveContactSegment(params: {
    organizationId: string;
    senderPhone?: string;
    conversationId?: string;
    profile?: BusinessProfile;
    hadPriorUserMessages?: boolean;
  }): Promise<'NEW_CONTACT' | 'RETURNING_CONTACT' | 'EXISTING_CUSTOMER'> {
    const { organizationId, conversationId, hadPriorUserMessages } = params;
    let senderPhone = params.senderPhone;

    let profile = params.profile;
    if (!profile) {
      profile = (await this.businessProfileRepo.findOne({ where: { organizationId } })) || undefined;
    }

    let convMessagesCount = 0;
    if (!senderPhone && conversationId) {
      const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
      if (conv) {
        senderPhone = conv.channelConversationId;
        convMessagesCount = conv.messagesCount || 0;
      }
    } else if (conversationId) {
      const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
      if (conv) {
        convMessagesCount = conv.messagesCount || 0;
      }
    }

    // 1. Verificar si YA ES CLIENTE / ESTUDIANTE / ALUMNO ACTUAL
    if (senderPhone && profile) {
      const customAi = this.extractCustomAiSettings(profile);
      if (customAi.existingCustomerPhones.some((p) => this.phonesMatch(p, senderPhone))) {
        return 'EXISTING_CUSTOMER';
      }
      if (customAi.salesOrders.some((o: any) => this.phonesMatch(o?.customerPhone, senderPhone))) {
        return 'EXISTING_CUSTOMER';
      }
    }

    if (senderPhone) {
      // ¿Tiene turnos confirmados o completados?
      const appts = await this.appointmentRepo.find({ where: { organizationId } });
      const hasAppointment = appts.some(
        (a) =>
          this.phonesMatch(a.customerPhone, senderPhone) &&
          (a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.COMPLETED)
      );
      if (hasAppointment) {
        return 'EXISTING_CUSTOMER';
      }

      // ¿Tiene Lead marcado como BOOKED (cliente/alumno convertido)?
      const leads = await this.leadRepo.find({ where: { organizationId } });
      const isBookedLead = leads.some(
        (l) => this.phonesMatch(l.phone, senderPhone) && l.status === LeadStatus.BOOKED
      );
      if (isBookedLead) {
        return 'EXISTING_CUSTOMER';
      }
    }

    // 2. Verificar si YA SE COMUNICÓ ANTES (envió mensajes previos)
    if (hadPriorUserMessages === true) {
      return 'RETURNING_CONTACT';
    }
    if (hadPriorUserMessages === undefined) {
      if (convMessagesCount > 0) {
        return 'RETURNING_CONTACT';
      }
      if (this.messageRepo && conversationId) {
        const userMsgCount = await this.messageRepo.count({
          where: { conversationId, sender: MessageSender.USER }
        });
        if (userMsgCount > 1) {
          return 'RETURNING_CONTACT';
        }
      }
    }

    // 3. Caso contrario: GENTE NUEVA (primer mensaje)
    return 'NEW_CONTACT';
  }

  async getDefaultProfile(): Promise<BusinessProfile | null> {
    return this.businessProfileRepo.findOne({ where: {} });
  }

  async processIncomingMessage(params: {
    organizationId: string;
    conversationId: string;
    userText: string;
    senderPhone?: string;
    contactSegment?: 'NEW_CONTACT' | 'RETURNING_CONTACT' | 'EXISTING_CUSTOMER';
    hadPriorUserMessages?: boolean;
    overrideProvider?: AIProviderType;
    overrideModel?: string;
  }): Promise<{
    replyText: string;
    toolExecutions: ToolExecutionRecord[];
    handoffToHuman: boolean;
    handoffReason?: string;
    contactSegment?: 'NEW_CONTACT' | 'RETURNING_CONTACT' | 'EXISTING_CUSTOMER';
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

    // 4. Preparar contexto y herramientas según el rol y estado de agenda
    const bookingEnabled = this.extractBookingEnabled(profile);
    const rawTools =
      activeRole === AgentRoleType.BOOKING && bookingEnabled
        ? this.bookingAgent.getToolDefinitions()
        : this.receptionistAgent.getToolDefinitions();

    const tools = bookingEnabled
      ? rawTools
      : rawTools.filter(
          (t) =>
            !['check_availability', 'check_available_slots', 'confirm_appointment', 'cancel_appointment'].includes(
              t.name
            )
        );

    const scalinkySlug = this.extractScalinkySlug(profile);
    let scalinkyInfo = '';

    if (bookingEnabled && scalinkySlug && this.scalinkyService) {
      try {
        const snapshot = await this.getOrSyncScalinkySnapshot(profile);
        if (snapshot && snapshot.synced && snapshot.services.length > 0 && snapshot.staff.length > 0) {
          const staffListStr = snapshot.staff.map((s) => `${s.name} (ID: ${s.staff_id})`).join(', ');
          const servListStr = snapshot.services
            .map((s) => `- ${s.name}: $${s.price} (Duración: ${s.duration_minutes} min | ID: ${s.service_id})`)
            .join('\n');
          scalinkyInfo = `\n\nSISTEMA DE AGENDA SINCRONIZADO CON SCALINKY (Negocio: "${scalinkySlug}"):
Horario operativo en Scalinky: ${snapshot.businessHoursSummary || 'Según disponibilidad de empleados'}
Empleados / Profesionales activos: ${staffListStr}
Servicios y Precios vigentes en Scalinky:
${servListStr}
REGLAS DE SCALINKY:
- Utiliza SIEMPRE estos servicios, precios y empleados sincronizados de Scalinky.
- Los turnos disponibles NUNCA los inventes: consúltalos SIEMPRE en tiempo real usando la herramienta 'check_availability' (o 'check_available_slots').
- Si el cliente menciona un empleado específico, pasa su nombre en 'staffName'; si no tiene preferencia, se consultarán los turnos disponibles de todos los empleados.`;
        } else if (snapshot && !snapshot.synced) {
          scalinkyInfo = `\n\nALERTA DE AGENDA SCALINKY (${scalinkySlug}): Estado ${snapshot.status} (${snapshot.message || 'Desincronizado'}).
IMPORTANTE: Si el cliente solicita consultar disponibilidad de turnos o agendar una cita, utiliza la herramienta 'handoff_to_human' e infórmale con amabilidad que la agenda está desincronizada en este instante y que un miembro del equipo humano le atenderá enseguida.`;
        }
      } catch (err: any) {
        this.logger.warn(`No se pudo cargar snapshot Scalinky: ${err.message}`);
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
        : 'Lunes a Viernes de 09:00 a 18:00 hs, Sábados de 09:00 a 13:00 hs (Domingos cerrado)';

    const servicesSummary =
      Array.isArray(profile.services) && profile.services.length > 0
        ? profile.services
            .map((s) => {
              const cap = Math.max(1, Number(s.maxCapacityPerSlot) || 1);
              const capInfo = cap > 1 ? ` | Cupo máx. por turno por día: ${cap} lugares` : '';
              const slotsInfo =
                Array.isArray(s.specificSlots) && s.specificSlots.length > 0
                  ? ` | Horarios de turno: ${s.specificSlots.join(', ')}`
                  : '';
              const daysInfo =
                Array.isArray(s.availableDays) && s.availableDays.length > 0
                  ? ` | Días: ${s.availableDays.map((d) => dayNames[d] || d).join(', ')}`
                  : '';
              const trialInfo = s.requiresTrialFirst
                ? ` | REGLA: Para empezar en este turno, el alumno nuevo debe agendar primero Clase de Prueba (sujeta al cupo máximo diario de ${cap} por turno)`
                : '';
              return `- ${s.name}: $${s.price} ${s.currency || profile.currency || 'USD'} (${s.durationMinutes || 60} min)${capInfo}${slotsInfo}${daysInfo}${trialInfo}${s.description ? ` — ${s.description}` : ''}`;
            })
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

    const customAi = this.extractCustomAiSettings(profile);
    const modeLabelMap: Record<string, string> = {
      HYBRID: 'Híbrido (Ventas de Productos/Servicios, Presupuestos, Consultas y Turnos)',
      SALES: 'Ventas, Toma de Pedidos, Presupuestos y Atención Comercial (Sin Turnos)',
      BOOKING: 'Gestión de Turnos, Citas y Atención al Cliente',
      INFO: 'Asesoramiento, Información del Negocio y Soporte al Cliente'
    };

    const bookingDirective = bookingEnabled && customAi.businessMode !== 'SALES' && customAi.businessMode !== 'INFO'
      ? `4. CONSULTA DE DISPONIBILIDAD, CLASES DE PRUEBA Y CUPO POR TURNO: La agenda está HABILITADA. Si el cliente o alumno busca un turno, clase de prueba o comenzar en un horario determinado, llama SIEMPRE a 'check_availability' (o 'check_available_slots') con la fecha calculada (YYYY-MM-DD) y el nombre/ID del servicio o turno. Si el turno tiene cupo máximo diario (ej. máximo 2 clases de prueba por turno por día) y en esa fecha ese turno figura completo ('fullSlots' o 'slotFull'), explicale amablemente que ya se completaron los cupos de prueba de ese turno en ese día y ofrécele inmediatamente las próximas fechas disponibles devueltas en 'nextAvailableDatesForFullShifts' / 'nextAvailableDates'.`
      : `4. MODO VENTAS Y ATENCIÓN (SIN AGENDA DE CALENDARIO): Este negocio opera sin agenda automática de calendario. Tu objetivo es asesorar sobre productos y servicios, informar precios, explicar cómo comprar, brindar los datos de pago/envío y responder cualquier duda sobre el negocio. Cuando el cliente confirme que quiere comprar, encargar o coordinar con el equipo, registra sus datos con 'create_lead' o utiliza 'handoff_to_human' e indícale que ya avisaste a un asesor para finalizar su pedido.`;

    const customContextSection = customAi.customContext
      ? `\nCONTEXTO DETALLADO, REGLAS E INFORMACIÓN PROPIA DEL NEGOCIO:\n${customAi.customContext}\n`
      : '';

    const paymentSection = customAi.paymentInfo
      ? `\nMEDIOS DE PAGO, ALIAS / CBU Y CONDICIONES DE COMPRA:\n${customAi.paymentInfo}\n`
      : '';

    const shippingSection = customAi.shippingOrDeliveryInfo
      ? `\nENVÍOS, ENTREGAS Y MODALIDAD DE ATENCIÓN:\n${customAi.shippingOrDeliveryInfo}\n`
      : '';

    const forwardingSection = customAi.customForwardingInstructions
      ? `\nINSTRUCCIONES PERSONALIZADAS DE REENVÍO Y ENRUTAMIENTO A GRUPOS / CONTACTOS:\n${customAi.customForwardingInstructions}\n(Si se cumple alguna de estas condiciones durante la charla, ejecuta la herramienta 'forward_to_group_or_contact' indicando el grupo/número de destino y el resumen completo).\n`
      : '';

    const resolvedSegment =
      params.contactSegment ||
      (await this.resolveContactSegment({
        organizationId,
        senderPhone: params.senderPhone,
        conversationId,
        profile,
        hadPriorUserMessages: params.hadPriorUserMessages
      }));

    const segmentMetaMap: Record<
      'NEW_CONTACT' | 'RETURNING_CONTACT' | 'EXISTING_CUSTOMER',
      { label: string; ruleText: string; defaultHint: string }
    > = {
      NEW_CONTACT: {
        label: '🆕 GENTE NUEVA (Primer contacto — Nunca había enviado mensajes antes)',
        ruleText: customAi.contactSegmentContexts.newContactContext,
        defaultHint:
          'Recíbelo con calidez, preséntale brevemente cómo trabaja el negocio y guíalo desde cero.'
      },
      RETURNING_CONTACT: {
        label: '💬 NÚMERO QUE YA SE COMUNICÓ ANTES (Ya envió mensajes previamente, aún sin ser cliente/alumno confirmado)',
        ruleText: customAi.contactSegmentContexts.returningContactContext,
        defaultHint:
          'Ten presente que ya habló anteriormente; no repitas presentaciones básicas innecesarias, retoma el hilo de su consulta y ayúdalo a dar el siguiente paso.'
      },
      EXISTING_CUSTOMER: {
        label: '⭐ YA ES CLIENTE / ESTUDIANTE ACTUAL DEL NEGOCIO',
        ruleText: customAi.contactSegmentContexts.existingCustomerContext,
        defaultHint:
          'Este contacto ya es cliente o alumno/estudiante activo del negocio. Trátalo con cercanía como parte de la comunidad y prioriza sus necesidades de cliente/alumno actual.'
      }
    };

    const currentSegmentMeta = segmentMetaMap[resolvedSegment];
    const contactSegmentSection = `\nPERFIL Y SEGMENTO DEL NÚMERO ACTUAL (DETECTADO ANTES DE RESPONDER):\nTipo de Contacto: ${currentSegmentMeta.label}\nInstrucción Obligatoria para este Segmento: ${
      currentSegmentMeta.ruleText ? currentSegmentMeta.ruleText : currentSegmentMeta.defaultHint
    }\n`;

    const systemPrompt = `Eres "${customAi.assistantName}", el Asistente Inteligente de Atención al Cliente y Ventas de ${profile.businessName}.
Tono y Personalidad: ${customAi.assistantTone}.
Modo de Operación: ${modeLabelMap[customAi.businessMode] || modeLabelMap.HYBRID}.
Descripción del Negocio: ${profile.description || 'Atención comercial, venta de productos y servicios profesionales'}.
Ubicación / Cobertura: ${profile.location}.
Horarios de Atención del Negocio: ${hoursList}.
Zona Horaria: ${timeZone}.
FECHA ACTUAL: ${dateFormatted} (${isoDate}). HORA ACTUAL: ${timeFormatted} hs.
Moneda: ${profile.currency}.
Política Comercial / Garantías / Cancelaciones: ${profile.cancellationPolicy}.
Estado de la Agenda de Turnos: ${bookingEnabled ? 'HABILITADA' : 'DESHABILITADA'}.
${contactSegmentSection}${customContextSection}${paymentSection}${shippingSection}${forwardingSection}
Catálogo de Productos y Servicios del Negocio:
${servicesSummary}
${scalinkyInfo}

REGLAS ESTRICTAS DE CONVERSACIÓN:
1. ADÁPTATE AL RUBRO Y CONTEXTO REAL DEL NEGOCIO: Responde acorde a la actividad de "${profile.businessName}" y aplica toda la información del CONTEXTO DETALLADO de arriba. Puedes vender productos, armar presupuestos, explicar cómo trabaja el negocio o coordinar servicios.
2. MANTÉN EL HILO DE LA CONVERSACIÓN: Si el cliente ya mencionó o preguntó por un producto o servicio específico en mensajes anteriores, NO le vuelvas a preguntar qué busca.
3. CÁLCULO DE FECHAS Y CONCISIÓN: Cuando el cliente diga "mañana", "hoy", "este viernes", calcula la fecha exacta en base a la FECHA ACTUAL (${isoDate}). Si la conversación ya está en curso, NO vuelvas a saludar con "¡Hola!"; responde de forma directa, natural y empática.
${bookingDirective}
5. COMPRAS, PEDIDOS Y COMPROBANTES: Si el cliente confirma que quiere comprar un producto o realizar un pedido, registra la venta usando la herramienta 'create_order' con el detalle de los artículos, monto y entrega, y pásale los datos de MEDIOS DE PAGO si corresponde. Si el cliente envía una imagen de comprobante de pago ([COMPROBANTE_DETECTADO]), confírmale que recibiste el comprobante con los datos detectados y que ya notificaste a administración.
6. NO INVENTES: No inventes precios, empleados, horarios ni condiciones que no figuren en el contexto o catálogo.
7. ATENCIÓN HUMANA: Si el cliente solicita hablar con una persona, dueño o encargado, si quiere cerrar una compra especial, si hay una urgencia técnica o si la agenda arroja estado desincronizado: utiliza SIEMPRE la herramienta 'handoff_to_human' y confírmale que ya notificaste al equipo humano para que le atiendan a la brevedad.`;

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
          handoffReason,
          contactSegment: resolvedSegment
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

        if (tc.name === 'handoff_to_human' || result.data?.handoffTriggered) {
          handoffToHuman = true;
          handoffReason =
            (tc.arguments?.reason as string) ||
            result.data?.reason ||
            'Solicitud de operador o caso especial';
          await this.conversationRepo.update(conversationId, {
            status: ConversationStatus.HUMAN_TAKEOVER
          });
        }

        if (result.data?.scalinkyDesynced) {
          await this.conversationRepo.update(conversationId, {
            status: ConversationStatus.HUMAN_TAKEOVER
          });
          return {
            replyText:
              'En este momento nuestra agenda se encuentra desincronizada. Ya le avisé a un miembro de nuestro equipo humano para que te atienda personalmente y coordine con vos a la brevedad.',
            toolExecutions,
            handoffToHuman: true,
            handoffReason: result.data?.reason || 'Agenda Scalinky desincronizada',
            contactSegment: resolvedSegment
          };
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
      replyText: 'He tomado nota de tu consulta. ¿En qué más te puedo ayudar?',
      toolExecutions,
      handoffToHuman,
      handoffReason,
      contactSegment: resolvedSegment
    };
  }

  private extractBookingEnabled(profile: BusinessProfile): boolean {
    if (profile?.specialInstructions) {
      try {
        const parsed = JSON.parse(profile.specialInstructions);
        if (typeof parsed?.bookingEnabled === 'boolean') {
          return parsed.bookingEnabled;
        }
      } catch {
        // Ignorar si no es JSON
      }
    }
    return true;
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

  private async getOrSyncScalinkySnapshot(profile: BusinessProfile): Promise<ScalinkyCachedSnapshot | null> {
    const slug = this.extractScalinkySlug(profile);
    if (!slug || !this.scalinkyService) return null;

    if (profile?.specialInstructions) {
      try {
        const parsed = JSON.parse(profile.specialInstructions);
        const cached: ScalinkyCachedSnapshot | undefined = parsed?.scalinkyCache;
        if (
          cached &&
          cached.slug === slug &&
          cached.synced === true &&
          Array.isArray(cached.services) &&
          cached.services.length > 0 &&
          Array.isArray(cached.staff) &&
          cached.staff.length > 0
        ) {
          return cached;
        }
      } catch {
        // No es JSON
      }
    }

    // Si no estaba guardado en caché todavía, sincronizar por primera vez y guardarlo
    return this.forceSyncScalinkySnapshot(profile, slug);
  }

  private async forceSyncScalinkySnapshot(
    profile: BusinessProfile,
    slug: string
  ): Promise<ScalinkyCachedSnapshot | null> {
    if (!this.scalinkyService) return null;
    const snapshot = await this.scalinkyService.syncBusinessSnapshot(slug);
    try {
      const prev = profile.specialInstructions ? JSON.parse(profile.specialInstructions) : {};
      prev.scalinkySlug = slug;
      prev.scalinkyCache = snapshot;
      profile.specialInstructions = JSON.stringify(prev);
      if (this.businessProfileRepo && profile.id) {
        await this.businessProfileRepo.save(profile);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo persistir caché de Scalinky: ${err.message}`);
    }
    return snapshot;
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
            const snapshot = await this.getOrSyncScalinkySnapshot(profile);
            if (snapshot && snapshot.services.length > 0) {
              list = snapshot.services.map((s) => ({
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
            const snapshot = await this.getOrSyncScalinkySnapshot(profile);
            const scFound = (snapshot?.services || []).find((s) =>
              s.name.toLowerCase().includes(query)
            );
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
                { day: 'monday', open: '09:00', close: '18:00', isOpen: true },
                { day: 'tuesday', open: '09:00', close: '18:00', isOpen: true },
                { day: 'wednesday', open: '09:00', close: '18:00', isOpen: true },
                { day: 'thursday', open: '09:00', close: '18:00', isOpen: true },
                { day: 'friday', open: '09:00', close: '18:00', isOpen: true },
                { day: 'saturday', open: '09:00', close: '13:00', isOpen: true },
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

      case 'create_order': {
        const newOrder = {
          id: `ord-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          customerName: (args.customerName as string) || 'Cliente WhatsApp',
          customerPhone: (args.customerPhone as string) || '',
          itemsSummary: (args.itemsSummary as string) || 'Compra de producto/servicio',
          totalAmount: Number(args.totalAmount) || 0,
          currency: profile.currency || 'USD',
          deliveryMethod: (args.deliveryMethod as string) || 'A coordinar',
          paymentMethod: (args.paymentMethod as string) || 'A confirmar',
          status: 'PENDIENTE',
          notes: (args.notes as string) || '',
          createdAt: new Date().toISOString()
        };

        try {
          let parsed: any = {};
          if (profile.specialInstructions) {
            try {
              parsed = JSON.parse(profile.specialInstructions);
            } catch {
              parsed = { customContext: profile.specialInstructions };
            }
          }
          const orders = Array.isArray(parsed.salesOrders) ? parsed.salesOrders : [];
          orders.unshift(newOrder);
          parsed.salesOrders = orders;
          profile.specialInstructions = JSON.stringify(parsed);
          if (this.businessProfileRepo && profile.id) {
            await this.businessProfileRepo.save(profile);
          }
        } catch (err: any) {
          this.logger.warn(`Error guardando pedido en perfil: ${err.message}`);
        }

        return {
          success: true,
          data: {
            orderCreated: true,
            order: newOrder,
            message: 'Pedido registrado con éxito en el panel y notificado al dueño.'
          }
        };
      }

      case 'forward_to_group_or_contact': {
        return {
          success: true,
          data: {
            forwardTriggered: true,
            targetGroupOrPhone: (args.targetGroupOrPhone as string) || '',
            summaryText: (args.summaryText as string) || '',
            message: 'Mensaje programado para reenvío al grupo o contacto.'
          }
        };
      }

      case 'check_availability':
      case 'check_available_slots': {
        if (!this.extractBookingEnabled(profile)) {
          return {
            success: false,
            data: {
              agendaDisabled: true,
              handoffTriggered: true,
              reason: 'Agenda deshabilitada por configuración del negocio',
              message: 'La agenda automática está deshabilitada. Deriva al cliente con un asesor humano.'
            }
          };
        }

        const date = (args.date as string) || new Date().toISOString().split('T')[0];
        const requestedServiceRaw = ((args.serviceId || args.serviceName || '') as string).toLowerCase().trim();
        const requestedStaffRaw = ((args.staffName || '') as string).toLowerCase().trim();

        const slug = this.extractScalinkySlug(profile);
        if (slug && this.scalinkyService) {
          let snapshot = await this.getOrSyncScalinkySnapshot(profile);

          // Si no está sincronizado o está incompleto, intentar resincronizar automáticamente 1 vez
          if (!snapshot || !snapshot.synced || snapshot.services.length === 0 || snapshot.staff.length === 0) {
            this.logger.warn(`[SCALINKY SELF-HEAL] Intentando resincronizar negocio "${slug}" antes de consultar turnos...`);
            snapshot = await this.forceSyncScalinkySnapshot(profile, slug);
          }

          if (!snapshot || !snapshot.synced || snapshot.services.length === 0 || snapshot.staff.length === 0) {
            return {
              success: false,
              data: {
                scalinkyDesynced: true,
                handoffTriggered: true,
                status: 'DESINCRONIZADO',
                reason: `Scalinky desincronizado (${snapshot?.message || 'sin conexión o sin datos'})`,
                message: 'No se pudo sincronizar con Scalinky. Dile al cliente que aguarde a ser atendido por un humano.'
              }
            };
          }

          const resolveAndQuery = async (snap: ScalinkyCachedSnapshot) => {
            const matchedService =
              snap.services.find(
                (s) =>
                  s.service_id.toLowerCase() === requestedServiceRaw ||
                  s.name.toLowerCase().includes(requestedServiceRaw) ||
                  requestedServiceRaw.includes(s.name.toLowerCase())
              ) || snap.services[0];

            const matchedStaff = requestedStaffRaw
              ? snap.staff.find(
                  (st) =>
                    st.staff_id.toLowerCase() === requestedStaffRaw ||
                    st.name.toLowerCase().includes(requestedStaffRaw) ||
                    requestedStaffRaw.includes(st.name.toLowerCase())
                )
              : undefined;

            const perStaffResults = await this.scalinkyService!.getLivePossibilitiesPerStaff(
              slug,
              matchedService.service_id,
              snap.staff,
              matchedStaff?.staff_id
            );

            const byEmployee: Array<{ employeeName: string; staffId: string; slots: string[] }> = [];
            const allSlotsSet = new Set<string>();

            for (const entry of perStaffResults) {
              const dayMatch = entry.possibilities.find((p) => p.date === date);
              const empSlots = dayMatch
                ? dayMatch.items.flatMap((it) => it.slots || [])
                : [];
              if (empSlots.length > 0) {
                byEmployee.push({
                  employeeName: entry.staffName,
                  staffId: entry.staffId,
                  slots: empSlots
                });
                empSlots.forEach((s) => allSlotsSet.add(s));
              }
            }

            return {
              serviceName: matchedService.name,
              serviceId: matchedService.service_id,
              byEmployee,
              availableSlots: Array.from(allSlotsSet).sort()
            };
          };

          try {
            const liveData = await resolveAndQuery(snapshot);
            return {
              success: true,
              data: {
                date,
                source: 'scalinky',
                serviceName: liveData.serviceName,
                isAvailable: liveData.availableSlots.length > 0,
                availableSlots: liveData.availableSlots,
                availabilityByEmployee: liveData.byEmployee
              }
            };
          } catch (err: any) {
            this.logger.warn(
              `[SCALINKY RETRY] Error consultando disponibilidad (${err.message}). Re-sincronizando snapshot y reintentando...`
            );
            const resynced = await this.forceSyncScalinkySnapshot(profile, slug);
            if (resynced && resynced.synced) {
              try {
                const retryData = await resolveAndQuery(resynced);
                return {
                  success: true,
                  data: {
                    date,
                    source: 'scalinky',
                    serviceName: retryData.serviceName,
                    isAvailable: retryData.availableSlots.length > 0,
                    availableSlots: retryData.availableSlots,
                    availabilityByEmployee: retryData.byEmployee
                  }
                };
              } catch (retryErr: any) {
                this.logger.error(`[SCALINKY DESYNC] Falló reintento en Scalinky: ${retryErr.message}`);
              }
            }

            return {
              success: false,
              data: {
                scalinkyDesynced: true,
                handoffTriggered: true,
                status: 'DESINCRONIZADO',
                reason: 'Fallo al consultar disponibilidad en Scalinky tras reintentar sincronización',
                message: 'Devuelve estado desincronizado y dile al cliente que espere a un humano.'
              }
            };
          }
        }

        // Modo catálogo nativo de TurnoFlow (con control de cupo por turno/día, clases de prueba y fechas alternativas)
        const evalResult = await this.evaluateDayCapacityAndSlots(
          organizationId,
          date,
          profile,
          requestedServiceRaw
        );
        const nextDates = await this.calculateNextAvailableDatesForService(
          organizationId,
          date,
          profile,
          requestedServiceRaw,
          evalResult.fullSlots
        );

        return {
          success: true,
          data: {
            date,
            source: 'turnoflow',
            serviceName: evalResult.matchedService?.name || undefined,
            maxCapacityPerSlot: evalResult.maxCapacityPerSlot,
            requiresTrialFirst: Boolean(evalResult.matchedService?.requiresTrialFirst),
            isAvailable: evalResult.availableSlots.length > 0,
            availableSlots: evalResult.availableSlots,
            fullSlots: evalResult.fullSlots,
            slotDetails: evalResult.slotDetails,
            nextAvailableDates: nextDates.upcomingDays,
            nextAvailableDatesForFullShifts: nextDates.byShift
          }
        };
      }

      case 'confirm_appointment': {
        if (!this.extractBookingEnabled(profile)) {
          return {
            success: false,
            data: {
              agendaDisabled: true,
              handoffTriggered: true,
              reason: 'Intento de reserva con agenda deshabilitada'
            }
          };
        }

        const startTime = this.normalizeStartTimeUtc(args.startTime as string);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        const requestedServiceRaw = ((args.serviceId || '') as string).toLowerCase().trim();
        const requestedStaffRaw = ((args.staffName || '') as string).toLowerCase().trim();

        let scalinkyBooking: any = null;
        const matchedNativeService = this.resolveTargetService(profile, requestedServiceRaw);
        let resolvedServiceName =
          matchedNativeService?.name || (args.serviceId as string) || 'Servicio General';
        const slug = this.extractScalinkySlug(profile);

        if (slug && this.scalinkyService) {
          let snapshot = await this.getOrSyncScalinkySnapshot(profile);
          if (!snapshot || !snapshot.synced) {
            snapshot = await this.forceSyncScalinkySnapshot(profile, slug);
          }

          if (!snapshot || !snapshot.synced || snapshot.services.length === 0 || snapshot.staff.length === 0) {
            return {
              success: false,
              data: {
                scalinkyDesynced: true,
                handoffTriggered: true,
                status: 'DESINCRONIZADO',
                reason: 'Scalinky desincronizado al intentar confirmar turno'
              }
            };
          }

          const attemptScalinkyBook = async (snap: ScalinkyCachedSnapshot) => {
            const matchedService =
              snap.services.find(
                (s) =>
                  s.service_id.toLowerCase() === requestedServiceRaw ||
                  s.name.toLowerCase().includes(requestedServiceRaw) ||
                  requestedServiceRaw.includes(s.name.toLowerCase())
              ) || snap.services[0];

            resolvedServiceName = matchedService.name;

            const matchedStaff = requestedStaffRaw
              ? snap.staff.find(
                  (st) =>
                    st.staff_id.toLowerCase() === requestedStaffRaw ||
                    st.name.toLowerCase().includes(requestedStaffRaw) ||
                    requestedStaffRaw.includes(st.name.toLowerCase())
                )
              : undefined;

            const dateStr = startTime.toISOString().split('T')[0];
            const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
            const endTimeStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

            const perStaff = await this.scalinkyService!.getLivePossibilitiesPerStaff(
              slug,
              matchedService.service_id,
              snap.staff,
              matchedStaff?.staff_id
            );

            for (const entry of perStaff) {
              const dayMatch = entry.possibilities.find((p) => p.date === dateStr);
              if (!dayMatch) continue;
              const slotItem =
                dayMatch.items.find((it) => (it.slots || []).includes(timeStr)) || dayMatch.items[0];
              if (slotItem?.availability_id) {
                return this.scalinkyService!.bookAppointment(slug, {
                  service_id: matchedService.service_id,
                  availability_id: slotItem.availability_id,
                  startAt: timeStr,
                  endAt: endTimeStr,
                  date: dateStr,
                  customerName: args.customerName as string,
                  customerPhone: args.customerPhone as string,
                  status: 'booked'
                });
              }
            }
            throw new Error('SLOT_NOT_AVAILABLE_IN_SCALINKY');
          };

          try {
            scalinkyBooking = await attemptScalinkyBook(snapshot);
          } catch (bookErr: any) {
            this.logger.warn(`[SCALINKY BOOK RETRY] Re-sincronizando y reintentando reserva: ${bookErr.message}`);
            const resynced = await this.forceSyncScalinkySnapshot(profile, slug);
            if (resynced && resynced.synced) {
              try {
                scalinkyBooking = await attemptScalinkyBook(resynced);
              } catch {
                return {
                  success: false,
                  data: {
                    scalinkyDesynced: true,
                    handoffTriggered: true,
                    status: 'DESINCRONIZADO',
                    reason: 'No se pudo registrar el turno en Scalinky tras resincronizar'
                  }
                };
              }
            } else {
              return {
                success: false,
                data: {
                  scalinkyDesynced: true,
                  handoffTriggered: true,
                  status: 'DESINCRONIZADO',
                  reason: 'Scalinky fuera de línea al confirmar turno'
                }
              };
            }
          }
        } else {
          // Validación de cupo máximo por turno por día en catálogo nativo TurnoFlow
          const reqDateStr = startTime.toISOString().split('T')[0];
          const reqSlotStr = `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(startTime.getUTCMinutes()).padStart(2, '0')}`;
          const evalDay = await this.evaluateDayCapacityAndSlots(
            organizationId,
            reqDateStr,
            profile,
            requestedServiceRaw
          );
          const bookedInRequestedSlot = evalDay.bookedCountBySlot[reqSlotStr] || 0;
          if (bookedInRequestedSlot >= evalDay.maxCapacityPerSlot) {
            const nextDates = await this.calculateNextAvailableDatesForService(
              organizationId,
              reqDateStr,
              profile,
              requestedServiceRaw,
              [reqSlotStr]
            );
            return {
              success: false,
              data: {
                slotFull: true,
                date: reqDateStr,
                slot: reqSlotStr,
                bookedCount: bookedInRequestedSlot,
                maxCapacityPerSlot: evalDay.maxCapacityPerSlot,
                availableSlotsSameDay: evalDay.availableSlots,
                nextAvailableDates: nextDates.upcomingDays,
                nextAvailableDatesForShift: nextDates.byShift[reqSlotStr] || [],
                message: `El turno de las ${reqSlotStr} el día ${reqDateStr} ya alcanzó su cupo máximo (${bookedInRequestedSlot}/${evalDay.maxCapacityPerSlot}). Ofrécele al alumno/cliente las próximas fechas disponibles para ese turno o los otros horarios disponibles.`
              }
            };
          }
        }

        const appointment = this.appointmentRepo.create({
          organizationId,
          customerName: args.customerName as string,
          customerPhone: args.customerPhone as string,
          serviceId: matchedNativeService?.id || (args.serviceId as string) || 'srv-default',
          serviceName: resolvedServiceName,
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
            maxCapacityPerSlot: Math.max(1, Number(matchedNativeService?.maxCapacityPerSlot) || 1),
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

  private normalizeStartTimeUtc(rawStart: string): Date {
    const trimmed = String(rawStart || '').trim();
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const withT = trimmed.replace(' ', 'T');
      const withSec = withT.length === 16 ? `${withT}:00` : withT;
      return new Date(`${withSec}Z`);
    }
    return new Date(trimmed);
  }

  private resolveTargetService(profile?: BusinessProfile, requestedServiceRaw?: string): any | undefined {
    const services = Array.isArray(profile?.services) ? profile!.services.filter((s) => s.isActive !== false) : [];
    if (services.length === 0) return undefined;

    const req = (requestedServiceRaw || '').toLowerCase().trim();
    if (req) {
      const direct = services.find(
        (s) =>
          (s.id || '').toLowerCase() === req ||
          (s.name || '').toLowerCase().includes(req) ||
          req.includes((s.name || '').toLowerCase())
      );
      if (direct) return direct;
    }

    // Si no especificó nombre exacto pero hay un servicio con clase de prueba o cupo especial, o un único servicio
    const trialOrCapacityService = services.find(
      (s) => s.requiresTrialFirst || (Number(s.maxCapacityPerSlot) || 1) > 1 || (Array.isArray(s.specificSlots) && s.specificSlots.length > 0)
    );
    return trialOrCapacityService || services[0];
  }

  public async evaluateDayCapacityAndSlots(
    organizationId: string,
    dateStr: string,
    profile?: BusinessProfile,
    requestedServiceRaw?: string,
    preloadedAppointments?: Appointment[]
  ): Promise<{
    matchedService?: any;
    maxCapacityPerSlot: number;
    candidateSlots: string[];
    availableSlots: string[];
    fullSlots: string[];
    bookedCountBySlot: Record<string, number>;
    slotDetails: Array<{
      slot: string;
      booked: number;
      maxCapacity: number;
      remaining: number;
      isFull: boolean;
    }>;
  }> {
    const matchedService = this.resolveTargetService(profile, requestedServiceRaw);
    const maxCapacityPerSlot = Math.max(1, Number(matchedService?.maxCapacityPerSlot) || 1);

    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const parsedDate = new Date(`${dateStr}T12:00:00Z`);
    const dayKey = !isNaN(parsedDate.getTime()) ? dayKeys[parsedDate.getUTCDay()] : 'monday';

    // Verificar si el servicio/turno se dicta en este día de la semana
    if (
      matchedService &&
      Array.isArray(matchedService.availableDays) &&
      matchedService.availableDays.length > 0
    ) {
      const allowedDays = matchedService.availableDays.map((d: string) => String(d).toLowerCase().trim());
      if (!allowedDays.includes(dayKey)) {
        return {
          matchedService,
          maxCapacityPerSlot,
          candidateSlots: [],
          availableSlots: [],
          fullSlots: [],
          bookedCountBySlot: {},
          slotDetails: []
        };
      }
    }

    let candidateSlots = ['09:00', '10:00', '11:30', '14:00', '15:30', '17:00'];

    if (profile && Array.isArray(profile.businessHours) && profile.businessHours.length > 0) {
      if (!isNaN(parsedDate.getTime())) {
        const daySched = profile.businessHours.find((h) => h.day === dayKey);
        if (daySched) {
          if (!daySched.isOpen) {
            return {
              matchedService,
              maxCapacityPerSlot,
              candidateSlots: [],
              availableSlots: [],
              fullSlots: [],
              bookedCountBySlot: {},
              slotDetails: []
            };
          }
          const openH = parseInt((daySched.open || '09:00').split(':')[0], 10);
          const closeH = parseInt((daySched.close || '18:00').split(':')[0], 10);
          if (!isNaN(openH) && !isNaN(closeH) && closeH > openH) {
            const generated: string[] = [];
            for (let h = openH; h < closeH; h++) {
              generated.push(`${String(h).padStart(2, '0')}:00`);
            }
            if (generated.length > 0) {
              candidateSlots = generated;
            }
          }
        }
      }
    }

    // Si el servicio/clase tiene horarios fijos de turno (ej. ["18:00", "19:30"] en escuela de Taekwondo)
    if (
      matchedService &&
      Array.isArray(matchedService.specificSlots) &&
      matchedService.specificSlots.length > 0
    ) {
      candidateSlots = matchedService.specificSlots
        .map((s: string) => String(s).trim())
        .filter(Boolean);
    }

    const existing =
      preloadedAppointments ||
      (await this.appointmentRepo.find({
        where: { organizationId, status: AppointmentStatus.CONFIRMED }
      }));

    const bookedCountBySlot: Record<string, number> = {};
    for (const a of existing) {
      try {
        const d = new Date(a.startTime);
        const apptDate = d.toISOString().split('T')[0];
        if (apptDate !== dateStr) continue;
        const slot = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
        bookedCountBySlot[slot] = (bookedCountBySlot[slot] || 0) + 1;
      } catch {
        // Ignorar fecha inválida
      }
    }

    const availableSlots: string[] = [];
    const fullSlots: string[] = [];
    const slotDetails = candidateSlots.map((slot) => {
      const booked = bookedCountBySlot[slot] || 0;
      const remaining = Math.max(0, maxCapacityPerSlot - booked);
      const isFull = booked >= maxCapacityPerSlot;
      if (isFull) {
        fullSlots.push(slot);
      } else {
        availableSlots.push(slot);
      }
      return {
        slot,
        booked,
        maxCapacity: maxCapacityPerSlot,
        remaining,
        isFull
      };
    });

    // También incluir en fullSlots cualquier horario fuera de candidateSlots que ya haya alcanzado el cupo ese día
    for (const [bookedSlot, count] of Object.entries(bookedCountBySlot)) {
      if (!candidateSlots.includes(bookedSlot) && count >= maxCapacityPerSlot) {
        fullSlots.push(bookedSlot);
      }
    }

    return {
      matchedService,
      maxCapacityPerSlot,
      candidateSlots,
      availableSlots,
      fullSlots,
      bookedCountBySlot,
      slotDetails
    };
  }

  public async calculateNextAvailableDatesForService(
    organizationId: string,
    fromDateStr: string,
    profile?: BusinessProfile,
    requestedServiceRaw?: string,
    targetShifts: string[] = []
  ): Promise<{
    upcomingDays: Array<{ date: string; dayLabel: string; availableSlots: string[] }>;
    byShift: Record<string, Array<{ date: string; dayLabel: string; remainingSpots: number }>>;
  }> {
    const existing = await this.appointmentRepo.find({
      where: { organizationId, status: AppointmentStatus.CONFIRMED }
    });

    const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const baseDate = new Date(`${fromDateStr}T12:00:00Z`);
    const upcomingDays: Array<{ date: string; dayLabel: string; availableSlots: string[] }> = [];
    const byShift: Record<string, Array<{ date: string; dayLabel: string; remainingSpots: number }>> = {};

    for (const sh of targetShifts) {
      byShift[sh] = [];
    }

    if (isNaN(baseDate.getTime())) {
      return { upcomingDays, byShift };
    }

    for (let offset = 1; offset <= 14; offset++) {
      const nextD = new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000);
      const nextDateStr = nextD.toISOString().split('T')[0];
      const dayLabel = dayLabels[nextD.getUTCDay()];

      const evalNext = await this.evaluateDayCapacityAndSlots(
        organizationId,
        nextDateStr,
        profile,
        requestedServiceRaw,
        existing
      );

      if (evalNext.availableSlots.length > 0 && upcomingDays.length < 5) {
        upcomingDays.push({
          date: nextDateStr,
          dayLabel,
          availableSlots: evalNext.availableSlots
        });
      }

      for (const sh of targetShifts) {
        if (byShift[sh] && byShift[sh].length < 4) {
          const booked = evalNext.bookedCountBySlot[sh] || 0;
          const isDayOpenForShift =
            evalNext.candidateSlots.includes(sh) || evalNext.availableSlots.length > 0;
          if (isDayOpenForShift && booked < evalNext.maxCapacityPerSlot) {
            byShift[sh].push({
              date: nextDateStr,
              dayLabel,
              remainingSpots: evalNext.maxCapacityPerSlot - booked
            });
          }
        }
      }
    }

    return { upcomingDays, byShift };
  }

  private async calculateAvailableSlots(
    organizationId: string,
    dateStr: string,
    profile?: BusinessProfile,
    requestedServiceRaw?: string
  ): Promise<string[]> {
    const evalResult = await this.evaluateDayCapacityAndSlots(
      organizationId,
      dateStr,
      profile,
      requestedServiceRaw
    );
    return evalResult.availableSlots;
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
    const bookingEnabled = this.extractBookingEnabled(profile);

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
      const followUpQuestion = bookingEnabled
        ? '¿Te gustaría que verifiquemos disponibilidad para agendar?'
        : '¿Te gustaría que un asesor de nuestro equipo se comunique con vos para coordinarlo?';
      return {
        content: `El servicio de ${matchedService.name} tiene un valor de $${matchedService.price} ${currency} (${matchedService.durationMinutes || 60} min). ${matchedService.description ? matchedService.description + '. ' : ''}${followUpQuestion}`,
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
        content: `En ${profile.businessName} ofrecemos:\n\n${topServices}\n\n¿Te interesa consultar por alguno en particular?`,
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
      const dayNames: Record<string, string> = {
        monday: 'Lun',
        tuesday: 'Mar',
        wednesday: 'Mié',
        thursday: 'Jue',
        friday: 'Vie',
        saturday: 'Sáb',
        sunday: 'Dom'
      };
      const hoursText =
        Array.isArray(profile.businessHours) && profile.businessHours.length > 0
          ? profile.businessHours
              .filter((h) => h.isOpen)
              .map((h) => `${dayNames[h.day] || h.day} ${h.open}-${h.close}`)
              .join(', ')
          : 'Lunes a Sábados';
      return {
        content: `Nuestros horarios de atención son: ${hoursText}. ${profile.location ? `Ubicación: ${profile.location}. ` : ''}¿En qué te podemos ayudar?`,
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
      if (!bookingEnabled) {
        return {
          content: `Ya le avisé a nuestro equipo en ${profile.businessName} para que un asesor se comunique contigo a la brevedad y coordine directamente con vos.`,
          usage: { inputTokens: 0, outputTokens: 0 }
        };
      }
      return {
        content: `Con gusto coordinamos en ${profile.businessName}. ¿Qué servicio necesitas y en qué día y rango de horario prefieres?`,
        usage: { inputTokens: 0, outputTokens: 0 }
      };
    }

    // 5. Saludo o respuesta general
    return {
      content: `¡Hola! Bienvenido/a a ${profile.businessName}. Con gusto te ayudo con información sobre nuestros servicios, precios y atención. ¿En qué te puedo orientar hoy?`,
      usage: { inputTokens: 0, outputTokens: 0 }
    };
  }
}
