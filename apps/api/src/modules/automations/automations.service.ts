import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationEntity } from '../../entities/automation.entity';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(AutomationEntity)
    private readonly autoRepo: Repository<AutomationEntity>
  ) {}

  async findAll(organizationId: string): Promise<AutomationEntity[]> {
    let list = await this.autoRepo.find({ where: { organizationId } });
    if (list.length === 0) {
      list = await this.seedDefaultAutomations(organizationId);
    }
    return list;
  }

  async toggle(organizationId: string, id: string): Promise<AutomationEntity> {
    const item = await this.autoRepo.findOne({ where: { id, organizationId } });
    if (item) {
      item.isActive = !item.isActive;
      item.status = item.isActive ? 'healthy' : 'paused';
      return this.autoRepo.save(item);
    }
    throw new Error('Automatización no encontrada');
  }

  private async seedDefaultAutomations(organizationId: string): Promise<AutomationEntity[]> {
    const defaults = [
      {
        name: 'Recepción y Respuesta WhatsApp',
        type: 'incoming-messages',
        isActive: true,
        status: 'healthy',
        totalRuns: 142,
        successRuns: 141,
        failedRuns: 1
      },
      {
        name: 'Captura y Clasificación de Leads',
        type: 'lead-management',
        isActive: true,
        status: 'healthy',
        totalRuns: 89,
        successRuns: 89,
        failedRuns: 0
      },
      {
        name: 'Seguimiento Automático de Interesados',
        type: 'follow-up',
        isActive: true,
        status: 'healthy',
        totalRuns: 34,
        successRuns: 33,
        failedRuns: 1
      },
      {
        name: 'Gestión y Confirmación de Reservas',
        type: 'booking',
        isActive: true,
        status: 'healthy',
        totalRuns: 56,
        successRuns: 56,
        failedRuns: 0
      },
      {
        name: 'Transferencia a Atención Humana',
        type: 'handoff',
        isActive: true,
        status: 'healthy',
        totalRuns: 12,
        successRuns: 12,
        failedRuns: 0
      }
    ];

    const entities = defaults.map((d) =>
      this.autoRepo.create({
        ...d,
        organizationId,
        lastRunAt: new Date()
      })
    );
    return this.autoRepo.save(entities);
  }
}
