import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Building2,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Zap
} from 'lucide-react-native';
import { useAuth } from '../src/lib/auth';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@turnoflow.com');
  const [password, setPassword] = useState('TurnoFlow2026!');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    if (mode === 'register' && (!fullName.trim() || !businessName.trim())) {
      setError('Completa tu nombre completo y el nombre de tu salón o centro de estética.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          businessName: businessName.trim()
        });
      }
      router.replace('/');
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo iniciar sesión. Verifica tus credenciales o la conexión con el servidor.';
      setError(Array.isArray(apiMsg) ? apiMsg.join(', ') : String(apiMsg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setMode('login');
    setEmail('admin@turnoflow.com');
    setPassword('TurnoFlow2026!');
    setSubmitting(true);
    try {
      await login('admin@turnoflow.com', 'TurnoFlow2026!');
      router.replace('/');
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Error al conectar con el servidor de demostración.';
      setError(Array.isArray(apiMsg) ? apiMsg.join(', ') : String(apiMsg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.outerContainer}>
      <View style={styles.card}>
        {/* Brand Header */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Sparkles size={22} color="#a855f7" />
          </View>
          <View>
            <Text style={styles.brandTitle}>TurnoFlow AI</Text>
            <Text style={styles.brandSubtitle}>
              Consola SaaS Multi-Tenant • Recepción Inteligente 24/7
            </Text>
          </View>
        </View>

        {/* Mode Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
            onPress={() => {
              setMode('login');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
              Iniciar Sesión
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
            onPress={() => {
              setMode('register');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
              Registrar Nuevo Salón (Multi-Tenant)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Alert */}
        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#f87171" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form Fields */}
        {mode === 'register' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre del Salón / Centro de Estética</Text>
              <View style={styles.inputWrapper}>
                <Building2 size={16} color="#71717a" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Ej. Lumina Beauty & Spa"
                  placeholderTextColor="#52525b"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tu Nombre Completo</Text>
              <View style={styles.inputWrapper}>
                <User size={16} color="#71717a" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Ej. Valeria Rossi"
                  placeholderTextColor="#52525b"
                />
              </View>
            </View>
          </>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <View style={styles.inputWrapper}>
            <Mail size={16} color="#71717a" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@turnoflow.com"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputWrapper}>
            <Lock size={16} color="#71717a" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry
              onSubmitEditing={handleSubmit}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>
                {mode === 'login'
                  ? 'Ingresar al Panel Administrativo'
                  : 'Crear Cuenta y Aprovisionar Agentes IA'}
              </Text>
              <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        {/* Quick Demo Button */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>O ACCESO INMEDIATO</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.demoBtn}
          onPress={handleQuickDemoLogin}
          disabled={submitting}
        >
          <Zap size={15} color="#c084fc" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.demoBtnTitle}>
              Acceso Rápido Demo Admin (admin@turnoflow.com)
            </Text>
            <Text style={styles.demoBtnSub}>
              Explora TurnoFlow Beauty Studio con 5 agentes, catálogo y métricas reales
            </Text>
          </View>
        </TouchableOpacity>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <ShieldCheck size={14} color="#22c55e" style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>
            Aislamiento Multi-Tenant con JWT • Datos persistidos en Supabase PostgreSQL
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#09090b'
  },
  outerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: (Platform.OS === 'web' ? '100vh' : '100%') as any
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 32
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  brandSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 2
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 8,
    padding: 4,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBtnActive: {
    backgroundColor: '#27272a'
  },
  tabText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  tabTextActive: {
    color: '#ffffff'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    flex: 1
  },
  fieldGroup: {
    marginBottom: 16
  },
  label: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 11
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333ea',
    borderRadius: 8,
    paddingVertical: 13,
    marginTop: 6
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272a'
  },
  dividerLabel: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 8,
    padding: 12
  },
  demoBtnTitle: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '700'
  },
  demoBtnSub: {
    color: '#a1a1aa',
    fontSize: 11,
    marginTop: 2
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#18181b'
  },
  footerText: {
    color: '#71717a',
    fontSize: 11
  }
});
