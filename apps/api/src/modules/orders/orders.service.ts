import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';
import { Order, OrderStatus, PaymentGateway } from '../../entities/order.entity';

export interface CreateOrderDto {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  gateway?: PaymentGateway;
  gatewayOrderId?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>
  ) {}

  async createCheckoutSession(dto: CreateOrderDto) {
    if (!dto.customerEmail || !dto.customerName) {
      throw new BadRequestException('El email y nombre del cliente son requeridos.');
    }

    const downloadToken = crypto.randomBytes(24).toString('hex');
    const gateway = dto.gateway || 'sandbox';
    // En sandbox las órdenes se completan inmediatamente
    const status: OrderStatus = gateway === 'sandbox' ? 'completed' : 'pending';

    const order = this.orderRepo.create({
      customerEmail: dto.customerEmail.toLowerCase().trim(),
      customerName: dto.customerName.trim(),
      customerPhone: dto.customerPhone?.trim(),
      planId: dto.planId || 'turnoflow-implementation-kit',
      amount: dto.amount ?? 49.0,
      currency: dto.currency || 'USD',
      gateway,
      gatewayOrderId: dto.gatewayOrderId || `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      status,
      downloadToken,
      downloadCount: 0,
      maxDownloads: 10
    });

    const saved = await this.orderRepo.save(order);
    this.logger.log(`Orden creada exitosamente: ${saved.id} (Token: ${downloadToken})`);

    const redirectUrl = `/download?token=${downloadToken}`;

    return {
      orderId: saved.id,
      downloadToken: saved.downloadToken,
      status: saved.status,
      amount: saved.amount,
      currency: saved.currency,
      redirectUrl
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

    // Ruta al archivo ZIP empaquetado del producto
    const zipPath = path.resolve(__dirname, '../../../../dist/TurnoFlow-AI-Complete.zip');

    if (!fs.existsSync(zipPath)) {
      this.logger.error(`El archivo ZIP de entrega no existe en la ruta: ${zipPath}`);
      throw new NotFoundException(
        'El archivo digital no está disponible en este momento. Intente más tarde.'
      );
    }

    // Incrementar contador de descargas
    order.downloadCount += 1;
    await this.orderRepo.save(order);
    this.logger.log(`Descarga autorizada para orden ${order.id}. Total descargas: ${order.downloadCount}/${order.maxDownloads}`);

    // Configurar cabeceras de respuesta HTTP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="TurnoFlow-AI-Complete.zip"'
    );

    const stream = fs.createReadStream(zipPath);
    return stream.pipe(res);
  }

  async findByToken(token: string): Promise<Order | null> {
    return this.orderRepo.findOne({ where: { downloadToken: token } });
  }
}
