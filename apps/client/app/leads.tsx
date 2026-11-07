import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Search,
  Flame,
  Plus,
  Check,
  ArrowRight
} from 'lucide-react-native';
import { apiClient, DEMO_LEADS } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

const STATUS_FILTERS = ['TODOS', 'NEW', 'CONTACTED', 'INTERESTED', 'PENDING', 'BOOKED', 'LOST'];
const STATUS_CYCLE = ['NEW', 'CONTACTED', 'INTERESTED', 'BOOKED'];

export default function LeadsScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TODOS');
  const [leads, setLeads] = useState<any[]>(DEMO_LEADS);

  // Formulario para crear nuevo lead
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newService, setNewService] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
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
        // Fallback a DEMO_LEADS si falla la red
      }
    };
    fetchLeads();
  }, [user?.organizationId]);

  const handleCreateLead = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const payload = {
      name: newName.trim(),
      phone: newPhone.trim(),
      requestedService: newService.trim() || 'Limpieza Facial Profunda',
      notes: newNotes.trim() || 'Registrado manualmente desde CRM',
      priority: 'HOT',
      intent: 'HIGH',
      status: 'NEW',
      source: 'WhatsApp'
    };

    try {
      const res = await apiClient.post('/leads', payload);
      const saved = {
        ...res.data,
        lastInteractionAt: 'Hace un instante'
      };
      setLeads((prev) => [saved, ...prev]);
    } catch {
      const fallbackItem = {
        id: `lead-${Date.now()}`,
        ...payload,
        lastInteractionAt: 'Hace un instante'
      };
      setLeads((prev) => [fallbackItem, ...prev]);
    }

    setNewName('');
    setNewPhone('');
    setNewService('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const handleAdvanceStatus = async (lead: any) => {
    const idx = STATUS_CYCLE.indexOf(lead.status);
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: nextStatus } : l))
    );

    try {
      await apiClient.patch(`/leads/${lead.id}`, { status: nextStatus });
    } catch {
      // Mantiene cambio local si falla la red
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.requestedService && l.requestedService.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = selectedStatus === 'TODOS' || l.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getPriorityBadge = (priority: string) => {
    if (priority === 'HOT') {
      return (
        <View style={[styles.priorityBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
          <Flame size={12} color="#f87171" style={{ marginRight: 3 }} />
          <Text style={[styles.priorityText, { color: '#f87171' }]}>HOT</Text>
        </View>
      );
    }
    return (
      <View style={[styles.priorityBadge, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
        <Text style={[styles.priorityText, { color: '#facc15' }]}>WARM</Text>
      </View>
    );
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      NEW: { label: 'Nuevo', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' },
      CONTACTED: { label: 'Contactado', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)' },
      INTERESTED: { label: 'Interesado', color: '#facc15', bg: 'rgba(234, 179, 8, 0.15)' },
      PENDING: { label: 'Pendiente', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.15)' },
      BOOKED: { label: 'Reservado', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)' },
      LOST: { label: 'Perdido', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)' }
    };
    const s = map[status] || { label: status, color: '#ffffff', bg: '#27272a' };
    return (
      <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
        <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="CRM de Leads y Prospectos"
        subtitle="Registro y seguimiento de oportunidades comerciales captadas por la IA"
      />

      <View style={styles.filterBar}>
        {/* Search */}
        <View style={styles.searchWrapper}>
          <Search size={16} color="#71717a" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, teléfono o servicio..."
            placeholderTextColor="#71717a"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, selectedStatus === s && styles.chipActive]}
              onPress={() => setSelectedStatus(s)}
            >
              <Text style={[styles.chipText, selectedStatus === s && styles.chipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Nuevo Lead</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {showAddForm && (
          <View style={styles.addBox}>
            <Text style={styles.addBoxTitle}>Registrar Nuevo Prospecto</Text>
            <View style={styles.addFieldsRow}>
              <TextInput
                style={[styles.input, { flex: 1.5 }]}
                placeholder="Nombre completo"
                placeholderTextColor="#52525b"
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={[styles.input, { flex: 1.2 }]}
                placeholder="Teléfono (+54911...)"
                placeholderTextColor="#52525b"
                value={newPhone}
                onChangeText={setNewPhone}
              />
              <TextInput
                style={[styles.input, { flex: 1.5 }]}
                placeholder="Servicio de interés"
                placeholderTextColor="#52525b"
                value={newService}
                onChangeText={setNewService}
              />
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Notas u observaciones"
                placeholderTextColor="#52525b"
                value={newNotes}
                onChangeText={setNewNotes}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateLead}>
                <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { flex: 2 }]}>PROSPECTO</Text>
            <Text style={[styles.th, { flex: 2 }]}>SERVICIO DE INTERÉS</Text>
            <Text style={[styles.th, { flex: 1.4 }]}>ESTADO</Text>
            <Text style={[styles.th, { flex: 1 }]}>PRIORIDAD</Text>
            <Text style={[styles.th, { flex: 1.3 }]}>ÚLTIMA INTERACCIÓN</Text>
            <Text style={[styles.th, { flex: 2.3 }]}>NOTAS / ACCIÓN</Text>
          </View>

          {/* Rows */}
          {filteredLeads.map((lead) => (
            <View key={lead.id} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.leadName}>{lead.name}</Text>
                <Text style={styles.leadPhone}>{lead.phone}</Text>
              </View>

              <View style={{ flex: 2 }}>
                <Text style={styles.leadService}>{lead.requestedService || 'Sin especificar'}</Text>
                <Text style={styles.leadSource}>Fuente: {lead.source}</Text>
              </View>

              <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {getStatusBadge(lead.status)}
                <TouchableOpacity
                  style={styles.advanceBtn}
                  onPress={() => handleAdvanceStatus(lead)}
                >
                  <ArrowRight size={11} color="#c084fc" />
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>{getPriorityBadge(lead.priority)}</View>

              <View style={{ flex: 1.3 }}>
                <Text style={styles.timeText}>{lead.lastInteractionAt}</Text>
              </View>

              <View style={{ flex: 2.3 }}>
                <Text style={styles.notesText} numberOfLines={2}>
                  {lead.notes}
                </Text>
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
  filterBar: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#09090b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 12,
    width: 300,
    height: 38
  },
  searchInput: {
    color: '#ffffff',
    fontSize: 13,
    flex: 1
  },
  chipsScroll: {
    flex: 1
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    marginRight: 8
  },
  chipActive: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.15)'
  },
  chipText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600'
  },
  chipTextActive: {
    color: '#ffffff'
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333ea',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  addBox: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#a855f7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20
  },
  addBoxTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10
  },
  addFieldsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  input: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
    minWidth: 140
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 28
  },
  table: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    overflow: 'hidden'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#18181b',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a'
  },
  th: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b'
  },
  leadName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  leadPhone: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2
  },
  leadService: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '500'
  },
  leadSource: {
    color: '#52525b',
    fontSize: 10,
    marginTop: 2
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  advanceBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700'
  },
  timeText: {
    color: '#a1a1aa',
    fontSize: 12
  },
  notesText: {
    color: '#71717a',
    fontSize: 11
  }
});
