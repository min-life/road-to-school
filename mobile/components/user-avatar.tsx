import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type UserAvatarProps = {
  avatarUrl?: string | null;
  fullName?: string | null;
  size?: number;
  onLoad?: () => void;
};

/** Both screens use AuthContext's avatar URL; changing it resets image failure state. */
export function UserAvatar(props: UserAvatarProps) {
  return <AvatarContent key={props.avatarUrl ?? ''} {...props} />;
}

function AvatarContent({ avatarUrl, fullName, size = 72, onLoad }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl && !imageFailed ? (
        <Image source={{ uri: avatarUrl }} style={styles.image} resizeMode="cover"
          onLoad={onLoad} onError={() => setImageFailed(true)} accessible={false} />
      ) : (
        <Text accessible={false} style={[styles.initial, { fontSize: size * 28 / 72 }]}>
          {(fullName || 'U').charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  initial: { fontWeight: '800', color: colors.foreground },
});
