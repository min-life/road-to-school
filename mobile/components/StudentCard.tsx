import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Image,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import type { ParentLinkedStudentItem } from '@/services/api-client';

interface StudentCardProps {
  student: ParentLinkedStudentItem;
  onPress: () => void;
  onUnlink: (studentId: string, studentName: string) => void;
}

const ACTION_BUTTON_WIDTH = 90;

export function StudentCard({ student, onPress, onUnlink }: StudentCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipedOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal movements greater than 10px and more horizontal than vertical
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (isSwipedOpen.current) {
          // If already open, allow sliding back to the right up to 0
          const newX = -ACTION_BUTTON_WIDTH + gestureState.dx;
          if (newX <= 0 && newX >= -ACTION_BUTTON_WIDTH - 20) {
            translateX.setValue(newX);
          }
        } else {
          // Only allow dragging to the left
          if (gestureState.dx < 0 && gestureState.dx >= -ACTION_BUTTON_WIDTH - 20) {
            translateX.setValue(gestureState.dx);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isSwipedOpen.current) {
          // If already open, if user drags right by > 20px, close it
          if (gestureState.dx > 20) {
            closeSwipe();
          } else {
            openSwipe();
          }
        } else {
          // If closed, if user dragged left by > 40px, snap open
          if (gestureState.dx < -40) {
            openSwipe();
          } else {
            closeSwipe();
          }
        }
      },
    })
  ).current;

  const openSwipe = () => {
    isSwipedOpen.current = true;
    Animated.spring(translateX, {
      toValue: -ACTION_BUTTON_WIDTH,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeSwipe = () => {
    isSwipedOpen.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const handleUnlinkPress = () => {
    closeSwipe();
    Alert.alert(
      'Hủy liên kết học sinh',
      `Bạn có chắc chắn muốn hủy liên kết với học sinh ${student.fullName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: () => onUnlink(student.id, student.fullName),
        },
      ]
    );
  };

  const isAvailable = student.status === 'AVAILABLE';

  return (
    <View style={styles.container}>
      {/* Hidden Action Button behind the card */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.unlinkButton}
          onPress={handleUnlinkPress}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          <Text style={styles.unlinkText}>Hủy liên kết</Text>
        </TouchableOpacity>
      </View>

      {/* Main Foreground Card with pan handlers */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => {
            if (isSwipedOpen.current) {
              closeSwipe();
            } else {
              onPress();
            }
          }}
          activeOpacity={0.9}
        >
          {/* Avatar or initial */}
          <View style={styles.avatarWrapper}>
            {student.avatarUrl ? (
              <Image source={{ uri: student.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(student.fullName || 'H').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Student Info */}
          <View style={styles.infoWrapper}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName} numberOfLines={1}>
                {student.fullName}
              </Text>
              {!isAvailable && (
                <View style={styles.disabledBadge}>
                  <Text style={styles.disabledBadgeText}>Đã vô hiệu hóa</Text>
                </View>
              )}
            </View>

            <View style={styles.schoolRow}>
              <Ionicons name="school-outline" size={14} color={colors.mutedText} />
              <Text style={styles.schoolName} numberOfLines={1}>
                {student.schoolName || 'Trường học'}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    position: 'relative',
    backgroundColor: '#EF4444',
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
  },
  unlinkButton: {
    width: ACTION_BUTTON_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unlinkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarWrapper: {
    marginRight: 14,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400E',
  },
  infoWrapper: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    flexShrink: 1,
  },
  disabledBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  disabledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  schoolName: {
    fontSize: 13,
    color: colors.mutedText,
    flexShrink: 1,
  },
});
