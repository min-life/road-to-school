import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { colors } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RoadToSchool</Text>
      <View style={styles.separator} />
      <Text style={styles.description}>
        Dự án hệ thống quản lý và giám sát xe đưa đón học sinh (Phase 0).
      </Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  separator: {
    marginVertical: 16,
    height: 1,
    width: '60%',
    backgroundColor: colors.border,
  },
  description: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
  },
});
