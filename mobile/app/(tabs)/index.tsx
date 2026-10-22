import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { checkBackendHealth, getApiBaseUrl, HealthResponse } from '@/services/api';

type ConnectionState = 'idle' | 'loading' | 'connected' | 'error';

export default function HomeScreen() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');

  const runHealthCheck = useCallback(async () => {
    setConnectionState('loading');
    setErrorMessage(null);
    const resolvedUrl = getApiBaseUrl();
    setApiUrl(resolvedUrl);

    try {
      const data = await checkBackendHealth(5000);
      setHealthData(data);
      setConnectionState('connected');
    } catch (err: any) {
      setConnectionState('error');
      setErrorMessage(err.message || 'Cannot connect to backend');
    }
  }, []);

  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.heroCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Phase 0 Foundation</Text>
        </View>
        <Text style={styles.title}>RoadToSchool Mobile</Text>
        <Text style={styles.subtitle}>
          Hệ thống giám sát và quản lý xe đưa đón học sinh.
        </Text>
      </View>

      {/* Backend Connectivity Test Card */}
      <View style={styles.testCard}>
        <View style={styles.testHeader}>
          <Ionicons name="hardware-chip-outline" size={20} color={colors.foreground} />
          <Text style={styles.testTitle}>Backend Connectivity</Text>
        </View>

        <View style={styles.urlRow}>
          <Text style={styles.label}>Resolved API Host:</Text>
          <Text style={styles.urlValue} numberOfLines={1}>
            {apiUrl || 'Detecting host...'}
          </Text>
        </View>

        {/* Status display */}
        <View style={styles.statusBox}>
          {connectionState === 'loading' && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.foreground} />
              <Text style={styles.statusLoadingText}>Checking connection...</Text>
            </View>
          )}

          {connectionState === 'connected' && (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusConnectedText}>Connected to Backend</Text>
                {healthData?.timestamp && (
                  <Text style={styles.timestampText}>
                    Server Time: {new Date(healthData.timestamp).toLocaleTimeString()}
                  </Text>
                )}
              </View>
            </View>
          )}

          {connectionState === 'error' && (
            <View style={styles.statusRow}>
              <Ionicons name="alert-circle" size={22} color={colors.error} />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusErrorText}>Connection failed</Text>
                <Text style={styles.errorDetailText}>{errorMessage}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Retry button */}
        <TouchableOpacity
          style={[
            styles.retryButton,
            connectionState === 'loading' && styles.buttonDisabled,
          ]}
          onPress={runHealthCheck}
          disabled={connectionState === 'loading'}
          activeOpacity={0.8}>
          <Ionicons name="refresh" size={18} color={colors.foreground} />
          <Text style={styles.retryButtonText}>
            {connectionState === 'loading' ? 'Checking...' : 'Retry Connection'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
  testCard: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  urlRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: colors.mutedText,
    marginBottom: 2,
  },
  urlValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: colors.foreground,
    fontWeight: '500',
  },
  statusBox: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLoadingText: {
    fontSize: 14,
    color: colors.foreground,
  },
  statusConnectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  timestampText: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  statusErrorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  errorDetailText: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
});
