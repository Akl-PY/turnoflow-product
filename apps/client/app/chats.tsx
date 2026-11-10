import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  TextInput,
  Platform
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Bot,
  User,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  Pause,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react-native';
import {
  fetchConversations,
  fetchConversationMessages,
  resumeConversationAi,
  pauseConversationAi,
  ConversationItem,
  ChatMessageItem
} from '../src/lib/api';

export default function ChatsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const queryClient = useQueryClient();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AI_HANDLED' | 'HUMAN_TAKEOVER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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
    refetchInterval: 10000 // Refrescar automáticamente cada 10s
  });

  // Seleccionar la primera conversación al cargar si ninguna está seleccionada
  useEffect(() => {
    if (!selectedChatId && conversations.length > 0) {
      setSelectedChatId(conversations[0].id);
    }
  }, [conversations, selectedChatId]);

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
    refetchInterval: 6000
  });

  // Mutación para reactivar IA
  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeConversationAi(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<ConversationItem[]>(['conversations'], (old) => {
        if (!old) return [updated];
        return old.map((c) => (c.id === updated.id ? updated : c));
      });
      setActionNotice('¡Atención de IA reactivada con éxito! El bot responderá las próximas consultas de este cliente.');
      setTimeout(() => setActionNotice(null), 6000);
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
      setTimeout(() => setActionNotice(null), 6000);
    }
  });

  const selectedChat = conversations.find((c) => c.id === selectedChatId);

  // Filtrado de conversaciones
  const filteredConversations = conversations.filter((c) => {
    if (filterStatus === 'AI_HANDLED' && c.status !== 'AI_HANDLED') return false;
    if (filterStatus === 'HUMAN_TAKEOVER' && c.status !== 'HUMAN_TAKEOVER') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const phoneMatch = c.channelConversationId?.toLowerCase().includes(q);
      const textMatch = c.lastMessagePreview?.toLowerCase().includes(q);
      return phoneMatch || textMatch;
    }
    return true;
  });

  const aiActiveCount = conversations.filter((c) => c.status === 'AI_HANDLED').length;
  const humanTakeoverCount = conversations.filter((c) => c.status === 'HUMAN_TAKEOVER').length;

  return (
    <View style={styles.container}>
      {/* Header Corporativo Material 3 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrapper}>
            <MessageSquare color="#1A73E8" size={24} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Chats & Control de IA 24/7</Text>
            <Text style={styles.headerSubtitle}>
              Supervisa las conversaciones de WhatsApp en tiempo real y reactiva el bot con un solo clic.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            refetch();
            if (selectedChatId) refetchMessages();
          }}
          disabled={isRefetching}
        >
          <RefreshCw size={16} color="#1A73E8" style={isRefetching ? styles.rotating : undefined} />
          <Text style={styles.refreshButtonText}>
            {isRefetching ? 'Actualizando...' : 'Actualizar'}
          </Text>
        </TouchableOpacity>
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
            <Text style={styles.statLabel}>🟡 Pausa Humana / Operador</Text>
            <View style={styles.humanPill}>
              <Text style={styles.humanPillText}>Atención Manual</Text>
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

      {/* Cuerpo Principal Dividido (Split Layout) */}
      <View style={[styles.contentLayout, !isDesktop && styles.contentLayoutMobile]}>
        {/* Columna Izquierda: Lista de Chats */}
        <View style={[styles.chatListPanel, !isDesktop && styles.chatListPanelMobile]}>
          {/* Barra de Búsqueda y Filtros */}
          <View style={styles.searchBarContainer}>
            <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por teléfono o mensaje..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

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
                  A medida que los clientes escriban a tu WhatsApp conectado, los chats aparecerán aquí automáticamente.
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
                    onPress={() => setSelectedChatId(conv.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.chatCardHeader}>
                      <View style={styles.chatCardTitleRow}>
                        <View style={[styles.avatar, isAi ? styles.avatarAi : styles.avatarHuman]}>
                          {isAi ? (
                            <Bot size={16} color="#059669" />
                          ) : (
                            <User size={16} color="#D97706" />
                          )}
                        </View>
                        <Text style={styles.chatPhone}>
                          {conv.channelConversationId || 'Cliente WhatsApp'}
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

        {/* Columna Derecha: Detalle del Chat Seleccionado & Control de IA */}
        <View style={styles.chatDetailPanel}>
          {selectedChat ? (
            <View style={styles.detailContainer}>
              {/* Barra Superior del Chat Seleccionado */}
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.detailPhone}>
                      {selectedChat.channelConversationId}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedChat.status === 'AI_HANDLED'
                          ? styles.statusBadgeAi
                          : styles.statusBadgeHuman
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedChat.status === 'AI_HANDLED'
                            ? styles.statusBadgeTextAi
                            : styles.statusBadgeTextHuman
                        ]}
                      >
                        {selectedChat.status === 'AI_HANDLED'
                          ? '🟢 IA Activa (Respondiendo)'
                          : '🟡 En Pausa Humana (Operador)'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailSubtext}>
                    Canal: WhatsApp Web QR • {selectedChat.messagesCount || 0} mensajes registrados
                  </Text>
                </View>

                {/* BOTÓN CLAVE: Reactivar IA o Pausar */}
                <View style={styles.actionButtons}>
                  {selectedChat.status === 'HUMAN_TAKEOVER' ? (
                    <TouchableOpacity
                      style={styles.resumeButton}
                      onPress={() => resumeMutation.mutate(selectedChat.id)}
                      disabled={resumeMutation.isPending}
                    >
                      {resumeMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                      )}
                      <Text style={styles.resumeButtonText}>
                        Reactivar Modo IA
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.pauseButton}
                      onPress={() => pauseMutation.mutate(selectedChat.id)}
                      disabled={pauseMutation.isPending}
                    >
                      {pauseMutation.isPending ? (
                        <ActivityIndicator size="small" color="#B45309" />
                      ) : (
                        <Pause size={16} color="#B45309" />
                      )}
                      <Text style={styles.pauseButtonText}>
                        Pausar IA (Atención Humana)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Mensajes del Chat */}
              <ScrollView style={styles.messagesScroll} contentContainerStyle={styles.messagesContent}>
                {isLoadingMessages ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#1A73E8" />
                    <Text style={styles.loadingText}>Cargando mensajes del chat...</Text>
                  </View>
                ) : messages.length === 0 ? (
                  <View style={styles.emptyMessages}>
                    <Text style={styles.emptyMessagesText}>
                      No hay mensajes registrados aún para esta conversación.
                    </Text>
                  </View>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageRow,
                          isUser ? styles.messageRowUser : styles.messageRowAi
                        ]}
                      >
                        <View
                          style={[
                            styles.messageBubble,
                            isUser ? styles.messageBubbleUser : styles.messageBubbleAi
                          ]}
                        >
                          <View style={styles.messageSenderHeader}>
                            {isUser ? (
                              <User size={12} color="#475569" style={{ marginRight: 4 }} />
                            ) : (
                              <Bot size={12} color="#1A73E8" style={{ marginRight: 4 }} />
                            )}
                            <Text style={isUser ? styles.senderLabelUser : styles.senderLabelAi}>
                              {isUser ? 'Cliente' : 'TurnoFlow AI (Recepcionista)'}
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
                          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAi]}>
                            {msg.content}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noChatSelected}>
              <MessageSquare size={48} color="#94A3B8" />
              <Text style={styles.noChatTitle}>Selecciona una conversación</Text>
              <Text style={styles.noChatText}>
                Elige un chat de la lista izquierda para consultar los mensajes y activar o pausar la atención con IA.
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
    backgroundColor: '#F8FAFC',
    padding: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  headerIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A73E8'
  },
  rotating: {
    opacity: 0.6
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginVertical: 4
  },
  statHint: {
    fontSize: 12,
    color: '#94A3B8'
  },
  activePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  },
  humanPill: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  humanPillText: {
    fontSize: 11,
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
    padding: 12,
    marginBottom: 16
  },
  alertBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46'
  },
  contentLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 20
  },
  contentLayoutMobile: {
    flexDirection: 'column'
  },
  chatListPanel: {
    width: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    display: 'flex'
  },
  chatListPanelMobile: {
    width: '100%',
    height: 300
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#0F172A'
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    gap: 8
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontSize: 11,
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
    lineHeight: 17,
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
  detailContainer: {
    flex: 1
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA'
  },
  detailPhone: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A'
  },
  detailSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A73E8',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  resumeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  pauseButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309'
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  messagesContent: {
    padding: 16,
    gap: 12
  },
  messageRow: {
    flexDirection: 'row'
  },
  messageRowUser: {
    justifyContent: 'flex-start'
  },
  messageRowAi: {
    justifyContent: 'flex-end'
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
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
  messageTime: {
    fontSize: 10,
    color: '#94A3B8'
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20
  },
  messageTextUser: {
    color: '#0F172A'
  },
  messageTextAi: {
    color: '#1E3A8A'
  },
  noChatSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  noChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16
  },
  noChatText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 340,
    marginTop: 6
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12
  },
  emptyStateText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4
  },
  emptyMessages: {
    padding: 32,
    alignItems: 'center'
  },
  emptyMessagesText: {
    fontSize: 13,
    color: '#94A3B8'
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B'
  }
});
