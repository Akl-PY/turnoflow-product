import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as QRCode from 'qrcode';
import { IntegrationStatus } from '@turnoflow/shared';

interface QRSessionState {
  organizationId: string;
  status: 'SCAN_QR' | 'CONNECTED' | 'DISCONNECTED';
  qrCodeDataUrl?: string;
  pairingCode?: string;
  connectedPhone?: string;
  connectedAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly qrSessions = new Map<string, QRSessionState>();
  private readonly recentBotMessages = new Map<string, number>();

  recordBotSentMessage(messageId?: string, text?: string) {
    const now = Date.now();
    if (messageId) {
      this.recentBotMessages.set(`id:${messageId}`, now);
    }
    if (text) {
      const textKey = `text:${text.trim().substring(0, 80)}`;
      this.recentBotMessages.set(textKey, now);
    }

    if (this.recentBotMessages.size > 200) {
      for (const [k, ts] of this.recentBotMessages.entries()) {
        if (now - ts > 300000) {
          this.recentBotMessages.delete(k);
        }
      }
    }
  }

  isBotSentMessage(messageId?: string, text?: string): boolean {
    const now = Date.now();
    if (messageId && this.recentBotMessages.has(`id:${messageId}`)) {
      return true;
    }
    if (text) {
      const textKey = `text:${text.trim().substring(0, 80)}`;
      if (this.recentBotMessages.has(textKey)) {
        return true;
      }
    }
    return false;
  }

