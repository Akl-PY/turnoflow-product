const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Generando paquete digital descargable TurnoFlow-AI-Complete.zip...');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const tempDir = path.join(distDir, 'TurnoFlow-AI-Complete');
const zipFile = path.join(distDir, 'TurnoFlow-AI-Complete.zip');

// 1. Asegurar directorios
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}
fs.mkdirSync(tempDir, { recursive: true });

// 2. Copiar carpetas del producto
const foldersToCopy = [
  'documentation',
  'automations',
  'prompts',
  'templates',
  'resources'
];

foldersToCopy.forEach((folder) => {
  const src = path.join(rootDir, folder);
  const dest = path.join(tempDir, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✅ Copiada carpeta: ${folder}`);
  }
});

// 3. Crear README y MANIFEST para el comprador
const manifestContent = `# TurnoFlow AI — Kit de Implementación Oficial
Versión: 1.0.0
Fecha de Emisión: ${new Date().toISOString()}
Licencia: Comercial (Pago Único USD 49)

## Contenido del Paquete:
1. /documentation: 13 Guías completas paso a paso (desde START-HERE.md hasta resolución de errores).
2. /automations: 5 Workflows oficiales para n8n en formato JSON listo para importar.
3. /prompts: 5 Especificaciones blindadas de prompts para los Agentes Especializados.
4. /templates: 5 Archivos CSV modelo (servicios, configuración, FAQs, leads y turnos).
5. /resources: Checklists de pre-instalación, puesta en marcha, seguridad y biblioteca de mensajes.

Para comenzar, abre:
documentation/START-HERE.md
`;

fs.writeFileSync(path.join(tempDir, 'README.txt'), manifestContent, 'utf-8');
console.log('✅ Creado README.txt y MANIFEST en el paquete.');

// 4. Comprimir a ZIP
try {
  if (process.platform === 'win32') {
    const psCmd = `powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipFile}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipFile}" TurnoFlow-AI-Complete`, { stdio: 'inherit' });
  }

  // Limpiar directorio temporal
  fs.rmSync(tempDir, { recursive: true, force: true });

  const stats = fs.statSync(zipFile);
  console.log(`🎉 ZIP generado con éxito: ${zipFile} (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (error) {
  console.error('❌ Error comprimiendo ZIP:', error.message);
  process.exit(1);
}
