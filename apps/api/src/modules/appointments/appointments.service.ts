import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from '../../entities/appointment.entity';
import { AppointmentStatus } from '@turnoflow/shared';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>
  ) {}

  async findAll(organizationId: string): Promise<Appointment[]> {
    return this.appointmentRepo.find({
      where: { organizationId },
      order: { startTime: 'ASC' }
    });
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
    startTime: string;
    leadId?: string;
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
      serviceName: data.serviceId,
      startTime: start,
      endTime: end,
      leadId: data.leadId,
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
