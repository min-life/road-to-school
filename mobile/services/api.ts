import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Automatically resolves the backend API host based on current execution environment:
 * 1. Explicit EXPO_PUBLIC_API_URL environment variable if provided.
 * 2. Dynamic host IP from Expo Metro runtime (Constants.expoConfig?.hostUri or debuggerHost) for physical devices & emulators.
 * 3. Android Emulator fallback (10.0.2.2:3000).
 * 4. iOS Simulator / Web fallback (localhost:3000).
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const backendPort = 3000;

  // Extract host from Expo Metro runtime if available
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${backendPort}/api/v1`;
    }
  }

  // Check experienceUrl or linkingUri (e.g. exp://192.168.2.5:8081)
  const expUrl = (Constants as any).experienceUrl || (Constants as any).linkingUri;
  if (expUrl && typeof expUrl === 'string') {
    const match = expUrl.match(/^[a-zA-Z]+:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return `http://${match[1]}:${backendPort}/api/v1`;
    }
  }

  // Android emulator loopback bridge
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${backendPort}/api/v1`;
  }

  // iOS simulator or Web
  return `http://localhost:${backendPort}/api/v1`;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface DbHealthResponse {
  status: string;
  database: string;
  timestamp: string;
}

/**
 * Checks backend API health with timeout and error handling.
 */
export async function checkBackendHealth(timeoutMs: number = 5000): Promise<HealthResponse> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data: HealthResponse = await response.json();
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out (5s)');
    }
    throw new Error(error.message || 'Network request failed');
  } finally {
    clearTimeout(timeoutId);
  }
}
