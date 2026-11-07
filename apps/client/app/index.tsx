import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  Users,
  CalendarCheck,
  Clock,
  UserCheck,
  Bot,
  Sparkles,
  CheckCircle2
} from 'lucide-react-native';
import { Header } from '../src/components/Header';
import { MetricCard } from '../src/components/MetricCard';
import { apiClient, DEMO_METRICS, DEMO_ACTIVITY } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Consulta de estadísticas reales con fallback elegante
  const { data: metrics = DEMO_METRICS } = useQuery({
    queryKey: ['dashboard-stats', user?.organizationId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/dashboard/stats');
        return res.data || DEMO_METRICS;
      } catch {
        return DEMO_METRICS;
      }
    }
  });

  // Consulta de actividad reciente real con fallback elegante
  const { data: activity = DEMO_ACTIVITY } = useQuery({
    queryKey: ['dashboard-activity', user?.organizationId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/dashboard/activity');
        if (Array.isArray(res.data) && res.data.length > 0) {
          return res.data.map((item: any) => ({
            ...item,
            timestamp: item.timestamp
              ? isNaN(new Date(item.timestamp).getTime())
                ? String(item.timestamp)
                : new Date(item.timestamp).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
              : 'Reciente'
          }));
        }
        return DEMO_ACTIVITY;
      } catch {
        return DEMO_ACTIVITY;
      }
    }
  });

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard General"
        subtitle={`Métricas de recepción y conversión en tiempo real — ${user?.organizationName || 'TurnoFlow Beauty Studio'}`}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Banner de bienvenida y estado de demostración */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Sparkles size={20} color="#a855f7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {user?.organizationName || 'TurnoFlow AI'} — Modo Recepción Activo
            </Text>
            <Text style={styles.bannerText}>
              Los agentes están atendiendo consultas en WhatsApp y sincronizando citas con Google Calendar.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() => router.push('/playground')}
          >
            <Text style={styles.bannerButtonText}>Simular en Playground</Text>
          </TouchableOpacity>
        </View>

        {/* 5 Métricas Principales */}
        <Text style={styles.sectionTitle}>MÉTRICAS CLAVE (ÚLTIMOS 30 DÍAS)</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Consultas Recibidas"
            value={metrics.totalInquiries}
            trend={metrics.inquiriesTrend}
            subtext="Mensajes procesados"
            icon={MessageSquare}
            iconColor="#3b82f6"
          />
          <MetricCard
            label="Leads Capturados"
            value={metrics.capturedLeads}
            trend={metrics.leadsTrend}
            subtext="Prospectos calificados"
            icon={Users}
            iconColor="#a855f7"
          />
          <MetricCard
            label="Reservas Confirmadas"
            value={metrics.confirmedBookings}
            trend={metrics.bookingsTrend}
            subtext="En Google Calendar"
            icon={CalendarCheck}
            iconColor="#22c55e"
          />
          <MetricCard
            label="Seguimientos Pendientes"
            value={metrics.pendingFollowUps}
            subtext="En horario comercial"
            icon={Clock}
            iconColor="#eab308"
          />
          <MetricCard
            label="Atención Humana (Handoff)"
            value={metrics.humanHandoffs}
            subtext="Casos derivados"
            icon={UserCheck}
            iconColor="#ec4899"
          />
        </View>

        {/* Dos Columnas: Actividad Reciente & Estado del Sistema */}
        <View style={styles.twoCol}>
          {/* Columna Izquierda: Actividad Reciente */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Actividad Reciente</Text>
              <TouchableOpacity onPress={() => router.push('/leads')}>
                <Text style={styles.panelLink}>Ver Todo</Text>
              </TouchableOpacity>
            </View>

            {activity.map((item: any) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.activityTime}>{item.timestamp}</Text>
              </View>
            ))}
          </View>

          {/* Columna Derecha: Estado de Agentes e Integraciones */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Estado de Agentes Especializados</Text>

            <View style={styles.agentCard}>
              <View style={styles.agentIconBg}>
                <Bot size={18} color="#a855f7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agentName}>Reception Agent</Text>
                <Text style={styles.agentModel}>Gemini 2.5 Flash / Claude 3.5 • 24/7 Activo</Text>
              </View>
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>Online</Text>
              </View>
            </View>

            <View style={styles.agentCard}>
              <View style={styles.agentIconBg}>
                <Bot size={18} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agentName}>Lead Intelligence Agent</Text>
                <Text style={styles.agentModel}>Clasificación & Scoring JSON</Text>
              </View>
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>Online</Text>
              </View>
            </View>

            <View style={styles.agentCard}>
              <View style={styles.agentIconBg}>
                <Bot size={18} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agentName}>Booking Agent</Text>
                <Text style={styles.agentModel}>Google Calendar Sync</Text>
              </View>
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>Online</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.panelTitle}>Estado de Integraciones</Text>
            <View style={styles.integrationRow}>
              <Text style={styles.integrationName}>WhatsApp Cloud API (Meta)</Text>
              <View style={styles.statusOnline}>
                <CheckCircle2 size={12} color="#22c55e" style={{ marginRight: 4 }} />
                <Text style={styles.statusOnlineText}>Conectado</Text>
              </View>
            </View>
            <View style={styles.integrationRow}>
              <Text style={styles.integrationName}>Google Calendar</Text>
              <View style={styles.statusOnline}>
                <CheckCircle2 size={12} color="#22c55e" style={{ marginRight: 4 }} />
                <Text style={styles.statusOnlineText}>Sincronizado</Text>
              </View>
            </View>
            <View style={styles.integrationRow}>
              <Text style={styles.integrationName}>Workflows n8n</Text>
              <View style={styles.statusOnline}>
                <CheckCircle2 size={12} color="#22c55e" style={{ marginRight: 4 }} />
                <Text style={styles.statusOnlineText}>5 Activos</Text>
              </View>
            </View>
          </View>
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
    padding: 28
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    padding: 18,
    borderRadius: 10,
    marginBottom: 24,
    gap: 14
  },
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2
  },
  bannerText: {
    color: '#a1a1aa',
    fontSize: 12
  },
  bannerButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6
  },
  bannerButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  sectionTitle: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24
  },
  twoCol: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap'
  },
  panel: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 20
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  panelTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14
  },
  panelLink: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '500'
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    gap: 12
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a855f7'
  },
  activityTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500'
  },
  activitySubtitle: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2
  },
  activityTime: {
    color: '#52525b',
    fontSize: 11
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    gap: 12
  },
  agentIconBg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  agentName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  agentModel: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2
  },
  badgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeSuccessText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700'
  },
  divider: {
    height: 1,
    backgroundColor: '#18181b',
    marginVertical: 14
  },
  integrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  integrationName: {
    color: '#d4d4d8',
    fontSize: 12
  },
  statusOnline: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusOnlineText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '500'
  }
});
