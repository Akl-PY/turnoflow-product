import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProspectingService } from './prospecting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProspectingFlowSchema, UpdateProspectingFlowSchema } from '@turnoflow/shared';

@ApiTags('Prospecting & Guided Flows')
@Controller('prospecting')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProspectingController {
  constructor(private readonly prospectingService: ProspectingService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los embudos de prospección del negocio' })
  async findAll(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.prospectingService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un embudo por ID' })
  async findById(@Request() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    return this.prospectingService.findById(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo embudo de prospección con sus pasos y seguidillas' })
  async create(@Request() req: any, @Body() body: any) {
    const orgId = req.user.organizationId;
    const validated = CreateProspectingFlowSchema.parse(body);
    return this.prospectingService.create(orgId, validated);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un embudo de prospección' })
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const orgId = req.user.organizationId;
    const validated = UpdateProspectingFlowSchema.parse(body);
    return this.prospectingService.update(orgId, id, validated);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activar o pausar un embudo' })
  async toggleActive(@Request() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    return this.prospectingService.toggleActive(orgId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un embudo de prospección' })
  async delete(@Request() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    return this.prospectingService.delete(orgId, id);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simular la evaluación de un mensaje contra los embudos' })
  async simulate(
    @Request() req: any,
    @Body()
    body: {
      userText: string;
      activeFlowId?: string;
      currentStepId?: string;
      isNewContact?: boolean;
    }
  ) {
    const orgId = req.user.organizationId;
    return this.prospectingService.evaluateMessage({
      organizationId: orgId,
      userText: body.userText,
      conversationMetadata: {
        activeFlowId: body.activeFlowId,
        currentStepId: body.currentStepId
      },
      isNewContact: body.isNewContact
    });
  }
}
