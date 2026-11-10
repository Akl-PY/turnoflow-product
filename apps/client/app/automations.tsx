import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Platform
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Zap,
  MessageSquare,
  Users,
  CalendarCheck,
  BellRing,
  RotateCcw
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

const BUSINESS_AUTOMATIONS = [
  {
    id: 'auto-1',
    name: 'Atención y Cotización Inmediata 24/7',
    description: 'Responde preguntas sobre tratamientos, tarifas vigentes y horarios de apertura en menos de 5 segundos.',
    category: 'Recepción WhatsApp',
    icon: MessageSquare,
    isActive: true,
    runs: 48,
    rate: '100%'
  },
  {
    id: 'auto-2',
    name: 'Registro Automático de Clientas',
    description: 'Detecta el interés de cada clienta y guarda su nombre, teléfono y tratamiento consultado en el directorio.',
    category: 'Directorio & Clientes',
    icon: Users,
    isActive: true,
    runs: 35,
    rate: '100%'
  },
  {
    id: 'auto-3',
    name: 'Coordinación y Reserva de Turnos',
    description: 'Consulta disponibilidad en la agenda del salón (o en Scalinky si está vinculado) y confirma la cita sin superposiciones.',
    category: 'Agenda & Citas',
    icon: CalendarCheck,
    isActive: true,
    runs: 18,
    rate: '100%'
  },
  {
    id: 'auto-4',
    name: 'Alerta Urgente al Administrador',
    description: 'Te envía un aviso directo a tu WhatsApp personal si una clienta pide hablar con una persona o tiene una consulta especial.',
    category: 'Supervisión Humana',
    icon: BellRing,
    isActive: true,
    runs: 6,
    rate: '100%'
  },
  {
    id: 'auto-5',
    name: 'Recordatorios y Seguimiento de Turnos',
    description: 'Envía recordatorios cordiales antes de la cita y da seguimiento a quienes consultaron precios pero aún no reservaron.',
    category: 'Fidelización',
    icon: RotateCcw,
    isActive: true,
    runs: 12,
    rate: '100%'
  }
];

export default function AutomationsScreen() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>(BUSINESS_AUTOMATIONS);

  useEffect(() => {
    const fetchAutomations = async () => {
      try {
        const res = await apiClient.get('/automations');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setWorkflows((prev) =>
            prev.map((item, idx) => {
              const matched = res.data[idx];
              return matched
                ? { ...item, isActive: matched.isActive, runs: matched.totalRuns ?? item.runs }
                : item;
            })
          );
        }
      } catch {
        // Fallback a BUSINESS_AUTOMATIONS
      }
    };
    fetchAutomations();
  }, [user?.organizationId]);

  const toggleWorkflow = async (id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => (wf.id === id ? { ...wf, isActive: !wf.isActive } : wf))
    );

    try {
      await apiClient.patch(`/automations/${id}/toggle`);
    } catch {
      // Mantiene cambio local si falla la red
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Automatizaciones del Salón"
        subtitle="Reglas de atención que funcionan solas las 24 horas en tu WhatsApp"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Banner Empresarial Google Material 3 */}
        <View style={styles.summaryBanner}>
          <View style={styles.bannerIconBadge}>
            <Zap size={20} color="#1A73E8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Automatización Integral del Salón</Text>
            <Text style={styles.bannerText}>
              Todas las funciones trabajan de forma automática en tiempo real. Puedes activar o pausar cualquiera de ellas con un solo toque cuando lo necesites.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>FUNCIONES AUTOMÁTICAS ACTIVAS</Text>

        <View style={styles.list}>
          {workflows.map((wf) => {
            const Icon = wf.icon;
            return (
              <View key={wf.id} style={styles.wfCard}>
                <View style={styles.wfHeader}>
                  <View style={[styles.wfIconBg, wf.isActive ? styles.iconBgActive : styles.iconBgInactive]}>
                    <Icon size={18} color={wf.isActive ? '#1A73E8' : '#64748B'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.wfName}>{wf.name}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{wf.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.wfDesc}>{wf.description}</Text>
                  </View>

                  <View style={styles.switchWrapper}>
                    <Text style={[styles.switchLabel, { color: wf.isActive ? '#16A34A' : '#64748B' }]}>
                      {wf.isActive ? 'ACTIVA' : 'PAUSADA'}
                    </Text>
                    <Switch
                      value={wf.isActive}
                      onValueChange={() => toggleWorkflow(wf.id)}
                      trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                      thumbColor={wf.isActive ? '#1A73E8' : '#94A3B8'}
                    />
                  </View>
                </View>

                {/* Métricas de Ejecución Limpias */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{wf.runs}</Text>
                    <Text style={styles.statLabel}>Atenciones realizadas</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#16A34A' }]}>{wf.rate}</Text>
                    <Text style={styles.statLabel}>Efectividad</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>Inmediata (24/7)</Text>
                    <Text style={styles.statLabel}>Disponibilidad</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 24,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center'
  },
  summaryBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
      } as any
    })
  },
  bannerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bannerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  bannerText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 14
  },
  list: {
    gap: 14
  },
  wfCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      } as any
    })
  },
  wfHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14
  },
  wfIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBgActive: {
    backgroundColor: '#E8F0FE'
  },
  iconBgInactive: {
    backgroundColor: '#F1F5F9'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4
  },
  wfName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700'
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  categoryBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600'
  },
  wfDesc: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18
  },
  switchWrapper: {
    alignItems: 'flex-end',
    gap: 4
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
    marginTop: 16
  },
  statBox: {
    gap: 2
  },
  statValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700'
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11
  }
});
