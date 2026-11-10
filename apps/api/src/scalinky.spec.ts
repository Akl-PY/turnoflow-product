import { ScalinkyService } from './modules/integrations/scalinky.service';

describe('Scalinky Integration Suite (Local Live Test)', () => {
  let service: ScalinkyService;
  let isOnline = false;

  beforeAll(async () => {
    service = new ScalinkyService();
    isOnline = await service.isHealthy();
  });

  it('debe responder a la verificación de salud de Scalinky', async () => {
    const online = await service.isHealthy();
    expect(typeof online).toBe('boolean');
  });

  it('debe obtener el catálogo de servicios de hes194 si está online o fallback a array', async () => {
    const services = await service.getServices('hes194');
    expect(Array.isArray(services)).toBe(true);
    if (isOnline) {
      expect(services.length).toBeGreaterThan(0);
      const corte = services.find((s) => s.name.includes('Corte de pelo'));
      expect(corte).toBeDefined();
    }
  });

  it('debe obtener el staff de hes194 si está online o fallback a array', async () => {
    const staff = await service.getStaff('hes194');
    expect(Array.isArray(staff)).toBe(true);
    if (isOnline) {
      expect(staff.length).toBeGreaterThan(0);
      expect(staff[0].name).toBe('Daniel Galetto');
    }
  });

  it('debe consultar la disponibilidad de turnos reales si está online', async () => {
    if (!isOnline) {
      return;
    }
    const staff = await service.getStaff('hes194');
    const services = await service.getServices('hes194');
    const possibilities = await service.getPossibilities(
      'hes194',
      staff[0].staff_id,
      services[0].service_id
    );

    expect(Array.isArray(possibilities)).toBe(true);
    expect(possibilities.length).toBeGreaterThan(0);
    expect(possibilities[0].date).toBeDefined();
    expect(Array.isArray(possibilities[0].items)).toBe(true);
  });

  it('debe rechazar credenciales inválidas para un negocio', async () => {
    const result = await service.verifyOwner('hes194', {
      email: 'hacker@fake.com',
      password: 'wrong'
    });
    expect(result.valid).toBe(false);
  });

  it('debe verificar exitosamente al dueño legítimo de hes194 si está online', async () => {
    if (!isOnline) {
      return;
    }
    const result = await service.verifyOwner('hes194', {
      email: 'danielgenarog@gmail.com',
      password: 'dGG2026??'
    });
    expect(result.valid).toBe(true);
    expect(result.businessName).toBe('HES1974');
    expect(result.owner?.email).toBe('danielgenarog@gmail.com');
  });
});
