import {
  Controller,
  Get,
  Put,
  Post,
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
}
