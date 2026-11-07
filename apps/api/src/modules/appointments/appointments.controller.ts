import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Headers
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Appointments & Calendar')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar turnos y reservas de la organización' })
  async findAll(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.appointmentsService.findAll(orgId);
  }

  @Post('check-slot')
  @ApiOperation({ summary: 'Verificar disponibilidad real de una franja horaria' })
  async checkSlot(
    @Body() body: { serviceId: string; startTime: string; organizationId?: string }
  ) {
    const orgId = body.organizationId || 'default-org-id';
    return this.appointmentsService.checkSlot(orgId, body.serviceId, body.startTime);
  }

  @Post('confirm-booking')
  @ApiOperation({ summary: 'Confirmar y asentar una reserva en la agenda' })
  async confirmBooking(
    @Body()
    body: {
      customerName: string;
      customerPhone: string;
      serviceId: string;
      startTime: string;
      organizationId?: string;
    }
  ) {
    const orgId = body.organizationId || 'default-org-id';
    return this.appointmentsService.confirmBooking(orgId, body);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar un turno existente' })
  async cancelAppointment(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    const orgId = req.user.organizationId;
    return this.appointmentsService.cancelAppointment(orgId, id, reason);
  }
}
