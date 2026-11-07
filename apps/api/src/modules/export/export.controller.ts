import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Product Distribution & Export')
@Controller('export')
export class ExportController {
  @Get('download-kit')
  @ApiOperation({ summary: 'Descargar kit digital de implementación TurnoFlow-AI-Complete.zip' })
  downloadKit(@Res() res: Response) {
    const zipPath = path.resolve(__dirname, '../../../../dist/TurnoFlow-AI-Complete.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=TurnoFlow-AI-Complete.zip');
      return fs.createReadStream(zipPath).pipe(res);
    }
    return res.status(404).json({
      error: 'El archivo ZIP de distribución aún no ha sido compilado. Ejecute npm run export:dist'
    });
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
