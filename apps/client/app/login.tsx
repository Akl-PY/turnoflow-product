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
  CheckCircle2
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
      setError('Completa tu nombre y el nombre de tu salón o centro de estética.');
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
        'No se pudo conectar. Verifica tus credenciales o el estado del servidor.';
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
        'Error al conectar con la cuenta de demostración.';
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
            <Sparkles size={22} color="#1A73E8" />
          </View>
          <View>
            <Text style={styles.brandTitle}>TurnoFlow AI</Text>
            <Text style={styles.brandTagline}>Gestión Inteligente de Citas & WhatsApp</Text>
          </View>
        </View>

        {/* Mode Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'login' && styles.tabButtonActive]}
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
            style={[styles.tabButton, mode === 'register' && styles.tabButtonActive]}
            onPress={() => {
              setMode('register');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
              Crear Cuenta
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Notification */}
        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form Fields */}
        {mode === 'register' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tu Nombre Completo</Text>
              <View style={styles.inputWrapper}>
                <User size={16} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Valeria Gómez"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre de tu Salón o Centro</Text>
              <View style={styles.inputWrapper}>
                <Building2 size={16} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Glow Hair Studio & Spa"
                  placeholderTextColor="#94A3B8"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>
            </View>
          </>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <View style={styles.inputWrapper}>
            <Mail size={16} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="admin@tunegocio.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputWrapper}>
            <Lock size={16} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>
                {mode === 'login' ? 'Ingresar a mi Negocio' : 'Registrar mi Salón'}
              </Text>
              <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        {/* Demo Fast Access */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>O INGRESA DIRECTAMENTE</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.demoBtn}
          onPress={handleQuickDemoLogin}
          disabled={submitting}
        >
          <View style={styles.demoIconWrapper}>
            <CheckCircle2 size={18} color="#1A73E8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.demoBtnTitle}>Acceso Inmediato de Demostración</Text>
            <Text style={styles.demoBtnSub}>
              Explora todas las funciones con credenciales listas para probar
            </Text>
          </View>
        </TouchableOpacity>

        {/* Security Footer */}
        <View style={styles.footerInfo}>
          <ShieldCheck size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>
            Conexión segura cifrada SSL • Diseñado para salones, estéticas y spas
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  outerContainer: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)'
        } as any)
      : {
          elevation: 3
        })
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A'
  },
  brandTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
        } as any)
      : {
          elevation: 1
        })
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
    fontSize: 12,
    flex: 1,
    fontWeight: '500'
  },
  fieldGroup: {
    marginBottom: 16
  },
  label: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    paddingVertical: 10
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 6
  },
  primaryBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: '#E2E8F0'
  },
  dividerLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    gap: 12
  },
  demoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  demoBtnTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700'
  },
  demoBtnSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center'
  }
});
