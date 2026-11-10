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
          <Sparkles size={14} color="#1a73e8" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnSecondaryText}>Probar Simulador</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  subtitle: {
    color: '#64748b',
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
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 6
  },
  statusText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '600'
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  actionBtnSecondaryText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '600'
  }
});
