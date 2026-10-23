import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const isDriver = user?.role === 'DRIVER';
  const roleName = isDriver ? 'Tài xế' : 'Giáo viên';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Lịch vận hành</Text>
        <Text style={styles.subtitle}>
          Thông tin phân công tuyến xe dành cho {roleName}
        </Text>
      </View>

      {/* Placeholder Foundation Card */}
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={40} color="#D97706" />
        </View>
        <Text style={styles.cardTitle}>Chưa có lịch vận hành</Text>
        <Text style={styles.cardDescription}>
          Hệ thống đang chuẩn bị lịch trình và danh sách học sinh theo tuyến. Bạn sẽ nhận được thông báo khi có phân công mới từ nhà trường.
        </Text>
      </View>

      {/* Operational Guidelines */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoBoxTitle}>Quy định vận hành</Text>
          <Text style={styles.infoBoxText}>
            Vui lòng kiểm tra phương tiện và danh sách học sinh ít nhất 15 phút trước giờ khởi hành.
          </Text>
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
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  infoBoxText: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 16,
  },
});
