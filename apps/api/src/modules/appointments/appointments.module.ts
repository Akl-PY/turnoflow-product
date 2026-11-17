import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../../entities/appointment.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, BusinessProfile]),
    IntegrationsModule
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService]
})
export class AppointmentsModule {}
