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
import { AppHeader } from '@/components/navigation/app-header';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import {
  mobileApiClient,
  ParentLinkedStudentItem,
} from '@/services/api-client';
import { StudentCard } from '@/components/StudentCard';
import { TrackingEmptyState } from '@/components/parent/tracking-empty-state';

export default function ParentTrackingScreen() {
  const router = useRouter();

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
      <AppHeader title="Học sinh theo dõi" subtitle={students.length > 0
              ? `${students.length} học sinh đang được liên kết`
              : 'Quản lý thông tin đưa đón học sinh'} actions={<NotificationBell />} />

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
          style={[styles.listContainer, styles.emptyViewport]}
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchLinkedStudents(true)}
              tintColor={colors.primary}
            />
          }
        >
          <TrackingEmptyState onLink={handleAddPress} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={[styles.listContent, { paddingBottom: 90 }]}
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
        style={[styles.fab, { bottom: 16 }]}
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
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 16,
  },
  // Keep both V2 link controls reachable without the floating + covering the card.
  emptyViewport: { marginBottom: 90 },
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
