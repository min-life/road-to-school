import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';

type TrackingEmptyStateProps = {
  onLink: () => void;
  title?: string;
  description?: string | null;
};

/** Shared linked-student empty card. V2 screens own the copy and link action. */
export function TrackingEmptyState({
  onLink,
  title = 'Chưa có học sinh nào',
  description = 'Nhấn vào nút bên dưới để liên kết với học sinh bằng mã định danh hoặc quét mã QR.',
}: TrackingEmptyStateProps) {
  const { width } = useWindowDimensions();
  const artWidth = Math.max(0, Math.min(240, width - 96));
  return <View style={styles.card}>
    {/* Same whitespace framing as V1; the original image is unchanged. */}
    <View pointerEvents="none" accessible={false}
      style={[styles.art, { width: artWidth, height: artWidth * 124 / 240 }]}>
      <Image source={require('../../assets/images/parent/parent-add-student.png')}
        resizeMode="contain" accessible={false}
        style={{ width: artWidth, height: artWidth, position: 'absolute', top: -artWidth * 64 / 240 }} />
    </View>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {!!description && <Text style={styles.description}>{description}</Text>}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Liên kết học sinh"
      style={[styles.button, !description && styles.buttonWithoutDescription]} onPress={onLink} activeOpacity={0.8}>
      <Ionicons name="add" size={20} color={colors.foreground} accessible={false} />
      <Text style={styles.buttonText}>Liên kết học sinh</Text>
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 16, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: '#EAE7DE', borderRadius: 20, alignItems: 'center' },
  art: { alignSelf: 'center', overflow: 'hidden', marginBottom: 8 },
  title: { color: colors.foreground, fontSize: 20, lineHeight: 27, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  description: { color: colors.mutedText, fontSize: 12, lineHeight: 18, textAlign: 'center',
    maxWidth: 300, marginTop: 6, marginBottom: 20 },
  button: { minHeight: 48, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.primary },
  buttonText: { flexShrink: 1, color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  buttonWithoutDescription: { marginTop: 20 },
});
