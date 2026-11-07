import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch
} from 'react-native';
import { Header } from '../src/components/Header';
import {
  Workflow,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  ExternalLink,
  Zap
} from 'lucide-react-native';
import { DEMO_AUTOMATIONS } from '../src/lib/api';

export default function AutomationsScreen() {
  const [workflows, setWorkflows] = useState(DEMO_AUTOMATIONS);

  const toggleWorkflow = (id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => (wf.id === id ? { ...wf, isActive: !wf.isActive } : wf))
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Automatizaciones & Flujos n8n"
        subtitle="Monitoreo en vivo de los 5 flujos orquestados para WhatsApp, CRM y Agenda"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.n8nBanner}>
          <View style={styles.n8nIcon}>
            <Zap size={20} color="#f97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Motor de Automatización n8n Conectado</Text>
            <Text style={styles.bannerText}>
              Los webhooks procesan solicitudes de Meta WhatsApp Cloud API y disparan eventos idempotentes en la API de TurnoFlow.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>WORKFLOWS OPERATIVOS EN PRODUCCIÓN</Text>

        <View style={styles.list}>
          {workflows.map((wf) => (
            <View key={wf.id} style={styles.wfCard}>
              <View style={styles.wfHeader}>
                <View style={styles.wfIconBg}>
                  <Workflow size={18} color={wf.isActive ? '#a855f7' : '#71717a'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wfName}>{wf.name}</Text>
                  <Text style={styles.wfType}>Archivo: automations/{wf.type}.json</Text>
                </View>

                <View style={styles.switchWrapper}>
                  <Text style={[styles.switchLabel, { color: wf.isActive ? '#4ade80' : '#71717a' }]}>
                    {wf.isActive ? 'ACTIVO' : 'PAUSADO'}
                  </Text>
                  <Switch
                    value={wf.isActive}
                    onValueChange={() => toggleWorkflow(wf.id)}
                    trackColor={{ false: '#27272a', true: '#9333ea' }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{wf.totalRuns}</Text>
                  <Text style={styles.statLabel}>Ejecuciones Totales</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#4ade80' }]}>{wf.successRuns}</Text>
                  <Text style={styles.statLabel}>Exitosas (100%)</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: wf.failedRuns > 0 ? '#f87171' : '#71717a' }]}>
                    {wf.failedRuns}
                  </Text>
                  <Text style={styles.statLabel}>Fallidas</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{wf.lastRunAt}</Text>
                  <Text style={styles.statLabel}>Último Disparo</Text>
                </View>
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
  scroll: {
    flex: 1
  },
  content: {
    padding: 28,
    maxWidth: 960
  },
  n8nBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
    gap: 14
  },
  n8nIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  bannerText: {
    color: '#a1a1aa',
    fontSize: 11,
    marginTop: 2
  },
  sectionHeader: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 14
  },
  list: {
    gap: 14
  },
  wfCard: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 18
  },
  wfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    paddingBottom: 14
  },
  wfIconBg: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  wfName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  wfType: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace'
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  switchLabel: {
    fontSize: 11,
    fontWeight: '700'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8
  },
  statBox: {
    alignItems: 'center'
  },
  statValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  statLabel: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 2
  }
});
