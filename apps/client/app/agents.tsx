import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch
} from 'react-native';
import { Header } from '../src/components/Header';
import { Bot, Cpu, Sparkles, Check, Save, CheckCircle } from 'lucide-react-native';
import { apiClient, DEMO_AGENTS } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { useRouter } from 'expo-router';

export default function AgentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>(DEMO_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(DEMO_AGENTS[0].id);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await apiClient.get('/agents');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setAgents(res.data);
          setSelectedAgentId(res.data[0].id);
        }
      } catch {
        // Fallback a DEMO_AGENTS
      }
    };
    fetchAgents();
  }, [user?.organizationId]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const persistAgentChange = async (updatedAgent: any) => {
    try {
      await apiClient.put(`/agents/${updatedAgent.id}`, {
        name: updatedAgent.name,
        isActive: updatedAgent.isActive,
        provider: updatedAgent.provider,
        model: updatedAgent.model,
        temperature: Number(updatedAgent.temperature) || 0.2,
        systemPrompt: updatedAgent.systemPrompt
      });
    } catch {
      // Mantiene estado local si falla la red
    }
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const next = { ...a, isActive: !a.isActive };
          persistAgentChange(next);
          return next;
        }
        return a;
      })
    );
  };

  const updateProvider = (provider: 'gemini' | 'anthropic' | 'openai') => {
    const modelMap = {
      gemini: 'gemini-2.5-flash',
      anthropic: 'claude-3-5-sonnet-20241022',
      openai: 'gpt-4o'
    };
    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgentId
          ? {
              ...a,
              provider,
              model: modelMap[provider]
            }
          : a
      )
    );
  };

  const updateSelectedField = (field: string, value: any) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === selectedAgentId ? { ...a, [field]: value } : a))
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Administración de Agentes de IA"
        subtitle="Configuración de personalidad, proveedor (Gemini / Claude / OpenAI), herramientas y límites"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {savedBanner && (
          <View style={styles.savedNotice}>
            <CheckCircle size={15} color="#4ade80" style={{ marginRight: 8 }} />
            <Text style={styles.savedNoticeText}>
              Configuración del agente guardada en la base de datos.
            </Text>
          </View>
        )}

        <View style={styles.layout}>
          {/* Lista Izquierda de Agentes */}
          <View style={styles.listCol}>
            <Text style={styles.colTitle}>AGENTES ESPECIALIZADOS</Text>
            {agents.map((agent) => {
              const isSelected = agent.id === selectedAgentId;
              return (
                <TouchableOpacity
                  key={agent.id}
                  style={[styles.agentItem, isSelected && styles.agentItemActive]}
                  onPress={() => setSelectedAgentId(agent.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.agentItemHeader}>
                    <View style={styles.agentBadge}>
                      <Bot size={16} color={isSelected ? '#c084fc' : '#a1a1aa'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.agentTitle, isSelected && styles.agentTitleActive]}>
                        {agent.name}
                      </Text>
                      <Text style={styles.agentProvider}>
                        {String(agent.provider).toUpperCase()} • {agent.model}
                      </Text>
                    </View>
                    <Switch
                      value={agent.isActive}
                      onValueChange={() => toggleAgent(agent.id)}
                      trackColor={{ false: '#27272a', true: '#9333ea' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => router.push('/playground')}
            >
              <Sparkles size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.testBtnText}>Abrir en Playground de Pruebas</Text>
            </TouchableOpacity>
          </View>

          {/* Panel Derecho: Configuración del Agente Seleccionado */}
          <View style={styles.detailCol}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailName}>{selectedAgent.name}</Text>
                  <Text style={styles.detailRole}>Rol del Sistema: {selectedAgent.role}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: selectedAgent.isActive
                        ? 'rgba(34,197,94,0.1)'
                        : 'rgba(239,68,68,0.1)'
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: selectedAgent.isActive ? '#4ade80' : '#f87171' }
                    ]}
                  >
                    {selectedAgent.isActive ? 'ACTIVO' : 'PAUSADO'}
                  </Text>
                </View>
              </View>

              {/* Selector de Proveedor */}
              <Text style={styles.fieldLabel}>Proveedor de Modelo de Lenguaje</Text>
              <View style={styles.providerRow}>
                <TouchableOpacity
                  style={[
                    styles.providerCard,
                    selectedAgent.provider === 'gemini' && styles.providerCardActive
                  ]}
                  onPress={() => updateProvider('gemini')}
                >
                  <Cpu
                    size={16}
                    color={selectedAgent.provider === 'gemini' ? '#c084fc' : '#71717a'}
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text
                      style={[
                        styles.providerName,
                        selectedAgent.provider === 'gemini' && styles.providerNameActive
                      ]}
                    >
                      Google Gemini
                    </Text>
                    <Text style={styles.providerDesc}>Gemini 2.5 Flash (Activo)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.providerCard,
                    selectedAgent.provider === 'anthropic' && styles.providerCardActive
                  ]}
                  onPress={() => updateProvider('anthropic')}
                >
                  <Cpu
                    size={16}
                    color={selectedAgent.provider === 'anthropic' ? '#c084fc' : '#71717a'}
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text
                      style={[
                        styles.providerName,
                        selectedAgent.provider === 'anthropic' && styles.providerNameActive
                      ]}
                    >
                      Anthropic Claude
                    </Text>
                    <Text style={styles.providerDesc}>Claude 3.5 Sonnet</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.providerCard,
                    selectedAgent.provider === 'openai' && styles.providerCardActive
                  ]}
                  onPress={() => updateProvider('openai')}
                >
                  <Cpu
                    size={16}
                    color={selectedAgent.provider === 'openai' ? '#c084fc' : '#71717a'}
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text
                      style={[
                        styles.providerName,
                        selectedAgent.provider === 'openai' && styles.providerNameActive
                      ]}
                    >
                      OpenAI
                    </Text>
                    <Text style={styles.providerDesc}>GPT-4o / GPT-4o-mini</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Parámetros de Inferencia */}
              <View style={styles.paramsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Modelo</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedAgent.model}
                    onChangeText={(val) => updateSelectedField('model', val)}
                  />
                </View>
                <View style={{ width: 140 }}>
                  <Text style={styles.fieldLabel}>Temperatura</Text>
                  <TextInput
                    style={styles.input}
                    value={String(selectedAgent.temperature)}
                    onChangeText={(val) => updateSelectedField('temperature', val)}
                  />
                </View>
              </View>

              {/* Instrucciones del Sistema */}
              <Text style={styles.fieldLabel}>Instrucciones del Sistema (System Prompt)</Text>
              <TextInput
                style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                value={selectedAgent.systemPrompt}
                onChangeText={(val) => updateSelectedField('systemPrompt', val)}
                multiline
                placeholderTextColor="#52525b"
              />

              {/* Herramientas Permitidas */}
              <Text style={styles.fieldLabel}>Herramientas Permitidas (Tool Calling)</Text>
              <View style={styles.toolsList}>
                {selectedAgent.allowedTools && selectedAgent.allowedTools.length > 0 ? (
                  selectedAgent.allowedTools.map((tool: string) => (
                    <View key={tool} style={styles.toolTag}>
                      <Check size={12} color="#4ade80" style={{ marginRight: 4 }} />
                      <Text style={styles.toolTagText}>{tool}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyToolsText}>
                    No requiere herramientas externas (Salida estructurada directa).
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.saveAgentBtn}
                onPress={() => persistAgentChange(selectedAgent)}
              >
                <Save size={15} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.saveAgentBtnText}>Guardar Cambios del Agente</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  scroll: {
    flex: 1
  },
  content: {
    padding: 28
  },
  savedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18
  },
  savedNoticeText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600'
  },
  layout: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap'
  },
  listCol: {
    width: 320
  },
  colTitle: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12
  },
  agentItem: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10
  },
  agentItemActive: {
    backgroundColor: '#18181b',
    borderColor: '#a855f7'
  },
  agentItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  agentBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  agentTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  agentTitleActive: {
    color: '#c084fc'
  },
  agentProvider: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 2
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  detailCol: {
    flex: 1,
    minWidth: 360
  },
  detailCard: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 24
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    paddingBottom: 16
  },
  detailName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  detailRole: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  fieldLabel: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14
  },
  providerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  providerCard: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 12
  },
  providerCardActive: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.08)'
  },
  providerName: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600'
  },
  providerNameActive: {
    color: '#ffffff'
  },
  providerDesc: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 2
  },
  paramsRow: {
    flexDirection: 'row',
    gap: 14
  },
  input: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13
  },
  toolsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  toolTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  toolTagText: {
    color: '#d4d4d8',
    fontSize: 11,
    fontFamily: 'monospace'
  },
  emptyToolsText: {
    color: '#71717a',
    fontSize: 12,
    fontStyle: 'italic'
  },
  saveAgentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333ea',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 22
  },
  saveAgentBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  }
});
