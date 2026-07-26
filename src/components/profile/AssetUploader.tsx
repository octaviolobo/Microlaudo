import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppError } from '@/lib/errors';
import {
  deleteDoctorAsset,
  getSignedDoctorAssetUrl,
  uploadDoctorAsset,
  type DoctorAssetKind,
} from '@/services/assets';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

type AssetUploaderProps = {
  label: string;
  kind: DoctorAssetKind;
  currentPath: string | null;
  onUploaded: (path: string) => void;
  onRemoved: () => void;
};

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {};

export function AssetUploader({
  label,
  kind,
  currentPath,
  onUploaded,
  onRemoved,
}: AssetUploaderProps) {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!currentPath) {
        setPreviewUrl(null);
        return;
      }
      try {
        const url = await getSignedDoctorAssetUrl(currentPath);
        if (!cancelled) setPreviewUrl(url);
      } catch {
        if (!cancelled) setPreviewUrl(null);
      }
    }
    refresh();
    return () => {
      cancelled = true;
    };
  }, [currentPath]);

  async function handleFileChange(event: unknown) {
    // Só é chamado no web — event é React.ChangeEvent<HTMLInputElement>.
    const target = (event as { target: HTMLInputElement }).target;
    const file = target.files?.[0];
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      const path = await uploadDoctorAsset(kind, file);
      onUploaded(path);
    } catch (err) {
      setError(err instanceof AppError ? err.message : t('profile.assetUploadError'));
    } finally {
      setBusy(false);
      // limpa o input para permitir re-selecionar o mesmo arquivo
      target.value = '';
    }
  }

  function handlePickFile() {
    if (Platform.OS !== 'web') return;
    inputRef.current?.click();
  }

  async function handleRemove() {
    if (!currentPath) return;
    setError(null);
    setBusy(true);
    try {
      await deleteDoctorAsset(currentPath);
      onRemoved();
    } catch (err) {
      setError(err instanceof AppError ? err.message : t('profile.assetUploadError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        <View style={styles.previewBox}>
          {previewUrl ? (
            <Image source={{ uri: previewUrl }} style={styles.preview} resizeMode="contain" />
          ) : (
            <Ionicons name="image-outline" size={28} color={Colors.textSubtle} />
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handlePickFile}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={currentPath ? t('profile.replaceFile') : t('profile.chooseFile')}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryAction,
              busy && styles.disabled,
              pressed && !busy && styles.pressed,
              webCursor,
            ]}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={16}
              color={Colors.primaryForeground}
              style={styles.icon}
            />
            <Text style={styles.primaryLabel}>
              {busy
                ? t('profile.uploading')
                : currentPath
                  ? t('profile.replaceFile')
                  : t('profile.chooseFile')}
            </Text>
          </Pressable>

          {currentPath && (
            <Pressable
              onPress={handleRemove}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('profile.removeFile')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryAction,
                busy && styles.disabled,
                pressed && !busy && styles.pressed,
                webCursor,
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={Colors.error}
                style={styles.icon}
              />
              <Text style={styles.secondaryLabel}>{t('profile.removeFile')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {Platform.OS === 'web' && (
        // input DOM nativo — mais direto que expo-image-picker no web, e
        // consistente com o padrão de branch por Platform.OS === 'web' já
        // usado em app/report/preview.tsx
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewBox: {
    width: 88,
    height: 88,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  primaryAction: {
    backgroundColor: Colors.primary,
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  primaryLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.primaryForeground,
  },
  secondaryLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.error,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
