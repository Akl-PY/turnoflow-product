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
  Plus,
  Tag,
  DollarSign,
  Clock,
  HelpCircle,
  ShieldCheck,
  Check
} from 'lucide-react-native';
import { DEMO_SERVICES } from '../src/lib/api';

const DEMO_FAQS = [
  {
    id: 'faq-1',
    question: '¿Cuáles son los medios de pago aceptados?',
    answer: 'Aceptamos transferencias bancarias, Mercado Pago, efectivo y tarjetas Visa y Mastercard.'
  },
  {
    id: 'faq-2',
    question: '¿Tienen estacionamiento en la zona?',
    answer: 'Contamos con 50% de descuento en el estacionamiento ubicado en Santa Fe 2480 a 30 metros.'
  },
  {
    id: 'faq-3',
    question: '¿Se requiere pago de seña para reservar?',
    answer: 'Para confirmar tu primer turno solicitamos una seña del 30% del valor del servicio.'
  },
  {
    id: 'faq-4',
    question: '¿Qué tolerancia de demora tienen?',
    answer: 'Contamos con una tolerancia máxima de 10 minutos para no afectar las citas posteriores.'
  }
];

export default function KnowledgeBaseScreen() {
  const [services, setServices] = useState(DEMO_SERVICES);
  const [faqs, setFaqs] = useState(DEMO_FAQS);
  const [activeTab, setActiveTab] = useState<'services' | 'faqs'>('services');

  // Form para nuevo servicio
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddService = () => {
    if (!newServiceName || !newServicePrice) return;
    const item = {
      id: `srv-${Date.now()}`,
      name: newServiceName,
      category: 'General',
      description: 'Tratamiento personalizado',
      price: parseFloat(newServicePrice) || 30,
      currency: 'USD',
      durationMinutes: parseInt(newServiceDuration, 10) || 60,
      isActive: true
    };
    setServices([item, ...services]);
    setNewServiceName('');
    setNewServicePrice('');
    setShowAddModal(false);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Base de Conocimiento & Catálogo"
        subtitle="Fuente de verdad absoluta que consultan los agentes de IA para responder y cotizar"
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.tabActive]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
            Catálogo de Servicios ({services.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'faqs' && styles.tabActive]}
          onPress={() => setActiveTab('faqs')}
        >
          <Text style={[styles.tabText, activeTab === 'faqs' && styles.tabTextActive]}>
            Preguntas Frecuentes ({faqs.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {activeTab === 'services' ? (
          <View>
            <View style={styles.actionRow}>
              <Text style={styles.sectionHeader}>SERVICIOS REGISTRADOS</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddModal(!showAddModal)}
              >
                <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.addBtnText}>Añadir Tratamiento</Text>
              </TouchableOpacity>
            </View>

            {showAddModal && (
              <View style={styles.addBox}>
                <Text style={styles.addBoxTitle}>Nuevo Servicio</Text>
                <View style={styles.addFieldsRow}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="Nombre del servicio (ej. Lifting de Pestañas)"
                    placeholderTextColor="#52525b"
                    value={newServiceName}
                    onChangeText={setNewServiceName}
                  />
                  <TextInput
                    style={[styles.input, { width: 90 }]}
                    placeholder="Precio USD"
                    placeholderTextColor="#52525b"
                    keyboardType="numeric"
                    value={newServicePrice}
                    onChangeText={setNewServicePrice}
                  />
                  <TextInput
                    style={[styles.input, { width: 90 }]}
                    placeholder="Minutos"
                    placeholderTextColor="#52525b"
                    keyboardType="numeric"
                    value={newServiceDuration}
                    onChangeText={setNewServiceDuration}
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddService}>
                    <Check size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.servicesGrid}>
              {services.map((srv) => (
                <View key={srv.id} style={styles.serviceCard}>
                  <View style={styles.serviceHeader}>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryText}>{srv.category}</Text>
                    </View>
                    <Text style={styles.servicePrice}>${srv.price} {srv.currency}</Text>
                  </View>

                  <Text style={styles.serviceName}>{srv.name}</Text>
                  <Text style={styles.serviceDesc}>{srv.description}</Text>

                  <View style={styles.serviceFooter}>
                    <View style={styles.durationRow}>
                      <Clock size={12} color="#71717a" style={{ marginRight: 4 }} />
                      <Text style={styles.durationText}>{srv.durationMinutes} min</Text>
                    </View>
                    <View style={styles.verifiedRow}>
                      <ShieldCheck size={12} color="#4ade80" style={{ marginRight: 4 }} />
                      <Text style={styles.verifiedText}>Grounding Verificado</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionHeader}>PREGUNTAS FRECUENTES (FAQS)</Text>
            <View style={styles.faqList}>
              {faqs.map((faq) => (
                <View key={faq.id} style={styles.faqCard}>
                  <View style={styles.faqHeader}>
                    <HelpCircle size={16} color="#a855f7" style={{ marginRight: 8 }} />
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                  </View>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
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
    backgroundColor: '#09090b'
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#09090b',
    gap: 8
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: '#a855f7'
  },
  tabText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '500'
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '600'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 28
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionHeader: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333ea',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    alignItems: 'center'
  },
  input: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12
  },
  saveBtn: {
    backgroundColor: '#22c55e',
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  serviceCard: {
    width: 300,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 18
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  categoryPill: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  categoryText: {
    color: '#c084fc',
    fontSize: 10,
    fontWeight: '700'
  },
  servicePrice: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  serviceName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  serviceDesc: {
    color: '#71717a',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    paddingTop: 10
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  durationText: {
    color: '#a1a1aa',
    fontSize: 11
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  verifiedText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '500'
  },
  faqList: {
    gap: 12
  },
  faqCard: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 16
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  faqQuestion: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  faqAnswer: {
    color: '#a1a1aa',
    fontSize: 12,
    lineHeight: 18,
    paddingLeft: 24
  }
});
