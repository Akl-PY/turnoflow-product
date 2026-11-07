import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './modules/orders/orders.service';
import { Order } from './entities/order.entity';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import * as fs from 'fs';

describe('TurnoFlow AI — OrdersModule & Hardening de Descargas', () => {
  let ordersService: OrdersService;

  const mockOrderCompleted = {
    id: 'order-uuid-1',
    customerEmail: 'cliente@estetica.com',
    customerName: 'Valeria Rossi',
    customerPhone: '+5491144556677',
    status: 'completed',
    planId: 'turnoflow-implementation-kit',
    amount: 49.0,
    currency: 'USD',
    gateway: 'sandbox',
    downloadToken: 'valid-download-token-1234567890abcdef',
    downloadCount: 0,
    maxDownloads: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockOrderPending = {
    ...mockOrderCompleted,
    id: 'order-uuid-pending',
    status: 'pending',
    downloadToken: 'pending-token-abcdef'
  };

  const mockOrderExceeded = {
    ...mockOrderCompleted,
    id: 'order-uuid-exceeded',
    downloadCount: 10,
    maxDownloads: 10,
    downloadToken: 'exceeded-token-abcdef'
  };

  const mockOrderRepo = {
    create: jest.fn().mockImplementation((dto) => ({
      id: `order-created-${Date.now()}`,
      ...dto
    })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.downloadToken === 'valid-download-token-1234567890abcdef') {
        return Promise.resolve({ ...mockOrderCompleted });
      }
      if (where.downloadToken === 'pending-token-abcdef') {
        return Promise.resolve({ ...mockOrderPending });
      }
      if (where.downloadToken === 'exceeded-token-abcdef') {
        return Promise.resolve({ ...mockOrderExceeded });
      }
      return Promise.resolve(null);
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepo
        }
      ]
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  describe('1. Creación de Orden y Sesión de Checkout', () => {
    it('debe crear una orden exitosamente y generar un token criptográfico único', async () => {
      const result = await ordersService.createCheckoutSession({
        customerEmail: 'comprador@salon.com',
        customerName: 'Laura Martínez',
        customerPhone: '+5491133445566',
        planId: 'turnoflow-implementation-kit'
      });

      expect(result).toBeDefined();
      expect(result.orderId).toBeDefined();
      expect(result.downloadToken).toBeDefined();
      expect(result.downloadToken.length).toBeGreaterThanOrEqual(32);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(49.0);
      expect(result.currency).toBe('USD');
      expect(result.redirectUrl).toContain(result.downloadToken);
      expect(result.saasCredentials).toBeDefined();
      expect(result.saasCredentials.email).toBe('comprador@salon.com');
      expect(result.saasCredentials.temporaryPassword).toBeDefined();
      expect(result.saasCredentials.dashboardUrl).toContain('/login');
    });

    it('debe rechazar la orden si falta el email o el nombre del cliente', async () => {
      await expect(
        ordersService.createCheckoutSession({
          customerEmail: '',
          customerName: 'Laura'
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        ordersService.createCheckoutSession({
          customerEmail: 'test@email.com',
          customerName: ''
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Verificación de Seguridad y Entrega de Descarga', () => {
    it('debe arrojar NotFoundException ante un token inválido o inexistente', async () => {
      const mockRes: any = {
        setHeader: jest.fn()
      };

      await expect(
        ordersService.verifyAndStreamDownload('token-inexistente-xyz', mockRes)
      ).rejects.toThrow(NotFoundException);
    });

    it('debe arrojar BadRequestException si la orden aún no está completada', async () => {
      const mockRes: any = {
        setHeader: jest.fn()
      };

      await expect(
        ordersService.verifyAndStreamDownload('pending-token-abcdef', mockRes)
      ).rejects.toThrow(BadRequestException);
    });

    it('debe arrojar ForbiddenException si se alcanzó el límite de descargas (10/10)', async () => {
      const mockRes: any = {
        setHeader: jest.fn()
      };

      await expect(
        ordersService.verifyAndStreamDownload('exceeded-token-abcdef', mockRes)
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe configurar las cabeceras HTTP y pipear el ZIP con token válido', async () => {
      // Mockear createReadStream y existsSync
      const pipeMock = jest.fn();
      const readStreamMock: any = { pipe: pipeMock };
      const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const streamSpy = jest
        .spyOn(fs, 'createReadStream')
        .mockReturnValue(readStreamMock as any);

      const mockRes: any = {
        setHeader: jest.fn()
      };

      await ordersService.verifyAndStreamDownload(
        'valid-download-token-1234567890abcdef',
        mockRes
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/zip'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="TurnoFlow-AI-Complete.zip"'
      );
      expect(pipeMock).toHaveBeenCalledWith(mockRes);

      existsSpy.mockRestore();
      streamSpy.mockRestore();
    });
  });
});
