import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Sidebar } from '../src/components/Sidebar';
import { authStorage } from '../src/lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const isAuth = authStorage.isAuthenticated();
    if (!isAuth && !isLoginPage) {
      router.replace('/login');
    } else if (isAuth && isLoginPage) {
      router.replace('/');
    }
    setAuthChecked(true);
  }, [pathname]);

  if (!authChecked && !isLoginPage) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  if (isLoginPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <Slot />
        </View>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <View style={styles.container}>
        {isDesktop && <Sidebar />}
        <View style={styles.contentArea}>
          <Slot />
        </View>
      </View>
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
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any
  }
});
