import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { resolveKitZipPath, buildInMemoryZipBuffer } from '../orders/orders.service';

@ApiTags('Product Distribution & Export')
@Controller('export')
export class ExportController {
  @Get('download-kit')
  @ApiOperation({ summary: 'Descargar kit digital de implementación TurnoFlow-AI-Complete.zip' })
  downloadKit(@Res() res: Response) {
    const zipPath = resolveKitZipPath();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="TurnoFlow-AI-Complete.zip"');

    if (zipPath) {
      return fs.createReadStream(zipPath).pipe(res);
    }

    const readmeText = `# TurnoFlow AI — Kit de Implementación Oficial\nVersión: 1.0.0\nLicencia: Comercial (Pago Único USD 49)\n\nAccede a tu panel SaaS en: https://turnoflow-product-clientturnoflow-p.vercel.app/login\n`;
    const zipBuffer = buildInMemoryZipBuffer('TurnoFlow-AI-Complete/README.txt', readmeText);
    return res.send(zipBuffer);
  }

  @Get('manifest')
  @ApiOperation({ summary: 'Obtener manifiesto de contenidos y versión del kit digital' })
  getManifest() {
    return {
      product: 'TurnoFlow AI — Recepción Inteligente 24/7',
      version: '1.0.0',
      compiledAt: new Date().toISOString(),
      license: 'Comercial (Pago Único USD 49)',
      contents: {
        documentationFiles: 13,
        n8nWorkflows: 5,
        specializedPrompts: 5,
        csvTemplates: 5,
        resources: 6
      }
    };
  }
}
