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
}
