import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal
} from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import {
  Menu,
  X,
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  Sparkles,
  BookOpen,
  Bot,
  Workflow,
  Smartphone,
  HelpCircle,
  Building2,
  LogOut,
  ChevronRight
} from 'lucide-react-native';
import { Sidebar } from '../src/components/Sidebar';
import { AuthProvider, useAuth } from '../src/lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

const ALL_NAV_ITEMS = [
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

function AuthenticatedShell() {
  const { user, isLoading, logout } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isDesktop = width >= 768;
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    if (!user && !isLoginPage) {
      router.replace('/login');
    } else if (user && isLoginPage) {
      router.replace('/');
    }
  }, [user, isLoading, isLoginPage, isMounted, router]);

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const navigateTo = (path: string) => {
    setIsDrawerOpen(false);
    router.push(path as any);
  };

  return (
    <View style={styles.container}>
      {/* Sidebar tradicional para pantallas medianas / grandes */}
      {user && isDesktop && !isLoginPage && <Sidebar />}

      {/* Contenedor principal */}
      <View style={styles.contentArea}>
        {/* Header móvil superior */}
        {user && !isDesktop && !isLoginPage && (
          <View style={styles.mobileTopBar}>
            <TouchableOpacity
              style={styles.mobileBrand}
              onPress={() => router.push('/')}
              activeOpacity={0.8}
            >
              <View style={styles.mobileLogoBadge}>
                <Sparkles color="#1A73E8" size={16} />
              </View>
              <View>
                <Text style={styles.mobileBrandTitle}>TurnoFlow AI</Text>
                <Text style={styles.mobileBrandSub} numberOfLines={1}>
                  {user.organizationName || 'Recepción 24/7'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mobileMenuButton}
              onPress={() => setIsDrawerOpen(!isDrawerOpen)}
              activeOpacity={0.7}
            >
              {isDrawerOpen ? <X size={22} color="#0F172A" /> : <Menu size={22} color="#0F172A" />}
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1a73e8" />
            <Text style={styles.loadingText}>Cargando TurnoFlow AI...</Text>
          </View>
        )}

        {/* Vista activa */}
        <View style={styles.slotWrapper}>
          <Slot />
        </View>

        {/* Barra de navegación inferior para móvil */}
        {user && !isDesktop && !isLoginPage && (
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={styles.bottomNavItem}
              onPress={() => navigateTo('/')}
              activeOpacity={0.7}
            >
              <LayoutDashboard
                size={20}
                color={pathname === '/' ? '#1A73E8' : '#64748B'}
              />
              <Text
                style={[
                  styles.bottomNavLabel,
                  pathname === '/' && styles.bottomNavLabelActive
                ]}
              >
                Inicio
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomNavItem}
              onPress={() => navigateTo('/chats')}
              activeOpacity={0.7}
            >
              <MessageSquare
                size={20}
                color={pathname.startsWith('/chats') ? '#1A73E8' : '#64748B'}
              />
              <Text
                style={[
                  styles.bottomNavLabel,
                  pathname.startsWith('/chats') && styles.bottomNavLabelActive
                ]}
              >
                Chats
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomNavItem}
              onPress={() => navigateTo('/appointments')}
              activeOpacity={0.7}
            >
              <Calendar
                size={20}
                color={pathname.startsWith('/appointments') ? '#1A73E8' : '#64748B'}
              />
              <Text
                style={[
                  styles.bottomNavLabel,
                  pathname.startsWith('/appointments') && styles.bottomNavLabelActive
                ]}
              >
                Agenda
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomNavItem}
              onPress={() => navigateTo('/leads')}
              activeOpacity={0.7}
            >
              <Users
                size={20}
                color={pathname.startsWith('/leads') ? '#1A73E8' : '#64748B'}
              />
              <Text
                style={[
                  styles.bottomNavLabel,
                  pathname.startsWith('/leads') && styles.bottomNavLabelActive
                ]}
              >
                Clientes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomNavItem}
              onPress={() => setIsDrawerOpen(true)}
              activeOpacity={0.7}
            >
              <Menu
                size={20}
                color={isDrawerOpen ? '#1A73E8' : '#64748B'}
              />
              <Text
                style={[
                  styles.bottomNavLabel,
                  isDrawerOpen && styles.bottomNavLabelActive
                ]}
              >
                Menú
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modal Drawer Completo para Móvil */}
        <Modal
          visible={isDrawerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsDrawerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsDrawerOpen(false)}
            />
            <View style={styles.drawerCard}>
              <View style={styles.drawerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.mobileLogoBadge}>
                    <Sparkles color="#1A73E8" size={18} />
                  </View>
                  <View>
                    <Text style={styles.drawerBrandTitle}>TurnoFlow AI</Text>
                    <Text style={styles.drawerBrandSub} numberOfLines={1}>
                      {user?.organizationName}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setIsDrawerOpen(false)}
                  style={styles.drawerCloseBtn}
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
                <Text style={styles.drawerSectionTitle}>MENÚ DEL SISTEMA</Text>
                {ALL_NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.path ||
                    (item.path !== '/' && pathname.startsWith(item.path));
                  const Icon = item.icon;

                  return (
                    <TouchableOpacity
                      key={item.path}
                      style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                      onPress={() => navigateTo(item.path)}
                      activeOpacity={0.7}
                    >
                      <Icon
                        size={18}
                        color={isActive ? '#1A73E8' : '#64748B'}
                        style={{ marginRight: 12 }}
                      />
                      <Text
                        style={[
                          styles.drawerItemLabel,
                          isActive && styles.drawerItemLabelActive
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isActive && <ChevronRight size={16} color="#1A73E8" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Footer Drawer */}
              {user && (
                <View style={styles.drawerFooter}>
                  <View style={styles.drawerUserRow}>
                    <Building2 size={14} color="#1A73E8" style={{ marginRight: 6 }} />
                    <Text style={styles.drawerUserEmail} numberOfLines={1}>
                      {user.email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.drawerLogoutBtn}
                    onPress={() => {
                      setIsDrawerOpen(false);
                      logout();
                    }}
                  >
                    <LogOut size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.drawerLogoutText}>Cerrar Sesión</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <AuthenticatedShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    minHeight: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    position: 'relative'
  },
  slotWrapper: {
    flex: 1
  },
  mobileTopBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10
  },
  mobileBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  mobileLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  mobileBrandTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  mobileBrandSub: {
    fontSize: 11,
    color: '#64748B'
  },
  mobileMenuButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bottomNav: {
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6
  },
  bottomNavLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500'
  },
  bottomNavLabelActive: {
    color: '#1A73E8',
    fontWeight: '700'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flexDirection: 'row'
  },
  modalOverlay: {
    flex: 1
  },
  drawerCard: {
    width: 290,
    backgroundColor: '#FFFFFF',
    height: '100%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  drawerBrandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  drawerBrandSub: {
    fontSize: 12,
    color: '#64748B'
  },
  drawerCloseBtn: {
    padding: 6
  },
  drawerMenu: {
    flex: 1,
    marginTop: 12
  },
  drawerSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4
  },
  drawerItemActive: {
    backgroundColor: '#EFF6FF'
  },
  drawerItemLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    flex: 1
  },
  drawerItemLabelActive: {
    color: '#1A73E8',
    fontWeight: '700'
  },
  drawerFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  drawerUserEmail: {
    fontSize: 12,
    color: '#64748B'
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    borderRadius: 8
  },
  drawerLogoutText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  loadingText: {
    color: '#475569',
    fontSize: 13,
    marginTop: 12
  }
});
