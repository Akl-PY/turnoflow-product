import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  TextInput,
  Platform,
  Linking
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Bot,
  User,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Play,
  Pause,
  ExternalLink,
  ChevronLeft,
  Send,
  Phone,
  ShieldCheck,
  Clock
} from 'lucide-react-native';
import {
  fetchConversations,
  fetchConversationMessages,
  resumeConversationAi,
  pauseConversationAi,
  sendManualMessage,
  resetAllConversationsAi,
  fetchAiProviderStatus,
  AiProviderStatus,
  ConversationItem,
  ChatMessageItem
} from '../src/lib/api';

const QUICK_REPLIES = [
  { icon: '📅', label: 'Pedir Día/Hora', text: '¡Hola! ¿Qué día y horario te vendría más cómodo para coordinar tu turno?' },
  { icon: '📋', label: 'Servicios & Precios', text: 'Con gusto te comparto información sobre nuestros servicios disponibles y precios. ¿Hay alguno que te interese?' },
  { icon: '💳', label: 'Medios de Pago', text: 'Aceptamos transferencias bancarias, tarjetas de débito/crédito y efectivo.' },
  { icon: '📍', label: 'Ubicación', text: 'Estamos disponibles en nuestro horario de atención habitual. ¿Te gustaría coordinar una cita?' },
  { icon: '⏳', label: 'Un momento por favor', text: '¡Hola! Estoy atendiendo a un cliente en este momento. En unos minutitos te respondo detalladamente.' },
  { icon: '🟢', label: 'Turno Confirmado', text: '¡Excelente! Tu turno ha quedado confirmado para el horario acordado. ¡Te esperamos!' }
];

