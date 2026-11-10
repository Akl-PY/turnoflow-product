import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Text
} from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
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

function AuthenticatedShell() {
  const { user, isLoading } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
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

  return (
    <View style={styles.container}>
      {user && isDesktop && !isLoginPage && <Sidebar />}
      <View style={styles.contentArea}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#a855f7" />
            <Text style={styles.loadingText}>Verificando sesión en TurnoFlow AI...</Text>
          </View>
        )}
        <Slot />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthenticatedShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#09090b',
    minHeight: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#09090b',
    overflow: 'hidden',
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    position: 'relative'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 13,
    marginTop: 12
  }
});
