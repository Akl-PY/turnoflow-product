import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Clock,
  CheckCircle2,
  CalendarDays,
  Calendar,
  Plus,
  XCircle,
  Check,
  Phone,
  Sparkles,
  AlertCircle
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

function formatAppointmentItem(raw: any) {
  if (raw.date && raw.time) return raw;
  const start = raw.startTime ? new Date(raw.startTime) : new Date();
  const end = raw.endTime
    ? new Date(raw.endTime)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const dateStr = start.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  const timeStr = `${start.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })} - ${end.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })} hs`;

  return {
    id: raw.id,
    customerName: raw.customerName,
    customerPhone: raw.customerPhone,
    serviceName: raw.serviceName || raw.serviceId,
    date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
    time: timeStr,
    status: raw.status || 'CONFIRMED',
    notes: raw.notes
  };
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de Nuevo Turno
  const [showAddForm, setShowAddForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceName, setServiceName] = useState('Tratamiento Capilar');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('16:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/appointments');
        if (Array.isArray(res.data)) {
          setAppointments(res.data.map(formatAppointmentItem));
        }
      } catch {
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [user?.organizationId]);

  const handleCreateAppointment = async () => {
    if (!customerName.trim() || !customerPhone.trim()) return;
    setSubmitting(true);
    const startIso = `${bookingDate}T${bookingTime}:00.000Z`;
    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      serviceName: serviceName.trim(),
      startTime: startIso,
      organizationId: user?.organizationId,
      notes: notes.trim() || 'Cita agendada manualmente'
    };

    try {
      const res = await apiClient.post('/appointments', payload);
      setAppointments((prev) => [formatAppointmentItem(res.data), ...prev]);
    } catch {
      const fallbackItem = {
        id: `apt-${Date.now()}`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        serviceName: serviceName.trim(),
        date: bookingDate,
        time: `${bookingTime} hs`,
        status: 'CONFIRMED',
        notes: notes.trim() || 'Cita registrada en el panel'
      };
      setAppointments((prev) => [fallbackItem, ...prev]);
    } finally {
      setSubmitting(false);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setShowAddForm(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    const confirmCancel = () => {
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status: 'CANCELLED' } : apt))
      );
      apiClient.delete(`/appointments/${id}`).catch(() => {});
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Seguro que deseas cancelar este turno?')) {
        confirmCancel();
      }
    } else {
      confirmCancel();
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Agenda & Citas del Salón"
        subtitle="Visualiza los turnos confirmados por el asistente de WhatsApp y agenda nuevas visitas"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Barra Superior */}
        <View style={styles.topToolbar}>
          <View style={styles.statsSummary}>
            <CalendarDays size={20} color="#1A73E8" style={{ marginRight: 8 }} />
            <Text style={styles.summaryText}>
              Turnos confirmados:{' '}
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                {appointments.filter((a) => a.status === 'CONFIRMED').length}
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newAptBtn}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.newAptBtnText}>Agendar Turno Manualmente</Text>
          </TouchableOpacity>
        </View>

        {/* Formulario de Cita Manual */}
        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nuevo Turno en Agenda</Text>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nombre de la Clienta</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Camila Benítez"
                  placeholderTextColor="#94A3B8"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Teléfono de WhatsApp</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. +5491122334455"
                  placeholderTextColor="#94A3B8"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Tratamiento / Servicio</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Balayage & Brushing"
                  placeholderTextColor="#94A3B8"
                  value={serviceName}
                  onChangeText={setServiceName}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Fecha (AAAA-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="2026-11-15"
                  placeholderTextColor="#94A3B8"
                  value={bookingDate}
                  onChangeText={setBookingDate}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Hora de Inicio (HH:MM)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="15:30"
                  placeholderTextColor="#94A3B8"
                  value={bookingTime}
                  onChangeText={setBookingTime}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Notas adicionales</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Recordatorio de traer pelo lavado"
                  placeholderTextColor="#94A3B8"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreateAppointment}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Confirmar Turno</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lista de Turnos */}
        <View style={styles.scheduleCard}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#1A73E8" size="large" />
              <Text style={styles.loadingText}>Cargando agenda de turnos...</Text>
            </View>
          ) : appointments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Calendar size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No hay citas agendadas aún</Text>
              <Text style={styles.emptySub}>
                Cuando tus clientas coordinen un turno por WhatsApp, el Asistente de IA lo confirmará y aparecerá inmediatamente en esta lista.
              </Text>
            </View>
          ) : (
            appointments.map((apt) => {
              const isConfirmed = apt.status === 'CONFIRMED';
              return (
                <View key={apt.id} style={styles.aptRow}>
                  {/* Fecha y Hora */}
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeText}>{apt.time}</Text>
                    <Text style={styles.dateText}>{apt.date}</Text>
                  </View>

                  {/* Detalle Clienta y Servicio */}
                  <View style={styles.detailBlock}>
                    <Text style={styles.customerName}>{apt.customerName}</Text>
                    <View style={styles.phoneRow}>
                      <Phone size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.customerPhone}>{apt.customerPhone}</Text>
                    </View>
                    <Text style={styles.serviceTag}>{apt.serviceName}</Text>
                    {apt.notes ? (
                      <Text style={styles.notesText}>{apt.notes}</Text>
                    ) : null}
                  </View>

                  {/* Estado y Acciones */}
                  <View style={styles.actionBlock}>
                    {isConfirmed ? (
                      <View style={styles.badgeConfirmed}>
                        <CheckCircle2 size={13} color="#16A34A" style={{ marginRight: 5 }} />
                        <Text style={styles.badgeConfirmedText}>Confirmado</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeCancelled}>
                        <XCircle size={13} color="#DC2626" style={{ marginRight: 5 }} />
                        <Text style={styles.badgeCancelledText}>Cancelado</Text>
                      </View>
                    )}

                    {isConfirmed && (
                      <TouchableOpacity
                        style={styles.cancelAptBtn}
                        onPress={() => handleCancelAppointment(apt.id)}
                      >
                        <Text style={styles.cancelAptBtnText}>Cancelar turno</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
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
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 24,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center'
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  statsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  summaryText: {
    fontSize: 13,
    color: '#475569'
  },
  newAptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  newAptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 20,
    marginBottom: 20
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  formField: {
    flex: 1,
    minWidth: 220,
    marginBottom: 10
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A'
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600'
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A73E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        } as any)
      : { elevation: 2 })
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B'
  },
  emptyBox: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 6
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 440,
    lineHeight: 18
  },
  aptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 16,
    flexWrap: 'wrap'
  },
  timeBlock: {
    minWidth: 140
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  detailBlock: {
    flex: 1,
    minWidth: 200
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748B'
  },
  serviceTag: {
    fontSize: 12,
    color: '#1A73E8',
    fontWeight: '600',
    marginTop: 4
  },
  notesText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2
  },
  actionBlock: {
    alignItems: 'flex-end',
    minWidth: 130
  },
  badgeConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeConfirmedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A'
  },
  badgeCancelled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeCancelledText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626'
  },
  cancelAptBtn: {
    marginTop: 8
  },
  cancelAptBtnText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500'
  }
});
