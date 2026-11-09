import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { ScalinkyService } from './scalinky.service';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ScalinkyService],
  exports: [IntegrationsService, ScalinkyService]
})
export class IntegrationsModule {}
