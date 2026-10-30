import { AppHeader } from '@/components/navigation/app-header';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '@/constants/theme';
import { mobileApiClient } from '@/services/api-client';

const STUDENT_CODE_REGEX = /^STU[A-Z0-9]{8}$/;

function validateStudentCode(code: string): string | null {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return 'Vui lòng nhập mã học sinh.';
  }
  if (!trimmed.startsWith('STU')) {
    return 'Mã học sinh phải bắt đầu bằng tiền tố STU.';
  }
  if (trimmed.length !== 11) {
    return 'Mã học sinh phải có đúng 11 ký tự (STU + 8 ký tự).';
  }
  if (!STUDENT_CODE_REGEX.test(trimmed)) {
    return 'Mã chỉ được chứa chữ cái in hoa và chữ số.';
  }
  const suffix = trimmed.slice(3);
  if (!/[A-Z]/.test(suffix) || !/[0-9]/.test(suffix)) {
    return 'Mã phải chứa ít nhất một chữ cái và một chữ số.';
  }
  return null;
}

export default function LinkStudentScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<'MANUAL' | 'QR'>('MANUAL');
  const [studentCode, setStudentCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const isScanningRef = useRef(false);

  const handleSubmitCode = async (codeToSubmit: string) => {
    const cleanCode = codeToSubmit.trim().toUpperCase();
    const validationError = validateStudentCode(cleanCode);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await mobileApiClient.requestLinkOtp(cleanCode);

      // Navigate to OTP verification screen
      router.push({
        pathname: '/parent/verify-otp',
        params: {
          challengeId: res.challengeId,
          maskedPhone: res.maskedPhone,
          expiresInSeconds: String(res.expiresInSeconds),
          studentCode: cleanCode,
        },
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể gửi yêu cầu liên kết. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
      isScanningRef.current = false;
    }
  };

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (isScanningRef.current || isSubmitting) return;

      const raw = (data || '').trim().toUpperCase();
      const validationError = validateStudentCode(raw);

      if (validationError) {
        Alert.alert('Mã QR không hợp lệ', 'Mã QR quét được không đúng định dạng học sinh RoadToSchool (STU...).');
        return;
      }

      isScanningRef.current = true;
      setStudentCode(raw);
      setMode('MANUAL');
      handleSubmitCode(raw);
    },
    [isSubmitting]
  );

  return (
    <View
      style={styles.container}
    >
      {/* Top Header */}
      <AppHeader title="Liên kết học sinh" onBack={() => router.back()} backDisabled={isSubmitting} />

      {/* Mode Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.switchButton, mode === 'MANUAL' && styles.switchButtonActive]}
          onPress={() => {
            setMode('MANUAL');
            setErrorMessage(null);
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={mode === 'MANUAL' ? '#92400E' : colors.mutedText}
          />
          <Text
            style={[styles.switchText, mode === 'MANUAL' && styles.switchTextActive]}
          >
            Nhập mã
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switchButton, mode === 'QR' && styles.switchButtonActive]}
          onPress={async () => {
            if (!permission?.granted) {
              const res = await requestPermission();
              if (!res.granted) {
                Alert.alert(
                  'Cần quyền truy cập máy ảnh',
                  'Vui lòng cấp quyền máy ảnh để quét mã QR học sinh.'
                );
                return;
              }
            }
            setMode('QR');
            setErrorMessage(null);
            isScanningRef.current = false;
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="qr-code-outline"
            size={18}
            color={mode === 'QR' ? '#92400E' : colors.mutedText}
          />
          <Text
            style={[styles.switchText, mode === 'QR' && styles.switchTextActive]}
          >
            Quét mã QR
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on mode */}
      {mode === 'MANUAL' ? (
        <KeyboardScrollView contentContainerStyle={styles.scrollContent}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nhập mã học sinh</Text>
            <Text style={styles.cardSubtitle}>
              Mã học sinh gồm 11 ký tự được cấp bởi nhà trường (ví dụ: STUA7B3C9D2).
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="school-outline"
                size={20}
                color={colors.mutedText}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                value={studentCode}
                onChangeText={(val) => {
                  setStudentCode(val.toUpperCase());
                  setErrorMessage(null);
                }}
                placeholder="STU..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={11}
                editable={!isSubmitting}
              />
              {studentCode.length > 0 && (
                <TouchableOpacity
                  onPress={() => setStudentCode('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!studentCode.trim() || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={() => handleSubmitCode(studentCode)}
              disabled={!studentCode.trim() || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <Text style={styles.submitButtonText}>Tiếp tục xác thực OTP</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.hintBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#D97706" />
            <Text style={styles.hintText}>
              Sau khi xác nhận mã, một tin nhắn chứa mã OTP 6 chữ số sẽ được gửi tới số điện thoại người giám hộ đã đăng ký với nhà trường.
            </Text>
          </View>
        </KeyboardScrollView>
      ) : (
        <View style={styles.cameraWrapper}>
          {!permission?.granted ? (
            <View style={styles.permissionContainer}>
              <Ionicons name="camera-outline" size={54} color={colors.mutedText} />
              <Text style={styles.permissionTitle}>Chưa có quyền máy ảnh</Text>
              <Text style={styles.permissionSubtitle}>
                Để quét mã QR học sinh, ứng dụng cần bạn cho phép sử dụng máy ảnh của thiết bị.
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
                activeOpacity={0.8}
              >
                <Text style={styles.permissionButtonText}>Cho phép truy cập máy ảnh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={StyleSheet.absoluteFill}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={isScanningRef.current ? undefined : handleBarcodeScanned}
              />
              {/* Scan Overlay Frame */}
              <View style={styles.overlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.scanInstruction}>
                  Hướng máy ảnh vào mã QR trên thẻ hoặc hồ sơ học sinh
                </Text>
                {isSubmitting && (
                  <View style={styles.scanningIndicator}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.scanningText}>Đang kiểm tra mã...</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    margin: 16,
    borderRadius: 14,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  switchButtonActive: {
    backgroundColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  switchText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedText,
  },
  switchTextActive: {
    color: '#92400E',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  clearButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  scanningText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
