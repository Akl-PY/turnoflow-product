import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Zap,
  MessageSquare,
  Users,
  CalendarCheck,
  BellRing,
  RotateCcw,
  Code,
  Copy,
  Check,
  Send,
  ExternalLink,
  ShieldCheck
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

const BUSINESS_AUTOMATIONS = [
  {
    id: 'autoReply247',
    name: 'Atención, Ventas y Cotización 24/7 + Buffer Anti-Ráfaga (3.5s)',
    description:
      'Agrupa mensajes consecutivos durante 3.5 segundos para no responder cortado y contesta consultas de precios, catálogo y ventas las 24 horas.',
    category: 'Recepción & Ventas WhatsApp',
    icon: MessageSquare,
    isActive: true,
    runs: 0,
    rate: '100%'
  },
  {
    id: 'visionReceipts',
    name: 'Lectura Multimodal de Comprobantes de Pago, Fotos y Audios Cortos',
    description:
      'Analiza fotos de comprobantes bancarios, imágenes de productos/fallas y transcribe notas de voz menores a 15 segundos automáticamente.',
    category: 'Visión & Audio IA',
    icon: CalendarCheck,
    isActive: true,
    runs: 0,
    rate: '100%'
  },
  {
    id: 'autoLeadCapture',
    name: 'Auto-Captura de Clientes y Clasificación de Intención en CRM',
    description:
      'Registra automáticamente en Clientes & Leads a cada contacto que escribe por WhatsApp y etiqueta su temperatura (🔥 Alta Intención, 🚨 Urgencia o 💬 Consulta).',
    category: 'Directorio & CRM',
    icon: Users,
    isActive: true,
    runs: 0,
    rate: '100%'
  },
  {
    id: 'adminAlerts',
    name: 'Alertas al WhatsApp del Dueño (Ventas, Comprobantes y Atención Humana)',
    description:
      'Envía un aviso inmediato a tu WhatsApp personal cuando un cliente confirma un pedido, manda un comprobante de pago o solicita hablar con una persona.',
    category: 'Supervisión & Ventas',
    icon: BellRing,
    isActive: true,
    runs: 0,
    rate: '100%'
  },
  {
    id: 'appointmentReminders',
    name: 'Recordatorios Automáticos de Turnos por WhatsApp (24 hs y 2 hs antes)',
    description:
      'Envía avisos automáticos por WhatsApp 24 horas y 2 horas antes de cada compromiso confirmado en la agenda.',
    category: 'Agenda & Fidelización',
    icon: RotateCcw,
    isActive: true,
    runs: 0,
    rate: '100%'
  }
];

