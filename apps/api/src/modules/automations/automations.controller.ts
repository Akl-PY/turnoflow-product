import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Automations (n8n Workflows)')
@Controller('automations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar workflows de automatización y su estado de ejecución' })
  async findAll(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.automationsService.findAll(orgId);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Pausar o activar un workflow de automatización' })
  async toggle(@Request() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    return this.automationsService.toggle(orgId, id);
  }
}
