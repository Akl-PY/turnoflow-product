import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Lead } from '../../entities/lead.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { LeadStatus, LeadIntent, LeadPriority } from '@turnoflow/shared';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @Optional()
    @InjectRepository(BusinessProfile)
    private readonly profileRepo?: Repository<BusinessProfile>
  ) {}

  async findAll(organizationId: string, query?: { status?: string; search?: string }): Promise<Lead[]> {
    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.organizationId = :organizationId', { organizationId });

    if (query?.status) {
      qb.andWhere('lead.status = :status', { status: query.status });
    }

    if (query?.search) {
      qb.andWhere('(LOWER(lead.name) LIKE :s OR lead.phone LIKE :s)', {
        s: `%${query.search.toLowerCase()}%`
      });
    }

    qb.orderBy('lead.lastInteractionAt', 'DESC');
    return qb.getMany();
  }

  async findOne(organizationId: string, id: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({
      where: { id, organizationId }
    });
    if (!lead) {
      throw new NotFoundException(`Lead con ID "${id}" no encontrado en esta organización.`);
    }
    return lead;
  }

  async create(organizationId: string, data: Partial<Lead>): Promise<Lead> {
    const lead = this.leadRepo.create({
      ...data,
      organizationId,
      status: data.status || LeadStatus.NEW,
      intent: data.intent || LeadIntent.INFORMATIONAL,
      priority: data.priority || LeadPriority.WARM,
      source: data.source || 'whatsapp'
    });
    return this.leadRepo.save(lead);
  }

  async update(organizationId: string, id: string, data: Partial<Lead>): Promise<Lead> {
    const lead = await this.findOne(organizationId, id);
    Object.assign(lead, data);
    return this.leadRepo.save(lead);
  }

  async markContacted(organizationId: string, id: string): Promise<Lead> {
    const lead = await this.findOne(organizationId, id);
    lead.status = LeadStatus.CONTACTED;
    lead.lastInteractionAt = new Date();
    return this.leadRepo.save(lead);
  }

  async findPendingFollowUps(organizationId?: string): Promise<Lead[]> {
    const qb = this.leadRepo.createQueryBuilder('lead');
    qb.where('lead.status IN (:...statuses)', {
      statuses: [LeadStatus.NEW, LeadStatus.INTERESTED, LeadStatus.PENDING]
    });

    if (organizationId) {
      qb.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    return qb.take(50).getMany();
  }

  async bulkImport(
    organizationId: string,
    items: Array<{ name?: string; phone: string; notes?: string }>,
    markAsCustomer = true
  ): Promise<{ importedCount: number; updatedCount: number }> {
    let importedCount = 0;
    let updatedCount = 0;
    const customerPhonesToAdd: string[] = [];

    const existingLeads = await this.leadRepo.find({ where: { organizationId } });

    for (const item of items) {
      const digits = (item.phone || '').replace(/\D/g, '');
      if (digits.length < 7) continue;
      const normalizedPhone = item.phone.trim().startsWith('+') ? item.phone.trim() : `+${digits}`;
      customerPhonesToAdd.push(normalizedPhone);

      const match = existingLeads.find((l) => {
        const lDigits = (l.phone || '').replace(/\D/g, '');
        return lDigits === digits || (lDigits.length >= 8 && digits.length >= 8 && lDigits.slice(-8) === digits.slice(-8));
      });

      if (match) {
        if (item.name && item.name.trim()) match.name = item.name.trim();
        if (markAsCustomer) match.status = LeadStatus.BOOKED;
        if (item.notes) match.notes = item.notes;
        match.lastInteractionAt = new Date();
        await this.leadRepo.save(match);
        updatedCount++;
      } else {
        const created = this.leadRepo.create({
          organizationId,
          name: (item.name || '').trim() || `Contacto ${normalizedPhone}`,
          phone: normalizedPhone,
          requestedService: markAsCustomer ? 'Cliente / Alumno Actual' : 'Importado',
          status: markAsCustomer ? LeadStatus.BOOKED : LeadStatus.NEW,
          intent: LeadIntent.HIGH,
          priority: LeadPriority.WARM,
          source: 'bulk_import',
          notes: item.notes || 'Importado en bloque desde el panel',
          lastInteractionAt: new Date()
        });
        await this.leadRepo.save(created);
        existingLeads.push(created);
        importedCount++;
      }
    }

    if (markAsCustomer && customerPhonesToAdd.length > 0 && this.profileRepo) {
      let profile = await this.profileRepo.findOne({ where: { organizationId } });
      if (!profile) profile = await this.profileRepo.findOne({ where: {} });
      if (profile) {
        let parsed: Record<string, any> = {};
        if (profile.specialInstructions) {
          try {
            parsed = JSON.parse(profile.specialInstructions);
          } catch {
            parsed = { customContext: profile.specialInstructions };
          }
        }
        const existingPhones: string[] = Array.isArray(parsed.existingCustomerPhones)
          ? parsed.existingCustomerPhones
          : [];
        const merged = Array.from(new Set([...existingPhones, ...customerPhonesToAdd]));
        parsed.existingCustomerPhones = merged;
        profile.specialInstructions = JSON.stringify(parsed);
        await this.profileRepo.save(profile);
      }
    }

    return { importedCount, updatedCount };
  }
}
