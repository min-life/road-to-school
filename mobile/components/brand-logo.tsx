import { Image, StyleSheet, View } from 'react-native';

/** User-supplied samples 3 + 1, bundled locally for native and web. */
export function BrandLogo() {
  return (
    <View style={styles.logo} accessible accessibilityRole="image" accessibilityLabel="Road To School">
      <Image source={require('../assets/images/brand/road-to-school-symbol.png')}
        style={styles.symbol} resizeMode="contain" accessible={false} />
      <View style={styles.wordmarkFrame}>
        <Image source={require('../assets/images/brand/road-to-school-wordmark.png')}
          style={styles.wordmark} resizeMode="contain" accessible={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: '100%', maxWidth: 260, alignItems: 'center', gap: 16 },
  symbol: { width: 128, height: 128 * 109 / 176 },
  wordmarkFrame: { width: '100%', aspectRatio: 440 / 92 },
  wordmark: { width: '100%', height: '100%' },
});
