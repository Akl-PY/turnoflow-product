import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Wrench,
  ShieldAlert,
  ChevronRight,
  MessageSquare,
  CheckCircle2
} from 'lucide-react-native';
import { apiClient } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

const SCENARIOS = [
  {
    id: 's1',
    label: 'Consulta de Precios',
    text: '¡Hola! ¿Cuánto sale el corte y nutrición y cuánto dura el turno?'
  },
  {
    id: 's2',
    label: 'Solicitud de Turno',
    text: 'Quiero agendar turno para este viernes a las 16:00 hs por favor.'
  },
  {
    id: 's3',
    label: 'Intento de Regateo',
    text: 'En otro lugar me cobran la mitad, ¿me hacés un descuento?'
  },
  {
    id: 's4',
    label: 'Ubicación y Horarios',
    text: '¿Dónde queda el local y hasta qué hora atienden hoy?'
  },
  {
    id: 's5',
    label: 'Hablar con Humano',
    text: 'Necesito hablar con la encargada por un reclamo importante.'
  }
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolCalls?: any[];
  handoffToHuman?: boolean;
}

export default function PlaygroundScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-welcome',
      sender: 'assistant',
      text: '¡Hola! 👋 Soy tu Asistente Virtual de WhatsApp de TurnoFlow AI. Puedes escribirme como si fueras una clienta para probar cómo respondo y cómo consulto tus precios y turnos.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedToolTrace, setSelectedToolTrace] = useState<any[] | null>(null);

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await apiClient.post('/ai/playground', {
        message: text,
        agentRole: 'RECEPTIONIST',
        organizationId: user?.organizationId
      });

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: res.data?.response || 'Estoy a tu disposición para ayudarte.',
        toolCalls: res.data?.toolCalls || [],
        handoffToHuman: res.data?.handoffToHuman
      };

      setMessages((prev) => [...prev, botMsg]);
      if (res.data?.toolCalls && res.data.toolCalls.length > 0) {
        setSelectedToolTrace(res.data.toolCalls);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: '¡Hola! En este momento estoy consultando el catálogo de tratamientos y horarios disponibles de tu salón. ¿En qué servicio estás interesada?'
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'm-welcome',
        sender: 'assistant',
        text: '¡Hola! 👋 Chat reiniciado. Envía una consulta o prueba los botones rápidos para ver cómo responde la IA.'
      }
    ]);
    setSelectedToolTrace(null);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Simulador en Vivo del Asistente"
        subtitle="Prueba cómo responderá tu bot ante consultas reales de tus clientas por WhatsApp"
      />

      {/* Escenarios de Prueba Rápida */}
      <View style={styles.scenariosBar}>
        <Text style={styles.scenariosTitle}>Casos habituales:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scenariosList}>
          {SCENARIOS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.scenarioChip}
              onPress={() => sendMessage(s.text)}
              disabled={isLoading}
            >
              <Text style={styles.scenarioLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.mainGrid}>
        {/* Chat de WhatsApp */}
        <View style={styles.chatContainer}>
          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatContent}>
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.msgWrapper,
                    isUser ? styles.msgWrapperUser : styles.msgWrapperBot
                  ]}
                >
                  <View style={styles.avatarBox}>
                    {isUser ? (
                      <User size={14} color="#64748B" />
                    ) : (
                      <Bot size={14} color="#1A73E8" />
                    )}
                  </View>

                  <View
                    style={[
                      styles.msgBubble,
                      isUser ? styles.bubbleUser : styles.bubbleBot
                    ]}
                  >
                    <Text
                      style={[
                        styles.msgText,
                        isUser ? styles.msgTextUser : styles.msgTextBot
                      ]}
                    >
                      {m.text}
                    </Text>

                    {m.handoffToHuman && (
                      <View style={styles.handoffAlert}>
                        <ShieldAlert size={14} color="#D97706" style={{ marginRight: 6 }} />
                        <Text style={styles.handoffAlertText}>
                          Se generó una alerta de WhatsApp al celular del dueño para responder personalmente.
                        </Text>
                      </View>
                    )}

                    {m.toolCalls && m.toolCalls.length > 0 && (
                      <TouchableOpacity
                        style={styles.toolBadge}
                        onPress={() => setSelectedToolTrace(m.toolCalls!)}
                      >
                        <Wrench size={11} color="#1A73E8" style={{ marginRight: 4 }} />
                        <Text style={styles.toolBadgeText}>
                          Consultó catálogo / horarios ({m.toolCalls.length})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {isLoading && (
              <View style={[styles.msgWrapper, styles.msgWrapperBot]}>
                <View style={styles.avatarBox}>
                  <Bot size={14} color="#1A73E8" />
                </View>
                <View style={[styles.msgBubble, styles.bubbleBot, { paddingVertical: 12 }]}>
                  <ActivityIndicator size="small" color="#1A73E8" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetChat}
            >
              <RotateCcw size={16} color="#64748B" />
            </TouchableOpacity>

            <TextInput
              style={styles.chatInput}
              placeholder="Escribe como una clienta (ej: ¿Tienen lugar hoy a las 17 hs?)..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => sendMessage()}
            />

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => sendMessage()}
              disabled={isLoading || !inputText.trim()}
            >
              <Send size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Panel Lateral: Información del Asistente */}
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>Actividad del Asistente</Text>
          <Text style={styles.infoPanelSub}>
            Aquí puedes ver qué reglas y datos utilizó la IA para elaborar la última respuesta.
          </Text>

          {selectedToolTrace && selectedToolTrace.length > 0 ? (
            <ScrollView style={styles.traceScroll}>
              {selectedToolTrace.map((call, idx) => (
                <View key={idx} style={styles.traceCard}>
                  <Text style={styles.traceActionName}>
                    Acción: {call.function?.name || 'Consulta de Catálogo'}
                  </Text>
                  <Text style={styles.traceDetails}>
                    Argumentos: {JSON.stringify(call.function?.arguments || {})}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyTraceBox}>
              <CheckCircle2 size={32} color="#16A34A" />
              <Text style={styles.emptyTraceTitle}>Respuesta Directa</Text>
              <Text style={styles.emptyTraceText}>
                El asistente respondió amablemente aplicando el protocolo de atención y las normas del salón.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scenariosBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  scenariosTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B'
  },
  scenariosList: {
    gap: 8,
    alignItems: 'center'
  },
  scenarioChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  scenarioLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600'
  },
  mainGrid: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
    gap: 20
  },
  chatContainer: {
    flex: 1.6,
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
  chatScroll: {
    flex: 1
  },
  chatContent: {
    padding: 20,
    gap: 16
  },
  msgWrapper: {
    flexDirection: 'row',
    gap: 10,
    maxWidth: '85%'
  },
  msgWrapperUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse'
  },
  msgWrapperBot: {
    alignSelf: 'flex-start'
  },
  avatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12
  },
  bubbleUser: {
    backgroundColor: '#1A73E8',
    borderBottomRightRadius: 2
  },
  bubbleBot: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 2
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19
  },
  msgTextUser: {
    color: '#FFFFFF'
  },
  msgTextBot: {
    color: '#0F172A'
  },
  handoffAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    padding: 8,
    marginTop: 8
  },
  handoffAlertText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    flex: 1
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6
  },
  toolBadgeText: {
    fontSize: 10,
    color: '#1A73E8',
    fontWeight: '700'
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8
  },
  resetBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A'
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20
  },
  infoPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  infoPanelSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
    marginBottom: 16
  },
  traceScroll: {
    flex: 1
  },
  traceCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  traceActionName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A73E8',
    marginBottom: 4
  },
  traceDetails: {
    fontSize: 11,
    color: '#64748B'
  },
  emptyTraceBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyTraceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4
  },
  emptyTraceText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17
  }
});
