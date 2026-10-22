import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="settings" size={32} color={colors.foreground} />
        </View>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.description}>
          Cài đặt ứng dụng và cấu hình người dùng cho hệ thống RoadToSchool.
        </Text>

        <View style={styles.settingItem}>
          <Ionicons name="color-palette-outline" size={20} color={colors.foreground} />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Theme</Text>
            <Text style={styles.settingValue}>RoadToSchool Brand (#FFCB56)</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <Ionicons name="information-circle-outline" size={20} color={colors.foreground} />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValue}>Phase 0 — Project Foundation</Text>
          </View>
        </View>
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
  },
  card: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  settingValue: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
});
