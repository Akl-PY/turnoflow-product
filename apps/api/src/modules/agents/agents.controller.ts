import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Agents Configuration')
@Controller('agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar agentes de IA configurados en la organización' })
  async findAll(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.agentsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de configuración de un agente' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    return this.agentsService.findOne(orgId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar configuración, instrucciones o proveedor de un agente' })
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const orgId = req.user.organizationId;
    return this.agentsService.update(orgId, id, body);
  }
}
