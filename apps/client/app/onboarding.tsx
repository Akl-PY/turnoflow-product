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

  // Scalinky Turnero Opcional
  const [scalinkySlug, setScalinkySlug] = useState('');
  const [isScalinkyLinked, setIsScalinkyLinked] = useState(false);
  const [savingScalinky, setSavingScalinky] = useState(false);
  const [scalinkyFeedback, setScalinkyFeedback] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [scalinkyServerOnline, setScalinkyServerOnline] = useState<boolean | null>(null);
  const [checkingScalinkyHealth, setCheckingScalinkyHealth] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerAuth, setShowOwnerAuth] = useState(false);
  const [ownerVerified, setOwnerVerified] = useState(false);

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

  // Cargar datos comerciales
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

          // Revisar si existe configuración de Scalinky en specialInstructions
          if (res.data.specialInstructions) {
            try {
              const parsed = JSON.parse(res.data.specialInstructions);
              if (parsed?.scalinkySlug) {
                setScalinkySlug(parsed.scalinkySlug);
                setIsScalinkyLinked(true);
                if (parsed.ownerEmail) setOwnerEmail(parsed.ownerEmail);
                if (parsed.ownerVerified) setOwnerVerified(true);
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

  // Desvincular Scalinky por completo
  const handleUnlinkScalinky = async () => {
    setSavingScalinky(true);
    setScalinkyFeedback(null);
    try {
      await apiClient.put('/business', { specialInstructions: '' });
      setScalinkySlug('');
      setIsScalinkyLinked(false);
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

  // Guardar vinculación de Scalinky con verificación de salud y propietario
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
              text: `❌ Verificación de dueño rechazada: ${verifyRes.data?.message || 'Credenciales incorrectas para este salón en Scalinky.'}`
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
      } else {
        // 3. Si no pasó contraseña, al menos validar que el salón exista en Scalinky
        try {
          await apiClient.get(`/integrations/scalinky/${trimmed}/services`);
        } catch (slugErr: any) {
          setScalinkyFeedback({
            type: 'error',
            text: `❌ No se encontró el salón "${trimmed}" en Scalinky. Verifica que el identificador sea exacto.`
          });
          setSavingScalinky(false);
          return;
        }
      }

      const payload: any = {
        specialInstructions: JSON.stringify({
          scalinkySlug: trimmed,
          ownerEmail: ownerEmail.trim() || undefined,
          ownerVerified: verifiedStatus,
          updatedAt: new Date().toISOString()
        })
      };

      await apiClient.put('/business', payload);
      setIsScalinkyLinked(true);
      setScalinkyFeedback({
        type: 'success',
        text: `¡Scalinky sincronizado correctamente con "${trimmed}"! El asistente consultará turnos y disponibilidad en vivo.`
      });
      setTimeout(() => setScalinkyFeedback(null), 5000);
    } catch {
      setScalinkyFeedback({
        type: 'error',
        text: 'Error al actualizar la configuración de Scalinky.'
      });
    } finally {
      setSavingScalinky(false);
    }
  };

  // Guardar datos comerciales
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
        cancellationPolicy
      });
      setBusinessSuccess(true);
      setTimeout(() => setBusinessSuccess(false), 3000);
    } catch {
      alert('Error al guardar los datos del negocio.');
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Configuración & Canales"
        subtitle="Conecta tu WhatsApp, sincroniza tu turnero o ajusta los datos de tu salón"
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
            2. Turnero Scalinky (Opcional)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'business' && styles.tabButtonActive]}
          onPress={() => setActiveTab('business')}
        >
          <Building2 size={16} color={activeTab === 'business' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'business' && styles.tabTextActive]}>
            3. Datos de tu Salón
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
                  Escanea el código QR desde tu teléfono para que el asistente responda consultas 24/7 en tu línea comercial.
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
        {/* PESTAÑA 2: SCALINKY TURNERO (OPCIONAL) */}
        {/* ======================================================== */}
        {activeTab === 'scalinky' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIcon}>
                <Calendar size={20} color="#1A73E8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Sincronización con Scalinky (Opcional)</Text>
                <Text style={styles.cardSubtitle}>
                  Si utilizas Scalinky como tu sistema de reservas online, conecta tu cuenta para sincronizar turnos y disponibilidad en vivo.
                </Text>
              </View>
            </View>

            {/* Estado actual de Scalinky con verificación en tiempo real */}
            <View
              style={[
                styles.scalinkyStatusBanner,
                scalinkyServerOnline === false
                  ? { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }
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
                            : isScalinkyLinked
                            ? '#16A34A'
                            : '#64748B',
                        fontWeight: '700'
                      }}
                    >
                      {scalinkyServerOnline === false
                        ? '🔴 Servidor Desconectado (Backend Offline)'
                        : isScalinkyLinked
                        ? `🟢 Sincronizado en Vivo con "${scalinkySlug}"`
                        : '⚪ No vinculado'}
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
                      ? `Tenías configurado el slug "${scalinkySlug}", pero el backend de Scalinky (puerto 3000) no responde. El Asistente de IA está operando de forma 100% autónoma utilizando tu catálogo propio de TurnoFlow (Servicios & Tarifas).`
                      : 'El backend de Scalinky no está levantado ni conectado en este momento. El Asistente de IA responderá utilizando únicamente el catálogo nativo de TurnoFlow.'
                    : isScalinkyLinked
                    ? 'El Asistente de IA está consultando tu agenda, profesionales y disponibilidad en tiempo real directamente desde Scalinky.'
                    : 'Actualmente el asistente responde precios y gestiona turnos usando el catálogo interno de TurnoFlow (Servicios & Tarifas).'}
                </Text>
              </View>
            </View>

            {/* Botón de desvinculación rápida si hay slug configurado */}
            {(isScalinkyLinked || Boolean(scalinkySlug)) && (
              <View style={styles.unlinkRow}>
                <TouchableOpacity
                  style={styles.unlinkBtn}
                  onPress={handleUnlinkScalinky}
                  disabled={savingScalinky}
                >
                  <Trash2 size={15} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.unlinkBtnText}>
                    Desvincular Scalinky (Volver al Catálogo Propio de TurnoFlow)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Formulario de Configuración de Scalinky */}
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Identificador o Slug de tu salón en Scalinky</Text>
              <Text style={styles.inputHelper}>
                Es el nombre que figura en el link de tu agenda pública (por ejemplo: si tu link es scalinky.com/esteticaglow, tu identificador es "esteticaglow").
              </Text>
              <View style={styles.scalinkyInputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. esteticaglow (deja vacío si no usas Scalinky)"
                  placeholderTextColor="#94A3B8"
                  value={scalinkySlug}
                  onChangeText={setScalinkySlug}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSaveScalinky}
                  disabled={savingScalinky}
                >
                  {savingScalinky ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Save size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.primaryBtnText}>Guardar y Validar</Text>
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
                    : '🔐 ¿Deseas verificar que eres el dueño del salón en Scalinky? (Recomendado)'}
                </Text>
              </TouchableOpacity>

              {showOwnerAuth && (
                <View style={styles.ownerAuthContainer}>
                  <Text style={styles.ownerAuthTitle}>
                    Validación de Titularidad con Scalinky
                  </Text>
                  <Text style={styles.ownerAuthSubtitle}>
                    Ingresa el email y contraseña de tu cuenta administradora de Scalinky para asegurar que nadie más pueda sincronizar tu salón.
                  </Text>
                  <View style={{ gap: 10, marginTop: 10 }}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email de Scalinky (ej. duena@salon.com)"
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
                <Text style={styles.dualTitle}>¿Cómo funciona el catálogo de turnos?</Text>
                <View style={styles.dualCard}>
                  <Text style={styles.dualCardTitle}>Opción A: Sin Scalinky (Recomendada si comienzas)</Text>
                  <Text style={styles.dualCardText}>
                    Dirígete a <Text style={styles.bold}>"Servicios & Tarifas"</Text> en el menú lateral. Allí puedes dar de alta tus tratamientos (corte, alisado, limpieza facial, etc.), definir la duración y el precio. La IA usará esa lista automáticamente para responder y coordinar turnos.
                  </Text>
                </View>
                <View style={styles.dualCard}>
                  <Text style={styles.dualCardTitle}>Opción B: Con Scalinky</Text>
                  <Text style={styles.dualCardText}>
                    Al escribir tu identificador arriba y guardar, TurnoFlow consultará en tiempo real la disponibilidad de tus profesionales y los servicios cargados en tu cuenta de Scalinky.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 3: DATOS DEL NEGOCIO */}
        {/* ======================================================== */}
        {activeTab === 'business' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIcon}>
                <Building2 size={20} color="#1A73E8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Información de tu Salón o Centro</Text>
                <Text style={styles.cardSubtitle}>
                  Estos datos los utiliza el asistente de IA para indicar la dirección exacta, horarios y normas de atención a los clientes que pregunten por WhatsApp.
                </Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Nombre del Salón o Estudio</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Ej. Glow Hair & Beauty Studio"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Descripción breve de tu propuesta</Text>
                <TextInput
                  style={styles.textInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ej. Estudio especializado en colorimetría, balayage y estética facial"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Dirección / Ubicación Física</Text>
                <TextInput
                  style={styles.textInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Ej. Av. Santa Fe 2450, Piso 2, Recoleta, CABA"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Teléfono de Contacto del Administrador (Dueño)</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Ej. +5491122334455"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.inputHelper}>
                  A este número se enviarán las alertas urgentes de WhatsApp cuando una clienta solicite atención humana o surja un caso especial.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Política de Cancelación y Reprogramación</Text>
                <TextInput
                  style={[styles.textInput, { height: 70 }]}
                  multiline
                  value={cancellationPolicy}
                  onChangeText={setCancellationPolicy}
                  placeholder="Ej. Cancelaciones o cambios de turno con al menos 24 hs de anticipación sin costo."
                  placeholderTextColor="#94A3B8"
                />
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
                    <Text style={styles.primaryBtnText}>Guardar Datos del Salón</Text>
                  </>
                )}
              </TouchableOpacity>

              {businessSuccess && (
                <View style={styles.feedbackBox}>
                  <CheckCircle size={16} color="#16A34A" style={{ marginRight: 8 }} />
                  <Text style={styles.feedbackText}>
                    ¡Datos guardados con éxito! El Asistente de IA ya cuenta con la información actualizada.
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
