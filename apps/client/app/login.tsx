import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import { authStorage } from '../src/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu email y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password
      });

      const { accessToken, user } = res.data;
      if (accessToken) {
        authStorage.setToken(accessToken);
        if (user) {
          authStorage.setUser(user);
        }
        router.replace('/');
      } else {
        setErrorMessage('Respuesta inválida del servidor.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 401
          ? 'Credenciales inválidas. Verifica tu email y contraseña.'
          : 'No se pudo conectar con el servidor. Revisa tu conexión.');
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('admin@turnoflow.com');
    setPassword('TurnoFlow2026!');
    setErrorMessage(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Sparkles size={24} color="#c084fc" />
          </View>
          <Text style={styles.title}>TurnoFlow AI</Text>
          <Text style={styles.subtitle}>Panel de Control & Recepción Inteligente</Text>
        </View>

        {/* Error Alert */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#f87171" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.form}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <View style={styles.inputContainer}>
            <Mail size={16} color="#71717a" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="tu-email@estetica.com"
              placeholderTextColor="#52525b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputContainer}>
            <Lock size={16} color="#71717a" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
                <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Credentials helper */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.demoButton} onPress={handleQuickDemo}>
            <Text style={styles.demoButtonText}>⚡ Cargar credenciales de Administrador</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: (Platform.OS === 'web' ? '100vh' : '100%') as any
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 28
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6
  },
  subtitle: {
    color: '#71717a',
    fontSize: 13,
    textAlign: 'center'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    flex: 1
  },
  form: {
    width: '100%'
  },
  label: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
    height: 44
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    height: '100%'
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    height: 44,
    borderRadius: 8,
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    alignItems: 'center'
  },
  demoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)'
  },
  demoButtonText: {
    color: '#a1a1aa',
    fontSize: 12
  }
});
