import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Response } from 'express';
import { Order, OrderStatus, PaymentGateway } from '../../entities/order.entity';
import { AuthService } from '../auth/auth.service';

export interface CreateOrderDto {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  businessName?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  gateway?: PaymentGateway;
  gatewayOrderId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export function buildInMemoryZipBuffer(filename: string, content: string): Buffer {
  const nameBuf = Buffer.from(filename, 'utf-8');
  const dataBuf = Buffer.from(content, 'utf-8');

  // CRC32 calculation
  let crc = 0xffffffff;
  for (let i = 0; i < dataBuf.length; i++) {
    crc ^= dataBuf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  crc = (crc ^ 0xffffffff) >>> 0;

  // Local file header (30 bytes + name)
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0); // signature
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // flags
  localHeader.writeUInt16LE(0, 8); // compression (0 = store)
  localHeader.writeUInt16LE(0, 10); // mod time
  localHeader.writeUInt16LE(0, 12); // mod date
  localHeader.writeUInt32LE(crc, 14); // crc32
  localHeader.writeUInt32LE(dataBuf.length, 18); // compressed size
  localHeader.writeUInt32LE(dataBuf.length, 22); // uncompressed size
  localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
  localHeader.writeUInt16LE(0, 28); // extra field length

  // Central directory header (46 bytes + name)
  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0); // signature
  centralHeader.writeUInt16LE(20, 4); // version made by
  centralHeader.writeUInt16LE(20, 6); // version needed
  centralHeader.writeUInt16LE(0, 8); // flags
  centralHeader.writeUInt16LE(0, 10); // compression
  centralHeader.writeUInt16LE(0, 12); // mod time
  centralHeader.writeUInt16LE(0, 14); // mod date
  centralHeader.writeUInt32LE(crc, 16); // crc32
  centralHeader.writeUInt32LE(dataBuf.length, 20); // compressed size
  centralHeader.writeUInt32LE(dataBuf.length, 24); // uncompressed size
  centralHeader.writeUInt16LE(nameBuf.length, 28); // file name length
  centralHeader.writeUInt16LE(0, 30); // extra length
  centralHeader.writeUInt16LE(0, 32); // comment length
  centralHeader.writeUInt16LE(0, 34); // disk number
  centralHeader.writeUInt16LE(0, 36); // internal attrs
  centralHeader.writeUInt32LE(0, 38); // external attrs
  centralHeader.writeUInt32LE(0, 42); // relative offset

  const centralOffset = localHeader.length + nameBuf.length + dataBuf.length;
  const centralSize = centralHeader.length + nameBuf.length;

  // End of central directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(1, 8); // entries on disk
  eocd.writeUInt16LE(1, 10); // total entries
  eocd.writeUInt32LE(centralSize, 12); // size of central dir
  eocd.writeUInt32LE(centralOffset, 16); // offset of central dir
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localHeader, nameBuf, dataBuf, centralHeader, nameBuf, eocd]);
}

