import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Lead } from '../../entities/lead.entity';
import { LeadStatus, LeadIntent, LeadPriority } from '@turnoflow/shared';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>
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
}
