import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ScalinkyServiceItem {
  service_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description?: string;
  active: boolean;
}

export interface ScalinkyStaffItem {
  staff_id: string;
  name: string;
  business_id: string;
}

export interface ScalinkySlotItem {
  availability_id: string;
  slots: string[];
}

export interface ScalinkyDayPossibility {
  date: string;
  items: ScalinkySlotItem[];
}

export interface CreateScalinkyAppointmentDto {
  service_id: string;
  availability_id: string;
  startAt: string;
  endAt: string;
  date: string; // YYYY-MM-DD
  customerName: string;
  customerPhone: string;
  status?: 'booked' | 'cancelled' | 'completed';
}

export interface ScalinkyCachedSnapshot {
  slug: string;
  synced: boolean;
  status: 'SYNCED' | 'DESINCRONIZADO' | 'OFFLINE' | 'INCOMPLETE';
  lastSyncedAt: string;
  businessName?: string;
  businessHoursSummary?: string;
  services: ScalinkyServiceItem[];
  staff: ScalinkyStaffItem[];
  message?: string;
}

@Injectable()
export class ScalinkyService {
  private readonly logger = new Logger(ScalinkyService.name);

  get baseUrl(): string {
    return (process.env.SCALINKY_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  }

  /**
   * Verifica la conectividad con la API de Scalinky.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.baseUrl}/health`, { timeout: 3000 });
      return res.status === 200 && res.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el catálogo de servicios de un negocio por su slug.
   */
  async getServices(slug: string): Promise<ScalinkyServiceItem[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/${slug}/service`, { timeout: 5000 });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      this.logger.warn(`Error al consultar servicios de Scalinky (${slug}): ${err.message}`);
      return [];
    }
  }

  /**
   * Obtiene la lista de profesionales del negocio.
   */
  async getStaff(slug: string): Promise<ScalinkyStaffItem[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/${slug}/staff`, { timeout: 5000 });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      this.logger.warn(`Error al consultar staff de Scalinky (${slug}): ${err.message}`);
      return [];
    }
  }

  /**
   * Consulta las posibilidades reales de turnos (a 14 días) para un servicio y profesional.
   */
  async getPossibilities(
    slug: string,
    staffId: string,
    serviceId: string
  ): Promise<ScalinkyDayPossibility[]> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/${slug}/appointment/staff/${staffId}/service/${serviceId}`,
        { timeout: 6000 }
      );
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      this.logger.warn(`Error al consultar disponibilidad en Scalinky (${slug}): ${err.message}`);
      return [];
    }
  }

  /**
   * Agenda definitivamente un turno en la base de datos de Scalinky y Google Calendar.
   */
  async bookAppointment(slug: string, dto: CreateScalinkyAppointmentDto): Promise<any> {
    try {
      const res = await axios.post(`${this.baseUrl}/${slug}/appointment`, dto, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000
      });
      this.logger.log(`Turno creado en Scalinky (${slug}): ${res.data?.appointment_id}`);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`Error al agendar en Scalinky (${slug}): ${msg}`);
      throw new Error(`Scalinky booking failed: ${msg}`);
    }
  }

  /**
   * Verifica que el usuario sea el dueño legítimo del negocio en Scalinky.
   */
  async verifyOwner(
    slug: string,
    credentials: { email: string; password: string }
  ): Promise<{
    valid: boolean;
    businessId?: string;
    businessName?: string;
    slug?: string;
    owner?: { userId: string; name: string; email: string; role: string };
    message?: string;
  }> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/business/slug/${slug}/verify-owner`,
        credentials,
        { headers: { 'Content-Type': 'application/json' }, timeout: 6000 }
      );
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      this.logger.warn(`Verificación de dueño fallida en Scalinky (${slug}): ${msg}`);
      return { valid: false, message: msg };
    }
  }

  /**
   * Sincroniza y valida el negocio en Scalinky:
   * Verifica salud, servicios, empleados (staff), horarios y disponibilidad inicial.
   * Devuelve un snapshot listo para guardarse en caché y no consultar catálogo en cada mensaje.
   */
  async syncBusinessSnapshot(slug: string): Promise<ScalinkyCachedSnapshot> {
    const cleanSlug = slug.trim().toLowerCase();
    const online = await this.isHealthy();

    if (!online) {
      return {
        slug: cleanSlug,
        synced: false,
        status: 'OFFLINE',
        lastSyncedAt: new Date().toISOString(),
        services: [],
        staff: [],
        message: 'El servidor de Scalinky no está activo ni accesible en este momento (Offline).'
      };
    }

    try {
      const [rawServices, staff] = await Promise.all([
        this.getServices(cleanSlug),
        this.getStaff(cleanSlug)
      ]);

      const services = rawServices.filter((s) => s.active !== false);

      if (services.length === 0 || staff.length === 0) {
        const reason =
          services.length === 0 && staff.length === 0
            ? `El negocio "${cleanSlug}" no existe en Scalinky o no tiene servicios ni empleados cargados.`
            : services.length === 0
            ? `El negocio "${cleanSlug}" en Scalinky no tiene servicios activos configurados.`
            : `El negocio "${cleanSlug}" en Scalinky no tiene empleados/profesionales configurados.`;

        return {
          slug: cleanSlug,
          synced: false,
          status: 'INCOMPLETE',
          lastSyncedAt: new Date().toISOString(),
          services,
          staff,
          message: reason
        };
      }

      // Verificar disponibilidad y deducir franja horaria del negocio a partir de las posibilidades reales
      let businessHoursSummary = 'Según disponibilidad de cada profesional en Scalinky';
      try {
        const samplePossibilities = await this.getPossibilities(
          cleanSlug,
          staff[0].staff_id,
          services[0].service_id
        );
        const allSlots = samplePossibilities
          .flatMap((d) => (Array.isArray(d.items) ? d.items.flatMap((it) => it.slots || []) : []))
          .filter(Boolean)
          .sort();

        if (allSlots.length > 0) {
          const minSlot = allSlots[0];
          const maxSlot = allSlots[allSlots.length - 1];
          businessHoursSummary = `Franja operativa detectada en Scalinky: ${minSlot} a ${maxSlot} hs`;
        }
      } catch {
        // Ignorar si falla inferencia de horario
      }

      return {
        slug: cleanSlug,
        synced: true,
        status: 'SYNCED',
        lastSyncedAt: new Date().toISOString(),
        businessHoursSummary,
        services,
        staff,
        message: `Sincronizado correctamente: ${services.length} servicio(s) y ${staff.length} empleado(s) cargados.`
      };
    } catch (err: any) {
      this.logger.error(`Error sincronizando snapshot de Scalinky (${cleanSlug}): ${err.message}`);
      return {
        slug: cleanSlug,
        synced: false,
        status: 'DESINCRONIZADO',
        lastSyncedAt: new Date().toISOString(),
        services: [],
        staff: [],
        message: `Error al sincronizar con Scalinky: ${err.message}`
      };
    }
  }

  /**
   * Consulta en vivo los turnos disponibles para una fecha (o próximos días),
   * buscando por cada empleado activo (o por un empleado específico si se indicó).
   */
  async getLivePossibilitiesPerStaff(
    slug: string,
    serviceId: string,
    staffList: ScalinkyStaffItem[],
    targetStaffId?: string
  ): Promise<
    Array<{
      staffId: string;
      staffName: string;
      possibilities: ScalinkyDayPossibility[];
    }>
  > {
    const online = await this.isHealthy();
    if (!online) {
      throw new Error('SCALINKY_OFFLINE');
    }

    const targets = targetStaffId
      ? staffList.filter((s) => s.staff_id === targetStaffId)
      : staffList;

    const effectiveTargets = targets.length > 0 ? targets : staffList;
    if (effectiveTargets.length === 0) {
      throw new Error('SCALINKY_NO_STAFF');
    }

    const results = await Promise.all(
      effectiveTargets.map(async (member) => {
        const res = await axios.get(
          `${this.baseUrl}/${slug}/appointment/staff/${member.staff_id}/service/${serviceId}`,
          { timeout: 6000 }
        );
        const possibilities: ScalinkyDayPossibility[] = Array.isArray(res.data) ? res.data : [];
        return {
          staffId: member.staff_id,
          staffName: member.name,
          possibilities
        };
      })
    );

    return results;
  }
}
