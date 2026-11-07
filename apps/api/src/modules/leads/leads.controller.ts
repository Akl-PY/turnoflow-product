import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Headers,
  UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Leads CRM')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar prospectos del CRM con filtros por estado o búsqueda' })
  async findAll(@Request() req: any, @Query() query: { status?: string; search?: string }) {
    const orgId = req.user.organizationId;
    return this.leadsService.findAll(orgId, query);
  }

  @Get('pending-followups')
  @ApiOperation({ summary: 'Obtener leads que requieren seguimiento (usado por n8n o cron)' })
  async findPendingFollowUps(@Headers('x-turnoflow-api-key') apiKey?: string) {
    // Permite autenticación por API Key interna para n8n
    const expectedKey = process.env.TURNOFLOW_API_KEY || 'default-secret-key';
    if (apiKey && apiKey !== expectedKey) {
      throw new UnauthorizedException('API Key inválida.');
    }
    return this.leadsService.findPendingFollowUps();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener detalle de un prospecto' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    return this.leadsService.findOne(orgId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo prospecto manualmente' })
  async create(@Request() req: any, @Body() body: any) {
    const orgId = req.user.organizationId;
    return this.leadsService.create(orgId, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar estado o notas de un prospecto' })
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const orgId = req.user.organizationId;
    return this.leadsService.update(orgId, id, body);
  }

  @Patch(':id/mark-contacted')
  @ApiOperation({ summary: 'Marcar lead como contactado tras envío de mensaje' })
  async markContacted(
    @Param('id') id: string,
    @Headers('x-turnoflow-api-key') apiKey?: string,
    @Request() req?: any
  ) {
    const orgId = req?.user?.organizationId || 'default-org-id';
    return this.leadsService.markContacted(orgId, id);
  }
}
