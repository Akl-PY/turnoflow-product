import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  GitFork,
  Plus,
  Play,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Tag,
  Users,
  ChevronDown,
  X,
  Send,
  RefreshCw,
  HelpCircle,
  CornerDownRight
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import {
  FlowTriggerType,
  FlowStepAction,
  ProspectingFlow,
  ProspectingStep,
  FlowBranch
} from '@turnoflow/shared';

const PREMADE_TEMPLATES: Partial<ProspectingFlow>[] = [
  {
    name: 'Calificación de Tratamientos & Cierre de Turnos',
    description: 'Guía paso a paso al cliente cuando consulta por precios o servicios, indaga la zona o tipo de tratamiento y propone agendar turno.',
    triggerType: FlowTriggerType.KEYWORD,
    triggerKeywords: ['precio', 'costo', 'promo', 'cuanto sale', 'tratamiento', 'laser', 'facial'],
    steps: [
      {
        id: 'step-1',
        name: 'Paso 1: Saludo e Indagación',
        botResponse: '¡Hola! Qué gusto saludarte. ✨ Para brindarte la información exacta y precios vigentes, ¿sobre qué tratamiento te gustaría consultar?\n\n1️⃣ Depilación Láser Soprano\n2️⃣ Limpieza Facial Profunda\n3️⃣ Uñas Esculpidas',
        action: FlowStepAction.NONE,
        branches: [
          {
            id: 'b-laser',
            label: 'Opción 1: Láser',
            keywords: ['1', 'laser', 'depilacion', 'soprano'],
            nextStepId: 'step-2-laser'
          },
          {
            id: 'b-facial',
            label: 'Opción 2: Facial',
            keywords: ['2', 'facial', 'limpieza'],
            nextStepId: 'step-2-facial'
          }
        ],
        fallbackResponse: 'Por favor indicame con el número 1 o 2 cuál tratamiento te gustaría conocer.',
        isFinalStep: false
      },
      {
        id: 'step-2-laser',
        name: 'Paso 2 Láser: Zona de interés',
        botResponse: '¡Excelente! Nuestro láser Soprano Titanium es 100% indoloro. ❄️ ¿En qué zona estás interesada/o: Axilas o Piernas completas?',
        action: FlowStepAction.SET_LEAD_INTEREST,
        actionPayload: {
          serviceName: 'Depilación Láser Soprano'
        },
        branches: [
          {
            id: 'b-axilas',
            label: 'Zona Axilas',
            keywords: ['axilas', 'axila'],
            nextStepId: 'step-3-laser-close'
          }
        ],
        isFinalStep: false
      },
      {
        id: 'step-2-facial',
        name: 'Paso 2 Facial: Beneficios y Cierre',
        botResponse: 'Nuestra Limpieza Facial Profunda con punta de diamante cuesta $22.000 y deja tu piel renovada y luminosa. 💆‍♀️\n\n¿Te gustaría ver los horarios disponibles para esta semana?',
        action: FlowStepAction.SET_LEAD_INTEREST,
        actionPayload: {
          serviceName: 'Limpieza Facial Profunda'
        },
        branches: [],
        isFinalStep: true
      },
      {
        id: 'step-3-laser-close',
        name: 'Paso 3 Láser: Promo y Reserva',
        botResponse: '¡Genial! Justo esta semana tenemos una *Promo 2x1 en Axilas* por $15.000 la sesión. 🎉\n\n¿Te gustaría que te reservemos un turno para este jueves o viernes?',
        action: FlowStepAction.SET_LEAD_STATUS,
        actionPayload: {
          leadStatus: 'INTERESTED' as any,
          notes: 'Interesado en Promo 2x1 Láser Axilas'
        },
        branches: [],
        isFinalStep: true
      }
    ]
  },
  {
    name: 'Bienvenida a Contactos Nuevos (Primer Mensaje)',
    description: 'Se activa automáticamente la primera vez que un cliente nuevo escribe por WhatsApp.',
    triggerType: FlowTriggerType.NEW_LEAD,
    triggerKeywords: [],
    steps: [
      {
        id: 'step-welcome',
        name: 'Paso 1: Bienvenida Institucional',
        botResponse: '¡Hola! Te damos la bienvenida a nuestro centro de estética. 💖 Para atenderte de la mejor manera, ¿en qué podemos ayudarte hoy?\n\n1) Quiero conocer los servicios y promociones\n2) Deseo coordinar o cambiar un turno\n3) Tengo una consulta personalizada',
        action: FlowStepAction.NONE,
        branches: [
          {
            id: 'b-servicios',
            label: '1) Servicios',
            keywords: ['1', 'servicios', 'promos', 'precios'],
            nextStepId: 'step-services'
          },
          {
            id: 'b-turno',
            label: '2) Turno',
            keywords: ['2', 'turno', 'agendar', 'cita'],
            nextStepId: 'step-booking'
          }
        ],
        isFinalStep: false
      },
      {
        id: 'step-services',
        name: 'Paso 2: Servicios Destacados',
        botResponse: 'Contamos con tratamientos de Estética Facial, Depilación Láser y Cuidado Corporal. ¿Te gustaría que te enviemos nuestro catálogo completo o preferís consultar por alguno en particular?',
        action: FlowStepAction.NONE,
        branches: [],
        isFinalStep: true
      },
      {
        id: 'step-booking',
        name: 'Paso 2: Solicitud de Turno',
        botResponse: '¡Con gusto! Contame qué servicio te gustaría realizarte y qué día u horario te queda más cómodo.',
        action: FlowStepAction.OFFER_BOOKING,
        branches: [],
        isFinalStep: true
      }
    ]
  }
];

