import { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { StepIndicator } from '@/components/report/StepIndicator';
import { MessageBox } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { uploadReportImage, deleteReportImage, listReportImages, getSignedImageUrl } from '@/services/images';
import { AppError } from '@/lib/errors';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { stepStyles as s } from '@/components/report/stepStyles';

import type { ReportImageRow } from '@/types/database';

const SLOTS: (1 | 2 | 3)[] = [1, 2, 3];

export function PhotosScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');

  const reportId = useReportStore((state) => state.reportId);
  const setStep = useReportStore((state) => state.setStep);

  const [images, setImages] = useState<ReportImageRow[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    if (!reportId) return;
    const rows = await listReportImages(reportId);
    setImages(rows);
    const urls: Record<string, string> = {};
    await Promise.all(
      rows.map(async (row) => {
        urls[row.id] = await getSignedImageUrl(row.image_url);
      }),
    );
    setPreviewUrls(urls);
  }, [reportId]);

  useEffect(() => {
    loadImages().catch(() => setError(tc('genericError')));
  }, [loadImages, tc]);

  type PhotoSource = 'camera' | 'gallery';

  // No celular o médico escolhe entre fotografar a lâmina na hora ou pegar da
  // galeria; no web só existe o seletor de arquivo.
  function askSource(): Promise<PhotoSource | null> {
    if (Platform.OS === 'web') return Promise.resolve('gallery');
    return new Promise((resolve) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [t('steps.photos.camera'), t('steps.photos.gallery'), tc('cancel')],
            cancelButtonIndex: 2,
          },
          (index) => resolve(index === 0 ? 'camera' : index === 1 ? 'gallery' : null),
        );
        return;
      }
      Alert.alert(
        t('steps.photos.addPhoto'),
        undefined,
        [
          { text: t('steps.photos.camera'), onPress: () => resolve('camera') },
          { text: t('steps.photos.gallery'), onPress: () => resolve('gallery') },
          { text: tc('cancel'), style: 'cancel', onPress: () => resolve(null) },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      );
    });
  }

  async function handlePick(sortOrder: 1 | 2 | 3) {
    if (!reportId) return;
    setError(null);
    try {
      const source = await askSource();
      if (!source) return;

      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t(source === 'camera' ? 'steps.photos.cameraDenied' : 'steps.photos.galleryDenied'));
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;

      setBusySlot(sortOrder);
      await uploadReportImage(reportId, result.assets[0].uri, sortOrder, result.assets[0].mimeType);
      await loadImages();
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setBusySlot(null);
    }
  }

  async function handleRemove(image: ReportImageRow) {
    setBusySlot(image.sort_order);
    setError(null);
    try {
      await deleteReportImage(image.id, image.image_url);
      await loadImages();
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setBusySlot(null);
    }
  }

  function handleNext() {
    setStep(3);
    router.push('/report/scores');
  }

  const canAdvance = images.length > 0;

  return (
    <View style={s.container}>
      <StepIndicator currentStep={2} />
      <Text style={s.title}>{t('steps.photos.title')}</Text>
      <Text style={photoStyles.hint}>{t('steps.photos.maxPhotos')}</Text>

      <View style={photoStyles.grid}>
        {SLOTS.map((slot) => {
          const image = images.find((img) => img.sort_order === slot);
          const isBusy = busySlot === slot;

          return (
            <TouchableOpacity
              key={slot}
              style={photoStyles.slot}
              onPress={() => (image ? handleRemove(image) : handlePick(slot))}
              disabled={isBusy}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={image ? t('steps.photos.removePhoto') : t('steps.photos.addPhoto')}
            >
              {image && previewUrls[image.id] ? (
                <>
                  <Image source={{ uri: previewUrls[image.id] }} style={photoStyles.thumbnail} />
                  <View style={photoStyles.removeBadge}>
                    <Ionicons name="close" size={14} color={Colors.primaryForeground} />
                  </View>
                </>
              ) : (
                <Ionicons name={isBusy ? 'hourglass-outline' : 'add'} size={28} color={Colors.textSubtle} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {!canAdvance && <Text style={photoStyles.hint}>{t('steps.photos.minPhotos')}</Text>}
      {error && <MessageBox message={error} type="error" />}

      <View style={s.nav}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
          <Text style={s.backText}>{t('nav.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.nextButton, !canAdvance && photoStyles.disabled]}
          onPress={handleNext}
          disabled={!canAdvance}
        >
          <Text style={s.nextText}>{t('nav.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default PhotosScreen;

const photoStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  slot: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