  async generateQRSession(organizationId: string): Promise<{ qrCode: string; pairingCode?: string; status: string; expiresAt: string }> {
    const rawUrl = process.env.EVOLUTION_API_URL || '';
    const rawKey = process.env.EVOLUTION_API_KEY || '';
    const evolutionUrl = rawUrl.trim().replace(/\/$/, '');
    const evolutionKey = rawKey.trim().replace(/^['"]|['"]$/g, '');

    if (evolutionUrl && evolutionKey) {
      const instanceName = `tf_${organizationId.replace(/-/g, '').substring(0, 12)}`;
      const baseUrl = evolutionUrl;
      const webhookUrl = `${process.env.APP_URL || 'https://turnoflowapi-production.up.railway.app'}/api/conversations/whatsapp-qr-webhook/${organizationId}`;

      const headers = {
        apikey: evolutionKey,
        Authorization: `Bearer ${evolutionKey}`,
        'Content-Type': 'application/json'
      };

      try {
        this.logger.log(`[EVOLUTION] Creando/verificando instancia ${instanceName} en ${baseUrl}...`);

        // 1. Crear instancia en Evolution API
        await axios.post(
          `${baseUrl}/instance/create`,
          {
            instanceName,
            token: evolutionKey,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            webhook: {
              url: webhookUrl,
              byEvents: false,
              base64: false,
              events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
            }
          },
          { headers, timeout: 6000 }
        ).catch((err) => {
          const status = err?.response?.status;
          const msg = err?.response?.data?.message || err?.response?.data?.error || err.message;
          if (status === 401) {
            this.logger.error(`[EVOLUTION 401] Autenticación rechazada. Key usada: ${evolutionKey.substring(0, 4)}...`);
            throw new BadRequestException(
              `Error de autenticación con Evolution API (401). Verifica que la variable EVOLUTION_API_KEY en turnoflowapi coincida con AUTHENTICATION_API_KEY en evolution-api.`
            );
          }
          this.logger.warn(`[EVOLUTION CREATE] Estado ${status}: ${JSON.stringify(msg)}`);
          return null;
        });

        // 2. Conectar y solicitar el QR oficial de Baileys
        this.logger.log(`[EVOLUTION] Obteniendo QR de Baileys para ${instanceName}...`);
        const connectRes = await axios.get(
          `${baseUrl}/instance/connect/${instanceName}`,
          { headers, timeout: 8000 }
        );

        const qrBase64 =
          connectRes.data?.base64 ||
          connectRes.data?.qrcode?.base64 ||
          connectRes.data?.code;
        const pairingCode = connectRes.data?.pairingCode;

        if (qrBase64) {
          const formattedQr = qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`;
          const expiresAt = new Date(Date.now() + 60 * 1000);
          this.qrSessions.set(organizationId, {
            organizationId,
            status: 'SCAN_QR',
            qrCodeDataUrl: formattedQr,
            pairingCode,
            expiresAt
          });

          return {
            qrCode: formattedQr,
            pairingCode,
            status: 'SCAN_QR',
            expiresAt: expiresAt.toISOString()
          };
        } else {
          this.logger.warn(`[EVOLUTION] Sin QR en respuesta: ${JSON.stringify(connectRes.data)}`);
          throw new BadRequestException('Evolution API respondió pero aún está iniciando Baileys. Reintentá en 5 segundos.');
        }
      } catch (err: any) {
        this.logger.error(`[EVOLUTION ERROR] ${err.response?.status || ''} - ${err.message}`);
        if (err instanceof BadRequestException) {
          throw err;
        }
        throw new BadRequestException(
          `No se pudo conectar a Evolution API (${baseUrl}): ${err?.response?.data?.message || err.message}`
        );
      }
    }

    // Modo local / Mock solo si NO hay EVOLUTION_API_URL configurada
    const sessionToken = `turnoflow_wa_${organizationId}_${Date.now()}`;
    const qrDataUrl = await QRCode.toDataURL(sessionToken, {
      width: 280,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    const expiresAt = new Date(Date.now() + 60 * 1000);
    this.qrSessions.set(organizationId, {
      organizationId,
      status: 'SCAN_QR',
      qrCodeDataUrl: qrDataUrl,
      expiresAt
    });

    return {
      qrCode: qrDataUrl,
      status: 'SCAN_QR',
      expiresAt: expiresAt.toISOString()
    };
  }

  async getQRStatus(organizationId: string): Promise<{ status: string; connectedPhone?: string; connectedAt?: string }> {
    const session = this.qrSessions.get(organizationId);
    const instanceName = `tf_${organizationId.replace(/-/g, '').substring(0, 12)}`;
    const rawUrl = process.env.EVOLUTION_API_URL || '';
    const rawKey = process.env.EVOLUTION_API_KEY || '';
    const evolutionUrl = rawUrl.trim().replace(/\/$/, '');
    const evolutionKey = rawKey.trim().replace(/^['"]|['"]$/g, '');

    // Consulta en vivo a Evolution API si está configurada
    if (evolutionUrl && evolutionKey) {
      try {
        const stateRes = await axios.get(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
          headers: { apikey: evolutionKey, Authorization: `Bearer ${evolutionKey}` },
          timeout: 3000
        });

        const state = stateRes.data?.instance?.state || stateRes.data?.state;
        if (state === 'open') {
          let realPhone = session?.connectedPhone;
          if (!realPhone) {
            try {
              const instRes = await axios.get(`${evolutionUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
                headers: { apikey: evolutionKey, Authorization: `Bearer ${evolutionKey}` },
                timeout: 3000
              });
              const instList = Array.isArray(instRes.data) ? instRes.data : [instRes.data];
              const myInst = instList.find((i: any) => i.name === instanceName || i.instanceName === instanceName) || instList[0];
              const rawOwner = myInst?.owner || myInst?.ownerJid;
              if (typeof rawOwner === 'string' && rawOwner.includes('@')) {
                const num = rawOwner.split(':')[0].replace(/\D/g, '');
                if (num.length >= 8) {
                  realPhone = `+${num}`;
                }
              }
            } catch {
              // Silencioso
            }
          }

          const connectedSession: QRSessionState = {
            organizationId,
            status: 'CONNECTED',
            connectedPhone: realPhone,
            connectedAt: session?.connectedAt || new Date()
          };
          this.qrSessions.set(organizationId, connectedSession);

          return {
            status: 'CONNECTED',
            connectedPhone: realPhone,
            connectedAt: connectedSession.connectedAt?.toISOString()
          };
        }
      } catch {
        // Si Evolution API no responde en este tick, recurrimos al estado en memoria
      }
    }

