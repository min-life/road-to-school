import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { colors } from '@/constants/theme';
import { ApiError } from '@/services/api-client';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [channel, setChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerRequestOtp } = useAuth();
  const router = useRouter();

  const handleNext = async () => {
    setError(null);
    const trimmedName = fullName.trim();
    const trimmedIdentifier = identifier.trim();

    if (trimmedName.length < 2) {
      setError('Họ và tên phải có tối thiểu 2 ký tự');
      return;
    }

    if (!trimmedIdentifier) {
      setError(
        channel === 'SMS'
          ? 'Vui lòng nhập số điện thoại'
          : 'Vui lòng nhập địa chỉ email',
      );
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không trùng khớp');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Gửi yêu cầu nhận mã OTP (tuyệt đối chưa tạo User trong DB)
      await registerRequestOtp(trimmedIdentifier);

      // 2. Chuyển tiếp dữ liệu đăng ký sang màn hình xác minh OTP
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          identifier: trimmedIdentifier,
          fullName: trimmedName,
          password,
          confirmPassword,
        },
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể gửi mã xác minh. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={styles.keyboardContainer}
    >
      <KeyboardScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Header & Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đăng ký Phụ huynh</Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={styles.subtitle}>
            Tạo tài khoản để theo dõi lộ trình và xe buýt của con
          </Text>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Họ và tên Phụ huynh</Text>
            <TextInput
              style={styles.input}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (error) setError(null);
              }}
              editable={!isSubmitting}
            />
          </View>

          {/* Channel Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Hình thức nhận mã xác thực</Text>
            <View style={styles.channelContainer}>
              <TouchableOpacity
                style={[
                  styles.channelTab,
                  channel === 'SMS' && styles.channelTabActive,
                ]}
                onPress={() => {
                  setChannel('SMS');
                  setIdentifier('');
                  if (error) setError(null);
                }}
              >
                <Text
                  style={[
                    styles.channelTabText,
                    channel === 'SMS' && styles.channelTabTextActive,
                  ]}
                >
                  Số điện thoại
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.channelTab,
                  channel === 'EMAIL' && styles.channelTabActive,
                ]}
                onPress={() => {
                  setChannel('EMAIL');
                  setIdentifier('');
                  if (error) setError(null);
                }}
              >
                <Text
                  style={[
                    styles.channelTabText,
                    channel === 'EMAIL' && styles.channelTabTextActive,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {channel === 'SMS' ? 'Số điện thoại' : 'Địa chỉ Email'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={channel === 'SMS' ? '0912345678' : 'parent@example.com'}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={channel === 'SMS' ? 'phone-pad' : 'email-address'}
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (error) setError(null);
              }}
              editable={!isSubmitting}
            />
          </View>

          {/* Mật khẩu */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Mật khẩu (tối thiểu 6 ký tự)</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Xác nhận mật khẩu */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Xác nhận lại mật khẩu</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError(null);
                }}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleNext}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator size="small" color={colors.foreground} />
                <Text style={styles.submitButtonText}>Đang gửi mã xác thực...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Tiếp tục</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              Đã có tài khoản? <Text style={styles.loginLinkBold}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
  },
  channelContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  channelTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  channelTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  channelTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedText,
  },
  channelTabTextActive: {
    color: colors.foreground,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: '#FAFAFA',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    height: 48,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.foreground,
  },
  eyeButton: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  loginLink: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 13,
    color: colors.mutedText,
  },
  loginLinkBold: {
    fontWeight: '700',
    color: colors.foreground,
  },
});
