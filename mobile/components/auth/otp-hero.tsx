import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

/** V1 illustration only. The screen keeps OTP state, actions and keyboard ownership. */
export function OtpHero({ compact = false }: { compact?: boolean }) {
  const { width } = useWindowDimensions();
  // Width-based sizing stays stable when Android's keyboard resizes the viewport.
  const size = Math.max(112, Math.min(compact ? 176 : 224, width - 128));
  return (
    <View
      pointerEvents="none"
      style={[styles.frame, { width: size, height: (size * 652) / 648 }]}
    >
      <Image
        source={require('../../assets/images/auth/verify-phone.jpg')}
        resizeMode="contain"
        accessible={false}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
});
