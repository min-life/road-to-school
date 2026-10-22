import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="compass" size={32} color={colors.foreground} />
        </View>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.description}>
          Màn hình khám phá các tuyến xe buýt và lộ trình đưa đón trong hệ thống RoadToSchool.
        </Text>
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>Chức năng sẽ được hoàn thiện trong Phase tiếp theo.</Text>
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
  placeholderBox: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
  },
  placeholderText: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
