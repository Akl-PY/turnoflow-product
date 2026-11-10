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
  Calendar,
  HelpCircle,
  ExternalLink
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

  // Consulta de estado de integraciones
  const { data: integrationsStatus } = useQuery({
    queryKey: ['integrations-status', user?.organizationId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/integrations/status');
        return res.data;
      } catch {
        return null;
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
  const isScalinkyConnected = Boolean(integrationsStatus?.scalinky?.connected);

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
        title="Panel de Control"
        subtitle={`Recepción inteligente 24/7 — ${user?.organizationName || 'Mi Salón'}`}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Banner de Confirmación al Limpiar Datos */}
        {resetSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#16a34a" style={{ marginRight: 8 }} />
            <Text style={styles.successBannerText}>{resetSuccess}</Text>
          </View>
        )}

        {/* Google Material 3 Hub Ejecutivo */}
        <View style={styles.enterpriseHubCard}>
          <View style={styles.hubHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.hubTitleRow}>
                <View style={styles.googleBrandBadge}>
                  <Sparkles size={14} color="#1a73e8" />
                </View>
                <Text style={styles.hubTitle}>Asistente Inteligente TurnoFlow</Text>
              </View>
              <Text style={styles.hubSubtitle}>
                {isWhatsAppConnected
                  ? `WhatsApp enlazado correctamente (${connectedPhone || 'Móvil vinculado'}). Respondiendo preguntas y agendando turnos.`
                  : 'Vinculá tu WhatsApp escaneando el código QR para que la IA atienda a tus clientas de forma automática.'}
              </Text>
            </View>

            <View style={styles.hubActionsRow}>
              <TouchableOpacity
                style={styles.btnGuide}
                onPress={() => router.push('/guide')}
              >
                <HelpCircle size={14} color="#1e40af" style={{ marginRight: 6 }} />
                <Text style={styles.btnGuideText}>¿Cómo utilizarlo?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => router.push('/playground')}
              >
                <Sparkles size={14} color="#1a73e8" style={{ marginRight: 6 }} />
                <Text style={styles.btnSecondaryText}>Probar Simulador</Text>
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
            {/* Chip 1: WhatsApp Móvil */}
            <View style={[styles.statusChip, isWhatsAppConnected ? styles.chipSuccess : styles.chipWarning]}>
              <View style={[styles.statusDot, isWhatsAppConnected ? styles.dotGreen : styles.dotAmber]} />
              <Text style={styles.chipLabel}>WhatsApp Móvil:</Text>
              <Text style={[styles.chipValue, isWhatsAppConnected ? styles.textGreen : styles.textAmber]}>
                {isWhatsAppConnected ? (connectedPhone ? `Conectado (${connectedPhone})` : 'Conectado') : 'Pendiente de escanear QR'}
              </Text>
            </View>

            {/* Chip 2: Scalinky Turnero */}
            <TouchableOpacity
              style={[styles.statusChip, isScalinkyConnected ? styles.chipSuccess : styles.chipNeutral]}
              onPress={() => router.push('/onboarding')}
            >
              <View style={[styles.statusDot, isScalinkyConnected ? styles.dotGreen : styles.dotGray]} />
              <Text style={styles.chipLabel}>Turnero Scalinky:</Text>
              <Text style={[styles.chipValue, isScalinkyConnected ? styles.textGreen : styles.textGray]}>
                {isScalinkyConnected ? 'Sincronizado' : 'No vinculado (usando catálogo del panel)'}
              </Text>
            </TouchableOpacity>

            {/* Chip 3: Motor de Inteligencia Artificial */}
            <View style={[styles.statusChip, styles.chipBlue]}>
              <View style={[styles.statusDot, styles.dotBlue]} />
              <Text style={styles.chipLabel}>Asistente IA:</Text>
              <Text style={[styles.chipValue, styles.textBlue]}>Google Gemini 2.5 Flash</Text>
            </View>
          </View>

          {/* Barra Inferior Limpia */}
          <View style={styles.hubFooterBar}>
            <Text style={styles.hubFooterNote}>
              💡 Los turnos confirmados y las consultas de clientas aparecerán acá en tiempo real.
            </Text>

            <TouchableOpacity
              style={styles.resetDataBtn}
              onPress={handleResetDemoData}
              disabled={resetting}
            >
              {resetting ? (
                <ActivityIndicator size="small" color="#dc2626" style={{ marginRight: 6 }} />
              ) : (
                <Trash2 size={13} color="#dc2626" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.resetDataBtnText}>
                {resetting ? 'Limpiando...' : 'Empezar de 0 (Limpiar datos de prueba)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5 Métricas Principales (Google Material 3 Cards) */}
        <Text style={styles.sectionTitle}>MÉTRICAS DEL NEGOCIO</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Consultas Atendidas"
            value={metrics.totalInquiries}
            trend={metrics.inquiriesTrend}
            subtext="Mensajes respondidos"
            icon={MessageSquare}
            iconColor="#1a73e8"
          />
          <MetricCard
            label="Clientes Registrados"
            value={metrics.capturedLeads}
            trend={metrics.leadsTrend}
            subtext="Nombres y teléfonos guardados"
            icon={Users}
            iconColor="#0284c7"
          />
          <MetricCard
            label="Turnos Confirmados"
            value={metrics.confirmedBookings}
            trend={metrics.bookingsTrend}
            subtext="En agenda de reservas"
            icon={CalendarCheck}
            iconColor="#16a34a"
          />
          <MetricCard
            label="Recordatorios Pendientes"
            value={metrics.pendingFollowUps}
            subtext="Avisos automáticos"
            icon={Clock}
            iconColor="#d97706"
          />
          <MetricCard
            label="Mensajes para Responder Vos"
            value={metrics.humanHandoffs}
            subtext="Consultas especiales"
            icon={UserCheck}
            iconColor="#e11d48"
          />
        </View>

        {/* Sección: Actividad en Vivo */}
        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <View>
              <Text style={styles.activityTitle}>Historial de Citas y Consultas</Text>
              <Text style={styles.activitySubtitle}>
                Turnos agendados y consultas atendidas en tiempo real
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                refetchMetrics();
                refetchActivity();
              }}
            >
              <RefreshCw size={13} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.refreshBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          {activity.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Calendar size={36} color="#94a3b8" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Tu panel está limpio y listo para empezar</Text>
              <Text style={styles.emptyDesc}>
                Cuando tus clientas te escriban al WhatsApp, verás reflejados acá sus turnos y sus consultas de precios al instante.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => router.push('/playground')}
              >
                <Sparkles size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Probar cómo responde el Asistente</Text>
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
                      <CalendarCheck size={16} color="#16a34a" />
                    ) : (
                      <Users size={16} color="#1a73e8" />
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
    backgroundColor: '#f8fafc'
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
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  successBannerText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '600'
  },
  enterpriseHubCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)'
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
    borderRadius: 6,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  hubTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  hubSubtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18
  },
  hubActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  btnGuide: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnGuideText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '600'
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnSecondaryText: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '600'
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
  statusChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9'
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
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0'
  },
  chipWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  chipBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  chipNeutral: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0'
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8
  },
  dotGreen: {
    backgroundColor: '#16a34a'
  },
  dotAmber: {
    backgroundColor: '#d97706'
  },
  dotBlue: {
    backgroundColor: '#1a73e8'
  },
  dotGray: {
    backgroundColor: '#94a3b8'
  },
  chipLabel: {
    color: '#475569',
    fontSize: 12,
    marginRight: 6,
    fontWeight: '500'
  },
  chipValue: {
    fontSize: 12,
    fontWeight: '700'
  },
  textGreen: {
    color: '#15803d'
  },
  textAmber: {
    color: '#b45309'
  },
  textBlue: {
    color: '#1d4ed8'
  },
  textGray: {
    color: '#64748b'
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
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  resetDataBtnText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600'
  },
  sectionTitle: {
    color: '#475569',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
      }
    })
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  activityTitle: {
    color: '#0f172a',
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
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  refreshBtnText: {
    color: '#475569',
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
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6
  },
  emptyDesc: {
    color: '#64748b',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#dcfce7'
  },
  iconLead: {
    backgroundColor: '#e0f2fe'
  },
  itemTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600'
  },
  itemSubtitle: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2
  },
  itemTimestamp: {
    color: '#64748b',
    fontSize: 11
  }
});