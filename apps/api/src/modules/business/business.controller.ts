import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Business Profile & Knowledge Base')
@Controller('business')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener configuración del negocio y base de conocimiento' })
  async getProfile(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.businessService.getProfile(orgId);
  }

  @Put()
  @ApiOperation({ summary: 'Actualizar datos comerciales, horarios, servicios o FAQs' })
  async updateProfile(@Request() req: any, @Body() body: any) {
    const orgId = req.user.organizationId;
    return this.businessService.updateProfile(orgId, body);
  }

  @Post('services')
  @ApiOperation({ summary: 'Añadir un servicio al catálogo del negocio' })
  async addService(@Request() req: any, @Body() body: any) {
    const orgId = req.user.organizationId;
    return this.businessService.addService(orgId, body);
  }

  @Get('sales-orders')
  @ApiOperation({ summary: 'Listar pedidos y compras registrados por el asistente de IA o manualmente' })
  async getSalesOrders(@Request() req: any) {
    const orgId = req.user.organizationId;
    return this.businessService.getSalesOrders(orgId);
  }

  @Post('sales-orders')
  @ApiOperation({ summary: 'Crear un nuevo pedido o venta manualmente' })
  async createSalesOrder(@Request() req: any, @Body() body: any) {
    const orgId = req.user.organizationId;
    return this.businessService.createSalesOrder(orgId, body);
  }

  @Patch('sales-orders/:orderId')
  @ApiOperation({ summary: 'Actualizar estado de un pedido o venta' })
  async updateSalesOrderStatus(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Body('status') status: string
  ) {
    const orgId = req.user.organizationId;
    return this.businessService.updateSalesOrderStatus(orgId, orderId, status);
  }

  @Delete('sales-orders/:orderId')
  @ApiOperation({ summary: 'Eliminar un pedido o venta' })
  async deleteSalesOrder(@Request() req: any, @Param('orderId') orderId: string) {
    const orgId = req.user.organizationId;
    return this.businessService.deleteSalesOrder(orgId, orderId);
  }
}