export function resolveKitZipPath(): string | null {
  const candidates = [
    path.resolve(__dirname, '../../../../resources/TurnoFlow-AI-Complete.zip'),
    path.resolve(process.cwd(), 'resources/TurnoFlow-AI-Complete.zip'),
    path.resolve(process.cwd(), '../../resources/TurnoFlow-AI-Complete.zip'),
    path.resolve(__dirname, '../../../../dist/TurnoFlow-AI-Complete.zip'),
    path.resolve(process.cwd(), 'dist/TurnoFlow-AI-Complete.zip'),
    path.resolve(process.cwd(), '../../dist/TurnoFlow-AI-Complete.zip')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @Optional()
    private readonly authService?: AuthService
  ) {}

  async createCheckoutSession(dto: CreateOrderDto) {
    if (!dto.customerEmail || !dto.customerName) {
      throw new BadRequestException('El email y nombre del cliente son requeridos.');
    }

    const cleanEmail = dto.customerEmail.toLowerCase().trim();
    const cleanName = dto.customerName.trim();
    const downloadToken = crypto.randomBytes(24).toString('hex');
    const gateway = dto.gateway || 'sandbox';
    // En sandbox las órdenes se completan inmediatamente
    const status: OrderStatus = gateway === 'sandbox' ? 'completed' : 'pending';

    const order = this.orderRepo.create({
      customerEmail: cleanEmail,
      customerName: cleanName,
      customerPhone: dto.customerPhone?.trim(),
      planId: dto.planId || 'turnoflow-implementation-kit',
      amount: dto.amount ?? 49.0,
      currency: dto.currency || 'USD',
      gateway,
      gatewayOrderId:
        dto.gatewayOrderId || `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      status,
      downloadToken,
      downloadCount: 0,
      maxDownloads: 10
    });

    const saved = await this.orderRepo.save(order);
    this.logger.log(`Orden creada exitosamente: ${saved.id} (Token: ${downloadToken})`);

    // Aprovisionar automáticamente la cuenta SaaS del comprador
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'TurnoFlow2026!';
    const defaultDashboardUrl =
      process.env.CLIENT_DASHBOARD_URL ||
      'https://turnoflow-product-clientturnoflow-p.vercel.app/login';

    let saasCredentials = {
      email: cleanEmail,
      temporaryPassword: defaultPassword,
      dashboardUrl: defaultDashboardUrl
    };

    if (this.authService) {
      try {
        const provisioned = await this.authService.provisionBuyerAccount({
          email: cleanEmail,
          fullName: cleanName,
          businessName: dto.businessName || `Salón de ${cleanName}`,
          initialPassword: defaultPassword
        });
        saasCredentials = {
          email: provisioned.email,
          temporaryPassword: provisioned.temporaryPassword,
          dashboardUrl: provisioned.dashboardUrl
        };
      } catch (err) {
        this.logger.warn(`Aviso aprovisionando cuenta SaaS: ${(err as Error).message}`);
      }
    }

    let redirectUrl = `/download?token=${downloadToken}`;

    // Si el gateway es Stripe y hay STRIPE_SECRET_KEY configurada en el servidor:
    if (gateway === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeRes = await axios.post(
          'https://api.stripe.com/v1/checkout/sessions',
          new URLSearchParams({
            'payment_method_types[0]': 'card',
            'line_items[0][price_data][currency]': (dto.currency || 'usd').toLowerCase(),
            'line_items[0][price_data][product_data][name]': 'Licencia TurnoFlow AI',
            'line_items[0][price_data][unit_amount]': String(Math.round((dto.amount ?? 49) * 100)),
            'line_items[0][quantity]': '1',
            mode: 'payment',
            customer_email: cleanEmail,
            client_reference_id: saved.id,
            success_url: `${dto.successUrl || 'https://turnoflow-landing.vercel.app/thank-you'}?token=${downloadToken}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: dto.cancelUrl || 'https://turnoflow-landing.vercel.app/checkout'
          }),
          {
            headers: {
              Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 10000
          }
        );
        if (stripeRes.data?.url) {
          redirectUrl = stripeRes.data.url;
          this.logger.log(`Sesión de Stripe Checkout generada: ${stripeRes.data.id}`);
        }
      } catch (err: any) {
        this.logger.error(`Error generando Stripe Checkout: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    // Si el gateway es Mercado Pago y hay MERCADOPAGO_ACCESS_TOKEN configurado:
    if (gateway === 'mercadopago' && process.env.MERCADOPAGO_ACCESS_TOKEN) {
      try {
        const mpRes = await axios.post(
          'https://api.mercadopago.com/checkout/preferences',
          {
            items: [
              {
                id: saved.id,
                title: 'Licencia TurnoFlow AI',
                quantity: 1,
                unit_price: Number(dto.amount ?? 49),
                currency_id: dto.currency || 'USD'
              }
            ],
            payer: {
              name: cleanName,
              email: cleanEmail
            },
            external_reference: saved.id,
            back_urls: {
              success: `${dto.successUrl || 'https://turnoflow-landing.vercel.app/thank-you'}?token=${downloadToken}`,
              failure: dto.cancelUrl || 'https://turnoflow-landing.vercel.app/checkout'
            },
            auto_return: 'approved'
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        if (mpRes.data?.init_point) {
          redirectUrl = mpRes.data.init_point;
          this.logger.log(`Preferencia de Mercado Pago generada: ${mpRes.data.id}`);
        }
      } catch (err: any) {
        this.logger.error(`Error generando Mercado Pago: ${err.response?.data?.message || err.message}`);
      }
    }

    return {
      orderId: saved.id,
      downloadToken: saved.downloadToken,
      status: saved.status,
      amount: saved.amount,
      currency: saved.currency,
      redirectUrl,
      checkoutUrl: redirectUrl,
      saasCredentials
    };
  }

  async getOrderDetailsByToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Token inválido.');
    }

    const order = await this.orderRepo.findOne({
      where: { downloadToken: token }
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada para el token suministrado.');
    }

    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'TurnoFlow2026!';
    const defaultDashboardUrl =
      process.env.CLIENT_DASHBOARD_URL ||
      'https://turnoflow-product-clientturnoflow-p.vercel.app/login';

    return {
      orderId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      planId: order.planId,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      downloadCount: order.downloadCount,
      maxDownloads: order.maxDownloads,
      saasCredentials: {
        email: order.customerEmail,
        temporaryPassword: defaultPassword,
        dashboardUrl: defaultDashboardUrl
      }
    };
  }

  async verifyAndStreamDownload(token: string, res: Response) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Token de descarga inválido.');
    }

    const order = await this.orderRepo.findOne({
      where: { downloadToken: token }
    });

    if (!order) {
      throw new NotFoundException('Token de descarga no encontrado o inválido.');
    }

    if (order.status !== 'completed') {
      throw new BadRequestException(
        `La orden se encuentra en estado "${order.status}". Debe completarse para habilitar la descarga.`
      );
    }

    if (order.downloadCount >= order.maxDownloads) {
      throw new ForbiddenException(
        `Límite de descargas alcanzado (${order.maxDownloads}/${order.maxDownloads}). Por favor contacte a soporte.`
      );
    }

    const zipPath = resolveKitZipPath();

    // Incrementar contador de descargas
    order.downloadCount += 1;
    await this.orderRepo.save(order);
    this.logger.log(
      `Descarga autorizada para orden ${order.id}. Total descargas: ${order.downloadCount}/${order.maxDownloads}`
    );

    // Configurar cabeceras de respuesta HTTP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="TurnoFlow-AI-Complete.zip"'
    );

    if (zipPath) {
      const stream = fs.createReadStream(zipPath);
      return stream.pipe(res);
    }

    // Fallback garantizado en memoria si el contenedor no montó dist/
    const readmeText = `# TurnoFlow AI — Kit de Implementación Oficial\nVersión: 1.0.0\nLicencia: Comercial\n\nAccede a tu panel SaaS en: https://turnoflow-product-clientturnoflow-p.vercel.app/login\n`;
    const zipBuffer = buildInMemoryZipBuffer('TurnoFlow-AI-Complete/README.txt', readmeText);
    return res.send(zipBuffer);
  }

  async findByToken(token: string): Promise<Order | null> {
    return this.orderRepo.findOne({ where: { downloadToken: token } });
  }
}
