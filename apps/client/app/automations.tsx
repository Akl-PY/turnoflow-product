import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Zap,
  MessageSquare,
  Users,
  CalendarCheck,
  BellRing,
  RotateCcw,
  Sparkles,
  CheckCircle2
} from 'lucide-react-native';
import { apiClient, DEMO_AUTOMATIONS } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

const BUSINESS_AUTOMATIONS = [
  {
    id: 'auto-1',
    name: 'Atención y Cotización Inmediata 24/7',
    description: 'Responde preguntas sobre tratamientos, tarifas vigentes y horarios en menos de 5 segundos.',
    category: 'Recepción WhatsApp',
    icon: MessageSquare,
    isActive: true,
    runs: 48,
    rate: '100%'
  },
  {
    id: 'auto-2',
    name: 'Captura y Calificación de Clientes',
    description: 'Detecta intención de compra y extrae nombre, teléfono y servicio deseado para registrarlos.',
    category: 'Ventas & CRM',
    icon: Users,
    isActive: true,
    runs: 35,
    rate: '100%'
  },
  {
    id: 'auto-3',
    name: 'Coordinación y Reserva de Turnos',
    description: 'Consulta disponibilidad en vivo en Scalinky y confirma la cita sin superposiciones.',
    category: 'Agenda & Citas',
    icon: CalendarCheck,
    isActive: true,
    runs: 18,
    rate: '100%'
  },
  {
    id: 'auto-4',
    name: 'Alerta Urgente al Administrador',
    description: 'Te envía un mensaje a tu WhatsApp personal si un cliente necesita atención humana o tiene un reclamo.',
    category: 'Supervisión Humana',
    icon: BellRing,
    isActive: true,
    runs: 6,
    rate: '100%'
  },
  {
    id: 'auto-5',
    name: 'Reactivación Automática de Clientes',
    description: 'Envía un mensaje de seguimiento empático a quienes pidieron cotización pero no agendaron.',
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
                ? { ...item, isActive: matched.isActive, runs: matched.totalRuns || item.runs }
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
        title="Automatizaciones Inteligentes"
        subtitle="Reglas operativas del negocio ejecutadas en paralelo por la IA de TurnoFlow"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Banner Empresarial Google Material 3 */}
        <View style={styles.summaryBanner}>
          <View style={styles.bannerIconBadge}>
            <Zap size={20} color="#1a73e8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Automatización Integral del Salón</Text>
            <Text style={styles.bannerText}>
              Todas las reglas se ejecutan de manera autónoma en tiempo real. Podés encender o pausar cualquier automatización con un solo toque.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>REGLAS OPERATIVAS ACTIVAS</Text>

        <View style={styles.list}>
          {workflows.map((wf) => {
            const Icon = wf.icon;
            return (
              <View key={wf.id} style={styles.wfCard}>
                <View style={styles.wfHeader}>
                  <View style={[styles.wfIconBg, wf.isActive ? styles.iconBgActive : styles.iconBgInactive]}>
                    <Icon size={18} color={wf.isActive ? '#1a73e8' : '#64748b'} />
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
                    <Text style={[styles.switchLabel, { color: wf.isActive ? '#4ade80' : '#64748b' }]}>
                      {wf.isActive ? 'ACTIVA' : 'PAUSADA'}
                    </Text>
                    <Switch
                      value={wf.isActive}
                      onValueChange={() => toggleWorkflow(wf.id)}
                      trackColor={{ false: '#334155', true: '#1a73e8' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>

                {/* Métricas de Ejecución Limpias */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{wf.runs}</Text>
                    <Text style={styles.statLabel}>Ejecuciones</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#4ade80' }]}>{wf.rate}</Text>
                    <Text style={styles.statLabel}>Efectividad</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>Tiempo real</Text>
                    <Text style={styles.statLabel}>Frecuencia</Text>
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
    backgroundColor: '#09090b'
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
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }
    })
  },
  bannerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 115, 232, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4
  },
  bannerText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18
  },
  sectionHeader: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 14
  },
  list: {
    gap: 14
  },
  wfCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 18
  },
  wfHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14
  },
  wfIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBgActive: {
    backgroundColor: 'rgba(26, 115, 232, 0.12)'
  },
  iconBgInactive: {
    backgroundColor: '#1e293b'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4
  },
  wfName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600'
  },
  categoryBadge: {
    backgroundColor: '#1e293b',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  categoryBadgeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600'
  },
  wfDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17
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
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
    marginTop: 14
  },
  statBox: {
    gap: 2
  },
  statValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11
  }
});