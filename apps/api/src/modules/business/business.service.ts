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
      profile = this.profileRepo.create({
        organizationId,
        businessName: 'Mi Negocio de Belleza',
        services: [],
        businessHours: [],
        faqs: []
      });
      profile = await this.profileRepo.save(profile);
    }
    return profile;
  }

  async updateProfile(organizationId: string, updateData: any): Promise<BusinessProfile> {
    const validated = BusinessConfigUpdateSchema.partial().parse(updateData);
    let profile = await this.getProfile(organizationId);
    Object.assign(profile, validated);
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
