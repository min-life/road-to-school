import { AppHeader } from '@/components/navigation/app-header';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import {
  mobileApiClient,
  ParentLinkedStudentDetail,
} from '@/services/api-client';
import {
  mobileVietmapService,
  MobileVietmapSuggestion,
} from '@/services/vietmap.service';
import { VietMapPicker } from '@/components/maps/VietMapPicker';

export default function CreateAddressRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [student, setStudent] = useState<ParentLinkedStudentDetail | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);

  // Address search & map state
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<MobileVietmapSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!studentId) return;
    mobileApiClient
      .getLinkedStudentDetail(studentId)
      .then(setStudent)
      .catch((err) => {
        Alert.alert('Lỗi', err?.message || 'Không thể tải thông tin học sinh.');
      })
      .finally(() => {
        setIsLoadingStudent(false);
      });
  }, [studentId]);

  const handleSearchChange = (val: string) => {
    setSearchText(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val.trim() || val.length < 2) {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await mobileVietmapService.autocomplete(val.trim());
        setSuggestions(results);
      } catch (err) {
        console.warn('Search suggestions error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = async (item: MobileVietmapSuggestion) => {
    setSearchText(item.address || item.display || item.name);
    setSuggestions([]);
    try {
      setIsSearching(true);
      const detail = await mobileVietmapService.getPlaceDetail(item.refId);
      if (detail) {
        setSelectedAddressText(detail.addressText || item.address);
        setSelectedLat(detail.latitude);
        setSelectedLng(detail.longitude);
      } else {
        Alert.alert(
          'Lỗi tọa độ',
          'Không thể lấy tọa độ chi tiết cho địa điểm này. Vui lòng chọn kết quả khác.'
        );
      }
    } catch (err) {
      console.warn('Place detail error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Xử lý khi phụ huynh chạm vào bản đồ hoặc kéo marker
  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    try {
      setIsReversing(true);
      const results = await mobileVietmapService.reverseGeocode(lat, lng);
      if (results && results.length > 0 && results[0].addressText) {
        const addr = results[0].addressText;
        setSelectedAddressText(addr);
        setSearchText(addr);
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    } finally {
      setIsReversing(false);
    }
  };

  const handleSubmit = async () => {
    if (!student || !studentId) return;

    if (!selectedAddressText || selectedLat === null || selectedLng === null) {
      Alert.alert(
        'Chưa chọn địa chỉ',
        'Vui lòng tìm kiếm hoặc chọn một vị trí cụ thể trên bản đồ VietMap.'
      );
      return;
    }

    const proposedData = {
      addressText: selectedAddressText,
      latitude: selectedLat,
      longitude: selectedLng,
    };

    try {
      setIsSubmitting(true);
      const otpRes = await mobileApiClient.requestStudentUpdateOtp(studentId, {
        type: 'ADDRESS_UPDATE',
        proposedData,
      });

      router.push({
        pathname: '/parent/create-request/verify-otp',
        params: {
          studentId,
          type: 'ADDRESS_UPDATE',
          challengeId: otpRes.challengeId,
          maskedPhone: otpRes.maskedPhone,
          proposedDataJson: JSON.stringify(proposedData),
        },
      });
    } catch (err: any) {
      Alert.alert(
        'Không thể gửi mã xác thực',
        err?.message || 'Không thể gửi yêu cầu mã OTP. Vui lòng thử lại sau.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader title="Đổi địa chỉ đón trả" onBack={() => router.back()} />

      {isLoadingStudent ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      ) : (
        <KeyboardScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Notice Card */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color="#1D4ED8" />
            <Text style={styles.noticeText}>
              Địa chỉ mới sẽ được kiểm tra và tích hợp vào tuyến xe buýt của học sinh sau khi được phê duyệt.
            </Text>
          </View>

          {/* 1. Current Address Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Địa chỉ đón trả hiện tại</Text>
            <View style={styles.currentAddressRow}>
              <Ionicons name="location-outline" size={18} color="#D97706" />
              <Text style={styles.currentAddressText}>
                {student?.addressText || 'Chưa cập nhật địa chỉ'}
              </Text>
            </View>
          </View>

          {/* 2. Search VietMap Address */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tìm kiếm địa chỉ mới (VietMap)</Text>

            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={handleSearchChange}
                placeholder="Nhập tên đường, số nhà, phường/xã..."
                placeholderTextColor="#94A3B8"
              />
              {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.refId}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pin" size={16} color="#2563EB" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionName}>{item.name}</Text>
                      <Text style={styles.suggestionAddress}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 3. Interactive VietMap Map */}
          <View style={styles.card}>
            <View style={styles.mapHeaderRow}>
              <Text style={styles.cardTitle}>Bản đồ chọn vị trí đón trả</Text>
              {isReversing && (
                <View style={styles.reversingBadge}>
                  <ActivityIndicator size="small" color="#D97706" />
                  <Text style={styles.reversingText}>Đang lấy địa chỉ...</Text>
                </View>
              )}
            </View>

            <VietMapPicker
              latitude={selectedLat}
              longitude={selectedLng}
              onLocationSelect={handleMapLocationSelect}
              height={270}
            />
          </View>

          {/* 4. Selected Address Confirmation Box */}
          {selectedAddressText ? (
            <View style={styles.selectedAddressBox}>
              <View style={styles.selectedHeader}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.selectedHeaderTitle}>Địa chỉ đề xuất đã chọn</Text>
              </View>
              <Text style={styles.selectedAddressContent}>{selectedAddressText}</Text>
              <View style={styles.coordRow}>
                <Ionicons name="navigate-outline" size={12} color="#64748B" />
                <Text style={styles.coordText}>
                  Tọa độ: {selectedLat?.toFixed(6)}, {selectedLng?.toFixed(6)}
                </Text>
              </View>
            </View>
          ) : null}

          {/* 5. Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedAddressText || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedAddressText || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#1E293B" />
            ) : (
              <View style={styles.submitRow}>
                <Text style={styles.submitButtonText}>Tiếp tục xác thực OTP</Text>
                <Ionicons name="arrow-forward" size={18} color="#1E293B" />
              </View>
            )}
          </TouchableOpacity>
        </KeyboardScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 10,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  reversingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  reversingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  currentAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  currentAddressText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  suggestionsList: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  suggestionAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  selectedAddressBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  selectedAddressContent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 19,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  coordText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
});
