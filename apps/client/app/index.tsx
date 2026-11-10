import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  Users,
  CalendarCheck,
  Clock,
  UserCheck,
  Sparkles,
  CheckCircle2,
  Smartphone,
  RefreshCw,
  Trash2,
  Calendar
} from 'lucide-react-native';
import { Header } from '../src/components/Header';
import { MetricCard } from '../src/components/MetricCard';
import { apiClient, INITIAL_METRICS } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Consulta de estadísticas reales (0 si no hay datos)
  const { data: metrics = INITIAL_METRICS, refetch: refetchMetrics } = useQuery({
    queryKey: ['dashboard-stats', user?.organizationId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/dashboard/stats');
        return res.data || INITIAL_METRICS;
      } catch {
        return INITIAL_METRICS;
      }
    }
  });

  // Consulta de actividad reciente real
  const { data: activity = [], refetch: refetchActivity } = useQuery({
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
        return [];
      } catch {
        return [];
      }
    }
  });

  // Consulta de estado del QR de WhatsApp
  const { data: qrStatusData } = useQuery({
    queryKey: ['qr-status', user?.organizationId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/integrations/whatsapp-qr/status');
        return res.data;
      } catch {
        return null;
      }
    },
    refetchInterval: 5000
  });

  const isWhatsAppConnected = qrStatusData?.status === 'CONNECTED';
  const connectedPhone = qrStatusData?.connectedPhone;

  // Acción: Limpiar datos de prueba y empezar de cero
  const handleResetDemoData = async () => {
    const confirmAction = () => {
      setResetting(true);
      setResetSuccess(null);
      apiClient
        .post('/dashboard/reset-demo-data')
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          setResetSuccess('¡Listo! Todos los datos de prueba fueron eliminados. Tu panel está en 0 para pruebas reales.');
          setTimeout(() => setResetSuccess(null), 5000);
        })
        .catch((err) => {
          const msg = err.response?.data?.message || err.message;
          alert(`Error al limpiar datos: ${msg}`);
        })
        .finally(() => {
          setResetting(false);
        });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas eliminar todos los leads, citas y mensajes de prueba para dejar el panel en 0 y probar con clientes reales?')) {
        confirmAction();
      }
    } else {
      Alert.alert(
        'Empezar de Cero',
        '¿Deseas eliminar todos los datos de prueba para dejar el panel limpio?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar datos de prueba', style: 'destructive', onPress: confirmAction }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Panel Ejecutivo"
        subtitle={`Centro de control y recepción inteligente — ${user?.organizationName || 'TurnoFlow Studio'}`}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Banner de Confirmación al Limpiar Datos */}
        {resetSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#22c55e" style={{ marginRight: 8 }} />
            <Text style={styles.successBannerText}>{resetSuccess}</Text>
          </View>
        )}

        {/* Google Material 3 Enterprise Status Hub */}
        <View style={styles.enterpriseHubCard}>
          <View style={styles.hubHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.hubTitleRow}>
                <View style={styles.googleBrandBadge}>
                  <Sparkles size={14} color="#1a73e8" />
                </View>
                <Text style={styles.hubTitle}>Ecosistema TurnoFlow AI</Text>
              </View>
              <Text style={styles.hubSubtitle}>
                {isWhatsAppConnected
                  ? `WhatsApp conectado (${connectedPhone || 'Dispositivo enlazado'}). Atendiendo y cotizando turnos en tiempo real.`
                  : 'Vinculá tu WhatsApp y Scalinky para automatizar la atención de tu salón.'}
              </Text>
            </View>

            <View style={styles.hubActionsRow}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => router.push('/playground')}
              >
                <Sparkles size={14} color="#c084fc" style={{ marginRight: 6 }} />
                <Text style={styles.btnSecondaryText}>Probar en Simulador</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => router.push('/onboarding')}
              >
                <Smartphone size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.btnPrimaryText}>
                  {isWhatsAppConnected ? 'Gestionar Conexión' : 'Conectar WhatsApp'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Chips de Estado en Vivo (Material 3 Surface) */}
          <View style={styles.statusChipsContainer}>
            {/* Chip 1: WhatsApp */}
            <View style={[styles.statusChip, isWhatsAppConnected ? styles.chipSuccess : styles.chipWarning]}>
              <View style={[styles.statusDot, isWhatsAppConnected ? styles.dotGreen : styles.dotAmber]} />
              <Text style={styles.chipLabel}>WhatsApp Móvil:</Text>
              <Text style={[styles.chipValue, isWhatsAppConnected ? styles.textGreen : styles.textAmber]}>
                {isWhatsAppConnected ? (connectedPhone ? `Conectado (${connectedPhone})` : 'Conectado') : 'Pendiente QR'}
              </Text>
            </View>

            {/* Chip 2: Scalinky Turnero */}
            <View style={[styles.statusChip, styles.chipBlue]}>
              <View style={[styles.statusDot, styles.dotBlue]} />
              <Text style={styles.chipLabel}>Turnero Scalinky:</Text>
              <Text style={[styles.chipValue, styles.textBlue]}>Sincronizado</Text>
            </View>

            {/* Chip 3: Motor de IA */}
            <View style={[styles.statusChip, styles.chipPurple]}>
              <View style={[styles.statusDot, styles.dotPurple]} />
              <Text style={styles.chipLabel}>Motor de IA:</Text>
              <Text style={[styles.chipValue, styles.textPurple]}>Google Gemini 2.5 Flash</Text>
            </View>
          </View>

          {/* Barra de Acciones de Administración Limpia */}
          <View style={styles.hubFooterBar}>
            <Text style={styles.hubFooterNote}>
              💡 Para recibir mensajes de clientes reales, escaneá el QR desde la pestaña Conexiones.
            </Text>

            <TouchableOpacity
              style={styles.resetDataBtn}
              onPress={handleResetDemoData}
              disabled={resetting}
            >
              {resetting ? (
                <ActivityIndicator size="small" color="#f87171" style={{ marginRight: 6 }} />
              ) : (
                <Trash2 size={13} color="#f87171" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.resetDataBtnText}>
                {resetting ? 'Limpiando...' : 'Empezar de 0 (Limpiar datos de prueba)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5 Métricas Principales (Google Material 3 Cards) */}
        <Text style={styles.sectionTitle}>MÉTRICAS DEL NEGOCIO (TIEMPO REAL)</Text>
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
            label="Clientes Registrados"
            value={metrics.capturedLeads}
            trend={metrics.leadsTrend}
            subtext="Prospectos calificados"
            icon={Users}
            iconColor="#a855f7"
          />
          <MetricCard
            label="Turnos Confirmados"
            value={metrics.confirmedBookings}
            trend={metrics.bookingsTrend}
            subtext="En Scalinky / Calendar"
            icon={CalendarCheck}
            iconColor="#22c55e"
          />
          <MetricCard
            label="Seguimientos Activos"
            value={metrics.pendingFollowUps}
            subtext="En horario comercial"
            icon={Clock}
            iconColor="#eab308"
          />
          <MetricCard
            label="Derivaciones a Humano"
            value={metrics.humanHandoffs}
            subtext="Atención del dueño"
            icon={UserCheck}
            iconColor="#ec4899"
          />
        </View>

        {/* Sección: Actividad en Vivo */}
        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <View>
              <Text style={styles.activityTitle}>Actividad en Vivo de Clientes</Text>
              <Text style={styles.activitySubtitle}>
                Turnos agendados y consultas atendidas por la IA en tiempo real
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                refetchMetrics();
                refetchActivity();
              }}
            >
              <RefreshCw size={13} color="#a1a1aa" style={{ marginRight: 6 }} />
              <Text style={styles.refreshBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          {activity.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Calendar size={36} color="#3f3f46" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Tu panel está limpio y en 0</Text>
              <Text style={styles.emptyDesc}>
                Cuando tus clientes te escriban al WhatsApp conectado, verás acá sus consultas, cotizaciones de tratamientos y confirmaciones de turnos al instante.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => router.push('/playground')}
              >
                <Sparkles size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Hacer una prueba en el simulador</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activityList}>
              {activity.map((item: any) => (
                <View key={item.id} style={styles.activityItem}>
                  <View
                    style={[
                      styles.activityIcon,
                      item.type === 'APPOINTMENT_CONFIRMED'
                        ? styles.iconApt
                        : styles.iconLead
                    ]}
                  >
                    {item.type === 'APPOINTMENT_CONFIRMED' ? (
                      <CalendarCheck size={16} color="#22c55e" />
                    ) : (
                      <Users size={16} color="#a855f7" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.itemTimestamp}>{item.timestamp}</Text>
                </View>
              ))}
            </View>
          )}
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
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center'
  },
  successBanner: {
    backgroundColor: '#052e16',
    borderWidth: 1,
    borderColor: '#166534',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  successBannerText: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '600'
  },
  enterpriseHubCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }
    })
  },
  hubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16
  },
  hubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  googleBrandBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(26, 115, 232, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(26, 115, 232, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  hubTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  hubSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18
  },
  hubActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  btnPrimary: {
    backgroundColor: '#1a73e8',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  btnSecondary: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnSecondaryText: {
    color: '#d8b4fe',
    fontSize: 13,
    fontWeight: '600'
  },
  statusChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1e293b'
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1
  },
  chipSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)'
  },
  chipWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)'
  },
  chipBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)'
  },
  chipPurple: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.25)'
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8
  },
  dotGreen: {
    backgroundColor: '#22c55e'
  },
  dotAmber: {
    backgroundColor: '#f59e0b'
  },
  dotBlue: {
    backgroundColor: '#3b82f6'
  },
  dotPurple: {
    backgroundColor: '#a855f7'
  },
  chipLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginRight: 6
  },
  chipValue: {
    fontSize: 12,
    fontWeight: '600'
  },
  textGreen: {
    color: '#4ade80'
  },
  textAmber: {
    color: '#fbbf24'
  },
  textBlue: {
    color: '#60a5fa'
  },
  textPurple: {
    color: '#c084fc'
  },
  hubFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12
  },
  hubFooterNote: {
    color: '#64748b',
    fontSize: 12
  },
  resetDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  resetDataBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600'
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 14
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24
  },
  activityCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 20
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  activityTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  activitySubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  refreshBtnText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '600'
  },
  emptyActivityBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6
  },
  emptyDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 18,
    marginBottom: 18
  },
  emptyActionBtn: {
    backgroundColor: '#1a73e8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  activityList: {
    gap: 10
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  iconApt: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)'
  },
  iconLead: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)'
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  itemSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2
  },
  itemTimestamp: {
    color: '#64748b',
    fontSize: 11
  }
});