export default function AutomationsScreen() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>(BUSINESS_AUTOMATIONS);

  // Estados para el Webhook de integración externa
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hola! Mensaje de prueba enviado desde mi otra aplicación.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const webhookEndpoint = 'https://turnoflowapi-production.up.railway.app/api/integrations/outbound-webhook';
  const webhookKey = 'turnoflow-webhook-secret-2026';

  const copyText = async (text: string, type: 'key' | 'curl') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      if (type === 'key') {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedCurl(true);
        setTimeout(() => setCopiedCurl(false), 2000);
      }
    } catch {
      // Ignorar fallo de portapapeles
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      setTestResult({ ok: false, msg: 'Ingresa un número de WhatsApp de destino (con código de país, ej: 5493512345678)' });
      return;
    }
    if (!testMessage.trim()) {
      setTestResult({ ok: false, msg: 'Ingresa el texto del mensaje a enviar' });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await apiClient.post('/integrations/outbound-webhook', {
        to: testPhone.trim(),
        message: testMessage.trim(),
        appName: 'Test desde Panel'
      }, {
        headers: {
          'x-api-key': webhookKey
        }
      });

      if (res.data?.success) {
        setTestResult({
          ok: true,
          msg: `✅ Mensaje enviado exitosamente vía Evolution API (ID: ${res.data?.result?.messageId || 'OK'})`
        });
      } else {
        setTestResult({
          ok: false,
          msg: res.data?.error || 'No se pudo enviar. Verifica que tu sesión de WhatsApp esté conectada.'
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: err.response?.data?.message || err.message || 'Error de conexión con el webhook'
      });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    const fetchAutomations = async () => {
      try {
        const res = await apiClient.get('/automations');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setWorkflows((prev) =>
            prev.map((item, idx) => {
              const matched =
                res.data.find((r: any) => r.id === item.id) || res.data[idx];
              return matched
                ? {
                    ...item,
                    name: matched.name || item.name,
                    description: matched.description || item.description,
                    category: matched.category || item.category,
                    isActive: Boolean(matched.isActive),
                    runs: matched.totalRuns ?? 0
                  }
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
        title="Automatizaciones del Negocio"
        subtitle="Controla en vivo las reglas automáticas que operan las 24 horas en tu WhatsApp"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Banner Empresarial Google Material 3 */}
        <View style={styles.summaryBanner}>
          <View style={styles.bannerIconBadge}>
            <Zap size={20} color="#1A73E8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Automatización Integral Conectada</Text>
            <Text style={styles.bannerText}>
              Cada interruptor activa o desactiva en tiempo real la función correspondiente en el motor de WhatsApp e Inteligencia Artificial de tu negocio.
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

        {/* Sección: Webhook para Aplicaciones Externas */}
        <Text style={[styles.sectionHeader, { marginTop: 32 }]}>
          CONEXIÓN EXTERNA — API WEBHOOK (ENVIAR WHATSAPP DESDE TUS OTRAS APPS)
        </Text>

        <View style={styles.webhookCard}>
          <View style={styles.webhookHeader}>
            <View style={styles.webhookIconBg}>
              <Code size={22} color="#1A73E8" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.wfName}>Webhook de Salida vía Evolution API</Text>
                <View style={[styles.categoryBadge, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
                  <Text style={[styles.categoryBadgeText, { color: '#15803D' }]}>100% GRATUITO / INCLUIDO</Text>
                </View>
              </View>
              <Text style={styles.wfDesc}>
                Envía mensajes directos de WhatsApp desde cualquiera de tus otros sistemas (CRM, web, tienda online, scripts en Python, n8n o Node) reutilizando la misma sesión activa de WhatsApp de TurnoFlow, sin pagar otra instancia de Evolution ni consumir APIs de voz.
              </Text>
            </View>
          </View>

          {/* Credenciales y Endpoint */}
          <View style={styles.credentialsGrid}>
            <View style={styles.credItem}>
              <Text style={styles.credLabel}>ENDPOINT URL (POST)</Text>
              <View style={styles.credRow}>
                <Text style={styles.credValue} numberOfLines={1} selectable>
                  {webhookEndpoint}
                </Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyText(webhookEndpoint, 'curl')}
                >
                  {copiedCurl ? (
                    <Check size={14} color="#16A34A" />
                  ) : (
                    <Copy size={14} color="#1A73E8" />
                  )}
                  <Text style={[styles.copyBtnText, copiedCurl && { color: '#16A34A' }]}>
                    {copiedCurl ? 'Copiado' : 'Copiar URL'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.credItem}>
              <Text style={styles.credLabel}>API KEY DE AUTENTICACIÓN (Header: x-api-key)</Text>
              <View style={styles.credRow}>
                <Text style={styles.credValue} numberOfLines={1} selectable>
                  {webhookKey}
                </Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyText(webhookKey, 'key')}
                >
                  {copiedKey ? (
                    <Check size={14} color="#16A34A" />
                  ) : (
                    <Copy size={14} color="#1A73E8" />
                  )}
                  <Text style={[styles.copyBtnText, copiedKey && { color: '#16A34A' }]}>
                    {copiedKey ? 'Copiada' : 'Copiar Key'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Código de Ejemplo cURL */}
          <View style={styles.codeSnippetContainer}>
            <View style={styles.codeSnippetHeader}>
              <Text style={styles.codeSnippetTitle}>EJEMPLO cURL (Listo para copiar y pegar)</Text>
              <TouchableOpacity
                style={styles.copyCodeBtn}
                onPress={() =>
                  copyText(
                    `curl -X POST "${webhookEndpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${webhookKey}" \\\n  -d '{"to": "5493512345678", "message": "Mensaje desde mi app", "appName": "MiCRM"}'`,
                    'curl'
                  )
                }
              >
                {copiedCurl ? (
                  <Check size={13} color="#16A34A" />
                ) : (
                  <Copy size={13} color="#94A3B8" />
                )}
                <Text style={styles.copyCodeText}>
                  {copiedCurl ? 'Comando cURL Copiado!' : 'Copiar cURL'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal style={styles.codeScroll} showsHorizontalScrollIndicator={false}>
              <Text style={styles.codeText} selectable>
                {`curl -X POST "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${webhookKey}" \\
  -d '{
    "to": "5493512345678",
    "message": "Hola! Notificación enviada desde mi sistema.",
    "appName": "Mi CRM"
  }'`}
              </Text>
            </ScrollView>
          </View>

          {/* Probador en Vivo */}
          <View style={styles.testerContainer}>
            <Text style={styles.testerTitle}>🧪 Probar Envío Inmediato desde este Panel</Text>
            <Text style={styles.testerSubtitle}>
              Ingresa un número de prueba con código de país para verificar que sale al instante por tu WhatsApp conectado:
            </Text>

            <View style={styles.testerInputsRow}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={styles.inputLabel}>Número Destino (ej: 5493512345678)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="5493512345678"
                  placeholderTextColor="#94A3B8"
                  value={testPhone}
                  onChangeText={setTestPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ flex: 2, minWidth: 260 }}>
                <Text style={styles.inputLabel}>Mensaje de Texto</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Escribe el mensaje..."
                  placeholderTextColor="#94A3B8"
                  value={testMessage}
                  onChangeText={setTestMessage}
                />
              </View>

              <TouchableOpacity
                style={[styles.sendTestBtn, sendingTest && { opacity: 0.6 }]}
                onPress={handleSendTestMessage}
                disabled={sendingTest}
              >
                {sendingTest ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={15} color="#FFFFFF" />
                    <Text style={styles.sendTestBtnText}>Enviar Prueba</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {testResult && (
              <View
                style={[
                  styles.testResultBadge,
                  testResult.ok ? styles.resultSuccess : styles.resultError
                ]}
              >
                <Text
                  style={[
                    styles.testResultText,
                    testResult.ok ? styles.resultTextSuccess : styles.resultTextError
                  ]}
                >
                  {testResult.msg}
                </Text>
              </View>
            )}
          </View>
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
  },
  webhookCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 24,
    gap: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(26, 115, 232, 0.08)'
      } as any
    })
  },
  webhookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16
  },
  webhookIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  credentialsGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14
  },
  credItem: {
    gap: 6
  },
  credLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12
  },
  credValue: {
    flex: 1,
    color: '#0F172A',
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontSize: 13,
    fontWeight: '600'
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  copyBtnText: {
    color: '#1A73E8',
    fontSize: 12,
    fontWeight: '600'
  },
  codeSnippetContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 16,
    gap: 12
  },
  codeSnippetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  codeSnippetTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  copyCodeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600'
  },
  codeScroll: {
    maxHeight: 160
  },
  codeText: {
    color: '#38BDF8',
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontSize: 12,
    lineHeight: 18
  },
  testerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 18,
    gap: 12
  },
  testerTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700'
  },
  testerSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17
  },
  testerInputsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 12
  },
  inputLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A'
  },
  sendTestBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    justifyContent: 'center'
  },
  sendTestBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  testResultBadge: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4
  },
  resultSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0'
  },
  resultError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  testResultText: {
    fontSize: 12,
    lineHeight: 18
  },
  resultTextSuccess: {
    color: '#15803D',
    fontWeight: '600'
  },
  resultTextError: {
    color: '#B91C1C',
    fontWeight: '600'
  }
});
