import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { nextStopEstimate } from '../utils/trip-navigation';

export function TripNextStopSummary({ estimate }: { estimate: ReturnType<typeof nextStopEstimate> }) {
  return <View>
    {estimate ? <Text style={styles.metrics} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
      {estimate.metres > 0 ? `${Math.max(1, Math.ceil(estimate.seconds / 60))} phút` : 'Đã đến'}
      <Text style={styles.distance}> · {estimate.metres >= 1000
        ? `${(estimate.metres / 1000).toFixed(1).replace('.', ',')} km`
        : `${Math.round(estimate.metres)} m`}</Text>
    </Text> : <Text style={styles.unavailable}>Chưa có ước tính</Text>}
    <Text style={styles.caption}>Đến điểm tiếp theo</Text>
  </View>;
}

const styles = StyleSheet.create({
  metrics: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.foreground },
  distance: { fontWeight: '500', color: colors.foreground },
  caption: { fontSize: 12, lineHeight: 18, color: colors.mutedText },
  unavailable: { fontSize: 18, lineHeight: 28, fontWeight: '600', color: colors.mutedText },
});
