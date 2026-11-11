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
  Plus,
  Clock,
  HelpCircle,
  BookOpen,
  Check,
  Sparkles,
  Trash2,
  DollarSign,
  Tag
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function KnowledgeBaseScreen() {
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'faqs'>('services');
  const [loading, setLoading] = useState(true);

  // Form para nuevo servicio
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [submittingService, setSubmittingService] = useState(false);

  // Form para nueva FAQ
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [submittingFaq, setSubmittingFaq] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/business');
        if (res.data) {
          if (Array.isArray(res.data.services)) {
            setServices(res.data.services);
          }
          if (Array.isArray(res.data.faqs)) {
            setFaqs(res.data.faqs);
          }
        }
      } catch {
        setServices([]);
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, [user?.organizationId]);

  const handleAddService = async () => {
    if (!newServiceName.trim() || !newServicePrice.trim()) return;
    setSubmittingService(true);
    const item = {
      name: newServiceName.trim(),
      category: 'General',
      description: newServiceDesc.trim() || 'Servicio profesional de nuestro negocio',
      price: parseFloat(newServicePrice) || 30,
      currency: 'USD',
      durationMinutes: parseInt(newServiceDuration, 10) || 60,
      isActive: true
    };

    try {
      const res = await apiClient.post('/business/services', item);
      if (res.data?.services) {
        setServices(res.data.services);
      } else {
        setServices([{ id: `srv-${Date.now()}`, ...item }, ...services]);
      }
    } catch {
      setServices([{ id: `srv-${Date.now()}`, ...item }, ...services]);
    } finally {
      setSubmittingService(false);
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDesc('');
      setShowAddModal(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const updated = services.filter((s) => s.id !== serviceId);
    setServices(updated);
    try {
      await apiClient.put('/business', { services: updated });
    } catch {
      // offline fallback
    }
  };

  const handleAddFaq = async () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    setSubmittingFaq(true);
    const nextFaqs = [
      ...faqs,
      {
        id: `faq-${Date.now()}`,
        question: newFaqQuestion.trim(),
        answer: newFaqAnswer.trim()
      }
    ];
    setFaqs(nextFaqs);
    try {
      await apiClient.put('/business', { faqs: nextFaqs });
    } catch {
      // offline fallback
    } finally {
      setSubmittingFaq(false);
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      setShowAddFaqModal(false);
    }
  };

  const handleDeleteFaq = async (faqId: string) => {
    const updated = faqs.filter((f) => f.id !== faqId);
    setFaqs(updated);
    try {
      await apiClient.put('/business', { faqs: updated });
    } catch {
      // offline fallback
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Servicios, Tarifas & Preguntas"
        subtitle="Administra los precios, tiempos de atención y respuestas automáticas del Asistente de IA"
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'services' && styles.tabButtonActive]}
          onPress={() => setActiveTab('services')}
        >
          <Tag size={16} color={activeTab === 'services' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
            Servicios & Tarifas ({services.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'faqs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('faqs')}
        >
          <HelpCircle size={16} color={activeTab === 'faqs' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'faqs' && styles.tabTextActive]}>
            Preguntas Frecuentes ({faqs.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* ======================================================== */}
        {/* PESTAÑA: SERVICIOS */}
        {/* ======================================================== */}
        {activeTab === 'services' && (
          <View>
            <View style={styles.topToolbar}>
              <View style={styles.infoBanner}>
                <BookOpen size={16} color="#1A73E8" style={{ marginRight: 8 }} />
                <Text style={styles.infoBannerText}>
                  Si no tienes Scalinky vinculado, el asistente utiliza esta lista para cotizar, responder consultas y coordinar turnos por WhatsApp.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowAddModal(!showAddModal)}
              >
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Nuevo Servicio</Text>
              </TouchableOpacity>
            </View>

            {/* Modal / Formulario Agregar Servicio */}
            {showAddModal && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Dar de Alta Nuevo Servicio o Prestación</Text>
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Nombre del Servicio / Producto</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. Mantenimiento Mensual, Consulta General, Reparación..."
                      placeholderTextColor="#94A3B8"
                      value={newServiceName}
                      onChangeText={setNewServiceName}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Precio Estimado ($ USD o moneda local)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. 35"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={newServicePrice}
                      onChangeText={setNewServicePrice}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Duración Estimada (Minutos)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. 60"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={newServiceDuration}
                      onChangeText={setNewServiceDuration}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Descripción Breve</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. Incluye revisión técnica, insumos y garantía"
                      placeholderTextColor="#94A3B8"
                      value={newServiceDesc}
                      onChangeText={setNewServiceDesc}
                    />
                  </View>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleAddService}
                    disabled={submittingService}
                  >
                    {submittingService ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Check size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>Guardar Servicio</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Grid de Servicios */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#1A73E8" size="large" />
                <Text style={styles.loadingText}>Cargando catálogo de servicios...</Text>
              </View>
            ) : services.length === 0 ? (
              <View style={styles.emptyBox}>
                <Tag size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No hay servicios cargados aún</Text>
                <Text style={styles.emptySub}>
                  Agrega los servicios, mantenimientos o prestaciones que ofrece tu negocio para que el asistente de WhatsApp pueda informar los precios exactos a tus clientes.
                </Text>
              </View>
            ) : (
              <View style={styles.servicesGrid}>
                {services.map((srv) => (
                  <View key={srv.id} style={styles.serviceCard}>
                    <View style={styles.serviceHeader}>
                      <Text style={styles.serviceName}>{srv.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteService(srv.id)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.servicePrice}>${srv.price}</Text>

                    <Text style={styles.serviceDesc}>
                      {srv.description || 'Servicio disponible en nuestro catálogo.'}
                    </Text>

                    <View style={styles.serviceFooter}>
                      <View style={styles.durationRow}>
                        <Clock size={13} color="#64748B" style={{ marginRight: 5 }} />
                        <Text style={styles.durationText}>{srv.durationMinutes || 45} min</Text>
                      </View>
                      <View style={styles.verifiedTag}>
                        <Check size={11} color="#16A34A" style={{ marginRight: 4 }} />
                        <Text style={styles.verifiedTagText}>Activo en WhatsApp</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA: PREGUNTAS FRECUENTES (FAQ) */}
        {/* ======================================================== */}
        {activeTab === 'faqs' && (
          <View>
            <View style={styles.topToolbar}>
              <View style={styles.infoBanner}>
                <HelpCircle size={16} color="#1A73E8" style={{ marginRight: 8 }} />
                <Text style={styles.infoBannerText}>
                  El asistente consulta estas respuestas ante dudas sobre métodos de pago, señas, ubicación o preparación previa.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowAddFaqModal(!showAddFaqModal)}
              >
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Nueva Pregunta</Text>
              </TouchableOpacity>
            </View>

            {/* Formulario Nueva FAQ */}
            {showAddFaqModal && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Agregar Pregunta & Respuesta</Text>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Pregunta de la clienta</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej. ¿Qué formas de pago aceptan?"
                    placeholderTextColor="#94A3B8"
                    value={newFaqQuestion}
                    onChangeText={setNewFaqQuestion}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Respuesta que dará el Asistente de IA</Text>
                  <TextInput
                    style={[styles.formInput, { height: 70 }]}
                    multiline
                    placeholder="Ej. Aceptamos efectivo, transferencia bancaria y tarjetas de crédito con cuotas sin interés."
                    placeholderTextColor="#94A3B8"
                    value={newFaqAnswer}
                    onChangeText={setNewFaqAnswer}
                  />
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowAddFaqModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleAddFaq}
                    disabled={submittingFaq}
                  >
                    {submittingFaq ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Check size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>Guardar Pregunta</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Lista de FAQs */}
            {faqs.length === 0 ? (
              <View style={styles.emptyBox}>
                <HelpCircle size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No hay preguntas frecuentes aún</Text>
                <Text style={styles.emptySub}>
                  Agrega preguntas habituales sobre formas de pago, estacionamiento o turnos para que el asistente responda al instante.
                </Text>
              </View>
            ) : (
              <View style={styles.faqList}>
                {faqs.map((faq) => (
                  <View key={faq.id} style={styles.faqCard}>
                    <View style={styles.faqHeader}>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteFaq(faq.id)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 24,
    gap: 12
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8
  },
  tabButtonActive: {
    borderBottomColor: '#1A73E8'
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
  infoBanner: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  infoBannerText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 16
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  primaryBtnText: {
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
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B'
  },
  emptyBox: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
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
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  serviceCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        } as any)
      : { elevation: 2 })
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1
  },
  deleteBtn: {
    padding: 4
  },
  servicePrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A73E8',
    marginBottom: 8
  },
  serviceDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 16,
    minHeight: 34
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  durationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500'
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  verifiedTagText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600'
  },
  faqList: {
    gap: 12
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1
  },
  faqAnswer: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19
  }
});
