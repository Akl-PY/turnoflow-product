import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform
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
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Smartphone,
  ShieldCheck
} from 'lucide-react-native';
import { Header } from '../src/components/Header';
import { MetricCard } from '../src/components/MetricCard';
import {
  apiClient,
  INITIAL_METRICS,
  getTenantWebhookUrl,
  getTenantVerifyToken
} from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tenantWebhookUrl = getTenantWebhookUrl(user?.organizationId);
  const tenantVerifyToken = getTenantVerifyToken(user?.organizationId);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Consulta de estadísticas reales de Supabase (0 si no hay datos aún)
  const { data: metrics = INITIAL_METRICS } = useQuery({
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

  // Consulta de actividad reciente real (sin datos inventados)
  const { data: activity = [] } = useQuery({
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

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard General"
        subtitle={`Métricas de recepción y conversión en tiempo real — ${user?.organizationName || 'TurnoFlow Beauty Studio'}`}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Tarjeta Destacada: Puesta en Marcha y Conexión de WhatsApp */}
        <View style={styles.whatsappCard}>
          <View style={styles.whatsappCardHeader}>
            <View style={styles.whatsappBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.whatsappBadgeText}>WHATSAPP 24/7 ACTIVO</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.whatsappTitle}>
                Conectá tu WhatsApp Oficial de Meta en 3 Pasos
              </Text>
              <Text style={styles.whatsappDesc}>
                Vinculá el webhook oficial para que los agentes inteligentes respondan consultas, coticen tratamientos y agenden citas sin intervención humana.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.whatsappPrimaryBtn}
              onPress={() => router.push('/onboarding')}
            >
              <Smartphone size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.whatsappPrimaryBtnText}>Configurar Número</Text>
              <ArrowRight size={14} color="#ffffff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Grid de Webhook y Token Multi-Tenant con Copiado Rápido */}
          <View style={styles.webhookGrid}>
            <View style={styles.webhookItem}>
              <Text style={styles.webhookLabel}>1. URL DEL WEBHOOK (EXCLUSIVA DE TU SALÓN)</Text>
              <View style={styles.copyBox}>
                <Text style={styles.copyValue} numberOfLines={1}>
                  {tenantWebhookUrl}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.copyBtn,
                    copiedKey === 'url' && styles.copyBtnSuccess
                  ]}
                  onPress={() => handleCopy(tenantWebhookUrl, 'url')}
                >
                  {copiedKey === 'url' ? (
                    <>
                      <Check size={12} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.copyBtnSuccessText}>¡Copiado!</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={12} color="#a1a1aa" style={{ marginRight: 4 }} />
                      <Text style={styles.copyBtnText}>Copiar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.webhookNoteText}>
                Ruta única aislada para recibir los mensajes directos de tu salón en Meta Cloud API.
              </Text>
            </View>

            <View style={styles.webhookItem}>
              <Text style={styles.webhookLabel}>2. TOKEN DE VERIFICACIÓN ÚNICO (MULTI-TENANT)</Text>
              <View style={styles.copyBox}>
                <Text style={styles.copyValue} numberOfLines={1}>
                  {tenantVerifyToken}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.copyBtn,
                    copiedKey === 'token' && styles.copyBtnSuccess
                  ]}
                  onPress={() => handleCopy(tenantVerifyToken, 'token')}
                >
                  {copiedKey === 'token' ? (
                    <>
                      <Check size={12} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.copyBtnSuccessText}>¡Copiado!</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={12} color="#a1a1aa" style={{ marginRight: 4 }} />
                      <Text style={styles.copyBtnText}>Copiar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.webhookNoteText}>
                Clave criptográfica única e irrepetible para autenticar y blindar la conexión de tu negocio.
              </Text>
            </View>
          </View>

          {/* Barra inferior de prueba */}
          <View style={styles.whatsappFooter}>
            <Text style={styles.whatsappFooterHint}>
              💡 ¿Querés probar cómo responde el bot antes de conectar Meta?
            </Text>
            <TouchableOpacity
              style={styles.playgroundQuickBtn}
              onPress={() => router.push('/playground')}
            >
              <Sparkles size={14} color="#a855f7" style={{ marginRight: 6 }} />
              <Text style={styles.playgroundQuickBtnText}>
                Probar en Simulador Playground
              </Text>
            </TouchableOpacity>
          </View>
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

            {activity.length === 0 ? (
              <View style={styles.emptyActivity}>
                <MessageSquare size={32} color="#52525b" style={{ marginBottom: 10 }} />
                <Text style={styles.emptyActivityTitle}>Sin actividad registrada todavía</Text>
                <Text style={styles.emptyActivityText}>
                  Los mensajes recibidos por WhatsApp y los turnos confirmados aparecerán aquí en vivo en tiempo real.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActivityBtn}
                  onPress={() => router.push('/playground')}
                >
                  <Sparkles size={13} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyActivityBtnText}>Simular una conversación</Text>
                </TouchableOpacity>
              </View>
            ) : (
              activity.map((item: any) => (
                <View key={item.id} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.activityTime}>{item.timestamp}</Text>
                </View>
              ))
            )}
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
  },
  whatsappCard: {
    backgroundColor: '#0c1a14',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    gap: 16
  },
  whatsappCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap'
  },
  whatsappBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e'
  },
  whatsappBadgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  whatsappTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4
  },
  whatsappDesc: {
    color: '#a1a1aa',
    fontSize: 12,
    lineHeight: 18
  },
  whatsappPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  whatsappPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  webhookGrid: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap'
  },
  webhookItem: {
    flex: 1,
    minWidth: 280,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    gap: 6
  },
  webhookNoteText: {
    color: '#a1a1aa',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2
  },
  webhookLabel: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  copyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8
  },
  copyValue: {
    color: '#e4e4e7',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    flex: 1
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  copyBtnSuccess: {
    backgroundColor: '#16a34a'
  },
  copyBtnText: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '600'
  },
  copyBtnSuccessText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  whatsappFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
    flexWrap: 'wrap',
    gap: 10
  },
  whatsappFooterHint: {
    color: '#a1a1aa',
    fontSize: 12
  },
  playgroundQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  playgroundQuickBtnText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '600'
  },
  emptyActivity: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyActivityTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  emptyActivityText: {
    color: '#71717a',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
    marginBottom: 14
  },
  emptyActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  emptyActivityBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  }
});
