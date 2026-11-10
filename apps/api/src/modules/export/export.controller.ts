import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
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

  @Get('manual')
  @ApiOperation({ summary: 'Ver manual visual ilustrado de TurnoFlow AI (listo para imprimir o guardar como PDF)' })
  getManual(@Res() res: Response) {
    const candidates = [
      path.resolve(__dirname, 'manual.html'),
      path.resolve(__dirname, '../../../../documentation/MANUAL_DE_USO_TURNOFLOW.html'),
      path.resolve(process.cwd(), 'documentation/MANUAL_DE_USO_TURNOFLOW.html'),
      path.resolve(process.cwd(), '../../documentation/MANUAL_DE_USO_TURNOFLOW.html')
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return fs.createReadStream(candidate).pipe(res);
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<h2>Manual de TurnoFlow AI</h2><p>El manual está disponible en la guía del panel: <a href="https://turnoflow-product-clientturnoflow-p.vercel.app/guide">Ir a la Guía</a></p>`);
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
