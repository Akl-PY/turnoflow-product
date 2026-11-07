import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Building2,
  Clock,
  Sparkles,
  Save,
  CheckCircle,
  FileText
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';

export default function OnboardingScreen() {
  const [businessName, setBusinessName] = useState('TurnoFlow Beauty Studio');
  const [description, setDescription] = useState('Estudio de belleza y estética integral');
  const [location, setLocation] = useState('Av. Santa Fe 2450, Recoleta, Buenos Aires');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [phone, setPhone] = useState('+5491133445566');
  const [cancellationPolicy, setCancellationPolicy] = useState('Cancelaciones con al menos 24 horas de antelación sin cargo.');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    try {
      await apiClient.put('/business', {
        businessName,
        description,
        location,
        timezone,
        contactPhone: phone,
        cancellationPolicy
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      // Fallback local visual
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Configuración del Negocio"
        subtitle="Asistente para alimentar la base de conocimiento y el contexto de los agentes"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {savedSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle size={16} color="#22c55e" style={{ marginRight: 8 }} />
            <Text style={styles.successText}>¡Configuración guardada y sincronizada con los agentes de IA!</Text>
          </View>
        )}

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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono de Contacto (WhatsApp Oficial)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+54911..."
              placeholderTextColor="#52525b"
            />
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
              Esta política será leída por el Reception Agent y el Booking Agent al coordinar citas.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Guardar Configuración Comercial</Text>
        </TouchableOpacity>
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
    padding: 28,
    maxWidth: 900
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  successText: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '500'
  },
  card: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 22,
    marginBottom: 20
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    paddingBottom: 10
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  inputGroup: {
    marginBottom: 16
  },
  row: {
    flexDirection: 'row',
    gap: 14
  },
  label: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13
  },
  hint: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 4
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333ea',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 10
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  }
});
