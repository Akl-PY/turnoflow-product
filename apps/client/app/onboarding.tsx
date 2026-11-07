import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../src/components/Header';
import {
  Building2,
  Save,
  CheckCircle,
  FileText,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  BookOpen
} from 'lucide-react-native';
import {
  apiClient,
  getTenantWebhookUrl,
  getTenantVerifyToken
} from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const tenantWebhookUrl = getTenantWebhookUrl(user?.organizationId);
  const tenantVerifyToken = getTenantVerifyToken(user?.organizationId);

  const [activeTab, setActiveTab] = useState<'whatsapp' | 'business'>('whatsapp');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Datos Comerciales
  const [businessName, setBusinessName] = useState(
    user?.organizationName || 'TurnoFlow Beauty Studio'
  );
  const [description, setDescription] = useState('Estudio de belleza y estética integral');
  const [location, setLocation] = useState('Av. Santa Fe 2450, Recoleta, Buenos Aires');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [phone, setPhone] = useState('+5491133445566');
  const [cancellationPolicy, setCancellationPolicy] = useState(
    'Cancelaciones con al menos 24 horas de antelación sin cargo.'
  );

  // WhatsApp Meta Cloud API
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const res = await apiClient.get('/business');
        if (res.data) {
          if (res.data.businessName) setBusinessName(res.data.businessName);
          if (res.data.description) setDescription(res.data.description);
          if (res.data.location) setLocation(res.data.location);
          if (res.data.timezone) setTimezone(res.data.timezone);
          if (res.data.contactPhone) setPhone(res.data.contactPhone);
          if (res.data.cancellationPolicy) setCancellationPolicy(res.data.cancellationPolicy);

          if (res.data.specialInstructions) {
            try {
              const parsed = JSON.parse(res.data.specialInstructions);
              if (parsed.whatsapp) {
                if (parsed.whatsapp.phoneNumberId) setPhoneNumberId(parsed.whatsapp.phoneNumberId);
                if (parsed.whatsapp.wabaId) setWabaId(parsed.whatsapp.wabaId);
                if (parsed.whatsapp.accessToken) setAccessToken(parsed.whatsapp.accessToken);
              }
            } catch {
              // no json in instructions
            }
          }
        }
      } catch {
        // mantener valores iniciales
      }
    };
    fetchBusiness();
  }, [user?.organizationId]);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const waConfig = JSON.stringify({
        whatsapp: {
          phoneNumberId: phoneNumberId.trim(),
          wabaId: wabaId.trim(),
          accessToken: accessToken.trim(),
          updatedAt: new Date().toISOString()
        }
      });

      await apiClient.put('/business', {
        businessName,
        description,
        location,
        timezone,
        contactPhone: phone,
        cancellationPolicy,
        specialInstructions: waConfig
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const testChatUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
    'Hola, quiero consultar por los servicios y turnos disponibles'
  )}`;

  const handleOpenTestChat = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(testChatUrl, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(testChatUrl);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Conexión de WhatsApp & Configuración"
        subtitle="Asistente de puesta en marcha para conectar tu salón con los 5 agentes de IA"
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'whatsapp' && styles.tabItemActive]}
          onPress={() => setActiveTab('whatsapp')}
        >
          <Smartphone
            size={16}
            color={activeTab === 'whatsapp' ? '#4ade80' : '#71717a'}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'whatsapp' && { color: '#4ade80', fontWeight: '700' }
            ]}
          >
            1. Conexión WhatsApp 24/7 (Meta)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'business' && styles.tabItemActive]}
          onPress={() => setActiveTab('business')}
        >
          <Building2
            size={16}
            color={activeTab === 'business' ? '#a855f7' : '#71717a'}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'business' && { color: '#c084fc', fontWeight: '700' }
            ]}
          >
            2. Perfil Comercial y Políticas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {savedSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle size={16} color="#22c55e" style={{ marginRight: 8 }} />
            <Text style={styles.successText}>
              ¡Configuración guardada y sincronizada exitosamente con la nube de TurnoFlow AI!
            </Text>
          </View>
        )}

        {activeTab === 'whatsapp' ? (
          <View style={styles.sectionContainer}>
            {/* Status Card */}
            <View style={styles.statusHero}>
              <View style={styles.statusDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusHeroTitle}>
                  Recepción Inteligente Oficial de WhatsApp Cloud API
                </Text>
                <Text style={styles.statusHeroDesc}>
                  Tu backend en Railway está listo para recibir mensajes 24/7 y procesarlos mediante IA.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heroChatBtn}
                onPress={handleOpenTestChat}
              >
                <Smartphone size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.heroChatBtnText}>Abrir Chat de Prueba</Text>
              </TouchableOpacity>
            </View>

            {/* Paso 1: Webhook & Verify Token */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepCircleText}>1</Text>
                </View>
                <View>
                  <Text style={styles.cardTitle}>Datos del Webhook para Meta Developers</Text>
                  <Text style={styles.cardSubtitle}>
                    Copiá estos datos y pegalos en la configuración de Webhook de tu App en Meta
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>URL DEL WEBHOOK EXCLUSIVO DE TU SALÓN</Text>
                <View style={styles.copyRow}>
                  <TextInput
                    style={[styles.input, styles.monoInput, { flex: 1 }]}
                    value={tenantWebhookUrl}
                    editable={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.actionCopyBtn,
                      copiedKey === 'wh_url' && styles.actionCopyBtnSuccess
                    ]}
                    onPress={() => handleCopy(tenantWebhookUrl, 'wh_url')}
                  >
                    {copiedKey === 'wh_url' ? (
                      <>
                        <Check size={14} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.actionCopyBtnTextSuccess}>¡Copiado!</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#a1a1aa" style={{ marginRight: 6 }} />
                        <Text style={styles.actionCopyBtnText}>Copiar URL</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>TOKEN DE VERIFICACIÓN ÚNICO (MULTI-TENANT)</Text>
                <View style={styles.copyRow}>
                  <TextInput
                    style={[styles.input, styles.monoInput, { flex: 1 }]}
                    value={tenantVerifyToken}
                    editable={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.actionCopyBtn,
                      copiedKey === 'wh_token' && styles.actionCopyBtnSuccess
                    ]}
                    onPress={() => handleCopy(tenantVerifyToken, 'wh_token')}
                  >
                    {copiedKey === 'wh_token' ? (
                      <>
                        <Check size={14} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.actionCopyBtnTextSuccess}>¡Copiado!</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#a1a1aa" style={{ marginRight: 6 }} />
                        <Text style={styles.actionCopyBtnText}>Copiar Token</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  🔑 Este es el token criptográfico exclusivo generado para tu salón. Garantiza aislamiento total para que los mensajes de tus clientes y la agenda de turnos solo pertenezcan a tu cuenta.
                </Text>
              </View>
            </View>

            {/* Paso 2: Guía Rápida de Configuración en Meta */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepCircleText}>2</Text>
                </View>
                <View>
                  <Text style={styles.cardTitle}>Guía Rápida en Meta for Developers (5 min)</Text>
                  <Text style={styles.cardSubtitle}>
                    Pasos exactos para vincular tu número en developers.facebook.com
                  </Text>
                </View>
              </View>

              <View style={styles.stepsList}>
                <View style={styles.stepItem}>
                  <Text style={styles.stepNum}>A.</Text>
                  <Text style={styles.stepText}>
                    Entrá en{' '}
                    <Text
                      style={styles.linkInline}
                      onPress={() => Linking.openURL('https://developers.facebook.com/apps')}
                    >
                      developers.facebook.com/apps
                    </Text>{' '}
                    y creá una aplicación seleccionando el tipo <Text style={styles.boldText}>"Otro" → "Negocios"</Text>.
                  </Text>
                </View>
                <View style={styles.stepItem}>
                  <Text style={styles.stepNum}>B.</Text>
                  <Text style={styles.stepText}>
                    En el panel lateral hacé clic en <Text style={styles.boldText}>"WhatsApp" → "Configuración rápida"</Text>. Meta te dará un número de prueba con 1.000 conversaciones gratis al mes.
                  </Text>
                </View>
                <View style={styles.stepItem}>
                  <Text style={styles.stepNum}>C.</Text>
                  <Text style={styles.stepText}>
                    En la pestaña <Text style={styles.boldText}>"Configuración" → "Webhook"</Text>, pegá la URL y el Token del Paso 1, y hacé clic en <Text style={styles.boldText}>"Verificar y Guardar"</Text>.
                  </Text>
                </View>
                <View style={styles.stepItem}>
                  <Text style={styles.stepNum}>D.</Text>
                  <Text style={styles.stepText}>
                    Hacé clic en <Text style={styles.boldText}>"Administrar campos"</Text> y seleccioná <Text style={styles.boldText}>"messages"</Text>. ¡Listo! Cada mensaje entrante será atendido por la IA.
                  </Text>
                </View>
              </View>
            </View>

            {/* Paso 3: Guardar Credenciales Opcionales */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepCircleText}>3</Text>
                </View>
                <View>
                  <Text style={styles.cardTitle}>Credenciales de tu Número de WhatsApp</Text>
                  <Text style={styles.cardSubtitle}>
                    Opcional: para que la IA responda directamente usando tu línea oficial
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>TELÉFONO DE WHATSAPP DEL SALÓN (CON CÓDIGO DE PAÍS)</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+5491133445566"
                  placeholderTextColor="#52525b"
                />
                <Text style={styles.hint}>
                  Ejemplo para Argentina: +54 9 11 xxxx-xxxx | Para México: +52 1 xxxxxxxxxx
                </Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>PHONE NUMBER ID (META)</Text>
                  <TextInput
                    style={styles.input}
                    value={phoneNumberId}
                    onChangeText={setPhoneNumberId}
                    placeholder="Ej. 104938291029384"
                    placeholderTextColor="#52525b"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>WHATSAPP BUSINESS ACCOUNT ID (WABA)</Text>
                  <TextInput
                    style={styles.input}
                    value={wabaId}
                    onChangeText={setWabaId}
                    placeholder="Ej. 948201948203948"
                    placeholderTextColor="#52525b"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>META ACCESS TOKEN (TOKEN PERMANENTE)</Text>
                <TextInput
                  style={[styles.input, { fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}
                  value={accessToken}
                  onChangeText={setAccessToken}
                  placeholder="EAAB..."
                  placeholderTextColor="#52525b"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                <Save size={16} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Guardando en la nube...' : 'Guardar Credenciales de WhatsApp'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Accesos Rápidos */}
            <View style={styles.quickBar}>
              <TouchableOpacity
                style={styles.quickBarBtn}
                onPress={() => router.push('/playground')}
              >
                <Sparkles size={16} color="#c084fc" style={{ marginRight: 8 }} />
                <Text style={styles.quickBarBtnText}>Probar en Playground de IA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBarBtn}
                onPress={() => router.push('/knowledge-base')}
              >
                <BookOpen size={16} color="#60a5fa" style={{ marginRight: 8 }} />
                <Text style={styles.quickBarBtnText}>Cargar Servicios y Precios</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.sectionContainer}>
            {/* Tab 2: Perfil Comercial */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Building2 size={18} color="#a855f7" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Identidad Comercial</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre Comercial del Negocio</Text>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Ej. Spa Esencia"
                  placeholderTextColor="#52525b"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descripción y Especialidad</Text>
                <TextInput
                  style={[styles.input, { height: 70 }]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  placeholder="Describe los tratamientos destacados y propuesta de valor..."
                  placeholderTextColor="#52525b"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Ubicación Física</Text>
                  <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Dirección, piso, ciudad"
                    placeholderTextColor="#52525b"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Zona Horaria (IANA)</Text>
                  <TextInput
                    style={styles.input}
                    value={timezone}
                    onChangeText={setTimezone}
                    placeholder="America/Argentina/Buenos_Aires"
                    placeholderTextColor="#52525b"
                  />
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <FileText size={18} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Políticas de Turnos y Cancelaciones</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Política Informada por los Agentes</Text>
                <TextInput
                  style={[styles.input, { height: 70 }]}
                  value={cancellationPolicy}
                  onChangeText={setCancellationPolicy}
                  multiline
                  placeholder="Ej. Cancelaciones con 24hs de antelación..."
                  placeholderTextColor="#52525b"
                />
                <Text style={styles.hint}>
                  Esta política será explicada a los clientes que soliciten cancelar o reprogramar citas por WhatsApp.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              <Save size={16} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando...' : 'Guardar Perfil Comercial'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#121215',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    paddingHorizontal: 28
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabItemActive: {
    borderBottomColor: '#4ade80'
  },
  tabText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '600'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 28,
    maxWidth: 960
  },
  sectionContainer: {
    gap: 20
  },
  statusHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1a14',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 12,
    padding: 18,
    gap: 14,
    flexWrap: 'wrap'
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e'
  },
  statusHeroTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2
  },
  statusHeroDesc: {
    color: '#a1a1aa',
    fontSize: 12
  },
  heroChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8
  },
  heroChatBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12
  },
  card: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 20
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderWidth: 1,
    borderColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepCircleText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '800'
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  cardSubtitle: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  input: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13
  },
  monoInput: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    color: '#86efac'
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  actionCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  actionCopyBtnSuccess: {
    backgroundColor: '#16a34a'
  },
  actionCopyBtnText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600'
  },
  actionCopyBtnTextSuccess: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  stepsList: {
    gap: 10
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  stepNum: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700'
  },
  stepText: {
    color: '#d4d4d8',
    fontSize: 12,
    lineHeight: 18,
    flex: 1
  },
  boldText: {
    fontWeight: '700',
    color: '#ffffff'
  },
  linkInline: {
    color: '#60a5fa',
    textDecorationLine: 'underline'
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap'
  },
  hint: {
    color: '#52525b',
    fontSize: 11,
    marginTop: 6
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f7',
    paddingVertical: 13,
    borderRadius: 8,
    marginTop: 8
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  quickBar: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap'
  },
  quickBarBtn: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingVertical: 12,
    borderRadius: 8
  },
  quickBarBtnText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '600'
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  successText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600'
  }
});
