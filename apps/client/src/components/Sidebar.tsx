import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  LayoutDashboard,
  Bot,
  Users,
  Calendar,
  BookOpen,
  Workflow,
  Sparkles,
  Settings,
  ShieldCheck,
  LogOut
} from 'lucide-react-native';
import { authStorage } from '../lib/auth';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads & CRM', icon: Users },
  { path: '/appointments', label: 'Agenda & Citas', icon: Calendar },
  { path: '/knowledge-base', label: 'Base de Conocimiento', icon: BookOpen },
  { path: '/agents', label: 'Agentes de IA', icon: Bot },
  { path: '/automations', label: 'Automatizaciones n8n', icon: Workflow },
  { path: '/playground', label: 'Playground IA', icon: Sparkles },
  { path: '/onboarding', label: 'Configuración Negocio', icon: Settings }
];

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Sparkles color="#a855f7" size={18} />
        </View>
        <View>
          <Text style={styles.brandTitle}>TurnoFlow AI</Text>
          <Text style={styles.brandSubtitle}>Recepción 24/7</Text>
        </View>
      </View>

      {/* Nav Menu */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>PLATAFORMA</Text>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <Icon
                size={18}
                color={isActive ? '#ffffff' : '#71717a'}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {item.path === '/playground' && (
                <View style={styles.pillBadge}>
                  <Text style={styles.pillText}>TEST</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Info */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            authStorage.logout();
            router.replace('/login');
          }}
        >
          <LogOut color="#f87171" size={14} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
        </TouchableOpacity>
        <View style={styles.securityRow}>
          <ShieldCheck color="#22c55e" size={14} />
          <Text style={styles.securityText}>Multi-Tenant Seguro</Text>
        </View>
        <Text style={styles.versionText}>v1.0.0 Production Ready</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: '#09090b',
    borderRightWidth: 1,
    borderRightColor: '#27272a',
    paddingVertical: 18,
    paddingHorizontal: 14,
    height: '100%'
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 26
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  brandSubtitle: {
    color: '#a1a1aa',
    fontSize: 11
  },
  menuContainer: {
    flex: 1
  },
  sectionHeader: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    marginBottom: 8
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 7,
    marginBottom: 3
  },
  navItemActive: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a'
  },
  navIcon: {
    marginRight: 10
  },
  navLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '600'
  },
  pillBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  pillText: {
    color: '#c084fc',
    fontSize: 9,
    fontWeight: '700'
  },
  footer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    paddingHorizontal: 8
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginBottom: 12
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600'
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  securityText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '500'
  },
  versionText: {
    color: '#52525b',
    fontSize: 10
  }
});
