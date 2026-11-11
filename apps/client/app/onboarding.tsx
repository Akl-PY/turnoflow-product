import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../src/components/Header';
import {
  Building2,
  Save,
  CheckCircle,
  Smartphone,
  Calendar,
  RefreshCw,
  PowerOff,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
  Layers,
  Trash2,
  Lock,
  ShieldAlert
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'qr' | 'scalinky' | 'business'>('qr');

  // WhatsApp Móvil (Evolution API / Baileys)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'DISCONNECTED' | 'SCAN_QR' | 'CONNECTED'>('DISCONNECTED');
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Agenda & Scalinky Turnero
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [togglingBooking, setTogglingBooking] = useState(false);
  const [scalinkySlug, setScalinkySlug] = useState('');
  const [isScalinkyLinked, setIsScalinkyLinked] = useState(false);
  const [savingScalinky, setSavingScalinky] = useState(false);
  const [syncingScalinky, setSyncingScalinky] = useState(false);
  const [scalinkyCache, setScalinkyCache] = useState<any | null>(null);
  const [scalinkyFeedback, setScalinkyFeedback] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [scalinkyServerOnline, setScalinkyServerOnline] = useState<boolean | null>(null);
  const [checkingScalinkyHealth, setCheckingScalinkyHealth] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerAuth, setShowOwnerAuth] = useState(false);
  const [ownerVerified, setOwnerVerified] = useState(false);

  // Datos Comerciales & Horarios
  const [businessName, setBusinessName] = useState(
    user?.organizationName || 'Mi Negocio'
  );
  const [description, setDescription] = useState('Atención comercial y coordinación de servicios');
  const [location, setLocation] = useState('Av. Principal 123, Ciudad');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [phone, setPhone] = useState('+5491133445566');
  const [cancellationPolicy, setCancellationPolicy] = useState(
    'Cancelaciones o reprogramaciones con al menos 24 horas de antelación.'
  );
  const [businessHours, setBusinessHours] = useState<
    Array<{ day: string; open: string; close: string; isOpen: boolean }>
  >([
    { day: 'monday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'tuesday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'wednesday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'thursday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'friday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'saturday', open: '09:00', close: '13:00', isOpen: true },
    { day: 'sunday', open: '09:00', close: '13:00', isOpen: false }
  ]);

  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessSuccess, setBusinessSuccess] = useState(false);

  // Consultar estado de WhatsApp
  const fetchQRStatus = async () => {
    try {
      const res = await apiClient.get('/integrations/whatsapp-qr/status');
      if (res.data?.status) {
        setQrStatus(res.data.status);
        if (res.data.connectedPhone) {
          setConnectedPhone(res.data.connectedPhone);
        }
      }
    } catch {
      // Ignorar reintentos periódicos
    }
  };

  const handleGenerateQR = async () => {
    setLoadingQr(true);
    setQrError(null);
    try {
      const res = await apiClient.post('/integrations/whatsapp-qr/session');
      if (res.data?.qrCode) {
        setQrCodeData(res.data.qrCode);
        setQrStatus('SCAN_QR');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'No se pudo conectar con el servidor de WhatsApp. Reintenta en unos instantes.';
      setQrError(msg);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDisconnectQR = async () => {
    try {
      await apiClient.delete('/integrations/whatsapp-qr/session');
      setQrStatus('DISCONNECTED');
      setQrCodeData(null);
      setConnectedPhone(null);
    } catch (err: any) {
      console.warn('Error desconectando QR:', err?.message);
    }
  };

  useEffect(() => {
    fetchQRStatus();
    if (activeTab === 'qr') {
      const interval = setInterval(fetchQRStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Consultar estado de Scalinky en tiempo real
  const fetchScalinkyStatus = async () => {
    setCheckingScalinkyHealth(true);
    try {
      const res = await apiClient.get('/integrations/scalinky/status');
      setScalinkyServerOnline(Boolean(res.data?.online));
    } catch {
      setScalinkyServerOnline(false);
    } finally {
      setCheckingScalinkyHealth(false);
    }
  };

  useEffect(() => {
    fetchScalinkyStatus();
  }, [activeTab]);

  // Cargar datos comerciales y horarios
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
          if (Array.isArray(res.data.businessHours) && res.data.businessHours.length > 0) {
            setBusinessHours(res.data.businessHours);
          }

          // Revisar si existe configuración de agenda y Scalinky en specialInstructions
          if (res.data.specialInstructions) {
            try {
              const parsed = JSON.parse(res.data.specialInstructions);
              if (typeof parsed?.bookingEnabled === 'boolean') {
                setBookingEnabled(parsed.bookingEnabled);
              }
              if (parsed?.scalinkySlug) {
                setScalinkySlug(parsed.scalinkySlug);
                setIsScalinkyLinked(true);
                if (parsed.ownerEmail) setOwnerEmail(parsed.ownerEmail);
                if (parsed.ownerVerified) setOwnerVerified(true);
                if (parsed.scalinkyCache) setScalinkyCache(parsed.scalinkyCache);
              }
            } catch {
              // no es JSON
            }
          }
        }
      } catch {
        // Mantener defaults
      }
    };
    fetchBusiness();
  }, [user?.organizationId]);

  // Habilitar / Deshabilitar Agenda de Turnos
  const handleToggleBookingEnabled = async () => {
    setTogglingBooking(true);
    const nextValue = !bookingEnabled;
    try {
      await apiClient.put('/business', {
        specialInstructions: JSON.stringify({
          bookingEnabled: nextValue,
          updatedAt: new Date().toISOString()
        })
      });
      setBookingEnabled(nextValue);
      setScalinkyFeedback({
        type: nextValue ? 'success' : 'warning',
        text: nextValue
          ? '✅ Agenda de turnos HABILITADA. El asistente verificará disponibilidad y coordinará turnos.'
          : '⏸️ Agenda de turnos DESHABILITADA. El asistente solo responderá consultas, precios y horarios, derivando reservas al equipo humano.'
      });
      setTimeout(() => setScalinkyFeedback(null), 5000);
    } catch {
      setScalinkyFeedback({
        type: 'error',
        text: 'No se pudo actualizar el estado de la agenda.'
      });
    } finally {
      setTogglingBooking(false);
    }
  };

  // Botón para Sincronizar Datos de Scalinky manualmente cuando hagan un cambio
  const handleSyncScalinkyNow = async () => {
    const trimmed = scalinkySlug.trim().toLowerCase();
    if (!trimmed) {
      setScalinkyFeedback({
        type: 'error',
        text: 'Ingresa primero el identificador (slug) de tu negocio en Scalinky.'
      });
      return;
    }

    setSyncingScalinky(true);
    setScalinkyFeedback(null);
    try {
      const syncRes = await apiClient.post(`/integrations/scalinky/${trimmed}/sync`);
      const snapshot = syncRes.data;

      if (!snapshot?.synced) {
        setScalinkyServerOnline(snapshot?.status !== 'OFFLINE');
        setScalinkyCache(snapshot);
        setScalinkyFeedback({
          type: 'error',
          text: `⚠️ Estado Desincronizado: ${snapshot?.message || 'Verifica que tu negocio en Scalinky tenga horarios, servicios y empleados cargados.'}`
        });
        return;
      }

      setScalinkyServerOnline(true);
      setScalinkyCache(snapshot);
      setIsScalinkyLinked(true);

      await apiClient.put('/business', {
        specialInstructions: JSON.stringify({
          bookingEnabled,
          scalinkySlug: trimmed,
          scalinkyCache: snapshot,
          ownerEmail: ownerEmail.trim() || undefined,
          ownerVerified,
          updatedAt: new Date().toISOString()
        })
      });

      setScalinkyFeedback({
        type: 'success',
        text: `🔄 ¡Datos de Scalinky sincronizados y guardados! (${snapshot.services?.length || 0} servicios y ${snapshot.staff?.length || 0} empleados listos en memoria).`
      });
      setTimeout(() => setScalinkyFeedback(null), 6000);
    } catch {
      setScalinkyFeedback({
        type: 'error',
        text: '❌ Error de red al sincronizar con Scalinky.'
      });
    } finally {
      setSyncingScalinky(false);
    }
  };

  // Desvincular Scalinky por completo
  const handleUnlinkScalinky = async () => {
    setSavingScalinky(true);
    setScalinkyFeedback(null);
    try {
      await apiClient.put('/business', {
        specialInstructions: JSON.stringify({
          bookingEnabled,
          scalinkySlug: '',
          scalinkyCache: null
        })
      });
      setScalinkySlug('');
      setIsScalinkyLinked(false);
      setScalinkyCache(null);
      setOwnerEmail('');
      setOwnerPassword('');
      setOwnerVerified(false);
      setScalinkyFeedback({
        type: 'success',
        text: 'Scalinky desvinculado con éxito. Ahora el Asistente de IA responderá utilizando únicamente el catálogo nativo de TurnoFlow (Servicios & Tarifas).'
      });
      setTimeout(() => setScalinkyFeedback(null), 5000);
    } catch {
      setScalinkyFeedback({
        type: 'error',
        text: 'Error al desvincular Scalinky. Reintenta en unos instantes.'
      });
    } finally {
      setSavingScalinky(false);
    }
  };

  // Guardar vinculación de Scalinky por primera vez (valida salud, dueño, horarios, servicios y empleados)
  const handleSaveScalinky = async () => {
    setSavingScalinky(true);
    setScalinkyFeedback(null);
    try {
      const trimmed = scalinkySlug.trim().toLowerCase();

      if (!trimmed) {
        await handleUnlinkScalinky();
        return;
      }

      // 1. Verificar si el backend de Scalinky está levantado y online
      let online = false;
      try {
        const healthRes = await apiClient.get('/integrations/scalinky/status');
        online = Boolean(healthRes.data?.online);
        setScalinkyServerOnline(online);
      } catch {
        online = false;
        setScalinkyServerOnline(false);
      }

      if (!online) {
        setScalinkyFeedback({
          type: 'error',
          text: '⚠️ No se puede sincronizar: El servidor de Scalinky no está activo ni accesible (Offline). Inicia el backend de Scalinky en el puerto 3000 o mantén el catálogo nativo de TurnoFlow.'
        });
        setSavingScalinky(false);
        return;
      }

      // 2. Si se ingresaron credenciales de dueño, verificar titularidad
      let verifiedStatus = ownerVerified;
      if (ownerEmail.trim() && ownerPassword.trim()) {
        try {
          const verifyRes = await apiClient.post(`/integrations/scalinky/${trimmed}/verify-owner`, {
            email: ownerEmail.trim(),
            password: ownerPassword.trim()
          });
          if (!verifyRes.data?.valid) {
            setScalinkyFeedback({
              type: 'error',
              text: `❌ Verificación de dueño rechazada: ${verifyRes.data?.message || 'Credenciales incorrectas para este negocio en Scalinky.'}`
            });
            setSavingScalinky(false);
            return;
          }
          verifiedStatus = true;
          setOwnerVerified(true);
        } catch {
          setScalinkyFeedback({
            type: 'error',
            text: '❌ Error al autenticar las credenciales del dueño en Scalinky.'
          });
          setSavingScalinky(false);
          return;
        }
      }

      // 3. Sincronizar por primera vez: verificar que el negocio tenga horarios, servicios, empleados y disponibilidad
      const syncRes = await apiClient.post(`/integrations/scalinky/${trimmed}/sync`);
      const snapshot = syncRes.data;

      if (!snapshot?.synced) {
        setScalinkyCache(snapshot);
        setScalinkyFeedback({
          type: 'error',
          text: `❌ No se pudo vincular "${trimmed}": ${snapshot?.message || 'El negocio en Scalinky debe tener horarios, servicios y empleados configurados.'}`
        });
        setSavingScalinky(false);
        return;
      }

      setScalinkyCache(snapshot);

      const payload: any = {
        specialInstructions: JSON.stringify({
          bookingEnabled,
          scalinkySlug: trimmed,
          scalinkyCache: snapshot,
          ownerEmail: ownerEmail.trim() || undefined,
          ownerVerified: verifiedStatus,
          updatedAt: new Date().toISOString()
        })
      };

      await apiClient.put('/business', payload);
      setIsScalinkyLinked(true);
      setScalinkyFeedback({
        type: 'success',
        text: `¡Conectado y sincronizado con "${trimmed}"! Se guardaron ${snapshot.services?.length || 0} servicios y ${snapshot.staff?.length || 0} empleados para no buscarlos en cada mensaje.`
      });
      setTimeout(() => setScalinkyFeedback(null), 6000);
    } catch {
      setScalinkyFeedback({
        type: 'error',
        text: 'Error al actualizar la configuración de Scalinky.'
      });
    } finally {
      setSavingScalinky(false);
    }
  };

  // Helpers para modificar horarios del negocio
  const toggleDayOpen = (dayKey: string) => {
    setBusinessHours((prev) =>
      prev.map((item) => (item.day === dayKey ? { ...item, isOpen: !item.isOpen } : item))
    );
  };

  const updateDayTime = (dayKey: string, field: 'open' | 'close', value: string) => {
    setBusinessHours((prev) =>
      prev.map((item) => (item.day === dayKey ? { ...item, [field]: value } : item))
    );
  };

  const copyMondayToWeekdays = () => {
    const monday = businessHours.find((h) => h.day === 'monday');
    if (!monday) return;
    setBusinessHours((prev) =>
      prev.map((item) =>
        ['tuesday', 'wednesday', 'thursday', 'friday'].includes(item.day)
          ? { ...item, open: monday.open, close: monday.close, isOpen: monday.isOpen }
          : item
      )
    );
  };

  // Guardar datos comerciales y horarios del negocio
  const handleSaveBusiness = async () => {
    setSavingBusiness(true);
    setBusinessSuccess(false);
    try {
      await apiClient.put('/business', {
        businessName,
        description,
        location,
        timezone,
        contactPhone: phone,
        cancellationPolicy,
        businessHours
      });
      setBusinessSuccess(true);
      setTimeout(() => setBusinessSuccess(false), 3000);
    } catch {
      alert('Error al guardar los datos y horarios del negocio. Verifica que las horas tengan formato HH:MM (ej. 09:00).');
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Configuración & Canales"
        subtitle="Conecta tu WhatsApp, habilita o deshabilita tu agenda, sincroniza Scalinky y ajusta los datos y horarios de tu negocio"
      />

      {/* Tabs Superiores */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'qr' && styles.tabButtonActive]}
          onPress={() => setActiveTab('qr')}
        >
          <Smartphone size={16} color={activeTab === 'qr' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}>
            1. WhatsApp Móvil (QR)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'scalinky' && styles.tabButtonActive]}
          onPress={() => setActiveTab('scalinky')}
        >
          <Calendar size={16} color={activeTab === 'scalinky' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'scalinky' && styles.tabTextActive]}>
            2. Agenda & Scalinky
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'business' && styles.tabButtonActive]}
          onPress={() => setActiveTab('business')}
        >
          <Building2 size={16} color={activeTab === 'business' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'business' && styles.tabTextActive]}>
            3. Datos y Horarios del Negocio
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* ======================================================== */}
        {/* PESTAÑA 1: WHATSAPP MÓVIL (QR) */}
        {/* ======================================================== */}
        {activeTab === 'qr' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIcon}>
                <Smartphone size={20} color="#1A73E8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Vincular WhatsApp Móvil</Text>
                <Text style={styles.cardSubtitle}>
                  Escanea el código QR desde tu teléfono para que el asistente responda consultas 24/7 en la línea comercial de tu negocio.
                </Text>
              </View>
            </View>

            {/* Estado de Conexión */}
            {qrStatus === 'CONNECTED' ? (
              <View style={styles.connectedBox}>
                <View style={styles.connectedBadge}>
                  <CheckCircle size={24} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connectedTitle}>WhatsApp Conectado con Éxito</Text>
                  <Text style={styles.connectedText}>
                    Línea vinculada:{' '}
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                      {connectedPhone || 'Teléfono verificado'}
                    </Text>
                    . Los mensajes entrantes son atendidos automáticamente por tu asistente de IA.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.disconnectBtn}
                  onPress={handleDisconnectQR}
                >
                  <PowerOff size={14} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.disconnectBtnText}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.qrContainer}>
                {qrError && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
                    <Text style={styles.errorText}>{qrError}</Text>
                  </View>
                )}

                <View style={styles.qrGrid}>
                  {/* Visual QR Card */}
                  <View style={styles.qrBox}>
                    {qrCodeData ? (
                      <Image
                        source={{ uri: qrCodeData }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.qrPlaceholder}>
                        <Smartphone size={44} color="#94A3B8" />
                        <Text style={styles.qrPlaceholderText}>
                          Haz clic abajo para generar el código QR de vinculación
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.generateBtn}
                      onPress={handleGenerateQR}
                      disabled={loadingQr}
                    >
                      {loadingQr ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.generateBtnText}>
                            {qrCodeData ? 'Actualizar Código QR' : 'Generar Código QR'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Pasos a Seguir */}
                  <View style={styles.instructionsBox}>
                    <Text style={styles.instructionsTitle}>Cómo vincular tu WhatsApp:</Text>
                    <View style={styles.stepRow}>
                      <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>1</Text>
                      </View>
                      <Text style={styles.stepText}>
                        Abre WhatsApp en tu teléfono celular de trabajo.
                      </Text>
                    </View>
                    <View style={styles.stepRow}>
                      <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>2</Text>
                      </View>
                      <Text style={styles.stepText}>
                        Toca los <Text style={styles.bold}>3 puntos</Text> (Android) o ve a{' '}
                        <Text style={styles.bold}>Configuración</Text> (iPhone) y selecciona{' '}
                        <Text style={styles.bold}>Dispositivos vinculados</Text>.
                      </Text>
                    </View>
                    <View style={styles.stepRow}>
                      <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>3</Text>
                      </View>
                      <Text style={styles.stepText}>
                        Toca <Text style={styles.bold}>Vincular un dispositivo</Text> y apunta la cámara a la pantalla para escanear el QR.
                      </Text>
                    </View>

                    <View style={styles.infoTip}>
                      <ShieldCheck size={16} color="#1A73E8" style={{ marginRight: 8 }} />
                      <Text style={styles.infoTipText}>
                        La conexión se mantiene activa las 24 horas. Si el teléfono se apaga o pierde señal, el sistema te avisará acá.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: AGENDA & SCALINKY TURNERO */}
        {/* ======================================================== */}
        {activeTab === 'scalinky' && (
          <View style={styles.sectionCard}>
            {/* Interruptor Maestro: Habilitar o Deshabilitar Agenda */}
            <View
              style={[
                styles.scalinkyStatusBanner,
                bookingEnabled
                  ? { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }
                  : { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }
              ]}
            >
              <View
                style={[
                  styles.statusIndicator,
                  bookingEnabled ? styles.bgGreen : styles.bgAmber
                ]}
              >
                <Calendar size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scalinkyStatusTitle}>
                  Módulo de Agenda de Turnos:{' '}
                  <Text
                    style={{
                      color: bookingEnabled ? '#16A34A' : '#D97706',
                      fontWeight: '700'
                    }}
                  >
                    {bookingEnabled ? '🟢 HABILITADA' : '⏸️ DESHABILITADA (Solo Atención y Consultas)'}
                  </Text>
                </Text>
                <Text style={styles.scalinkyStatusSub}>
                  {bookingEnabled
                    ? 'El Asistente de IA consulta horarios libres y coordina/agenda turnos automáticamente con tus clientes.'
                    : 'El Asistente de IA responde precios, servicios, horarios de atención y dudas generales, pero NO ofrece ni agenda turnos en calendario (deriva al equipo humano cuando el cliente quiere coordinar).'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: bookingEnabled ? '#DC2626' : '#16A34A',
                    paddingHorizontal: 14,
                    paddingVertical: 10
                  }
                ]}
                onPress={handleToggleBookingEnabled}
                disabled={togglingBooking}
              >
                {togglingBooking ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {bookingEnabled ? 'Deshabilitar Agenda' : 'Habilitar Agenda'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.cardHeader}>
              <View style={styles.headerIcon}>
                <Layers size={20} color="#1A73E8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Sincronización con Scalinky (Opcional)</Text>
                <Text style={styles.cardSubtitle}>
                  Si tu negocio utiliza Scalinky, vincula tu cuenta para traer sus horarios, servicios, empleados y consultar disponibilidad en vivo por cada empleado.
                </Text>
              </View>
            </View>

            {/* Estado actual de Scalinky con verificación en tiempo real */}
            <View
              style={[
                styles.scalinkyStatusBanner,
                scalinkyServerOnline === false
                  ? { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }
                  : scalinkyCache && scalinkyCache.synced === false
                  ? { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }
                  : isScalinkyLinked
                  ? { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }
                  : {}
              ]}
            >
              <View
                style={[
                  styles.statusIndicator,
                  scalinkyServerOnline === false
                    ? styles.bgRed
                    : scalinkyCache && scalinkyCache.synced === false
                    ? styles.bgAmber
                    : isScalinkyLinked
                    ? styles.bgGreen
                    : styles.bgSlate
                ]}
              >
                {scalinkyServerOnline === false ? (
                  <AlertCircle size={20} color="#FFFFFF" />
                ) : isScalinkyLinked ? (
                  <CheckCircle size={20} color="#FFFFFF" />
                ) : (
                  <Layers size={20} color="#FFFFFF" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.scalinkyStatusTitle}>
                    Estado de Scalinky:{' '}
                    <Text
                      style={{
                        color:
                          scalinkyServerOnline === false
                            ? '#DC2626'
                            : scalinkyCache && scalinkyCache.synced === false
                            ? '#D97706'
                            : isScalinkyLinked
                            ? '#16A34A'
                            : '#64748B',
                        fontWeight: '700'
                      }}
                    >
                      {scalinkyServerOnline === false
                        ? '🔴 Servidor Desconectado (Backend Offline)'
                        : scalinkyCache && scalinkyCache.synced === false
                        ? `🟠 Desincronizado (${scalinkyCache.status})`
                        : isScalinkyLinked
                        ? `🟢 Sincronizado con "${scalinkySlug}"`
                        : '⚪ No vinculado (Catálogo Propio de TurnoFlow)'}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.refreshSmallBtn}
                    onPress={fetchScalinkyStatus}
                    disabled={checkingScalinkyHealth}
                  >
                    <RefreshCw
                      size={14}
                      color="#64748B"
                      style={checkingScalinkyHealth ? { opacity: 0.5 } : {}}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.scalinkyStatusSub}>
                  {scalinkyServerOnline === false
                    ? isScalinkyLinked && scalinkySlug
                      ? `Tenías configurado el slug "${scalinkySlug}", pero el backend de Scalinky (puerto 3000) no responde. Si un cliente pide turno y falla la resincronización, el bot indicará que aguarde a ser atendido por un humano.`
                      : 'El backend de Scalinky no está levantado en este momento. El Asistente de IA utiliza el catálogo nativo de TurnoFlow.'
                    : isScalinkyLinked
                    ? 'Tus horarios, servicios y empleados están guardados en memoria para responder al instante. Los turnos disponibles se consultan siempre en vivo y por cada empleado.'
                    : 'Actualmente el asistente responde precios y gestiona turnos usando el catálogo interno de TurnoFlow (Servicios & Tarifas).'}
                </Text>
              </View>
            </View>

            {/* Botones de Sincronizar Ahora y Desvincular */}
            {(isScalinkyLinked || Boolean(scalinkySlug)) && (
              <View style={[styles.unlinkRow, { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }]}>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: '#0284C7', flex: 1, minWidth: 220 }
                  ]}
                  onPress={handleSyncScalinkyNow}
                  disabled={syncingScalinky || savingScalinky}
                >
                  {syncingScalinky ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryBtnText}>
                        🔄 Sincronizar Datos de Scalinky Ahora
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.unlinkBtn, { flex: 1, minWidth: 220 }]}
                  onPress={handleUnlinkScalinky}
                  disabled={savingScalinky || syncingScalinky}
                >
                  <Trash2 size={15} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.unlinkBtnText}>
                    Desvincular Scalinky (Usar Catálogo Propio)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Aviso explícito de sincronización manual tras cambios en Scalinky */}
            <View style={[styles.infoTip, { marginBottom: 16, marginTop: 0, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Sparkles size={16} color="#1D4ED8" style={{ marginRight: 8 }} />
              <Text style={[styles.infoTipText, { color: '#1E3A8A' }]}>
                <Text style={styles.bold}>¿Cómo funciona la memoria de Scalinky?</Text> Al conectar tu cuenta revisamos que el negocio tenga su horario, servicios y empleados, y los guardamos para no buscarlos en cada mensaje (excepto los turnos libres, que siempre se consultan en vivo y por cada empleado).{' '}
                <Text style={styles.bold}>
                  Si realizas algún cambio de horarios, servicios, precios o empleados en Scalinky, debes tocar el botón "🔄 Sincronizar Datos de Scalinky Ahora" para traer la información actualizada.
                </Text>
              </Text>
            </View>

            {/* Resumen de Datos Guardados en Caché de Scalinky */}
            {scalinkyCache && scalinkyCache.synced && (
              <View style={[styles.dualCard, { marginBottom: 18, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.dualCardTitle, { color: '#15803D' }]}>
                  📦 Datos de "{scalinkyCache.slug}" guardados en memoria (Caché Activa)
                </Text>
                <Text style={[styles.dualCardText, { color: '#166534', marginBottom: 4 }]}>
                  • <Text style={styles.bold}>Horario del Negocio:</Text> {scalinkyCache.businessHoursSummary || 'Según disponibilidad de empleados'}
                </Text>
                <Text style={[styles.dualCardText, { color: '#166534', marginBottom: 4 }]}>
                  • <Text style={styles.bold}>Empleados ({scalinkyCache.staff?.length || 0}):</Text>{' '}
                  {(scalinkyCache.staff || []).map((st: any) => st.name).join(', ') || 'Sin empleados'}
                </Text>
                <Text style={[styles.dualCardText, { color: '#166534', marginBottom: 4 }]}>
                  • <Text style={styles.bold}>Servicios ({scalinkyCache.services?.length || 0}):</Text>{' '}
                  {(scalinkyCache.services || [])
                    .map((sv: any) => `${sv.name} ($${sv.price})`)
                    .join(' | ') || 'Sin servicios'}
                </Text>
                {scalinkyCache.lastSyncedAt && (
                  <Text style={{ fontSize: 11, color: '#15803D', marginTop: 4 }}>
                    Última sincronización: {new Date(scalinkyCache.lastSyncedAt).toLocaleString()}
                  </Text>
                )}
              </View>
            )}

            {/* Formulario de Configuración de Scalinky */}
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Identificador o Slug de tu negocio en Scalinky</Text>
              <Text style={styles.inputHelper}>
                Es el nombre que figura en el link de tu agenda pública (por ejemplo: si tu link es scalinky.com/minegocio, tu identificador es "minegocio").
              </Text>
              <View style={styles.scalinkyInputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. hes194 o el slug de tu negocio (deja vacío si no usas Scalinky)"
                  placeholderTextColor="#94A3B8"
                  value={scalinkySlug}
                  onChangeText={setScalinkySlug}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSaveScalinky}
                  disabled={savingScalinky || syncingScalinky}
                >
                  {savingScalinky ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Save size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.primaryBtnText}>Conectar y Sincronizar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Sección Opcional de Verificación de Dueño */}
              <TouchableOpacity
                style={styles.ownerAuthToggle}
                onPress={() => setShowOwnerAuth(!showOwnerAuth)}
              >
                <Lock size={14} color="#1A73E8" style={{ marginRight: 6 }} />
                <Text style={styles.ownerAuthToggleText}>
                  {showOwnerAuth
                    ? 'Ocultar verificación de dueño'
                    : '🔐 ¿Deseas verificar que eres el dueño del negocio en Scalinky? (Recomendado)'}
                </Text>
              </TouchableOpacity>

              {showOwnerAuth && (
                <View style={styles.ownerAuthContainer}>
                  <Text style={styles.ownerAuthTitle}>
                    Validación de Titularidad con Scalinky
                  </Text>
                  <Text style={styles.ownerAuthSubtitle}>
                    Ingresa el email y contraseña de tu cuenta administradora de Scalinky para validar tu titularidad al vincular.
                  </Text>
                  <View style={{ gap: 10, marginTop: 10 }}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email de Scalinky (ej. admin@minegocio.com)"
                      placeholderTextColor="#94A3B8"
                      value={ownerEmail}
                      onChangeText={setOwnerEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Contraseña de Scalinky"
                      placeholderTextColor="#94A3B8"
                      value={ownerPassword}
                      onChangeText={setOwnerPassword}
                      secureTextEntry
                    />
                  </View>
                </View>
              )}

              {scalinkyFeedback && (
                <View
                  style={[
                    styles.feedbackBox,
                    scalinkyFeedback.type === 'error'
                      ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
                      : scalinkyFeedback.type === 'warning'
                      ? { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }
                      : {}
                  ]}
                >
                  {scalinkyFeedback.type === 'error' ? (
                    <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
                  ) : (
                    <CheckCircle size={16} color="#16A34A" style={{ marginRight: 8 }} />
                  )}
                  <Text
                    style={[
                      styles.feedbackText,
                      scalinkyFeedback.type === 'error'
                        ? { color: '#B91C1C' }
                        : scalinkyFeedback.type === 'warning'
                        ? { color: '#D97706' }
                        : {}
                    ]}
                  >
                    {scalinkyFeedback.text}
                  </Text>
                </View>
              )}

              {/* Aclaración importante para el usuario */}
              <View style={styles.dualModeExplanation}>
                <Text style={styles.dualTitle}>¿Cómo funciona el catálogo y la agenda?</Text>
                <View style={styles.dualCard}>
                  <Text style={styles.dualCardTitle}>Opción A: Sin Scalinky (Catálogo Propio Universal)</Text>
                  <Text style={styles.dualCardText}>
                    Dirígete a <Text style={styles.bold}>"Servicios & Tarifas"</Text> en el menú lateral. Allí puedes cargar cualquier servicio, mantenimiento, consulta o producto que ofrezca tu negocio, con su precio y duración.
                  </Text>
                </View>
                <View style={styles.dualCard}>
                  <Text style={styles.dualCardTitle}>Opción B: Con Scalinky (Reglas y Empleados)</Text>
                  <Text style={styles.dualCardText}>
                    Al conectar Scalinky, TurnoFlow guarda los horarios, servicios y empleados de tu negocio, y consulta en vivo los turnos libres por cada empleado. Si ocurre un error de conexión, intenta resincronizar automáticamente y, si no responde, avisa al cliente que aguarde a un humano.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 3: DATOS Y HORARIOS DEL NEGOCIO */}
        {/* ======================================================== */}
        {activeTab === 'business' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIcon}>
                <Building2 size={20} color="#1A73E8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Información y Horarios de tu Negocio</Text>
                <Text style={styles.cardSubtitle}>
                  Configura el nombre, rubro, dirección y horarios de apertura de tu empresa o actividad (mantenimiento, consultorio, tienda, servicios técnicos, estética, etc.).
                </Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Nombre de tu Negocio, Empresa o Marca</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Ej. CrystalPool, Clínica Dental Norte, Taller Integral, etc."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Rubro y Descripción de lo que ofrecen</Text>
                <TextInput
                  style={styles.textInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ej. Mantenimiento de piscinas, reparación de bombas, limpieza y control de agua"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Dirección Física o Zona de Cobertura</Text>
                <TextInput
                  style={styles.textInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Ej. Av. Principal 2450 o Atención a domicilio en Zona Norte"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Teléfono de Contacto del Administrador / Dueño (Para Alertas)</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Ej. +5491122334455"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.inputHelper}>
                  A este número se enviarán las alertas urgentes de WhatsApp cuando un cliente solicite hablar con una persona o requiera asistencia especial.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Política Comercial, Cancelaciones o Garantías</Text>
                <TextInput
                  style={[styles.textInput, { height: 70 }]}
                  multiline
                  value={cancellationPolicy}
                  onChangeText={setCancellationPolicy}
                  placeholder="Ej. Cancelaciones o reprogramaciones con al menos 24 hs de anticipación sin cargo."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Editor Visual de Horarios de Atención del Negocio */}
              <View style={[styles.dualModeExplanation, { marginTop: 12, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <View>
                    <Text style={styles.dualTitle}>🕒 Horarios de Atención del Negocio</Text>
                    <Text style={styles.inputHelper}>
                      Define qué días está abierto tu negocio y en qué horario (formato HH:MM, ej. 09:00 a 18:00).
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.refreshSmallBtn, { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                    onPress={copyMondayToWeekdays}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>
                      ⚡ Copiar Lunes a Lun-Vie
                    </Text>
                  </TouchableOpacity>
                </View>

                {[
                  { key: 'monday', label: 'Lunes' },
                  { key: 'tuesday', label: 'Martes' },
                  { key: 'wednesday', label: 'Miércoles' },
                  { key: 'thursday', label: 'Jueves' },
                  { key: 'friday', label: 'Viernes' },
                  { key: 'saturday', label: 'Sábado' },
                  { key: 'sunday', label: 'Domingo' }
                ].map((dayInfo) => {
                  const row = businessHours.find((h) => h.day === dayInfo.key) || {
                    day: dayInfo.key,
                    open: '09:00',
                    close: '18:00',
                    isOpen: false
                  };
                  return (
                    <View
                      key={dayInfo.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: row.isOpen ? '#FFFFFF' : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: row.isOpen ? '#CBD5E1' : '#E2E8F0',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginBottom: 8,
                        flexWrap: 'wrap',
                        gap: 10
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 160, gap: 10 }}>
                        <TouchableOpacity
                          onPress={() => toggleDayOpen(dayInfo.key)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                            backgroundColor: row.isOpen ? '#DCFCE7' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: row.isOpen ? '#86EFAC' : '#CBD5E1'
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: row.isOpen ? '#15803D' : '#64748B'
                            }}
                          >
                            {row.isOpen ? '🟢 Abierto' : '⚪ Cerrado'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          {dayInfo.label}
                        </Text>
                      </View>

                      {row.isOpen ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>De</Text>
                          <TextInput
                            style={[styles.textInput, { width: 80, flex: 0, textAlign: 'center', paddingVertical: 6 }]}
                            value={row.open}
                            onChangeText={(val) => updateDayTime(dayInfo.key, 'open', val)}
                            placeholder="09:00"
                            maxLength={5}
                          />
                          <Text style={{ fontSize: 12, color: '#64748B' }}>a</Text>
                          <TextInput
                            style={[styles.textInput, { width: 80, flex: 0, textAlign: 'center', paddingVertical: 6 }]}
                            value={row.close}
                            onChangeText={(val) => updateDayTime(dayInfo.key, 'close', val)}
                            placeholder="18:00"
                            maxLength={5}
                          />
                          <Text style={{ fontSize: 12, color: '#64748B' }}>hs</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                          Sin atención al público este día
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSaveBusiness}
                disabled={savingBusiness}
              >
                {savingBusiness ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Save size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryBtnText}>Guardar Datos y Horarios del Negocio</Text>
                  </>
                )}
              </TouchableOpacity>

              {businessSuccess && (
                <View style={styles.feedbackBox}>
                  <CheckCircle size={16} color="#16A34A" style={{ marginRight: 8 }} />
                  <Text style={styles.feedbackText}>
                    ¡Datos y horarios guardados con éxito! El Asistente de IA ya cuenta con la información actualizada.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 24,
    gap: 12
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8
  },
  tabButtonActive: {
    borderBottomColor: '#1A73E8'
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  tabTextActive: {
    color: '#1A73E8',
    fontWeight: '700'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 24,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center'
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        } as any)
      : { elevation: 2 })
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18
  },
  connectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 20,
    gap: 16
  },
  connectedBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  connectedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534'
  },
  connectedText: {
    fontSize: 13,
    color: '#15803D',
    marginTop: 3,
    lineHeight: 18
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  disconnectBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600'
  },
  qrContainer: {
    marginTop: 6
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },
  qrGrid: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap'
  },
  qrBox: {
    width: 280,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  qrImage: {
    width: 240,
    height: 240,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 14
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginBottom: 14
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%'
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  instructionsBox: {
    flex: 1,
    minWidth: 280,
    justifyContent: 'center'
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A73E8'
  },
  stepText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    lineHeight: 19
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A'
  },
  infoTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 14
  },
  infoTipText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 16
  },
  scalinkyStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    gap: 14
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  bgGreen: {
    backgroundColor: '#16A34A'
  },
  bgSlate: {
    backgroundColor: '#64748B'
  },
  bgRed: {
    backgroundColor: '#DC2626'
  },
  bgAmber: {
    backgroundColor: '#D97706'
  },
  refreshSmallBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  unlinkRow: {
    marginBottom: 16
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  unlinkBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700'
  },
  ownerAuthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6
  },
  ownerAuthToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A73E8'
  },
  ownerAuthContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    marginTop: 8
  },
  ownerAuthTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4
  },
  ownerAuthSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16
  },
  scalinkyStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A'
  },
  scalinkyStatusSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16
  },
  formContainer: {
    marginTop: 8
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4
  },
  inputHelper: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16
  },
  scalinkyInputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A'
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 11
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginTop: 14
  },
  feedbackText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600'
  },
  dualModeExplanation: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  dualTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12
  },
  dualCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10
  },
  dualCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A73E8',
    marginBottom: 4
  },
  dualCardText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18
  },
  formGroup: {
    marginBottom: 16
  }
});