    if (!session) {
      return { status: 'DISCONNECTED' };
    }
    return {
      status: session.status,
      connectedPhone: session.connectedPhone,
      connectedAt: session.connectedAt?.toISOString()
    };
  }

  markQRConnected(organizationId: string, phone?: string) {
    const existing = this.qrSessions.get(organizationId) || { organizationId, status: 'CONNECTED' };
    existing.status = 'CONNECTED';
    if (phone) {
      const clean = phone.replace(/@.*$/, '').replace(/\D/g, '');
      existing.connectedPhone = clean.length >= 8 ? `+${clean}` : phone;
    }
    existing.connectedAt = new Date();
    this.qrSessions.set(organizationId, existing);
  }

  async disconnectQRSession(organizationId: string): Promise<{ success: boolean }> {
    this.qrSessions.delete(organizationId);
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    if (evolutionUrl && evolutionKey) {
      try {
        const instanceName = `tf_${organizationId.replace(/-/g, '').substring(0, 12)}`;
        await axios.delete(`${evolutionUrl.replace(/\/$/, '')}/instance/delete/${instanceName}`, {
          headers: { apikey: evolutionKey }
        });
      } catch {
        // Silently continue
      }
    }
    return { success: true };
  }

  async sendQRWhatsAppMessage(
    organizationId: string,
    to: string,
    text: string,
    explicitInstanceName?: string
  ): Promise<{ success: boolean; messageId?: string }> {
    const rawUrl = process.env.EVOLUTION_API_URL || '';
    const rawKey = process.env.EVOLUTION_API_KEY || '';
    const evolutionUrl = rawUrl.trim().replace(/\/$/, '');
    const evolutionKey = rawKey.trim().replace(/^['"]|['"]$/g, '');

    if (!evolutionUrl || !evolutionKey) {
      this.recordBotSentMessage(undefined, text);
      this.logger.log(`[QR MOCK] WhatsApp QR saliente a ${to}: "${text.substring(0, 60)}..."`);
      return { success: true, messageId: `mock-wa-qr-${Date.now()}` };
    }

    try {
      this.recordBotSentMessage(undefined, text);
      const instanceName =
        explicitInstanceName || `tf_${organizationId.replace(/-/g, '').substring(0, 12)}`;
      const cleanPhone = to.split('@')[0].split(':')[0].replace(/\D/g, '');

      const response = await axios.post(
        `${evolutionUrl}/message/sendText/${instanceName}`,
        {
          number: cleanPhone,
          text: text
        },
        {
          headers: {
            apikey: evolutionKey,
            Authorization: `Bearer ${evolutionKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const msgId = response.data?.key?.id;
      if (msgId) {
        this.recordBotSentMessage(msgId, text);
      }

      this.logger.log(`Mensaje QR enviado a ${cleanPhone} vía Evolution (${instanceName}): ${msgId || 'ok'}`);
      return { success: true, messageId: msgId };
    } catch (err: any) {
      this.logger.error(`Error enviando mensaje vía Evolution API: ${err.response?.data?.message || err.message}`);
      return { success: false };
    }
  }

  async sendWhatsAppMessage(
    to: string,
    messageText: string,
    credentials?: { phoneNumberId?: string; accessToken?: string }
  ): Promise<{ success: boolean; messageId?: string }> {
    const phoneNumberId = credentials?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = credentials?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const version = process.env.WHATSAPP_API_VERSION || 'v20.0';

    if (!phoneNumberId || !token) {
      this.logger.log(`[MOCK MODE] WhatsApp saliente a ${to}: "${messageText.substring(0, 60)}..."`);
      return { success: true, messageId: `mock-wa-msg-${Date.now()}` };
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: messageText }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };
    } catch (err: any) {
      this.logger.error(`Error enviando WhatsApp: ${err.response?.data?.error?.message || err.message}`);
      return { success: false };
    }
  }

  async appendLeadToSheets(leadData: Record<string, unknown>): Promise<{ success: boolean }> {
    this.logger.log(`[SHEETS SYNC] Sincronizando lead a Google Sheets: ${JSON.stringify(leadData)}`);
    return { success: true };
  }

  getStatus() {
    const rawUrl = process.env.EVOLUTION_API_URL || '';
    const rawKey = process.env.EVOLUTION_API_KEY || '';
    const evolutionUrl = rawUrl.trim().replace(/\/$/, '');
    const evolutionKey = rawKey.trim().replace(/^['"]|['"]$/g, '');

    const hasAI = !!(
      process.env.GEMINI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY
    );

    return {
      whatsapp: {
        status: process.env.WHATSAPP_ACCESS_TOKEN ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Configurado' : 'Pendiente'
      },
      evolutionQR: {
        status: (evolutionUrl && evolutionKey) ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING,
        url: evolutionUrl ? evolutionUrl : 'No configurado',
        hasKey: !!evolutionKey
      },
      scalinky: {
        status: IntegrationStatus.CONFIGURING,
        connected: false,
        slug: null
      },
      aiProvider: {
        provider: process.env.AI_PROVIDER || 'gemini',
        status: hasAI ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING
      },
      googleCalendar: {
        status: process.env.GOOGLE_CLIENT_ID ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING,
        calendarId: process.env.GOOGLE_CALENDAR_ID ? 'Configurado' : 'Pendiente'
      },
      n8n: {
        status: process.env.N8N_BASE_URL ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING,
        url: process.env.N8N_BASE_URL || 'http://localhost:5678'
      }
    };
  }
}
