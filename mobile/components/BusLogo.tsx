import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

export function BusLogo({ size = 56 }: { size?: number }) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 4 },
      ]}
      accessibilityRole="image"
      accessibilityLabel="Logo xe buýt RoadToSchool"
    >
      <Text style={[styles.busEmoji, { fontSize: size * 0.55 }]}>🚌</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  busEmoji: {
    textAlign: 'center',
  },
});