export default function ChatsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const queryClient = useQueryClient();
  const messagesScrollRef = useRef<ScrollView>(null);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'LIST' | 'DETAIL'>('LIST');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AI_HANDLED' | 'HUMAN_TAKEOVER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [manualMessageText, setManualMessageText] = useState('');
  const [isSendingManual, setIsSendingManual] = useState(false);

  // Consulta de conversaciones
  const {
    data: conversations = [],
    isLoading,
    isRefetching,
    refetch
  } = useQuery<ConversationItem[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const list = await fetchConversations();
        return Array.isArray(list) ? list : [];
      } catch (err) {
        return [];
      }
    },
    refetchInterval: 8000 // Refrescar automáticamente cada 8s
  });

  // Consulta de estado de salud del motor de IA y Circuit Breaker
  const { data: aiStatus } = useQuery<AiProviderStatus>({
    queryKey: ['aiProviderStatus'],
    queryFn: async () => {
      try {
        return await fetchAiProviderStatus();
      } catch {
        return {
          activeProvider: 'gemini_flash',
          geminiStatus: 'HEALTHY',
          openAiStatus: 'HEALTHY',
          hasBackup: true
        };
      }
    },
    refetchInterval: 15000
  });

  // Seleccionar la primera conversación al cargar en desktop
  useEffect(() => {
    if (isDesktop && !selectedChatId && conversations.length > 0) {
      setSelectedChatId(conversations[0].id);
    }
  }, [conversations, selectedChatId, isDesktop]);

  // Consulta de mensajes del chat seleccionado
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery<ChatMessageItem[]>({
    queryKey: ['messages', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return [];
      try {
        const res = await fetchConversationMessages(selectedChatId);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedChatId,
    refetchInterval: 4000
  });

  // Auto scroll al último mensaje cuando cambian
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Mutación para reactivar IA
  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeConversationAi(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<ConversationItem[]>(['conversations'], (old) => {
        if (!old) return [updated];
        return old.map((c) => (c.id === updated.id ? updated : c));
      });
      setActionNotice('¡Atención de IA reactivada con éxito! El bot responderá las próximas consultas de este cliente.');
      setTimeout(() => setActionNotice(null), 5000);
    }
  });

  // Mutación para pausar IA
  const pauseMutation = useMutation({
    mutationFn: (id: string) => pauseConversationAi(id, 'Pausa manual desde el panel'),
    onSuccess: (updated) => {
      queryClient.setQueryData<ConversationItem[]>(['conversations'], (old) => {
        if (!old) return [updated];
        return old.map((c) => (c.id === updated.id ? updated : c));
      });
      setActionNotice('IA pausada. La conversación queda en atención humana manual durante 24 horas.');
      setTimeout(() => setActionNotice(null), 5000);
    }
  });

  // Mutación para reactivar TODAS las conversaciones a Modo IA
  const resetAllMutation = useMutation({
    mutationFn: () => resetAllConversationsAi(),
    onSuccess: (res) => {
      queryClient.setQueryData<ConversationItem[]>(['conversations'], (old) => {
        if (!old) return [];
        return old.map((c) => ({ ...c, status: 'AI_HANDLED' }));
      });
      setActionNotice(`¡Listo! Se reactivaron todas las conversaciones (${res.affected} chats) al Modo IA 24/7.`);
      setTimeout(() => setActionNotice(null), 6000);
      refetch();
    }
  });

  // Enviar mensaje manual desde el panel hacia WhatsApp
  const handleSendManual = async () => {
    if (!selectedChatId || !manualMessageText.trim() || isSendingManual) return;
    const text = manualMessageText.trim();
    setIsSendingManual(true);

    try {
      await sendManualMessage(selectedChatId, text);
      setManualMessageText('');

      // Actualizar estado de la conversación localmente a HUMAN_TAKEOVER
      queryClient.setQueryData<ConversationItem[]>(['conversations'], (old) => {
        if (!old) return [];
        return old.map((c) =>
          c.id === selectedChatId
            ? { ...c, status: 'HUMAN_TAKEOVER', lastMessagePreview: text }
            : c
        );
      });

      // Refrescar mensajes inmediatamente
      await refetchMessages();

      setActionNotice('Mensaje enviado a WhatsApp. Modo manual activado para este chat.');
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice('Error al enviar mensaje. Revisa la conexión de WhatsApp.');
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setIsSendingManual(false);
    }
  };

  const selectedChat = conversations.find((c) => c.id === selectedChatId);

  // Filtrado de conversaciones
  const filteredConversations = conversations.filter((c) => {
    if (filterStatus === 'AI_HANDLED' && c.status !== 'AI_HANDLED') return false;
    if (filterStatus === 'HUMAN_TAKEOVER' && c.status !== 'HUMAN_TAKEOVER') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const phoneMatch = (c.channelConversationId || '').toLowerCase().includes(q);
      const textMatch = (c.lastMessagePreview || '').toLowerCase().includes(q);
      return phoneMatch || textMatch;
    }
    return true;
  });

  const aiActiveCount = conversations.filter((c) => c.status === 'AI_HANDLED').length;
  const humanTakeoverCount = conversations.filter((c) => c.status === 'HUMAN_TAKEOVER').length;

  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    if (!isDesktop) {
      setMobileView('DETAIL');
    }
  };

  const openWhatsAppDirectly = (phone?: string) => {
    if (!phone) return;
    const cleanDigits = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanDigits}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  // ==========================================
  // Render: Componente de Lista de Chats
  // ==========================================
  const renderChatList = () => (
    <View style={[styles.chatListPanel, !isDesktop && styles.chatListPanelMobile]}>
      {/* Barra de Búsqueda */}
      <View style={styles.searchBarContainer}>
        <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por teléfono o mensaje..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
            <Text style={{ fontSize: 11, color: '#94A3B8' }}>Borrar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs de Filtro */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilterStatus('ALL')}
        >
          <Text
            style={[styles.filterTabText, filterStatus === 'ALL' && styles.filterTabTextActive]}
          >
            Todos ({conversations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'AI_HANDLED' && styles.filterTabActive]}
          onPress={() => setFilterStatus('AI_HANDLED')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'AI_HANDLED' && styles.filterTabTextActive
            ]}
          >
            🟢 IA Activa ({aiActiveCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'HUMAN_TAKEOVER' && styles.filterTabActive]}
          onPress={() => setFilterStatus('HUMAN_TAKEOVER')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'HUMAN_TAKEOVER' && styles.filterTabTextActive
            ]}
          >
            🟡 Pausados ({humanTakeoverCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listado de Chats */}
      <ScrollView style={styles.chatListScroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1A73E8" />
            <Text style={styles.loadingText}>Cargando chats guardados...</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={36} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No hay chats en este filtro</Text>
            <Text style={styles.emptyStateText}>
              A medida que los clientes escriban a tu WhatsApp, aparecerán aquí automáticamente en tiempo real.
            </Text>
          </View>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedChatId;
            const isAi = conv.status === 'AI_HANDLED';

            return (
              <TouchableOpacity
                key={conv.id}
                style={[styles.chatCard, isSelected && styles.chatCardSelected]}
                onPress={() => handleSelectChat(conv.id)}
                activeOpacity={0.7}
              >
                <View style={styles.chatCardHeader}>
                  <View style={styles.chatCardTitleRow}>
                    <View style={[styles.avatar, isAi ? styles.avatarAi : styles.avatarHuman]}>
                      {isAi ? (
                        <Bot size={15} color="#059669" />
                      ) : (
                        <User size={15} color="#D97706" />
                      )}
                    </View>
                    <Text style={styles.chatPhone}>
                      {conv.channelConversationId || (conv as any).customerPhone || 'Cliente WhatsApp'}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, isAi ? styles.statusBadgeAi : styles.statusBadgeHuman]}>
                    <Text style={[styles.statusBadgeText, isAi ? styles.statusBadgeTextAi : styles.statusBadgeTextHuman]}>
                      {isAi ? '🟢 IA Activa' : '🟡 En Pausa'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.chatPreview} numberOfLines={2}>
                  {conv.lastMessagePreview || 'Sin mensajes recientes'}
                </Text>

                <View style={styles.chatFooter}>
                  <Text style={styles.chatDate}>
                    {conv.updatedAt
                      ? new Date(conv.updatedAt).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) + ' hs'
                      : 'Reciente'}
                  </Text>
                  <Text style={styles.chatCount}>
                    {conv.messagesCount || 0} mensajes
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  // ==========================================
  // Render: Detalle del Chat Seleccionado
  // ==========================================
  const renderChatDetail = () => {
    if (!selectedChat) {
      return (
        <View style={styles.noChatSelected}>
          <MessageSquare size={48} color="#94A3B8" />
          <Text style={styles.noChatTitle}>Selecciona una conversación</Text>
          <Text style={styles.noChatText}>
            Elige un chat de la lista para ver los mensajes en vivo, responder directamente por WhatsApp o reactivar la IA.
          </Text>
        </View>
      );
    }

    const isAiActive = selectedChat.status === 'AI_HANDLED';
    const targetPhone = selectedChat.channelConversationId || (selectedChat as any).customerPhone;

    return (
      <View style={styles.detailContainer}>
        {/* Barra Superior del Chat Seleccionado */}
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderLeft}>
            {!isDesktop && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setMobileView('LIST')}
                activeOpacity={0.7}
              >
                <ChevronLeft size={22} color="#1A73E8" />
                <Text style={styles.backButtonText}>Chats</Text>
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={styles.detailPhone}>
                  {targetPhone}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    isAiActive ? styles.statusBadgeAi : styles.statusBadgeHuman
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isAiActive ? styles.statusBadgeTextAi : styles.statusBadgeTextHuman
                    ]}
                  >
                    {isAiActive ? '🟢 Modo IA Activo' : '🟡 En Pausa Humana'}
                  </Text>
                </View>
              </View>

              <Text style={styles.detailSubtext}>
                Canal: WhatsApp • {messages.length || selectedChat.messagesCount || 0} mensajes registrados
              </Text>
            </View>
          </View>

          {/* Acciones Rápidas de Cabecera */}
          <View style={styles.actionButtons}>
            {/* Botón Abrir en WhatsApp */}
            <TouchableOpacity
              style={styles.whatsappDirectButton}
              onPress={() => openWhatsAppDirectly(targetPhone)}
              activeOpacity={0.8}
            >
              <ExternalLink size={14} color="#059669" />
              {isDesktop && <Text style={styles.whatsappDirectText}>WhatsApp</Text>}
            </TouchableOpacity>

            {/* Botón Control IA: Reactivar o Pausar */}
            {!isAiActive ? (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => resumeMutation.mutate(selectedChat.id)}
                disabled={resumeMutation.isPending}
                activeOpacity={0.8}
              >
                {resumeMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                )}
                <Text style={styles.resumeButtonText}>
                  Reactivar IA
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={() => pauseMutation.mutate(selectedChat.id)}
                disabled={pauseMutation.isPending}
                activeOpacity={0.8}
              >
                {pauseMutation.isPending ? (
                  <ActivityIndicator size="small" color="#B45309" />
                ) : (
                  <Pause size={14} color="#B45309" />
                )}
                <Text style={styles.pauseButtonText}>
                  Pausar IA
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Historial de Mensajes */}
        <ScrollView
          ref={messagesScrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={true}
        >
          {isLoadingMessages ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1A73E8" />
              <Text style={styles.loadingText}>Cargando mensajes del chat...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <MessageSquare size={36} color="#CBD5E1" />
              <Text style={styles.emptyMessagesText}>
                No hay mensajes guardados en el historial de esta conversación.
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const senderUpper = (msg.sender || '').toUpperCase();
              const isUser = senderUpper === 'USER';
              const isHumanAgent = senderUpper === 'HUMAN_AGENT';
              const isAi = !isUser && !isHumanAgent;

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAgent
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? styles.messageBubbleUser
                        : isHumanAgent
                        ? styles.messageBubbleHuman
                        : styles.messageBubbleAi
                    ]}
                  >
                    <View style={styles.messageSenderHeader}>
                      {isUser ? (
                        <User size={12} color="#475569" style={{ marginRight: 4 }} />
                      ) : isHumanAgent ? (
                        <User size={12} color="#059669" style={{ marginRight: 4 }} />
                      ) : (
                        <Bot size={12} color="#1A73E8" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={
                          isUser
                            ? styles.senderLabelUser
                            : isHumanAgent
                            ? styles.senderLabelHuman
                            : styles.senderLabelAi
                        }
                      >
                        {isUser
                          ? 'Cliente'
                          : isHumanAgent
                          ? 'Operador (Tú)'
                          : 'TurnoFlow AI'}
                      </Text>
                      <Text style={styles.messageTime}>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : ''}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.messageText,
                        isUser
                          ? styles.messageTextUser
                          : isHumanAgent
                          ? styles.messageTextHuman
                          : styles.messageTextAi
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Chips de Respuestas Rápidas con 1 Toque */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesScroll}
          >
            {QUICK_REPLIES.map((qr, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickReplyChip}
                onPress={() => setManualMessageText(qr.text)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickReplyChipIcon}>{qr.icon}</Text>
                <Text style={styles.quickReplyChipText}>{qr.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Barra Inferior de Respuesta Manual Directa a WhatsApp */}
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            placeholder="Escribe una respuesta manual para enviar a WhatsApp..."
            placeholderTextColor="#94A3B8"
            value={manualMessageText}
            onChangeText={setManualMessageText}
            multiline={true}
            onSubmitEditing={handleSendManual}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!manualMessageText.trim() || isSendingManual) && styles.sendButtonDisabled
            ]}
            onPress={handleSendManual}
            disabled={!manualMessageText.trim() || isSendingManual}
            activeOpacity={0.8}
          >
            {isSendingManual ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Corporativo (Desktop o Modo Lista en Móvil) */}
      {(isDesktop || mobileView === 'LIST') && (
        <>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrapper}>
                <MessageSquare color="#1A73E8" size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={styles.headerTitle}>Chats & Control de IA 24/7</Text>
                  <View
                    style={[
                      styles.providerBadge,
                      aiStatus?.geminiStatus === 'COOLDOWN_30M'
                        ? styles.providerBadgeWarning
                        : styles.providerBadgeActive
                    ]}
                  >
                    <View
                      style={[
                        styles.providerDot,
                        aiStatus?.geminiStatus === 'COOLDOWN_30M'
                          ? styles.providerDotWarning
                          : styles.providerDotActive
                      ]}
                    />
                    <Text
                      style={[
                        styles.providerBadgeText,
                        aiStatus?.geminiStatus === 'COOLDOWN_30M'
                          ? styles.providerBadgeTextWarning
                          : styles.providerBadgeTextActive
                      ]}
                    >
                      {aiStatus?.geminiStatus === 'COOLDOWN_30M'
                        ? 'Respaldo Activo (Gemini reposo 30m)'
                        : 'Motor IA: Gemini Flash 24/7 • Failover Listo'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.headerSubtitle}>
                  Supervisa WhatsApp en tiempo real, responde manualmente o reactiva el bot con un solo clic.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={styles.resetAllButton}
                onPress={() => resetAllMutation.mutate()}
                disabled={resetAllMutation.isPending}
                activeOpacity={0.8}
              >
                {resetAllMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Sparkles size={14} color="#FFFFFF" />
                )}
                <Text style={styles.resetAllButtonText}>
                  {resetAllMutation.isPending ? 'Reactivando...' : 'Reactivar Todos a Modo IA'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => {
                  refetch();
                  if (selectedChatId) refetchMessages();
                }}
                disabled={isRefetching}
                activeOpacity={0.7}
              >
                <RefreshCw
                  size={15}
                  color="#1A73E8"
                  style={isRefetching ? styles.rotating : undefined}
                />
                <Text style={styles.refreshButtonText}>
                  {isRefetching ? 'Actualizando...' : 'Actualizar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tarjetas de Métricas de Estado */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total de Conversaciones</Text>
              <Text style={styles.statValue}>{conversations.length}</Text>
              <Text style={styles.statHint}>Registradas en la base de datos</Text>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#10B981', borderLeftWidth: 4 }]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>🟢 Modo IA Activo</Text>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>24/7</Text>
                </View>
              </View>
              <Text style={[styles.statValue, { color: '#047857' }]}>{aiActiveCount}</Text>
              <Text style={styles.statHint}>El bot responde consultas y turnos</Text>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>🟡 Pausa Humana</Text>
                <View style={styles.humanPill}>
                  <Text style={styles.humanPillText}>Manual</Text>
                </View>
              </View>
              <Text style={[styles.statValue, { color: '#B45309' }]}>{humanTakeoverCount}</Text>
              <Text style={styles.statHint}>Silenciado para atención personal</Text>
            </View>
          </View>

          {/* Notificación de Acción */}
          {actionNotice && (
            <View style={styles.alertBanner}>
              <CheckCircle2 color="#047857" size={18} />
              <Text style={styles.alertBannerText}>{actionNotice}</Text>
            </View>
          )}
        </>
      )}

      {/* Disposición Principal (Desktop: 2 Columnas | Móvil: Vista Única Alternable) */}
      {isDesktop ? (
        <View style={styles.contentLayout}>
          {renderChatList()}
          <View style={styles.chatDetailPanel}>{renderChatDetail()}</View>
        </View>
      ) : mobileView === 'LIST' ? (
        <View style={styles.contentLayoutMobileOnly}>{renderChatList()}</View>
      ) : (
        <View style={styles.contentLayoutMobileOnly}>
          {actionNotice && (
            <View style={[styles.alertBanner, { marginHorizontal: 12, marginTop: 8 }]}>
              <CheckCircle2 color="#047857" size={16} />
              <Text style={styles.alertBannerText}>{actionNotice}</Text>
            </View>
          )}
          <View style={styles.chatDetailPanelMobile}>{renderChatDetail()}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: Platform.OS === 'web' ? 20 : 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 260
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  resetAllButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A73E8'
  },
  rotating: {
    opacity: 0.6
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginVertical: 4
  },
  statHint: {
    fontSize: 11,
    color: '#94A3B8'
  },
  activePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669'
  },
  humanPill: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  humanPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706'
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  alertBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    flex: 1
  },
  contentLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16
  },
  contentLayoutMobileOnly: {
    flex: 1
  },
  chatListPanel: {
    width: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    display: 'flex'
  },
  chatListPanelMobile: {
    width: '100%',
    flex: 1
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 13,
    color: '#0F172A'
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap'
  },
  filterTab: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
    backgroundColor: '#F1F5F9'
  },
  filterTabActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B'
  },
  filterTabTextActive: {
    color: '#1A73E8'
  },
  chatListScroll: {
    flex: 1
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    marginBottom: 8
  },
  chatCardSelected: {
    borderColor: '#1A73E8',
    backgroundColor: '#F8FAFC'
  },
  chatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  chatCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarAi: {
    backgroundColor: '#ECFDF5'
  },
  avatarHuman: {
    backgroundColor: '#FFFBEB'
  },
  chatPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeAi: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  statusBadgeHuman: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  statusBadgeTextAi: {
    color: '#059669'
  },
  statusBadgeTextHuman: {
    color: '#D97706'
  },
  chatPreview: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 6
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  chatDate: {
    fontSize: 11,
    color: '#94A3B8'
  },
  chatCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  chatDetailPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  chatDetailPanelMobile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  detailContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    flexWrap: 'wrap',
    gap: 8
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 200
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  backButtonText: {
    fontSize: 12,
    color: '#1A73E8',
    fontWeight: '700'
  },
  detailPhone: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  detailSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  whatsappDirectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 7
  },
  whatsappDirectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669'
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A73E8',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 7
  },
  resumeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 7
  },
  pauseButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309'
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  messagesContent: {
    padding: 14,
    gap: 10
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%'
  },
  messageRowUser: {
    justifyContent: 'flex-start'
  },
  messageRowAgent: {
    justifyContent: 'flex-end'
  },
  messageBubble: {
    maxWidth: Platform.OS === 'web' ? '75%' : '88%',
    padding: 10,
    borderRadius: 12
  },
  messageBubbleUser: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 2
  },
  messageBubbleAi: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderTopRightRadius: 2
  },
  messageBubbleHuman: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderTopRightRadius: 2
  },
  messageSenderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  senderLabelUser: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginRight: 8
  },
  senderLabelAi: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A73E8',
    marginRight: 8
  },
  senderLabelHuman: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginRight: 8
  },
  messageTime: {
    fontSize: 10,
    color: '#94A3B8'
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18
  },
  messageTextUser: {
    color: '#0F172A'
  },
  messageTextAi: {
    color: '#1E3A8A'
  },
  messageTextHuman: {
    color: '#064E3B'
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6
  },
  providerBadgeActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  providerBadgeWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  providerDotActive: {
    backgroundColor: '#10B981'
  },
  providerDotWarning: {
    backgroundColor: '#F59E0B'
  },
  providerBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  providerBadgeTextActive: {
    color: '#047857'
  },
  providerBadgeTextWarning: {
    color: '#B45309'
  },
  quickRepliesContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  quickRepliesScroll: {
    gap: 6,
    alignItems: 'center'
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4
  },
  quickReplyChipIcon: {
    fontSize: 12
  },
  quickReplyChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155'
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 10,
    gap: 8
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    maxHeight: 80
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6
  },
  noChatSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  noChatTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14
  },
  noChatText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 6
  },
  emptyState: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10
  },
  emptyStateText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4
  },
  emptyMessages: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyMessagesText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B'
  }
});
