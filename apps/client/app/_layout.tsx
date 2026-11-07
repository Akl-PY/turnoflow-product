import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Sidebar } from '../src/components/Sidebar';

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
