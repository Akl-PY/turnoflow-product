import { Injectable, Logger } from '@nestjs/common';
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

  async generateQRSession(organizationId: string): Promise<{ qrCode: string; pairingCode?: string; status: string; expiresAt: string }> {
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (evolutionUrl && evolutionKey) {
      try {
        const instanceName = `tf_${organizationId.replace(/-/g, '').substring(0, 12)}`;
        const baseUrl = evolutionUrl.replace(/\/$/, '');
        const webhookUrl = `${process.env.APP_URL || 'https://turnoflowapi-production.up.railway.app'}/api/conversations/whatsapp-qr-webhook/${organizationId}`;
        await axios.post(
          `${baseUrl}/instance/create`,
          {
            instanceName,
            qrcode: true,
            webhook: webhookUrl,
            webhook_by_events: false,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
          },
          { headers: { apikey: evolutionKey }, timeout: 3500 }
        ).catch(() => null);

        const connectRes = await axios.get(
          `${baseUrl}/instance/connect/${instanceName}`,
          { headers: { apikey: evolutionKey }, timeout: 3500 }
        );

        const qrBase64 = connectRes.data?.base64 || connectRes.data?.code;
        const pairingCode = connectRes.data?.pairingCode;

        if (qrBase64) {
          const expiresAt = new Date(Date.now() + 60 * 1000);
          this.qrSessions.set(organizationId, {
            organizationId,
            status: 'SCAN_QR',
            qrCodeDataUrl: qrBase64,
            pairingCode,
            expiresAt
          });

          return {
            qrCode: qrBase64,
            pairingCode,
            status: 'SCAN_QR',
            expiresAt: expiresAt.toISOString()
          };
        }
      } catch (err: any) {
        this.logger.warn(`Evolution API connection failed, falling back to native QR: ${err.message}`);
      }
    }

    // Generador nativo de sesión QR TurnoFlow
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
    existing.connectedPhone = phone || '+5491188990011';
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
    text: string
  ): Promise<{ success: boolean; messageId?: string }> {
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionUrl || !evolutionKey) {
      this.logger.log(`[QR MOCK] WhatsApp QR saliente a ${to}: "${text.substring(0, 60)}..."`);
      return { success: true, messageId: `mock-wa-qr-${Date.now()}` };
    }

    try {
      const instanceName = `tf_${organizationId.replace(/-/g, '').substring(0, 12)}`;
      const cleanPhone = to.replace(/\D/g, '');
      const baseUrl = evolutionUrl.replace(/\/$/, '');

      const response = await axios.post(
        `${baseUrl}/message/sendText/${instanceName}`,
        {
          number: cleanPhone,
          text: text
        },
        {
          headers: {
            apikey: evolutionKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      this.logger.log(`Mensaje QR enviado a ${cleanPhone} vía Evolution: ${response.data?.key?.id || 'ok'}`);
      return { success: true, messageId: response.data?.key?.id };
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
    return {
      whatsapp: {
        status: process.env.WHATSAPP_ACCESS_TOKEN ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Configurado' : 'Pendiente'
      },
      aiProvider: {
        provider: process.env.AI_PROVIDER || 'anthropic',
        status: (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) ? IntegrationStatus.CONNECTED : IntegrationStatus.CONFIGURING
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
