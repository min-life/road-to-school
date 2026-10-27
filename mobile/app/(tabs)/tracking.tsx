import { NotificationBell } from '@/components/notification-bell';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import {
  mobileApiClient,
  ParentLinkedStudentItem,
} from '@/services/api-client';
import { StudentCard } from '@/components/StudentCard';

export default function ParentTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [students, setStudents] = useState<ParentLinkedStudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLinkedStudents = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await mobileApiClient.getLinkedStudents();
      setStudents(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải danh sách học sinh. Vui lòng kiểm tra lại kết nối.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  const handleUnlink = async (studentId: string, studentName: string) => {
    try {
      await mobileApiClient.unlinkStudent(studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      Alert.alert('Thành công', `Đã hủy liên kết với học sinh ${studentName}`);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể hủy liên kết. Vui lòng thử lại.');
    }
  };

  const handleCardPress = (studentId: string) => {
    router.push({
      pathname: '/parent/student-detail/[id]',
      params: { id: studentId },
    });
  };

  const handleAddPress = () => {
    router.push('/parent/link-student');
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Học sinh theo dõi</Text>
          <Text style={styles.headerSubtitle}>
            {students.length > 0
              ? `${students.length} học sinh đang được liên kết`
              : 'Quản lý thông tin đưa đón học sinh'}
          </Text>
        </View>
        <NotificationBell />
      </View>

      {/* Main Content */}
      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách học sinh...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Lỗi tải dữ liệu</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchLinkedStudents()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : students.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchLinkedStudents(true)}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={44} color="#D97706" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có học sinh nào</Text>
          <Text style={styles.emptySubtitle}>
            Nhấn vào nút bên dưới để liên kết với học sinh bằng mã định danh hoặc quét mã QR.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={colors.foreground} />
            <Text style={styles.emptyButtonText}>Liên kết học sinh</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchLinkedStudents(true)}
              tintColor={colors.primary}
            />
          }
        >
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onPress={() => handleCardPress(student.id)}
              onUnlink={handleUnlink}
            />
          ))}
        </ScrollView>
      )}

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={handleAddPress}
        activeOpacity={0.85}
        accessibilityLabel="Thêm liên kết học sinh"
      >
        <Ionicons name="add" size={32} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.mutedText,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
