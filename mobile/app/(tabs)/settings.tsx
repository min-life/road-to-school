import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { mobileApiClient } from '@/services/api-client';

export default function SettingsScreen() {
  const { user, logout, setUser, refreshUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 1. Avatar Update State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 2. Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // 3. Parent Change Name Modal State
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // --- Handlers ---

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Yêu cầu quyền truy cập',
          'Vui lòng cấp quyền truy cập thư viện ảnh để thay đổi ảnh đại diện.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      // Diagnostics: IMAGE_SELECTED
      console.log('[AVATAR_DIAG] [IMAGE_SELECTED]', {
        platform: Platform.OS,
        assetUriLength: asset.uri ? asset.uri.length : 0,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
      });

      // File size validation (max 5MB)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Ảnh quá lớn', 'Ảnh vượt quá dung lượng cho phép (tối đa 5MB).');
        return;
      }

      setIsUploadingAvatar(true);

      let mimeType = asset.mimeType || 'image/jpeg';
      if (mimeType.toLowerCase() === 'image/jpg') {
        mimeType = 'image/jpeg';
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType.toLowerCase())) {
        mimeType = 'image/jpeg';
      }

      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
      const cleanFileName = (asset.fileName || `avatar_${Date.now()}.${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');

      // Normalize URI: Keep proper scheme for both Android and iOS
      const normalizedUri = asset.uri.startsWith('file://') || asset.uri.startsWith('content://')
        ? asset.uri
        : `file://${asset.uri}`;

      // Diagnostics: FILE_PREPARED
      console.log('[AVATAR_DIAG] [FILE_PREPARED]', {
        platform: Platform.OS,
        uriScheme: normalizedUri.split(':')[0],
        mimeType,
        fileName: cleanFileName,
      });

      const formData = new FormData();

      // Diagnostics: FORMDATA_CREATED
      console.log('[AVATAR_DIAG] [FORMDATA_CREATED]', { created: true });

      let filePart: any;
      if (Platform.OS === 'web') {
        const blobRes = await fetch(normalizedUri);
        const blob = await blobRes.blob();
        filePart = new globalThis.File([blob], cleanFileName, { type: mimeType });
      } else {
        const file = new ExpoFile(normalizedUri);
        Object.defineProperty(file, 'type', {
          value: mimeType,
          writable: true,
          configurable: true,
          enumerable: true,
        });
        Object.defineProperty(file, 'name', {
          value: cleanFileName,
          writable: true,
          configurable: true,
          enumerable: true,
        });
        filePart = file;
      }

      // Diagnostics: FILE_PART_VALIDATED
      console.log('[AVATAR_DIAG] [FILE_PART_VALIDATED]', {
        hasBytesMethod: typeof (filePart as any).bytes === 'function' || filePart instanceof Blob,
        fileName: filePart.name,
        mimeType: (filePart as any).type,
        fileUri: (filePart as any).uri || normalizedUri,
      });

      formData.append('avatar', filePart, cleanFileName);

      const response = await mobileApiClient.updateAvatar(formData);

      // Diagnostics: UPLOAD_SUCCEEDED
      console.log('[AVATAR_DIAG] [UPLOAD_SUCCEEDED]', {
        hasAvatarUrl: Boolean(response.avatarUrl),
      });

      if (user) {
        setUser({ ...user, avatarUrl: response.avatarUrl });
      }
      await refreshUser();

      // Diagnostics: PROFILE_UPDATED
      console.log('[AVATAR_DIAG] [PROFILE_UPDATED]', {
        updated: true,
      });

      Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công.');
    } catch (err: any) {
      // Diagnostics: UPLOAD_FAILED
      console.error('[AVATAR_DIAG] [UPLOAD_FAILED]', {
        statusCode: err?.statusCode,
        code: err?.code,
        message: err?.message,
      });

      let title = 'Lỗi tải ảnh';
      let message = 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.';

      const statusCode = err?.statusCode || 0;
      const code = err?.code || '';
      const rawMsg = (err?.message || '').toLowerCase();

      if (code === 'CLIENT_MULTIPART_ERROR' || rawMsg.includes('formdatapart')) {
        message = 'Lỗi xử lý tệp ảnh trên thiết bị. Vui lòng thử lại.';
      } else if (code === 'TIMEOUT' || code === 'TIMEOUT_ERROR' || rawMsg.includes('quá thời gian') || rawMsg.includes('timeout')) {
        message = 'Kết nối quá thời gian chờ. Vui lòng thử lại.';
      } else if (code === 'NETWORK_ERROR' || rawMsg.includes('network request failed')) {
        message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền và thử lại.';
      } else if (statusCode === 401 || statusCode === 403) {
        message = 'Phiên đăng nhập không hợp lệ hoặc không có quyền.';
      } else if (statusCode === 413 || rawMsg.includes('vượt quá') || rawMsg.includes('quá lớn')) {
        message = 'Ảnh vượt quá dung lượng cho phép.';
      } else if (rawMsg.includes('định dạng') || rawMsg.includes('mimetype') || rawMsg.includes('format')) {
        message = 'Định dạng ảnh không được hỗ trợ.';
      } else if (statusCode >= 500 || rawMsg.includes('cloudinary') || rawMsg.includes('lưu trữ')) {
        message = 'Không thể lưu ảnh đại diện.';
      } else if (statusCode === 400) {
        message = 'Không thể xử lý ảnh đã chọn.';
      } else if (err?.message) {
        message = err.message;
      }

      Alert.alert(title, message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    try {
      setIsChangingPass(true);
      await mobileApiClient.changePassword({
        currentPassword,
        newPassword,
      });

      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Đổi mật khẩu thành công',
        'Mật khẩu của bạn đã được thay đổi. Các phiên đăng nhập trên thiết bị khác đã được thu hồi an toàn.'
      );
    } catch (err: any) {
      Alert.alert('Lỗi đổi mật khẩu', err?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleOpenNameModal = () => {
    if (!user) return;
    setNewFullName(user.fullName || '');
    setIsNameModalOpen(true);
  };

  const handleUpdateName = async () => {
    const trimmed = newFullName.trim();
    if (!trimmed) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống.');
      return;
    }
    if (user && trimmed === user.fullName) {
      setIsNameModalOpen(false);
      return;
    }

    try {
      setIsUpdatingName(true);
      const updatedUser = await mobileApiClient.updateName({ fullName: trimmed });
      setUser(updatedUser);
      setIsNameModalOpen(false);
      Alert.alert('Thành công', 'Đã cập nhật tên tài khoản thành công.');
    } catch (err: any) {
      Alert.alert('Lỗi cập nhật tên', err?.message || 'Không thể cập nhật tên. Vui lòng thử lại.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  let roleLabel = 'Người dùng';
  switch (user?.role) {
    case 'DRIVER':
      roleLabel = 'Tài xế';
      break;
    case 'BUS_ATTENDANT':
      roleLabel = 'Giáo viên';
      break;
    case 'PARENT':
      roleLabel = 'Phụ huynh học sinh';
      break;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account Profile Card */}
      {user && (
        <View style={styles.card}>
          {/* Avatar with Camera badge */}
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickAvatar}
            disabled={isUploadingAvatar}
            activeOpacity={0.8}
          >
            {user.avatarUrl ? (
              <Image
                key={user.avatarUrl}
                source={{ uri: user.avatarUrl }}
                style={styles.avatarImage}
                onLoad={() => console.log('[AVATAR_DIAG] [8. AVATAR_RENDERED]', { platform: Platform.OS, hasAvatarUrl: Boolean(user.avatarUrl) })}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {(user.fullName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.cameraBadge}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#1E293B" />
              ) : (
                <Ionicons name="camera" size={14} color="#1E293B" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
          <Text style={styles.userIdentifier}>
            {user.email || user.phone || 'Chưa cập nhật'}
          </Text>

          {/* Action List */}
          <View style={styles.actionList}>
            {/* Đổi ảnh đại diện */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePickAvatar}
              disabled={isUploadingAvatar}
            >
              <Ionicons name="image-outline" size={18} color="#475569" />
              <Text style={styles.actionButtonText}>Đổi ảnh đại diện</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Đổi tên tài khoản (Chỉ dành cho Phụ huynh) */}
            {user.role === 'PARENT' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleOpenNameModal}
              >
                <Ionicons name="pencil-outline" size={18} color="#475569" />
                <Text style={styles.actionButtonText}>Đổi tên tài khoản</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {/* Đổi mật khẩu */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsPasswordModalOpen(true)}
            >
              <Ionicons name="key-outline" size={18} color="#475569" />
              <Text style={styles.actionButtonText}>Đổi mật khẩu</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Đăng xuất */}
            <TouchableOpacity
              style={[styles.actionButton, styles.logoutButtonRow]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
              {isLoggingOut && <ActivityIndicator size="small" color="#EF4444" />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* System Settings Card */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>

        <View style={styles.settingItem}>
          <Ionicons name="color-palette-outline" size={20} color={colors.foreground} />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Giao diện</Text>
            <Text style={styles.settingValue}>Bảng màu RoadToSchool (#FFCB56)</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.foreground} />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Bảo mật</Text>
            <Text style={styles.settingValue}>Expo SecureStore (Mã hóa phần cứng)</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <Ionicons name="information-circle-outline" size={20} color={colors.foreground} />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Phiên bản</Text>
            <Text style={styles.settingValue}>RoadToSchool v2.0</Text>
          </View>
        </View>
      </View>

      {/* Modal: Change Password */}
      <Modal
        visible={isPasswordModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <KeyboardScrollView
          style={[styles.modalOverlay, { alignItems: undefined, justifyContent: undefined }]}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <TouchableOpacity
                onPress={() => setIsPasswordModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Mật khẩu hiện tại */}
              <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showCurrentPass}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Nhập mật khẩu đang dùng"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPass(!showCurrentPass)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Mật khẩu mới */}
              <Text style={styles.inputLabel}>Mật khẩu mới (tối thiểu 8 ký tự)</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showNewPass}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPass(!showNewPass)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showNewPass ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Xác nhận mật khẩu mới */}
              <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showConfirmPass}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPass(!showConfirmPass)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setIsPasswordModalOpen(false)}
              >
                <Text style={styles.cancelModalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitModalButton}
                onPress={handleChangePassword}
                disabled={isChangingPass}
              >
                {isChangingPass ? (
                  <ActivityIndicator size="small" color="#1E293B" />
                ) : (
                  <Text style={styles.submitModalButtonText}>Lưu mật khẩu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardScrollView>
      </Modal>

      {/* Modal: Change Name (PARENT only) */}
      <Modal
        visible={isNameModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNameModalOpen(false)}
      >
        <KeyboardScrollView
          style={[styles.modalOverlay, { alignItems: undefined, justifyContent: undefined }]}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi tên tài khoản phụ huynh</Text>
              <TouchableOpacity
                onPress={() => setIsNameModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Họ và tên hiển thị</Text>
              <TextInput
                style={styles.textInput}
                value={newFullName}
                onChangeText={setNewFullName}
                placeholder="Nhập họ và tên của bạn"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.helperText}>
                Tên này được hiển thị trong tài khoản phụ huynh và các thông báo xác thực.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setIsNameModalOpen(false)}
              >
                <Text style={styles.cancelModalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitModalButton}
                onPress={handleUpdateName}
                disabled={isUpdatingName}
              >
                {isUpdatingName ? (
                  <ActivityIndicator size="small" color="#1E293B" />
                ) : (
                  <Text style={styles.submitModalButtonText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.foreground,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 203, 86, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  userIdentifier: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 16,
  },
  actionList: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 10,
  },
  logoutButtonRow: {
    marginTop: 6,
    borderBottomWidth: 0,
  },
  logoutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  settingValue: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  eyeButton: {
    padding: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  cancelModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitModalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitModalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
});
