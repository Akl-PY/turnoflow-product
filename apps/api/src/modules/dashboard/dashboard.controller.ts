import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Dashboard Metrics')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obtener métricas clave de rendimiento en tiempo real' })
  async getMetrics(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.dashboardService.getMetrics(orgId);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Obtener historial de actividad reciente' })
  async getActivity(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.dashboardService.getRecentActivity(orgId);
  }

  @Post('reset-demo-data')
  @ApiOperation({ summary: 'Limpiar todos los datos de prueba (leads, citas y mensajes) para empezar de cero' })
  async resetDemoData(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.dashboardService.resetDemoData(orgId);
  }
}
