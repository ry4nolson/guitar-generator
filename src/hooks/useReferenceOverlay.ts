import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_REFERENCE_SETTINGS,
  loadReferenceSettings,
  saveReferenceSettings,
  type ReferenceOverlaySettings,
} from '../state/referenceOverlay';
import { useDesignStore } from '../state/store';

/** Holds the optional tracing reference image for the canvas.
 * Settings (opacity/scale/rotation/offset/flags) persist in localStorage; the
 * image bytes stay in-memory as an object URL for the session only.
 */
export function useReferenceOverlay() {
  const [settings, setSettingsState] = useState<ReferenceOverlaySettings>(() => loadReferenceSettings());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  const setSettings = useCallback((patch: Partial<ReferenceOverlaySettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveReferenceSettings(next);
      return next;
    });
  }, []);

  const loadImageFile = useCallback(
    (file: File) => {
      if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
        throw new Error('Reference image must be a PNG, JPEG, or WebP file.');
      }
      const url = URL.createObjectURL(file);
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = url;
      setImageUrl(url);
      const img = new Image();
      img.onload = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = url;
      setSettings({ visible: true });
      // First reference load: drop body opacity so the image shows through for tracing.
      const { settings: editor, setBodyOpacity } = useDesignStore.getState();
      if ((editor.bodyOpacity ?? 1) >= 0.99) setBodyOpacity(0.5);
    },
    [setSettings],
  );

  const removeImage = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    setImageUrl(null);
    setNaturalSize(null);
  }, []);

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState({ ...DEFAULT_REFERENCE_SETTINGS });
    saveReferenceSettings({ ...DEFAULT_REFERENCE_SETTINGS });
  }, []);

  return {
    settings,
    setSettings,
    resetSettings,
    imageUrl,
    naturalSize,
    loadImageFile,
    removeImage,
    hasImage: imageUrl !== null,
  };
}

export type ReferenceOverlayApi = ReturnType<typeof useReferenceOverlay>;
