import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Phone, Download } from 'lucide-react-native';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.actions}>
        {/* Connection Status Pill */}
        <View style={styles.statusPill}>
          <View style={styles.pulseDot} />
          <Phone size={12} color="#22c55e" style={{ marginRight: 4 }} />
          <Text style={styles.statusText}>WhatsApp IA 24/7</Text>
        </View>

        {/* Playground Quick Button */}
        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={() => router.push('/playground')}
        >
          <Sparkles size={14} color="#c084fc" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnSecondaryText}>Probar Agentes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#09090b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  subtitle: {
    color: '#71717a',
    fontSize: 12
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 6
  },
  statusText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '500'
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7
  },
  actionBtnSecondaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500'
  }
});
