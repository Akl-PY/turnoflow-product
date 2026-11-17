import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { BusinessConfigUpdateSchema, ServiceItem } from '@turnoflow/shared';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(BusinessProfile)
    private readonly profileRepo: Repository<BusinessProfile>
  ) {}

  async getProfile(organizationId: string): Promise<BusinessProfile> {
    let profile = await this.profileRepo.findOne({ where: { organizationId } });
    if (!profile) {
      // Fallback: si hubo reinicio de contenedor y existe un único perfil principal, reutilizarlo
      const existingAll = await this.profileRepo.find();
      if (existingAll.length === 1) {
        profile = existingAll[0];
      } else {
        profile = this.profileRepo.create({
          organizationId,
          businessName: 'Mi Negocio',
          description: 'Atención comercial y coordinación de servicios',
          services: [],
          businessHours: [
            { day: 'monday', open: '09:00', close: '18:00', isOpen: true },
            { day: 'tuesday', open: '09:00', close: '18:00', isOpen: true },
            { day: 'wednesday', open: '09:00', close: '18:00', isOpen: true },
            { day: 'thursday', open: '09:00', close: '18:00', isOpen: true },
            { day: 'friday', open: '09:00', close: '18:00', isOpen: true },
            { day: 'saturday', open: '09:00', close: '13:00', isOpen: true },
            { day: 'sunday', open: '00:00', close: '00:00', isOpen: false }
          ],
          faqs: []
        });
        profile = await this.profileRepo.save(profile);
      }
    }
    return profile;
  }

  async updateProfile(organizationId: string, updateData: any): Promise<BusinessProfile> {
    const validated = BusinessConfigUpdateSchema.partial().parse(updateData);
    const profile = await this.getProfile(organizationId);

    // Solo actualizar las propiedades explícitamente enviadas en updateData
    // para que los defaults de Zod (.default([])) no borren services o businessHours existentes
    for (const key of Object.keys(updateData || {})) {
      if (key === 'specialInstructions') {
        const incomingStr = updateData.specialInstructions;
        if (incomingStr === '') {
          // Si vacía explícitamente specialInstructions, conservar bookingEnabled si existía
          try {
            const prev = profile.specialInstructions ? JSON.parse(profile.specialInstructions) : {};
            profile.specialInstructions = JSON.stringify({
              bookingEnabled: prev.bookingEnabled !== undefined ? prev.bookingEnabled : true
            });
          } catch {
            profile.specialInstructions = '';
          }
        } else if (typeof incomingStr === 'string') {
          try {
            const prev = profile.specialInstructions ? JSON.parse(profile.specialInstructions) : {};
            const next = JSON.parse(incomingStr);
            const merged = { ...prev, ...next };
            if (next.scalinkySlug === '' || next.scalinkySlug === null) {
              delete merged.scalinkySlug;
              delete merged.scalinkyCache;
            }
            profile.specialInstructions = JSON.stringify(merged);
          } catch {
            profile.specialInstructions = incomingStr;
          }
        }
      } else if (key in validated && (validated as any)[key] !== undefined) {
        (profile as any)[key] = (validated as any)[key];
      }
    }

    return this.profileRepo.save(profile);
  }

  async addService(organizationId: string, serviceData: Partial<ServiceItem>): Promise<BusinessProfile> {
    const profile = await this.getProfile(organizationId);
    const services = profile.services || [];
    const newService: ServiceItem = {
      id: 'srv-' + Math.random().toString(36).substring(2, 8),
      name: serviceData.name || 'Nuevo Servicio',
      category: serviceData.category || 'General',
      description: serviceData.description || '',
      price: serviceData.price ?? 25,
      currency: serviceData.currency || profile.currency || 'USD',
      durationMinutes: serviceData.durationMinutes ?? 45,
      isActive: true
    };
    services.push(newService);
    profile.services = services;
    return this.profileRepo.save(profile);
  }

  private parseInstructions(profile: BusinessProfile): Record<string, any> {
    if (!profile.specialInstructions) return {};
    try {
      return JSON.parse(profile.specialInstructions);
    } catch {
      return { customContext: profile.specialInstructions };
    }
  }

  async getSalesOrders(organizationId: string): Promise<any[]> {
    const profile = await this.getProfile(organizationId);
    const parsed = this.parseInstructions(profile);
    return Array.isArray(parsed.salesOrders) ? parsed.salesOrders : [];
  }

  async createSalesOrder(organizationId: string, orderData: any): Promise<any> {
    const profile = await this.getProfile(organizationId);
    const parsed = this.parseInstructions(profile);
    const orders = Array.isArray(parsed.salesOrders) ? parsed.salesOrders : [];

    const newOrder = {
      id: `ord-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      customerName: orderData.customerName || 'Cliente',
      customerPhone: orderData.customerPhone || '',
      itemsSummary: orderData.itemsSummary || 'Pedido General',
      totalAmount: Number(orderData.totalAmount) || 0,
      currency: orderData.currency || profile.currency || 'USD',
      deliveryMethod: orderData.deliveryMethod || 'A coordinar',
      paymentMethod: orderData.paymentMethod || 'Transferencia / Efectivo',
      status: orderData.status || 'PENDIENTE',
      notes: orderData.notes || '',
      createdAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    parsed.salesOrders = orders;
    profile.specialInstructions = JSON.stringify(parsed);
    await this.profileRepo.save(profile);
    return newOrder;
  }

  async updateSalesOrderStatus(organizationId: string, orderId: string, status: string): Promise<any> {
    const profile = await this.getProfile(organizationId);
    const parsed = this.parseInstructions(profile);
    const orders: any[] = Array.isArray(parsed.salesOrders) ? parsed.salesOrders : [];
    const target = orders.find((o) => o.id === orderId);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
      parsed.salesOrders = orders;
      profile.specialInstructions = JSON.stringify(parsed);
      await this.profileRepo.save(profile);
    }
    return target;
  }

  async deleteSalesOrder(organizationId: string, orderId: string): Promise<{ deleted: boolean }> {
    const profile = await this.getProfile(organizationId);
    const parsed = this.parseInstructions(profile);
    const orders: any[] = Array.isArray(parsed.salesOrders) ? parsed.salesOrders : [];
    parsed.salesOrders = orders.filter((o) => o.id !== orderId);
    profile.specialInstructions = JSON.stringify(parsed);
    await this.profileRepo.save(profile);
    return { deleted: true };
  }
}