export default function ProspectingScreen() {
  const [flows, setFlows] = useState<ProspectingFlow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editorVisible, setEditorVisible] = useState<boolean>(false);
  const [currentFlow, setCurrentFlow] = useState<Partial<ProspectingFlow> | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Estado del simulador interactivo
  const [simVisible, setSimVisible] = useState<boolean>(false);
  const [simFlow, setSimFlow] = useState<ProspectingFlow | null>(null);
  const [simActiveStepId, setSimActiveStepId] = useState<string | undefined>(undefined);
  const [simInput, setSimInput] = useState<string>('');
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; stepName?: string }>>([]);
  const [simEvaluating, setSimEvaluating] = useState<boolean>(false);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/prospecting');
      setFlows(res.data || []);
    } catch (err: any) {
      console.warn('Error al cargar embudos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleToggleActive = async (id: string) => {
    try {
      const res = await apiClient.patch(`/prospecting/${id}/toggle`);
      setFlows((prev) => prev.map((f) => (f.id === id ? res.data : f)));
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo actualizar el estado del embudo.');
    }
  };

  const handleDeleteFlow = async (id: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('¿Seguro que deseas eliminar este embudo de prospección?')) return;
    }
    try {
      await apiClient.delete(`/prospecting/${id}`);
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo eliminar el embudo.');
    }
  };

  const openNewFlowModal = () => {
    setCurrentFlow({
      name: '',
      description: '',
      triggerType: FlowTriggerType.KEYWORD,
      triggerKeywords: ['precio', 'promo', 'info'],
      isActive: true,
      steps: [
        {
          id: 'step-1',
          name: 'Paso 1: Saludo e Indagación',
          botResponse: '¡Hola! Gracias por comunicarte. ¿Qué tratamiento te gustaría consultar? 1) Opción A, 2) Opción B',
          action: FlowStepAction.NONE,
          branches: [
            {
              id: 'branch-1',
              label: 'Opción 1',
              keywords: ['1', 'opcion a'],
              nextStepId: 'step-2'
            }
          ],
          isFinalStep: false
        },
        {
          id: 'step-2',
          name: 'Paso 2: Seguidilla y Oferta',
          botResponse: 'Excelente elección. Tenemos una promo especial de $15.000. ¿Te gustaría agendar un turno para esta semana?',
          action: FlowStepAction.SET_LEAD_INTEREST,
          actionPayload: { serviceName: 'Opción A' },
          branches: [],
          isFinalStep: true
        }
      ]
    });
    setEditorVisible(true);
  };

  const openTemplateModal = (template: Partial<ProspectingFlow>) => {
    setCurrentFlow(JSON.parse(JSON.stringify(template)));
    setEditorVisible(true);
  };

  const openEditModal = (flow: ProspectingFlow) => {
    setCurrentFlow(JSON.parse(JSON.stringify(flow)));
    setEditorVisible(true);
  };

  const handleSaveFlow = async () => {
    if (!currentFlow?.name?.trim()) {
      Alert.alert('Campo Requerido', 'Por favor ingresa un nombre para el embudo.');
      return;
    }
    if (!currentFlow?.steps || currentFlow.steps.length === 0) {
      Alert.alert('Pasos Requeridos', 'El embudo debe tener al menos un paso.');
      return;
    }

    try {
      setSaving(true);
      if (currentFlow.id) {
        const res = await apiClient.put(`/prospecting/${currentFlow.id}`, currentFlow);
        setFlows((prev) => prev.map((f) => (f.id === currentFlow.id ? res.data : f)));
      } else {
        const res = await apiClient.post('/prospecting', currentFlow);
        setFlows((prev) => [...prev, res.data]);
      }
      setEditorVisible(false);
      setCurrentFlow(null);
    } catch (err: any) {
      Alert.alert('Error al Guardar', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // Funciones del simulador
  const startSimulation = (flow: ProspectingFlow) => {
    setSimFlow(flow);
    setSimActiveStepId(undefined);
    setSimMessages([
      {
        sender: 'bot',
        text: `🤖 Simulador iniciado para: "${flow.name}". Escribe un mensaje simulando ser un cliente (ej. "${flow.triggerKeywords[0] || 'Hola'}") para activar la seguidilla.`
      }
    ]);
    setSimInput('');
    setSimVisible(true);
  };

  const sendSimMessage = async () => {
    if (!simInput.trim() || !simFlow) return;
    const userText = simInput.trim();
    setSimInput('');

    setSimMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setSimEvaluating(true);

    try {
      const res = await apiClient.post('/prospecting/simulate', {
        userText,
        activeFlowId: simFlow.id,
        currentStepId: simActiveStepId,
        isNewContact: simFlow.triggerType === FlowTriggerType.NEW_LEAD && !simActiveStepId
      });

      const match = res.data;
      if (match.matched) {
        setSimActiveStepId(match.isFinalStep ? undefined : match.stepId);
        const step = simFlow.steps.find((s) => s.id === match.stepId);
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: match.replyMessage,
            stepName: step?.name || match.stepId
          }
        ]);
        if (match.isFinalStep) {
          setSimMessages((prev) => [
            ...prev,
            {
              sender: 'bot',
              text: '🏁 [Fin de la seguidilla del embudo] El lead quedó calificado y listo para agendar. Los siguientes mensajes serán atendidos por la Recepcionista IA general.'
            }
          ]);
        }
      } else {
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: 'ℹ️ El mensaje no coincidió con ninguna opción de la seguidilla. El flujo se deriva a la IA general o repregunta.'
          }
        ]);
      }
    } catch (err: any) {
      setSimMessages((prev) => [
        ...prev,
        { sender: 'bot', text: `❌ Error de simulación: ${err.message}` }
      ]);
    } finally {
      setSimEvaluating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Embudos & Prospección Guiada" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner Explicativo */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <GitFork size={20} color="#1a73e8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Funnels de Prospección & Respuestas en Seguidilla</Text>
              <Text style={styles.heroSubtitle}>
                Controlá con precisión matemática qué responde el bot ante preguntas clave: "¿Qué sale tal servicio?", "Soy nuevo". 
                Creá árboles de respuestas automáticas ("Si pregunta A ➔ Enviar B; si responde C ➔ Enviar D") para guiar a tus prospectos directamente hacia el cierre de la venta.
              </Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={openNewFlowModal} activeOpacity={0.8}>
              <Plus size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Crear Nuevo Embudo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección de Plantillas Listas para Usar */}
        <View style={styles.sectionHeader}>
          <Sparkles size={18} color="#1a73e8" />
          <Text style={styles.sectionTitle}>Plantillas Rápidas Listas para Activar</Text>
        </View>
        <View style={styles.templateGrid}>
          {PREMADE_TEMPLATES.map((tmpl, idx) => (
            <View key={idx} style={styles.templateCard}>
              <Text style={styles.templateName}>{tmpl.name}</Text>
              <Text style={styles.templateDesc}>{tmpl.description}</Text>
              <View style={styles.templateFooter}>
                <View style={styles.tagPill}>
                  <Text style={styles.tagPillText}>
                    {tmpl.triggerType === FlowTriggerType.NEW_LEAD ? 'Contacto Nuevo' : `${tmpl.triggerKeywords?.length} Palabras clave`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.templateButton}
                  onPress={() => openTemplateModal(tmpl)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.templateButtonText}>Usar Plantilla</Text>
                  <ArrowRight size={14} color="#1a73e8" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Listado de Embudos Creados */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <MessageSquare size={18} color="#0f172a" />
          <Text style={styles.sectionTitle}>Tus Embudos Activos ({flows.length})</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a73e8" />
            <Text style={styles.loadingText}>Cargando embudos de prospección...</Text>
          </View>
        ) : flows.length === 0 ? (
          <View style={styles.emptyContainer}>
            <GitFork size={42} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Aún no tenés ningún embudo configurado</Text>
            <Text style={styles.emptySubtitle}>
              Elegí una plantilla rápida arriba o creá tu primer embudo personalizado para automatizar la prospección.
            </Text>
          </View>
        ) : (
          flows.map((flow) => (
            <View key={flow.id} style={styles.flowCard}>
              <View style={styles.flowCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.flowTitleRow}>
                    <Text style={styles.flowName}>{flow.name}</Text>
                    <View style={[styles.statusBadge, flow.isActive ? styles.statusActive : styles.statusPaused]}>
                      <Text style={[styles.statusBadgeText, flow.isActive ? styles.statusActiveText : styles.statusPausedText]}>
                        {flow.isActive ? 'ACTIVO' : 'PAUSADO'}
                      </Text>
                    </View>
                  </View>
                  {flow.description ? <Text style={styles.flowDesc}>{flow.description}</Text> : null}
                </View>
                <Switch
                  value={flow.isActive}
                  onValueChange={() => handleToggleActive(flow.id)}
                  trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                  thumbColor={flow.isActive ? '#1a73e8' : '#f8fafc'}
                />
              </View>

              {/* Disparador */}
              <View style={styles.triggerInfoBox}>
                <Tag size={15} color="#475569" />
                <Text style={styles.triggerInfoText}>
                  {flow.triggerType === FlowTriggerType.NEW_LEAD ? (
                    <Text style={{ fontWeight: '600', color: '#0f172a' }}>Disparador: Cada contacto nuevo que escribe por primera vez</Text>
                  ) : (
                    <Text>
                      <Text style={{ fontWeight: '600', color: '#0f172a' }}>Palabras clave que activan el embudo: </Text>
                      {flow.triggerKeywords?.join(', ') || 'Ninguna'}
                    </Text>
                  )}
                </Text>
              </View>

              {/* Previsualización de los Pasos de la Seguidilla */}
              <View style={styles.stepsPreviewContainer}>
                <Text style={styles.stepsPreviewTitle}>Seguidilla de pasos ({flow.steps?.length || 0}):</Text>
                {flow.steps?.map((step, sIdx) => (
                  <View key={step.id || sIdx} style={styles.stepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>{sIdx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepNameText}>{step.name}</Text>
                      <Text style={styles.stepMessageSnippet} numberOfLines={2}>
                        "{step.botResponse}"
                      </Text>
                      {step.branches && step.branches.length > 0 && (
                        <View style={styles.branchesList}>
                          {step.branches.map((b, bIdx) => (
                            <View key={b.id || bIdx} style={styles.branchItem}>
                              <CornerDownRight size={12} color="#64748b" />
                              <Text style={styles.branchItemText}>
                                Si responde <Text style={{ fontWeight: '700' }}>[{b.keywords.join(', ')}]</Text> ➔ Avanza a siguiente paso
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Botonera de Acción */}
              <View style={styles.flowCardFooter}>
                <TouchableOpacity
                  style={styles.simulateButton}
                  onPress={() => startSimulation(flow)}
                  activeOpacity={0.8}
                >
                  <Play size={14} color="#16a34a" />
                  <Text style={styles.simulateButtonText}>Probar en Simulador</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.iconActionButton}
                    onPress={() => openEditModal(flow)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={16} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconActionButton}
                    onPress={() => handleDeleteFlow(flow.id)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* MODAL EDITOR DE EMBUDO */}
      <Modal visible={editorVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {currentFlow?.id ? 'Editar Embudo de Prospección' : 'Nuevo Embudo de Prospección'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Definí el disparador y los mensajes encadenados paso a paso.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditorVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Nombre */}
              <Text style={styles.fieldLabel}>Nombre del Embudo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Prospección de Depilación Láser"
                placeholderTextColor="#94a3b8"
                value={currentFlow?.name || ''}
                onChangeText={(val) => setCurrentFlow((prev) => ({ ...prev, name: val }))}
              />

              {/* Descripción */}
              <Text style={styles.fieldLabel}>Descripción (Objetivo)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Ej. Guiar a interesados en precios hacia la reserva de una sesión de prueba"
                placeholderTextColor="#94a3b8"
                value={currentFlow?.description || ''}
                onChangeText={(val) => setCurrentFlow((prev) => ({ ...prev, description: val }))}
              />

              {/* Tipo de Disparador */}
              <Text style={styles.fieldLabel}>¿Cuándo se debe activar este embudo?</Text>
              <View style={styles.triggerTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.triggerTypeButton,
                    currentFlow?.triggerType === FlowTriggerType.KEYWORD && styles.triggerTypeButtonActive
                  ]}
                  onPress={() => setCurrentFlow((prev) => ({ ...prev, triggerType: FlowTriggerType.KEYWORD }))}
                >
                  <Tag size={16} color={currentFlow?.triggerType === FlowTriggerType.KEYWORD ? '#1a73e8' : '#64748b'} />
                  <Text
                    style={[
                      styles.triggerTypeButtonText,
                      currentFlow?.triggerType === FlowTriggerType.KEYWORD && styles.triggerTypeButtonTextActive
                    ]}
                  >
                    Por Palabras Clave
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.triggerTypeButton,
                    currentFlow?.triggerType === FlowTriggerType.NEW_LEAD && styles.triggerTypeButtonActive
                  ]}
                  onPress={() => setCurrentFlow((prev) => ({ ...prev, triggerType: FlowTriggerType.NEW_LEAD }))}
                >
                  <Users size={16} color={currentFlow?.triggerType === FlowTriggerType.NEW_LEAD ? '#1a73e8' : '#64748b'} />
                  <Text
                    style={[
                      styles.triggerTypeButtonText,
                      currentFlow?.triggerType === FlowTriggerType.NEW_LEAD && styles.triggerTypeButtonTextActive
                    ]}
                  >
                    Cada Contacto Nuevo
                  </Text>
                </TouchableOpacity>
              </View>

              {currentFlow?.triggerType === FlowTriggerType.KEYWORD && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldSublabel}>
                    Palabras clave separadas por comas (ej. precio, costo, promo, cuanto sale):
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="precio, costo, promo, info, laser"
                    placeholderTextColor="#94a3b8"
                    value={currentFlow?.triggerKeywords?.join(', ') || ''}
                    onChangeText={(val) => {
                      const keywords = val
                        .split(',')
                        .map((k) => k.trim())
                        .filter(Boolean);
                      setCurrentFlow((prev) => ({ ...prev, triggerKeywords: keywords }));
                    }}
                  />
                </View>
              )}

              {/* Constructor de Pasos */}
              <View style={{ marginTop: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Pasos y Seguidillas del Embudo</Text>
                <TouchableOpacity
                  style={styles.addStepButton}
                  onPress={() => {
                    const newId = `step-${(currentFlow?.steps?.length || 0) + 1}`;
                    const newStep: ProspectingStep = {
                      id: newId,
                      name: `Paso ${(currentFlow?.steps?.length || 0) + 1}`,
                      botResponse: 'Mensaje de respuesta...',
                      action: FlowStepAction.NONE,
                      branches: [],
                      isFinalStep: false
                    };
                    setCurrentFlow((prev) => ({
                      ...prev,
                      steps: [...(prev?.steps || []), newStep]
                    }));
                  }}
                >
                  <Plus size={14} color="#1a73e8" />
                  <Text style={styles.addStepButtonText}>Agregar Paso</Text>
                </TouchableOpacity>
              </View>

              {currentFlow?.steps?.map((step, sIdx) => (
                <View key={step.id || sIdx} style={styles.stepEditCard}>
                  <View style={styles.stepEditHeader}>
                    <Text style={styles.stepEditTitle}>Paso {sIdx + 1}: {step.name}</Text>
                    {currentFlow.steps!.length > 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentFlow((prev) => ({
                            ...prev,
                            steps: prev?.steps?.filter((_, i) => i !== sIdx)
                          }));
                        }}
                      >
                        <Trash2 size={16} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.fieldSublabel}>Nombre interno del paso:</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={step.name}
                    onChangeText={(val) => {
                      const updated = [...currentFlow.steps!];
                      updated[sIdx].name = val;
                      setCurrentFlow((prev) => ({ ...prev, steps: updated }));
                    }}
                  />

                  <Text style={styles.fieldSublabel}>Mensaje exacto que enviará el Bot al cliente:</Text>
                  <TextInput
                    style={[styles.input, { height: 75 }]}
                    multiline
                    value={step.botResponse}
                    onChangeText={(val) => {
                      const updated = [...currentFlow.steps!];
                      updated[sIdx].botResponse = val;
                      setCurrentFlow((prev) => ({ ...prev, steps: updated }));
                    }}
                  />

                  {/* Configuración de Seguidilla / Ramas */}
                  <View style={styles.branchesEditSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.branchSectionTitle}>Seguidilla (Opciones de respuesta esperadas):</Text>
                      <TouchableOpacity
                        style={styles.addBranchButton}
                        onPress={() => {
                          const updated = [...currentFlow.steps!];
                          const branchId = `b-${Math.random().toString(36).substring(2, 7)}`;
                          updated[sIdx].branches = [
                            ...(updated[sIdx].branches || []),
                            {
                              id: branchId,
                              label: `Opción ${(updated[sIdx].branches?.length || 0) + 1}`,
                              keywords: ['1'],
                              nextStepId: currentFlow.steps![sIdx + 1]?.id || currentFlow.steps![0].id
                            }
                          ];
                          setCurrentFlow((prev) => ({ ...prev, steps: updated }));
                        }}
                      >
                        <Plus size={12} color="#1a73e8" />
                        <Text style={styles.addBranchButtonText}>Agregar Opción</Text>
                      </TouchableOpacity>
                    </View>

                    {step.branches && step.branches.length > 0 ? (
                      step.branches.map((br, bIdx) => (
                        <View key={br.id || bIdx} style={styles.branchEditRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.branchInputLabel}>Palabras del cliente (ej. 1, laser):</Text>
                            <TextInput
                              style={styles.inputMini}
                              value={br.keywords.join(', ')}
                              onChangeText={(val) => {
                                const updated = [...currentFlow.steps!];
                                updated[sIdx].branches[bIdx].keywords = val.split(',').map((k) => k.trim()).filter(Boolean);
                                setCurrentFlow((prev) => ({ ...prev, steps: updated }));
                              }}
                            />
                          </View>
                          <View style={{ width: 140 }}>
                            <Text style={styles.branchInputLabel}>Avanzar al paso:</Text>
                            <TextInput
                              style={styles.inputMini}
                              placeholder="ID ej. step-2"
                              value={br.nextStepId}
                              onChangeText={(val) => {
                                const updated = [...currentFlow.steps!];
                                updated[sIdx].branches[bIdx].nextStepId = val;
                                setCurrentFlow((prev) => ({ ...prev, steps: updated }));
                              }}
                            />
                          </View>
                          <TouchableOpacity
                            style={{ paddingTop: 18 }}
                            onPress={() => {
                              const updated = [...currentFlow.steps!];
                              updated[sIdx].branches = updated[sIdx].branches.filter((_, i) => i !== bIdx);
                              setCurrentFlow((prev) => ({ ...prev, steps: updated }));
                            }}
                          >
                            <X size={16} color="#dc2626" />
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noBranchesText}>
                        (Sin opciones siguientes: este paso finaliza el embudo o deriva a la IA general)
                      </Text>
                    )}
                  </View>

                  <View style={styles.stepCheckboxRow}>
                    <Switch
                      value={step.isFinalStep}
                      onValueChange={(val) => {
                        const updated = [...currentFlow.steps!];
                        updated[sIdx].isFinalStep = val;
                        setCurrentFlow((prev) => ({ ...prev, steps: updated }));
                      }}
                      trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                      thumbColor={step.isFinalStep ? '#1a73e8' : '#f8fafc'}
                    />
                    <Text style={styles.stepCheckboxText}>
                      ¿Es paso final? (Finaliza el embudo y guarda el lead calificado)
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditorVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveFlow}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#fff" />
                    <Text style={styles.saveButtonText}>Guardar Embudo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SIMULADOR EN VIVO */}
      <Modal visible={simVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Simulador en Vivo del Embudo</Text>
                <Text style={styles.modalSubtitle}>
                  {simFlow?.name} ({simActiveStepId ? `Paso actual: ${simActiveStepId}` : 'Inicio del flujo'})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSimVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chatArea} showsVerticalScrollIndicator={false}>
              {simMessages.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.chatBubble,
                    msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot
                  ]}
                >
                  {msg.stepName && (
                    <Text style={styles.chatStepBadge}>{msg.stepName}</Text>
                  )}
                  <Text
                    style={[
                      styles.chatText,
                      msg.sender === 'user' ? styles.chatTextUser : styles.chatTextBot
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
              {simEvaluating && (
                <View style={[styles.chatBubble, styles.chatBubbleBot]}>
                  <ActivityIndicator size="small" color="#1a73e8" />
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Escribe como cliente (ej. precio, 1, axilas)..."
                placeholderTextColor="#94a3b8"
                value={simInput}
                onChangeText={setSimInput}
                onSubmitEditing={sendSimMessage}
              />
              <TouchableOpacity
                style={styles.chatSendButton}
                onPress={sendSimMessage}
                disabled={simEvaluating}
                activeOpacity={0.8}
              >
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    padding: 24,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center'
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8
  },
  heroHeader: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start'
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22
  },
  heroActions: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  primaryButton: {
    backgroundColor: '#1a73e8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  templateCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6
  },
  templateDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12
  },
  tagPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  tagPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  templateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a73e8'
  },
  flowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6
  },
  flowCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  flowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4
  },
  flowName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  statusActive: {
    backgroundColor: '#dcfce7'
  },
  statusActiveText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '700'
  },
  statusPaused: {
    backgroundColor: '#f1f5f9'
  },
  statusPausedText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700'
  },
  flowDesc: {
    fontSize: 13,
    color: '#64748b'
  },
  triggerInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  triggerInfoText: {
    fontSize: 13,
    color: '#475569',
    flex: 1
  },
  stepsPreviewContainer: {
    backgroundColor: '#fbfcfd',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16
  },
  stepsPreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start'
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  stepNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a'
  },
  stepMessageSnippet: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2
  },
  branchesList: {
    marginTop: 6,
    gap: 4
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  branchItemText: {
    fontSize: 12,
    color: '#475569'
  },
  flowCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  simulateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a'
  },
  iconActionButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b'
  },
  emptyContainer: {
    padding: 48,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 450
  },

  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 750,
    maxHeight: '85%',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  modalBody: {
    padding: 20
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6
  },
  fieldSublabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 14
  },
  inputSmall: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 10
  },
  inputMini: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    color: '#0f172a'
  },
  triggerTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14
  },
  triggerTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  triggerTypeButtonActive: {
    borderColor: '#1a73e8',
    backgroundColor: '#eff6ff'
  },
  triggerTypeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  triggerTypeButtonTextActive: {
    color: '#1a73e8'
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  addStepButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a73e8'
  },
  stepEditCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  stepEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  stepEditTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  branchesEditSection: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10
  },
  branchSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  addBranchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addBranchButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a73e8'
  },
  branchEditRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 8
  },
  branchInputLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 3
  },
  noBranchesText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 6
  },
  stepCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  stepCheckboxText: {
    fontSize: 12,
    color: '#475569'
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  saveButton: {
    backgroundColor: '#1a73e8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff'
  },

  // Estilos del chat del Simulador
  chatArea: {
    padding: 16,
    height: 380
  },
  chatBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: '85%'
  },
  chatBubbleBot: {
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start'
  },
  chatBubbleUser: {
    backgroundColor: '#1a73e8',
    alignSelf: 'flex-end'
  },
  chatStepBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a73e8',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  chatText: {
    fontSize: 13,
    lineHeight: 18
  },
  chatTextBot: {
    color: '#0f172a'
  },
  chatTextUser: {
    color: '#ffffff'
  },
  chatInputRow: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a'
  },
  chatSendButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
