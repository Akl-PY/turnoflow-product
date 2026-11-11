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
}
