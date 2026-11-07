import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  Search
} from 'lucide-react-native';

const DEMO_APPOINTMENTS = [
  {
    id: 'apt-1',
    customerName: 'Lucía Fernández',
    customerPhone: '+5491188990011',
    serviceName: 'Manicura Rusa con Esmaltado Semipermanente',
    date: 'Mañana, Jueves 12 de Noviembre',
    time: '15:00 - 16:00 hs',
    status: 'CONFIRMED',
    calendarSynced: true,
    notes: 'Cliente puntual, primera sesión'
  },
  {
    id: 'apt-2',
    customerName: 'Valentina López',
    customerPhone: '+5491166778899',
    serviceName: 'Lifting de Pestañas + Tinte',
    date: 'Viernes 13 de Noviembre',
    time: '11:00 - 11:50 hs',
    status: 'CONFIRMED',
    calendarSynced: true,
    notes: 'Alérgica a tintes con amoníaco (verificado tinte vegetal)'
  },
  {
    id: 'apt-3',
    customerName: 'Camila Gómez',
    customerPhone: '+5491144556677',
    serviceName: 'Limpieza Facial Profunda',
    date: 'Viernes 13 de Noviembre',
    time: '16:30 - 17:30 hs',
    status: 'CONFIRMED',
    calendarSynced: true,
    notes: 'Piel mixta'
  }
];

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState(DEMO_APPOINTMENTS);
  const [testSlotDate, setTestSlotDate] = useState('2026-11-13');
  const [slotCheckResult, setSlotCheckResult] = useState<string | null>(null);

  const checkSlotAvailability = () => {
    // Simulación de verificación de Google Calendar
    setSlotCheckResult(
      '✅ Google Calendar Verificado: Disponibilidad libre encontrada en 10:00, 14:00 y 17:30 hs.'
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Agenda y Citas Confirmadas"
        subtitle="Sincronización bidireccional en tiempo real con Google Calendar"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Banner de Sincronización Google Calendar */}
        <View style={styles.calendarBanner}>
          <View style={styles.calendarIcon}>
            <CalendarDays size={20} color="#22c55e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Google Calendar Vinculado: "TurnoFlow - Citas Confirmadas"</Text>
            <Text style={styles.bannerText}>
              Los turnos confirmados por el Booking Agent se reservan de forma inmediata impidiendo solapamientos.
            </Text>
          </View>
          <View style={styles.badgeOnline}>
            <Text style={styles.badgeOnlineText}>Sync Activa</Text>
          </View>
        </View>

        {/* Verificador de Disponibilidad Manual */}
        <View style={styles.slotCheckCard}>
          <Text style={styles.cardTitle}>Verificador Rápido de Disponibilidad Real</Text>
          <Text style={styles.cardSubtitle}>
            Comprueba slots libres exactamente como lo hace el Booking Agent antes de confirmar.
          </Text>

          <View style={styles.slotRow}>
            <TextInput
              style={styles.input}
              value={testSlotDate}
              onChangeText={setTestSlotDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#52525b"
            />
            <TouchableOpacity style={styles.checkBtn} onPress={checkSlotAvailability}>
              <Sparkles size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.checkBtnText}>Verificar Slots en Google Calendar</Text>
            </TouchableOpacity>
          </View>

          {slotCheckResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{slotCheckResult}</Text>
            </View>
          )}
        </View>

        {/* Lista de Turnos Confirmados */}
        <Text style={styles.sectionTitle}>PRÓXIMOS TURNOS CONFIRMADOS</Text>
        <View style={styles.list}>
          {appointments.map((apt) => (
            <View key={apt.id} style={styles.aptCard}>
              <View style={styles.aptLeft}>
                <View style={styles.timeBadge}>
                  <Clock size={14} color="#a855f7" style={{ marginRight: 6 }} />
                  <Text style={styles.timeText}>{apt.time}</Text>
                </View>
                <Text style={styles.dateText}>{apt.date}</Text>
              </View>

              <View style={styles.aptCenter}>
                <Text style={styles.customerName}>{apt.customerName}</Text>
                <Text style={styles.customerPhone}>{apt.customerPhone}</Text>
                <Text style={styles.serviceName}>{apt.serviceName}</Text>
                {apt.notes && <Text style={styles.notesText}>Nota: {apt.notes}</Text>}
              </View>

              <View style={styles.aptRight}>
                <View style={styles.badgeConfirmed}>
                  <CheckCircle2 size={12} color="#4ade80" style={{ marginRight: 4 }} />
                  <Text style={styles.badgeConfirmedText}>CONFIRMADO</Text>
                </View>
                <Text style={styles.gcalSyncText}>Google Calendar ID #ok</Text>
              </View>
            </View>
          ))}
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
    padding: 28,
    maxWidth: 960
  },
  calendarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    gap: 14
  },
  calendarIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  bannerText: {
    color: '#a1a1aa',
    fontSize: 11,
    marginTop: 2
  },
  badgeOnline: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  badgeOnlineText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700'
  },
  slotCheckCard: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 20,
    marginBottom: 24
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2
  },
  cardSubtitle: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 14
  },
  slotRow: {
    flexDirection: 'row',
    gap: 12
  },
  input: {
    width: 180,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333ea',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  checkBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  resultBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)'
  },
  resultText: {
    color: '#c084fc',
    fontSize: 12
  },
  sectionTitle: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12
  },
  list: {
    gap: 12
  },
  aptCard: {
    flexDirection: 'row',
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 16
  },
  aptLeft: {
    width: 200
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  timeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  dateText: {
    color: '#71717a',
    fontSize: 11
  },
  aptCenter: {
    flex: 1
  },
  customerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  customerPhone: {
    color: '#71717a',
    fontSize: 11,
    marginBottom: 4
  },
  serviceName: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '500'
  },
  notesText: {
    color: '#52525b',
    fontSize: 11,
    marginTop: 2
  },
  aptRight: {
    alignItems: 'flex-end'
  },
  badgeConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4
  },
  badgeConfirmedText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700'
  },
  gcalSyncText: {
    color: '#52525b',
    fontSize: 10
  }
});
