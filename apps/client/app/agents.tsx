import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Header } from '../src/components/Header';
import { Bot, Cpu, Sparkles, Check, Save, CheckCircle, ShieldCheck } from 'lucide-react-native';
import { apiClient, DEMO_AGENTS } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function AgentsScreen() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>(DEMO_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(DEMO_AGENTS[0].id);
  const [savedBanner, setSavedBanner] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
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
      // offline fallback
    } finally {
      setSaving(false);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2500);
    }
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
        title="Módulos del Asistente Virtual"
        subtitle="Especializaciones de la IA para recepcionar, cotizar, agendar turnos y avisar al dueño"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {savedBanner && (
          <View style={styles.savedBanner}>
            <CheckCircle size={16} color="#16A34A" style={{ marginRight: 8 }} />
            <Text style={styles.savedBannerText}>
              ¡Configuración guardada! El asistente responderá aplicando estos ajustes.
            </Text>
          </View>
        )}

        <View style={styles.layoutGrid}>
          {/* Columna Izquierda: Lista de Módulos */}
          <View style={styles.agentsListCard}>
            <Text style={styles.listHeaderTitle}>Especialidades Activas</Text>
            {agents.map((ag) => {
              const isSelected = ag.id === selectedAgentId;
              return (
                <TouchableOpacity
                  key={ag.id}
                  style={[styles.agentItem, isSelected && styles.agentItemActive]}
                  onPress={() => setSelectedAgentId(ag.id)}
                >
                  <View style={styles.agentItemTop}>
                    <View style={styles.agentItemIcon}>
                      <Bot size={16} color={isSelected ? '#1A73E8' : '#64748B'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.agentItemName, isSelected && styles.agentItemNameActive]}>
                        {ag.name}
                      </Text>
                      <Text style={styles.agentItemRole}>{ag.role}</Text>
                    </View>
                    <Switch
                      value={ag.isActive}
                      onValueChange={() => toggleAgent(ag.id)}
                      trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                      thumbColor={ag.isActive ? '#1A73E8' : '#94A3B8'}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Columna Derecha: Detalles del Módulo Seleccionado */}
          <View style={styles.agentDetailCard}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailTitle}>{selectedAgent.name}</Text>
                <Text style={styles.detailRole}>Rol operativo: {selectedAgent.role}</Text>
              </View>
              <View style={[styles.statusBadge, selectedAgent.isActive ? styles.bgSuccess : styles.bgMuted]}>
                <Text style={[styles.statusText, selectedAgent.isActive ? styles.textSuccess : styles.textMuted]}>
                  {selectedAgent.isActive ? 'Módulo Activo' : 'En Pausa'}
                </Text>
              </View>
            </View>

            {/* Selector de Motor de IA */}
            <Text style={styles.fieldLabel}>Motor de Inteligencia Artificial</Text>
            <View style={styles.providerRow}>
              {[
                { id: 'gemini', name: 'Google Gemini 2.5 Flash', desc: 'Rápido y optimizado (Recomendado)' },
                { id: 'anthropic', name: 'Claude 3.5 Sonnet', desc: 'Máxima empatía y lenguaje natural' },
                { id: 'openai', name: 'OpenAI GPT-4o', desc: 'Versátil para consultas complejas' }
              ].map((p) => {
                const isActive = selectedAgent.provider === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.providerCard, isActive && styles.providerCardActive]}
                    onPress={() => updateProvider(p.id as any)}
                  >
                    <Text style={[styles.providerName, isActive && styles.providerNameActive]}>
                      {p.name}
                    </Text>
                    <Text style={styles.providerDesc}>{p.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Prompt de Instrucciones */}
            <Text style={styles.fieldLabel}>Instrucciones de Personalidad y Protocolo</Text>
            <TextInput
              style={[styles.input, styles.promptInput]}
              multiline
              value={selectedAgent.systemPrompt}
              onChangeText={(txt) => updateSelectedField('systemPrompt', txt)}
            />

            {/* Botón Guardar */}
            <TouchableOpacity
              style={styles.saveAgentBtn}
              onPress={() => persistAgentChange(selectedAgent)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Save size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveAgentBtnText}>Guardar Ajustes de este Módulo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  savedBannerText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600'
  },
  layoutGrid: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap'
  },
  agentsListCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        } as any)
      : { elevation: 2 })
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  agentItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  agentItemActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#1A73E8'
  },
  agentItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  agentItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  agentItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  agentItemNameActive: {
    color: '#1A73E8'
  },
  agentItemRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  agentDetailCard: {
    flex: 1.8,
    minWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        } as any)
      : { elevation: 2 })
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  detailRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  bgSuccess: {
    backgroundColor: '#DCFCE7'
  },
  bgMuted: {
    backgroundColor: '#F1F5F9'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  textSuccess: {
    color: '#16A34A'
  },
  textMuted: {
    color: '#64748B'
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 16
  },
  providerRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  providerCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12
  },
  providerCardActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#1A73E8'
  },
  providerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  providerNameActive: {
    color: '#1A73E8'
  },
  providerDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0F172A'
  },
  promptInput: {
    height: 160,
    textAlignVertical: 'top'
  },
  saveAgentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20
  },
  saveAgentBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  }
});
