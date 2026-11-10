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
  HelpCircle,
  ShieldCheck,
  LogOut,
  Building2,
  Smartphone,
  MessageSquare
} from 'lucide-react-native';
import { useAuth } from '../lib/auth';

const NAV_ITEMS = [
  { path: '/', label: 'Panel Ejecutivo', icon: LayoutDashboard },
  { path: '/chats', label: 'Chats & Control IA', icon: MessageSquare },
  { path: '/guide', label: 'Cómo Funciona', icon: HelpCircle },
  { path: '/leads', label: 'Clientes & Leads', icon: Users },
  { path: '/appointments', label: 'Agenda & Citas', icon: Calendar },
  { path: '/knowledge-base', label: 'Servicios & Tarifas', icon: BookOpen },
  { path: '/agents', label: 'Agentes de IA', icon: Bot },
  { path: '/automations', label: 'Automatizaciones', icon: Workflow },
  { path: '/playground', label: 'Simulador en Vivo', icon: Sparkles },
  { path: '/onboarding', label: 'WhatsApp & Scalinky', icon: Smartphone }
];

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Sparkles color="#1a73e8" size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandTitle}>TurnoFlow AI</Text>
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            {user?.organizationName || 'Recepción 24/7'}
          </Text>
        </View>
      </View>

      {/* Nav Menu */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>GESTIÓN DEL SALÓN</Text>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
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
                color={isActive ? '#1a73e8' : '#64748b'}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {item.path === '/guide' && (
                <View style={styles.guideBadge}>
                  <Text style={styles.guideBadgeText}>GUÍA</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Info & Active User */}
      <View style={styles.footer}>
        {user && (
          <View style={styles.userCard}>
            <View style={styles.userHeader}>
              <Building2 size={13} color="#1a73e8" style={{ marginRight: 6 }} />
              <Text style={styles.orgNameText} numberOfLines={1}>
                {user.organizationName}
              </Text>
            </View>
            <Text style={styles.userEmailText} numberOfLines={1}>
              {user.email}
            </Text>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                logout();
                router.replace('/login');
              }}
            >
              <LogOut size={12} color="#dc2626" style={{ marginRight: 6 }} />
              <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.securityRow}>
          <ShieldCheck color="#16a34a" size={14} />
          <Text style={styles.securityText}>Empresarial y Seguro</Text>
        </View>
        <Text style={styles.versionText}>TurnoFlow v1.0 • Google Material</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
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
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(26, 115, 232, 0.25)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  brandSubtitle: {
    color: '#64748b',
    fontSize: 11
  },
  menuContainer: {
    flex: 1
  },
  sectionHeader: {
    color: '#94a3b8',
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
    borderRadius: 8,
    marginBottom: 3
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  navIcon: {
    marginRight: 10
  },
  navLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },
  navLabelActive: {
    color: '#1a73e8',
    fontWeight: '700'
  },
  guideBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  guideBadgeText: {
    color: '#1e40af',
    fontSize: 9,
    fontWeight: '700'
  },
  footer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 4
  },
  userCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  orgNameText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  },
  userEmailText: {
    color: '#64748b',
    fontSize: 10,
    marginBottom: 8
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 6,
    paddingVertical: 5
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600'
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  securityText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '600'
  },
  versionText: {
    color: '#94a3b8',
    fontSize: 10
  }
});