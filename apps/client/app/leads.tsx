import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Search,
  Users,
  Plus,
  Check,
  ArrowRight,
  Phone,
  Calendar,
  Sparkles,
  MessageSquare
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { downloadCsv } from '../src/lib/csv';

const STATUS_FILTERS = [
  { key: 'TODOS', label: 'Todos los Clientes' },
  { key: 'NEW', label: 'Nuevas Consultas' },
  { key: 'CONTACTED', label: 'En Conversación' },
  { key: 'INTERESTED', label: '🔥 Interesados' },
  { key: 'BOOKED', label: '✅ Compra / Turno' }
];

const STATUS_CYCLE = ['NEW', 'CONTACTED', 'INTERESTED', 'BOOKED'];

function getStatusBadge(status: string) {
  switch (status) {
    case 'NEW':
      return { label: 'Nueva Consulta', bg: '#E8F0FE', text: '#1A73E8', border: '#BFDBFE' };
    case 'CONTACTED':
      return { label: 'En Conversación', bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    case 'INTERESTED':
      return { label: '🔥 Interesado', bg: '#EDE9FE', text: '#4F46E5', border: '#DDD6FE' };
    case 'PENDING':
      return { label: '🚨 Requiere Humano', bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
    case 'BOOKED':
      return { label: '✅ Confirmado / Venta', bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' };
    default:
      return { label: status, bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
  }
}

function getIntentBadge(intent?: string, priority?: string) {
  if (intent === 'URGENT') {
    return { label: '🚨 Urgencia / Reclamo', color: '#DC2626' };
  }
  if (intent === 'HIGH' || priority === 'HOT') {
    return { label: '🔥 Alta Intención', color: '#EA580C' };
  }
  return { label: '💬 Consulta', color: '#64748B' };
}

export default function LeadsScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TODOS');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario para crear nuevo lead
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Importación en bloque de Clientes / Alumnos
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkMarkAsCustomer, setBulkMarkAsCustomer] = useState(true);
  const [importingBulk, setImportingBulk] = useState(false);
  const [newService, setNewService] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/leads');
        if (Array.isArray(res.data)) {
          setLeads(
            res.data.map((l: any) => ({
              ...l,
              lastInteractionAt: l.lastInteractionAt
                ? isNaN(new Date(l.lastInteractionAt).getTime())
                  ? l.lastInteractionAt
                  : new Date(l.lastInteractionAt).toLocaleDateString('es-AR')
                : 'Hoy'
            }))
          );
        }
      } catch {
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [user?.organizationId]);

  const handleCreateLead = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    setSubmitting(true);
    const payload = {
      name: newName.trim(),
      phone: newPhone.trim(),
      requestedService: newService.trim() || 'Servicio General',
      notes: newNotes.trim() || 'Registrada manualmente desde el panel',
      priority: 'HOT',
      intent: 'HIGH',
      status: 'NEW',
      source: 'WhatsApp'
    };

    try {
      const res = await apiClient.post('/leads', payload);
      const saved = {
        ...res.data,
        lastInteractionAt: 'Hace un momento'
      };
      setLeads((prev) => [saved, ...prev]);
    } catch {
      const fallbackItem = {
        id: `lead-${Date.now()}`,
        ...payload,
        lastInteractionAt: 'Hace un momento'
      };
      setLeads((prev) => [fallbackItem, ...prev]);
    } finally {
      setSubmitting(false);
      setNewName('');
      setNewPhone('');
      setNewService('');
      setNewNotes('');
      setShowAddForm(false);
    }
  };

  const handleAdvanceStatus = async (lead: any) => {
    const idx = STATUS_CYCLE.indexOf(lead.status);
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: nextStatus } : l))
    );

    try {
      await apiClient.patch(`/leads/${lead.id}`, { status: nextStatus });
    } catch {
      // Ignorar para UI offline
    }
  };

  const handleBulkImport = async () => {
    const raw = bulkImportText.trim();
    if (!raw || importingBulk) return;
    setImportingBulk(true);
    try {
      const items = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(/[,;\t]+/).map((p) => p.trim());
          if (parts.length >= 2) {
            const firstIsPhone = /^\+?\d[\d\s-]{6,}$/.test(parts[0]);
            return firstIsPhone
              ? { phone: parts[0], name: parts[1] }
              : { name: parts[0], phone: parts[1] };
          }
          return { phone: parts[0], name: '' };
        });

      await apiClient.post('/leads/bulk-import', {
        items,
        markAsCustomer: bulkMarkAsCustomer
      });
      const res = await apiClient.get('/leads');
      if (Array.isArray(res.data)) {
        setLeads(res.data);
      }
      setBulkImportText('');
      setShowBulkImport(false);
    } catch {
      alert('No se pudo importar la lista. Revisá el formato e intentá nuevamente.');
    } finally {
      setImportingBulk(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      (l.name && l.name.toLowerCase().includes(search.toLowerCase())) ||
      (l.phone && l.phone.toLowerCase().includes(search.toLowerCase())) ||
      (l.requestedService && l.requestedService.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = selectedStatus === 'TODOS' || l.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Directorio de Clientes & Leads"
        subtitle="Auto-captura de contactos de WhatsApp, temperatura de compra e historial de consultas"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Barra Superior con Buscador y Filtros */}
        <View style={styles.topToolbar}>
          <View style={styles.searchBox}>
            <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, teléfono, producto o servicio..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 10
            }}
            onPress={() => {
              setShowBulkImport(!showBulkImport);
              setShowAddForm(false);
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>
              📋 Importar Lista
            </Text>
          </TouchableOpacity>

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
                `clientes-leads-${new Date().toISOString().split('T')[0]}.csv`,
                ['Nombre', 'Teléfono', 'Servicio/Interés', 'Estado', 'Notas'],
                filteredLeads.map((l) => [l.name, l.phone, l.requestedService, l.status, l.notes])
              )
            }
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
              📥 Exportar CSV
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newLeadBtn}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.newLeadBtnText}>Registrar Cliente</Text>
          </TouchableOpacity>
        </View>

        {/* Filtros de Estado */}
        <View style={styles.filtersRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                selectedStatus === f.key && styles.filterChipActive
              ]}
              onPress={() => setSelectedStatus(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === f.key && styles.filterChipTextActive
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tarjeta de Importación en Bloque */}
        {showBulkImport && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>📋 Importar Clientes o Alumnos Actuales en Bloque</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              Pegá una línea por contacto (formato: "Nombre, +549..." o solo el teléfono). Al marcarlos como actuales, la IA los reconocerá automáticamente y no les ofrecerá clase de prueba inicial.
            </Text>
            <TextInput
              style={[styles.formInput, { height: 110, textAlignVertical: 'top', marginBottom: 10 }]}
              multiline
              placeholder={'Daniel Galetto, +5493547464266\nSofía Pérez, +5491122334455'}
              placeholderTextColor="#94A3B8"
              value={bulkImportText}
              onChangeText={setBulkImportText}
            />
            <TouchableOpacity
              onPress={() => setBulkMarkAsCustomer(!bulkMarkAsCustomer)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  backgroundColor: bulkMarkAsCustomer ? '#1A73E8' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: bulkMarkAsCustomer ? '#1A73E8' : '#94A3B8',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {bulkMarkAsCustomer && <Check size={12} color="#FFFFFF" />}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                ⭐ Marcar todos como Clientes / Estudiantes Actuales
              </Text>
            </TouchableOpacity>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBulkImport(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleBulkImport}
                disabled={importingBulk}
              >
                <Check size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>
                  {importingBulk ? 'Importando...' : 'Importar y Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Formulario de Alta Rápida */}
        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Registrar Nuevo Cliente</Text>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nombre y Apellido</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Martín Gómez"
                  placeholderTextColor="#94A3B8"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Teléfono (con WhatsApp)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. +5491133445566"
                  placeholderTextColor="#94A3B8"
                  value={newPhone}
                  onChangeText={setNewPhone}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Producto o Servicio de Interés</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Mantenimiento Mensual, Compra de Bomba, Consulta..."
                  placeholderTextColor="#94A3B8"
                  value={newService}
                  onChangeText={setNewService}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Notas o Preferencias</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Solicita presupuesto con envío"
                  placeholderTextColor="#94A3B8"
                  value={newNotes}
                  onChangeText={setNewNotes}
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
                onPress={handleCreateLead}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Guardar Cliente</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tabla / Lista de Leads */}
        <View style={styles.tableCard}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#1A73E8" size="large" />
              <Text style={styles.loadingText}>Cargando directorio de clientes...</Text>
            </View>
          ) : filteredLeads.length === 0 ? (
            <View style={styles.emptyBox}>
              <Users size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No hay clientes registrados aún</Text>
              <Text style={styles.emptySub}>
                Cada vez que una persona te escriba a tu número de WhatsApp conectado, se registrará automáticamente en esta lista con su nombre, teléfono e intención detectada.
              </Text>
            </View>
          ) : (
            filteredLeads.map((item) => {
              const badge = getStatusBadge(item.status);
              const intentInfo = getIntentBadge(item.intent, item.priority);
              return (
                <View key={item.id} style={styles.leadRow}>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <View style={styles.phoneRow}>
                      <Phone size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.clientPhone}>{item.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.serviceInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={styles.serviceName}>
                        {item.requestedService || 'Consulta General'}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: intentInfo.color }}>
                        {intentInfo.label}
                      </Text>
                    </View>
                    <Text style={styles.notesText} numberOfLines={1}>
                      {item.notes || 'Atendido por el Asistente de IA'}
                    </Text>
                  </View>

                  <View style={styles.statusBox}>
                    <TouchableOpacity
                      style={[
                        styles.badge,
                        { backgroundColor: badge.bg, borderColor: badge.border }
                      ]}
                      onPress={() => handleAdvanceStatus(item)}
                    >
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.lastSeen}>Último contacto: {item.lastInteractionAt}</Text>
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
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  searchBox: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A'
  },
  newLeadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  newLeadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  filterChipActive: {
    backgroundColor: '#1A73E8',
    borderColor: '#1A73E8'
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  tableCard: {
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
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 16,
    flexWrap: 'wrap'
  },
  clientInfo: {
    flex: 1,
    minWidth: 180
  },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3
  },
  clientPhone: {
    fontSize: 12,
    color: '#64748B'
  },
  serviceInfo: {
    flex: 1,
    minWidth: 200
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  notesText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2
  },
  statusBox: {
    alignItems: 'flex-end',
    minWidth: 140
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  lastSeen: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4
  }
});
