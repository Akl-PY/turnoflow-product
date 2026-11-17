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
import { downloadCsv } from '../src/lib/csv';

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
    rawStartIso: raw.startTime ? new Date(raw.startTime).toISOString() : '',
    slotKey: raw.startTime
      ? `${new Date(raw.startTime).toISOString().split('T')[0]}_${String(new Date(raw.startTime).getUTCHours()).padStart(2, '0')}:${String(new Date(raw.startTime).getUTCMinutes()).padStart(2, '0')}`
      : `${raw.date}_${raw.time}`,
    date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
    time: timeStr,
    status: raw.status || 'CONFIRMED',
    notes: raw.notes
  };
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0]);

  // Formulario de Nuevo Turno
  const [showAddForm, setShowAddForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceName, setServiceName] = useState('Servicio / Visita General');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('16:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const [resAppts, resBiz] = await Promise.all([
          apiClient.get('/appointments'),
          apiClient.get('/business').catch(() => ({ data: null }))
        ]);
        if (Array.isArray(resAppts.data)) {
          setAppointments(resAppts.data.map(formatAppointmentItem));
        }
        if (Array.isArray(resBiz.data?.services)) {
          setServicesCatalog(resBiz.data.services);
        }
      } catch {
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [user?.organizationId]);

  const handleSendReminder = async (id: string) => {
    setReminderFeedback(null);
    try {
      const res = await apiClient.post(`/appointments/${id}/send-reminder`);
      setReminderFeedback(res.data?.message || '🔔 Recordatorio enviado por WhatsApp.');
      setTimeout(() => setReminderFeedback(null), 4000);
    } catch {
      setReminderFeedback('⚠️ No se pudo enviar el recordatorio. Verifica la conexión QR de WhatsApp.');
      setTimeout(() => setReminderFeedback(null), 4000);
    }
  };

  const handleCreateAppointment = async () => {
    if (!customerName.trim() || !customerPhone.trim()) return;
    setSubmitting(true);
    const startIso = `${bookingDate}T${bookingTime}:00.000Z`;
    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      serviceId: serviceName.trim(),
      serviceName: serviceName.trim(),
      startTime: startIso,
      organizationId: user?.organizationId,
      notes: notes.trim() || 'Cita agendada manualmente'
    };

    try {
      const res = await apiClient.post('/appointments/confirm-booking', payload);
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
      apiClient.patch(`/appointments/${id}/cancel`).catch(() => {});
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
        title="Agenda & Citas del Negocio"
        subtitle="Visualiza los turnos confirmados por el asistente de WhatsApp, envía recordatorios y agenda visitas"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Aviso de Recordatorios Automáticos */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#EFF6FF',
            borderWidth: 1,
            borderColor: '#BFDBFE',
            borderRadius: 10,
            padding: 12,
            marginBottom: 16
          }}
        >
          <Sparkles size={16} color="#1D4ED8" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 12, color: '#1E3A8A', flex: 1 }}>
            🔔 <Text style={{ fontWeight: '700' }}>Recordatorios Automáticos Activos:</Text> El sistema envía un aviso automático por WhatsApp a tus clientes <Text style={{ fontWeight: '700' }}>24 hs antes y 2 hs antes</Text> de cada turno confirmado. También puedes enviar un recordatorio manual desde cada tarjeta.
          </Text>
        </View>

        {reminderFeedback && (
          <View
            style={{
              backgroundColor: '#F0FDF4',
              borderWidth: 1,
              borderColor: '#BBF7D0',
              borderRadius: 8,
              padding: 10,
              marginBottom: 14
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>
              {reminderFeedback}
            </Text>
          </View>
        )}

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

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 10
              }}
              onPress={() =>
                downloadCsv(
                  `agenda-turnos-${new Date().toISOString().split('T')[0]}.csv`,
                  ['Cliente', 'Teléfono', 'Servicio/Turno', 'Fecha', 'Hora', 'Estado', 'Notas'],
                  appointments.map((a) => [
                    a.customerName,
                    a.customerPhone,
                    a.serviceName,
                    a.date,
                    a.time,
                    a.status,
                    a.notes
                  ])
                )
              }
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                📥 Exportar CSV
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newAptBtn}
              onPress={() => setShowAddForm(!showAddForm)}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.newAptBtnText}>Agendar Turno Manualmente</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumen Visual de Cupos por Turno del Día */}
        {(() => {
          const capacityServices = servicesCatalog.filter(
            (s) =>
              (Number(s.maxCapacityPerSlot) || 1) > 1 ||
              (Array.isArray(s.specificSlots) && s.specificSlots.length > 0)
          );
          if (capacityServices.length === 0) return null;
          const primarySrv = capacityServices[0];
          const slotsList: string[] =
            Array.isArray(primarySrv.specificSlots) && primarySrv.specificSlots.length > 0
              ? primarySrv.specificSlots
              : ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
          const maxCap = Math.max(1, Number(primarySrv.maxCapacityPerSlot) || 1);
          const todayIso = new Date().toISOString().split('T')[0];
          const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          return (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 12,
                padding: 14,
                marginBottom: 16
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 10
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                  📊 Ocupación de Cupos — {primarySrv.name} ({summaryDate})
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  {[
                    { label: 'Hoy', val: todayIso },
                    { label: 'Mañana', val: tomorrowIso }
                  ].map((d) => (
                    <TouchableOpacity
                      key={d.label}
                      onPress={() => setSummaryDate(d.val)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: summaryDate === d.val ? '#EFF6FF' : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: summaryDate === d.val ? '#1A73E8' : '#CBD5E1'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: summaryDate === d.val ? '#1A73E8' : '#475569'
                        }}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      fontSize: 11,
                      width: 96,
                      color: '#0F172A'
                    }}
                    value={summaryDate}
                    onChangeText={setSummaryDate}
                    placeholder="AAAA-MM-DD"
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {slotsList.map((slot) => {
                  const key = `${summaryDate}_${slot}`;
                  const count = appointments.filter(
                    (a) => a.status === 'CONFIRMED' && a.slotKey === key
                  ).length;
                  const isFull = count >= maxCap;
                  return (
                    <View
                      key={slot}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: isFull ? '#FEF2F2' : count > 0 ? '#FEFCE8' : '#F0FDF4',
                        borderWidth: 1,
                        borderColor: isFull ? '#FECACA' : count > 0 ? '#FDE68A' : '#BBF7D0'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isFull ? '#DC2626' : count > 0 ? '#B45309' : '#15803D'
                        }}
                      >
                        🕒 {slot} hs • {count}/{maxCap} {isFull ? 'COMPLETO' : 'libre(s)'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Formulario de Cita Manual */}
        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nuevo Turno en Agenda</Text>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nombre del Cliente</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Juan Pérez"
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
                <Text style={styles.fieldLabel}>Servicio / Motivo</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Mantenimiento Mensual, Revisión, Consulta..."
                  placeholderTextColor="#94A3B8"
                  value={serviceName}
                  onChangeText={setServiceName}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Fecha (AAAA-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="2026-11-20"
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
                  placeholder="Ej. Dirección o detalles del servicio"
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
                Cuando tus clientes coordinen un turno o visita por WhatsApp, el Asistente de IA lo confirmará y aparecerá inmediatamente en esta lista.
              </Text>
            </View>
          ) : (
            appointments.map((apt) => {
              const isConfirmed = apt.status === 'CONFIRMED';
              const sameSlotCount = appointments.filter(
                (other) => other.status === 'CONFIRMED' && other.slotKey && other.slotKey === apt.slotKey
              ).length;
              const matchedSrv = servicesCatalog.find(
                (s) =>
                  (s.name || '').toLowerCase() === (apt.serviceName || '').toLowerCase() ||
                  (apt.serviceName || '').toLowerCase().includes((s.name || '').toLowerCase())
              );
              const maxCap = Math.max(1, Number(matchedSrv?.maxCapacityPerSlot) || 1);
              const isSlotFull = sameSlotCount >= maxCap;

              return (
                <View key={apt.id} style={styles.aptRow}>
                  {/* Fecha y Hora */}
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeText}>{apt.time}</Text>
                    <Text style={styles.dateText}>{apt.date}</Text>
                  </View>

                  {/* Detalle Cliente y Servicio */}
                  <View style={styles.detailBlock}>
                    <Text style={styles.customerName}>{apt.customerName}</Text>
                    <View style={styles.phoneRow}>
                      <Phone size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.customerPhone}>{apt.customerPhone}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={styles.serviceTag}>{apt.serviceName}</Text>
                      {isConfirmed && (
                        <View
                          style={{
                            backgroundColor: isSlotFull && maxCap > 1 ? '#FEF2F2' : '#F8FAFC',
                            borderWidth: 1,
                            borderColor: isSlotFull && maxCap > 1 ? '#FECACA' : '#E2E8F0',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: isSlotFull && maxCap > 1 ? '#DC2626' : '#475569'
                            }}
                          >
                            👥 Cupo en este turno: {sameSlotCount}/{maxCap}
                            {isSlotFull && maxCap > 1 ? ' (Cupo Completo)' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
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
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1,
                            borderColor: '#BFDBFE'
                          }}
                          onPress={() => handleSendReminder(apt.id)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                            🔔 Recordatorio WhatsApp
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cancelAptBtn}
                          onPress={() => handleCancelAppointment(apt.id)}
                        >
                          <Text style={styles.cancelAptBtnText}>Cancelar turno</Text>
                        </TouchableOpacity>
                      </View>
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
