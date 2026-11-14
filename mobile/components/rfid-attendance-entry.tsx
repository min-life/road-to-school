import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { attendantTheme } from '../constants/theme';
import { RfidAttendancePanel } from './rfid-attendance-panel';

type Props = Omit<React.ComponentProps<typeof RfidAttendancePanel>, 'onInteractionChange'>;

/** The caller supplies the assigned attendant scope; Drivers keep the existing read-only roster. */
export function RfidAttendanceEntry(props: Props) {
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        testID="rfid-attendance-toggle"
        accessibilityRole="button"
        accessibilityLabel="Điểm danh bằng thẻ RFID"
        accessibilityState={{ expanded, disabled: locked }}
        disabled={locked}
        activeOpacity={0.8}
        style={[styles.button, !expanded && styles.collapsed, locked && styles.locked]}
        onPress={() => setExpanded((previous) => !previous)}
      >
        <Ionicons name="radio-outline" size={20} color={locked ? attendantTheme.colors.disabledText : attendantTheme.colors.primary} />
        <Text style={[styles.label, locked && attendantTheme.buttons.disabledText]}>Điểm danh RFID</Text>
        {locked ? (
          <ActivityIndicator color={attendantTheme.colors.disabledText} size="small" />
        ) : (
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={attendantTheme.colors.primary} />
        )}
      </TouchableOpacity>
      {expanded && (
        <RfidAttendancePanel {...props} onInteractionChange={setLocked} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    ...attendantTheme.buttons.selected,
  },
  collapsed: { marginBottom: 12 },
  locked: { ...attendantTheme.buttons.disabled, borderColor: attendantTheme.colors.disabled },
  label: { flex: 1, fontSize: 14, fontWeight: '700', color: attendantTheme.colors.primary },
});
