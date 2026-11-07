import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: number;
  icon: LucideIcon;
  iconColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon: Icon,
  iconColor = '#a855f7'
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.iconWrapper, { backgroundColor: `${iconColor}15` }]}>
          <Icon size={16} color={iconColor} />
        </View>
      </View>

      <Text style={styles.value}>{value}</Text>

      <View style={styles.footerRow}>
        {trend !== undefined && (
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>+{trend}%</Text>
          </View>
        )}
        {subtext && <Text style={styles.subtext}>{subtext}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 18
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  label: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500'
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  value: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  trendBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  trendText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700'
  },
  subtext: {
    color: '#71717a',
    fontSize: 11
  }
});
