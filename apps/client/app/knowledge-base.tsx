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
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'orders' | 'context' | 'faqs'>('services');
  const [loading, setLoading] = useState(true);

  // Form para pedido manual
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderItemsSummary, setOrderItemsSummary] = useState('');
  const [orderTotalAmount, setOrderTotalAmount] = useState('');
  const [orderDeliveryMethod, setOrderDeliveryMethod] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Form para nuevo servicio o producto
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState<'Servicio' | 'Producto'>('Servicio');
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

  // Contexto extendido y ventas IA
  const [businessMode, setBusinessMode] = useState<'HYBRID' | 'SALES' | 'BOOKING' | 'INFO'>('HYBRID');
  const [assistantName, setAssistantName] = useState('');
  const [assistantTone, setAssistantTone] = useState('Cercano, amable, resolutivo y profesional (voseo natural)');
  const [customContext, setCustomContext] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [shippingOrDeliveryInfo, setShippingOrDeliveryInfo] = useState('');
  const [savingContext, setSavingContext] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);

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
          if (res.data.specialInstructions) {
            try {
              const parsed = JSON.parse(res.data.specialInstructions);
              if (parsed.businessMode) setBusinessMode(parsed.businessMode);
              if (parsed.assistantName) setAssistantName(parsed.assistantName);
              if (parsed.assistantTone) setAssistantTone(parsed.assistantTone);
              if (parsed.customContext) setCustomContext(parsed.customContext);
              if (parsed.paymentInfo) setPaymentInfo(parsed.paymentInfo);
              if (parsed.shippingOrDeliveryInfo) setShippingOrDeliveryInfo(parsed.shippingOrDeliveryInfo);
              if (Array.isArray(parsed.salesOrders)) setSalesOrders(parsed.salesOrders);
            } catch {
              setCustomContext(res.data.specialInstructions);
            }
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

  const handleCreateOrder = async () => {
    if (!orderCustomerName.trim() || !orderItemsSummary.trim()) return;
    setSubmittingOrder(true);
    try {
      const res = await apiClient.post('/business/sales-orders', {
        customerName: orderCustomerName.trim(),
        customerPhone: orderCustomerPhone.trim(),
        itemsSummary: orderItemsSummary.trim(),
        totalAmount: parseFloat(orderTotalAmount) || 0,
        deliveryMethod: orderDeliveryMethod.trim() || 'Retiro / Envío a coordinar'
      });
      if (res.data) {
        setSalesOrders((prev) => [res.data, ...prev]);
      }
      setOrderCustomerName('');
      setOrderCustomerPhone('');
      setOrderItemsSummary('');
      setOrderTotalAmount('');
      setOrderDeliveryMethod('');
      setShowAddOrderModal(false);
    } catch {
      // ignore
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleChangeOrderStatus = async (orderId: string, nextStatus: string) => {
    setSalesOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    try {
      await apiClient.patch(`/business/sales-orders/${orderId}`, { status: nextStatus });
    } catch {
      // ignore
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setSalesOrders((prev) => prev.filter((o) => o.id !== orderId));
    try {
      await apiClient.delete(`/business/sales-orders/${orderId}`);
    } catch {
      // ignore
    }
  };

  const handleSaveAiContext = async () => {
    setSavingContext(true);
    setContextSaved(false);
    try {
      await apiClient.put('/business', {
        specialInstructions: JSON.stringify({
          bookingEnabled: businessMode === 'SALES' || businessMode === 'INFO' ? false : true,
          businessMode,
          assistantName: assistantName.trim() || undefined,
          assistantTone,
          customContext,
          paymentInfo,
          shippingOrDeliveryInfo,
          updatedAt: new Date().toISOString()
        })
      });
      setContextSaved(true);
      setTimeout(() => setContextSaved(false), 3500);
    } catch {
      alert('No se pudo guardar el contexto del negocio.');
    } finally {
      setSavingContext(false);
    }
  };

  const handleAddService = async () => {
    if (!newServiceName.trim() || !newServicePrice.trim()) return;
    setSubmittingService(true);
    const item = {
      name: newServiceName.trim(),
      category: newItemCategory,
      description:
        newServiceDesc.trim() ||
        (newItemCategory === 'Producto'
          ? 'Producto disponible para compra'
          : 'Servicio profesional de nuestro negocio'),
      price: parseFloat(newServicePrice) || 30,
      currency: 'USD',
      durationMinutes: newItemCategory === 'Producto' ? 15 : parseInt(newServiceDuration, 10) || 60,
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
        title="Catálogo, Ventas & Contexto IA"
        subtitle="Administra tus productos, servicios, preguntas frecuentes y entrena al asistente sobre tu negocio"
      />

      {/* Tabs */}
      <View style={[styles.tabBar, { flexWrap: 'wrap' }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'services' && styles.tabButtonActive]}
          onPress={() => setActiveTab('services')}
        >
          <Tag size={16} color={activeTab === 'services' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
            Productos & Servicios ({services.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
          onPress={() => setActiveTab('orders')}
        >
          <DollarSign size={16} color={activeTab === 'orders' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            🛍️ Pedidos & Ventas ({salesOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'context' && styles.tabButtonActive]}
          onPress={() => setActiveTab('context')}
        >
          <Sparkles size={16} color={activeTab === 'context' ? '#1A73E8' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'context' && styles.tabTextActive]}>
            Contexto & Ventas IA
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
        {/* PESTAÑA: PRODUCTOS & SERVICIOS */}
        {/* ======================================================== */}
        {activeTab === 'services' && (
          <View>
            <View style={styles.topToolbar}>
              <View style={styles.infoBanner}>
                <BookOpen size={16} color="#1A73E8" style={{ marginRight: 8 }} />
                <Text style={styles.infoBannerText}>
                  Carga aquí los productos que vendes o los servicios que ofreces para que el asistente informe precios, arme presupuestos, tome pedidos o coordine turnos por WhatsApp.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowAddModal(!showAddModal)}
              >
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Agregar Ítem al Catálogo</Text>
              </TouchableOpacity>
            </View>

            {/* Modal / Formulario Agregar Producto o Servicio */}
            {showAddModal && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Dar de Alta Producto o Servicio</Text>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  {(['Servicio', 'Producto'] as const).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setNewItemCategory(cat)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: newItemCategory === cat ? '#EFF6FF' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: newItemCategory === cat ? '#1A73E8' : '#CBD5E1'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: newItemCategory === cat ? '#1A73E8' : '#475569'
                        }}
                      >
                        {cat === 'Producto' ? '📦 Producto en Venta' : '🛠️ Servicio / Prestación'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>
                      {newItemCategory === 'Producto' ? 'Nombre del Producto / Artículo' : 'Nombre del Servicio'}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder={
                        newItemCategory === 'Producto'
                          ? 'Ej. Bomba Autocebante 1HP, Kit de Cloro, Repuesto...'
                          : 'Ej. Mantenimiento Mensual, Visita Técnica, Consulta...'
                      }
                      placeholderTextColor="#94A3B8"
                      value={newServiceName}
                      onChangeText={setNewServiceName}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Precio ($ USD o moneda local)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. 45"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={newServicePrice}
                      onChangeText={setNewServicePrice}
                    />
                  </View>
                  {newItemCategory === 'Servicio' && (
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
                  )}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Detalles, Stock o Descripción</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder={
                        newItemCategory === 'Producto'
                          ? 'Ej. En stock para entrega inmediata, garantía de 1 año'
                          : 'Ej. Incluye revisión completa, insumos y asesoramiento'
                      }
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
                        <Text style={styles.saveBtnText}>
                          Guardar {newItemCategory}
                        </Text>
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
                        <Text style={styles.durationText}>
                          {srv.category === 'Producto' ? '📦 Producto en venta' : `${srv.durationMinutes || 45} min`}
                        </Text>
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
        {/* PESTAÑA: PEDIDOS & VENTAS REGISTRADAS */}
        {/* ======================================================== */}
        {activeTab === 'orders' && (
          <View>
            <View style={styles.topToolbar}>
              <View style={styles.infoBanner}>
                <DollarSign size={16} color="#1A73E8" style={{ marginRight: 8 }} />
                <Text style={styles.infoBannerText}>
                  Cuando un cliente confirma una compra por WhatsApp, la IA registra automáticamente el pedido aquí y te envía una alerta a tu celular.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowAddOrderModal(!showAddOrderModal)}
              >
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Registrar Pedido Manual</Text>
              </TouchableOpacity>
            </View>

            {showAddOrderModal && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Registrar Nuevo Pedido / Venta</Text>
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Nombre del Cliente</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. Carlos Gómez"
                      placeholderTextColor="#94A3B8"
                      value={orderCustomerName}
                      onChangeText={setOrderCustomerName}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Teléfono WhatsApp</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. +5491122334455"
                      placeholderTextColor="#94A3B8"
                      value={orderCustomerPhone}
                      onChangeText={setOrderCustomerPhone}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Detalle de Productos / Ítems</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. 1x Bomba 1HP + 2x Cloro 5kg"
                      placeholderTextColor="#94A3B8"
                      value={orderItemsSummary}
                      onChangeText={setOrderItemsSummary}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Monto Total ($)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. 120"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={orderTotalAmount}
                      onChangeText={setOrderTotalAmount}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Dirección de Envío o Retiro</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. Envío a Av. Libertador 1400 / Retira en local"
                      placeholderTextColor="#94A3B8"
                      value={orderDeliveryMethod}
                      onChangeText={setOrderDeliveryMethod}
                    />
                  </View>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowAddOrderModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleCreateOrder}
                    disabled={submittingOrder}
                  >
                    {submittingOrder ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Check size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>Guardar Pedido</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {salesOrders.length === 0 ? (
              <View style={styles.emptyBox}>
                <DollarSign size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No hay pedidos registrados aún</Text>
                <Text style={styles.emptySub}>
                  Cuando tus clientes compren productos o cierren un pedido por WhatsApp, el asistente lo registrará automáticamente en esta lista.
                </Text>
              </View>
            ) : (
              <View style={styles.faqList}>
                {salesOrders.map((ord) => {
                  const statusColor =
                    ord.status === 'ENTREGADO'
                      ? '#16A34A'
                      : ord.status === 'PAGADO'
                      ? '#0284C7'
                      : ord.status === 'EN_CAMINO'
                      ? '#7C3AED'
                      : '#D97706';
                  return (
                    <View key={ord.id} style={styles.faqCard}>
                      <View style={styles.faqHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.faqQuestion}>
                            🛍️ {ord.customerName} {ord.customerPhone ? `(${ord.customerPhone})` : ''}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A73E8', marginTop: 4 }}>
                            {ord.itemsSummary} — ${ord.totalAmount || 0} {ord.currency || 'USD'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: '#F8FAFC',
                              borderWidth: 1,
                              borderColor: statusColor
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>
                              {ord.status || 'PENDIENTE'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteOrder(ord.id)}
                            style={styles.deleteBtn}
                          >
                            <Trash2 size={14} color="#94A3B8" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={[styles.faqAnswer, { marginTop: 6 }]}>
                        📍 Entrega: {ord.deliveryMethod || 'A coordinar'} | 💳 Pago: {ord.paymentMethod || 'A confirmar'}
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {[
                          { code: 'PENDIENTE', label: '⏳ Pendiente' },
                          { code: 'PAGADO', label: '💳 Pagado' },
                          { code: 'EN_CAMINO', label: '🚚 En Camino' },
                          { code: 'ENTREGADO', label: '✅ Entregado' }
                        ].map((st) => (
                          <TouchableOpacity
                            key={st.code}
                            onPress={() => handleChangeOrderStatus(ord.id, st.code)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 6,
                              backgroundColor: ord.status === st.code ? '#EFF6FF' : '#F8FAFC',
                              borderWidth: 1,
                              borderColor: ord.status === st.code ? '#1A73E8' : '#E2E8F0'
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: ord.status === st.code ? '#1A73E8' : '#475569'
                              }}
                            >
                              {st.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA: CONTEXTO, VENTAS Y PERSONALIDAD IA */}
        {/* ======================================================== */}
        {activeTab === 'context' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>🧠 Entrenamiento, Ventas y Contexto Libre del Negocio</Text>
            <Text style={[styles.emptySub, { textAlign: 'left', marginBottom: 16 }]}>
              Aquí puedes darle todo el contexto que quieras a tu asistente para que venda productos, tome pedidos, pase tu Alias/CBU o responda sobre tu empresa sin depender únicamente de turnos.
            </Text>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Modo Principal de Operación</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 12 }}>
                {[
                  { id: 'HYBRID' as const, label: '🔄 Híbrido (Ventas, Consultas y Turnos)' },
                  { id: 'SALES' as const, label: '🛒 Solo Ventas, Pedidos y Presupuestos' },
                  { id: 'INFO' as const, label: '💬 Atención al Cliente e Info del Negocio' },
                  { id: 'BOOKING' as const, label: '📅 Foco en Reserva de Turnos' }
                ].map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setBusinessMode(m.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 8,
                      backgroundColor: businessMode === m.id ? '#EFF6FF' : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: businessMode === m.id ? '#1A73E8' : '#CBD5E1'
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: businessMode === m.id ? '#1A73E8' : '#475569'
                      }}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nombre del Asistente</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Asistente Comercial o Sofi"
                  placeholderTextColor="#94A3B8"
                  value={assistantName}
                  onChangeText={setAssistantName}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Tono y Estilo de Comunicación</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Cercano y amigable (voseo), Vendedor proactivo, Técnico..."
                  placeholderTextColor="#94A3B8"
                  value={assistantTone}
                  onChangeText={setAssistantTone}
                />
              </View>
            </View>

            <View style={[styles.formField, { marginTop: 12 }]}>
              <Text style={styles.fieldLabel}>
                Contexto Completo del Negocio, Cómo Vender y Reglas Personalizadas
              </Text>
              <TextInput
                style={[styles.formInput, { height: 130, textAlignVertical: 'top' }]}
                multiline
                placeholder="Escribe todo sobre tu negocio: qué venden, cómo cotizar, qué datos pedir al cliente para cerrar una compra o envío, garantías, marcas, promociones..."
                placeholderTextColor="#94A3B8"
                value={customContext}
                onChangeText={setCustomContext}
              />
            </View>

            <View style={[styles.formField, { marginTop: 12 }]}>
              <Text style={styles.fieldLabel}>
                Medios de Pago, Alias / CBU y Condiciones de Compra
              </Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                multiline
                placeholder="Ej. Alias: MI.NEGOCIO.MP (Banco / Billetera), efectivo con descuento, link de pago..."
                placeholderTextColor="#94A3B8"
                value={paymentInfo}
                onChangeText={setPaymentInfo}
              />
            </View>

            <View style={[styles.formField, { marginTop: 12 }]}>
              <Text style={styles.fieldLabel}>
                Envíos, Entregas, Visitas a Domicilio o Retiro en Local
              </Text>
              <TextInput
                style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="Ej. Envíos a domicilio en el día, retiro por sucursal sin cargo, visitas técnicas..."
                placeholderTextColor="#94A3B8"
                value={shippingOrDeliveryInfo}
                onChangeText={setShippingOrDeliveryInfo}
              />
            </View>

            <View style={[styles.formActions, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveAiContext}
                disabled={savingContext}
              >
                {savingContext ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Guardar Contexto y Reglas IA</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {contextSaved && (
              <Text style={{ color: '#15803D', fontSize: 13, fontWeight: '700', marginTop: 10 }}>
                ✅ ¡Contexto guardado! El asistente ya responde y vende con esta configuración.
              </Text>
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
                  El asistente consulta estas respuestas ante dudas sobre métodos de pago, envíos, ubicación o garantías.
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
                  <Text style={styles.fieldLabel}>Pregunta del cliente</Text>
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
