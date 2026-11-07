import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { OrdersService, CreateOrderDto } from './orders.service';

@ApiTags('Orders & Digital Fulfillment')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout-session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear sesión de compra y generar token de descarga seguro'
  })
  @ApiResponse({
    status: 201,
    description: 'Orden registrada y token de descarga generado'
  })
  async createCheckoutSession(@Body() body: CreateOrderDto) {
    return this.ordersService.createCheckoutSession(body);
  }

  @Get('verify-download/:token')
  @ApiOperation({
    summary: 'Validar token de compra y descargar el archivo TurnoFlow-AI-Complete.zip'
  })
  @ApiResponse({
    status: 200,
    description: 'Transmisión binaria del kit digital ZIP'
  })
  @ApiResponse({
    status: 403,
    description: 'Límite de descargas alcanzado'
  })
  @ApiResponse({
    status: 404,
    description: 'Token inválido o archivo no encontrado'
  })
  async verifyDownload(@Param('token') token: string, @Res() res: Response) {
    return this.ordersService.verifyAndStreamDownload(token, res);
  }
}
