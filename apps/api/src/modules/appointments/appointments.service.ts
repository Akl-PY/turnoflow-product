import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Optional
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from '../../entities/appointment.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { IntegrationsService } from '../integrations/integrations.service';
import { AppointmentStatus } from '@turnoflow/shared';

@Injectable()
export class AppointmentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentsService.name);
  private reminderTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @Optional()
    @InjectRepository(BusinessProfile)
    private readonly profileRepo?: Repository<BusinessProfile>,
    @Optional()
    private readonly integrationsService?: IntegrationsService
  ) {}

  onModuleInit() {
    // Ejecutar revisión de recordatorios cada 15 minutos sin bloquear el event loop en tests
    this.reminderTimer = setInterval(() => {
      this.processUpcomingReminders().catch((err) =>
        this.logger.warn(`Error en cron de recordatorios: ${err.message}`)
      );
    }, 15 * 60 * 1000);
    if (this.reminderTimer && typeof this.reminderTimer.unref === 'function') {
      this.reminderTimer.unref();
    }
  }

  onModuleDestroy() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
    }
  }

  async processUpcomingReminders(): Promise<{ sent24h: number; sent2h: number }> {
    if (!this.integrationsService) return { sent24h: 0, sent2h: 0 };
    const now = Date.now();
    const confirmed = await this.appointmentRepo.find({
      where: { status: AppointmentStatus.CONFIRMED }
    });

    let sent24h = 0;
    let sent2h = 0;

    for (const appt of confirmed) {
      if (!appt.customerPhone || !appt.startTime) continue;
      const startMs = new Date(appt.startTime).getTime();
      const diffHours = (startMs - now) / (1000 * 60 * 60);
      const notes = appt.notes || '';

      let businessName = 'nuestro negocio';
      if (this.profileRepo) {
        const prof = await this.profileRepo.findOne({ where: { organizationId: appt.organizationId } });
        if (prof?.businessName) businessName = prof.businessName;
        if (prof?.specialInstructions) {
          try {
            const parsed = JSON.parse(prof.specialInstructions);
            if (parsed?.automations?.appointmentReminders === false) {
              continue;
            }
          } catch {
            // Ignorar
          }
        }
      }

      const timeStr = new Date(appt.startTime).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Recordatorio de 24 horas antes (entre 23 y 25 hs antes)
      if (diffHours >= 23 && diffHours <= 25 && !notes.includes('[REMINDER_24H]')) {
        const msg = `🔔 ¡Hola ${appt.customerName}! Te recordamos desde *${businessName}* que mañana a las *${timeStr} hs* tenés agendado *${appt.serviceName || 'tu turno'}*.\n\nSi necesitás reprogramar o hacer alguna consulta, respondé a este mensaje. ¡Te esperamos!`;
        const res = await this.integrationsService.sendQRWhatsAppMessage(
          appt.organizationId,
          appt.customerPhone,
          msg
        );
        if (res.success) {
          appt.notes = `${notes} [REMINDER_24H]`.trim();
          await this.appointmentRepo.save(appt);
          sent24h++;
        }
      }

      // Recordatorio de 2 horas antes (entre 1.5 y 2.5 hs antes)
      if (diffHours >= 1.5 && diffHours <= 2.5 && !notes.includes('[REMINDER_2H]')) {
        const msg = `⏰ ¡Hola ${appt.customerName}! Te recordamos que hoy a las *${timeStr} hs* (en 2 horas) tenés tu compromiso de *${appt.serviceName || 'atención'}* en *${businessName}*. ¡Nos vemos pronto!`;
        const res = await this.integrationsService.sendQRWhatsAppMessage(
          appt.organizationId,
          appt.customerPhone,
          msg
        );
        if (res.success) {
          appt.notes = `${notes} [REMINDER_2H]`.trim();
          await this.appointmentRepo.save(appt);
          sent2h++;
        }
      }
    }

    return { sent24h, sent2h };
  }

  async sendManualReminder(organizationId: string, id: string): Promise<{ success: boolean; message: string }> {
    const appointment = await this.appointmentRepo.findOne({
      where: [{ id, organizationId }, { id }]
    });
    if (!appointment) {
      throw new NotFoundException('Turno no encontrado.');
    }
    if (!this.integrationsService) {
      return { success: false, message: 'Servicio de WhatsApp no disponible.' };
    }

    let businessName = 'nuestro negocio';
    if (this.profileRepo) {
      const prof = await this.profileRepo.findOne({ where: { organizationId: appointment.organizationId } });
      if (prof?.businessName) businessName = prof.businessName;
    }

    const d = new Date(appointment.startTime);
    const dateStr = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const msg = `🔔 ¡Hola ${appointment.customerName}! Te escribimos desde *${businessName}* para recordarte tu compromiso de *${appointment.serviceName || 'servicio'}* agendado para el *${dateStr}* a las *${timeStr} hs*.\n\nPor favor confirmanos por acá si asistís o si necesitás coordinar otro horario. ¡Muchas gracias!`;

    const res = await this.integrationsService.sendQRWhatsAppMessage(
      appointment.organizationId,
      appointment.customerPhone,
      msg
    );

    if (res.success) {
      appointment.notes = `${appointment.notes || ''} [REMINDER_SENT]`.trim();
      await this.appointmentRepo.save(appointment);
      return { success: true, message: `Recordatorio enviado por WhatsApp a ${appointment.customerPhone}` };
    }

    return { success: false, message: 'No se pudo enviar el recordatorio por WhatsApp. Verifica que el QR esté conectado.' };
  }

  async findAll(organizationId: string): Promise<Appointment[]> {
    let list = await this.appointmentRepo.find({
      where: { organizationId },
      order: { startTime: 'ASC' }
    });
    if (list.length === 0) {
      list = await this.appointmentRepo.find({
        order: { startTime: 'ASC' }
      });
    }
    return list;
  }

  async checkSlot(organizationId: string, serviceId: string, startTimeIso: string): Promise<{
    isAvailable: boolean;
    alternativeSlots: string[];
  }> {
    const requestedStart = new Date(startTimeIso);
    const requestedEnd = new Date(requestedStart.getTime() + 60 * 60 * 1000); // 60 min

    // Verificar si ya existe un turno confirmado en esa franja
    const conflict = await this.appointmentRepo.findOne({
      where: {
        organizationId,
        status: AppointmentStatus.CONFIRMED,
        startTime: Between(
          new Date(requestedStart.getTime() - 45 * 60 * 1000),
          new Date(requestedEnd.getTime() - 15 * 60 * 1000)
        )
      }
    });

    if (conflict) {
      return {
        isAvailable: false,
        alternativeSlots: [
          new Date(requestedStart.getTime() + 120 * 60 * 1000).toISOString(),
          new Date(requestedStart.getTime() + 180 * 60 * 1000).toISOString()
        ]
      };
    }

    return {
      isAvailable: true,
      alternativeSlots: []
    };
  }

  async confirmBooking(organizationId: string, data: {
    customerName: string;
    customerPhone: string;
    serviceId: string;
    serviceName?: string;
    startTime: string;
    leadId?: string;
    notes?: string;
  }): Promise<Appointment> {
    const availability = await this.checkSlot(organizationId, data.serviceId, data.startTime);
    if (!availability.isAvailable) {
      throw new ConflictException('El horario solicitado ya se encuentra ocupado.');
    }

    const start = new Date(data.startTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const appointment = this.appointmentRepo.create({
      organizationId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: data.serviceId,
      serviceName: data.serviceName || data.serviceId,
      startTime: start,
      endTime: end,
      leadId: data.leadId,
      notes: data.notes,
      status: AppointmentStatus.CONFIRMED
    });

    return this.appointmentRepo.save(appointment);
  }

  async cancelAppointment(organizationId: string, id: string, reason?: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id, organizationId }
    });
    if (!appointment) {
      throw new NotFoundException('Turno no encontrado.');
    }
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = reason || 'Cancelado por solicitud del cliente';
    return this.appointmentRepo.save(appointment);
  }
}
