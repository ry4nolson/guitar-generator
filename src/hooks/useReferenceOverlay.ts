import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createReferenceOverlayItem,
  isAllowedImageDataUrl,
  isAllowedReferenceImageFile,
  loadReferenceOverlays,
  normalizeReferenceOverlaysDocument,
  saveReferenceOverlays,
  type ReferenceOverlayItem,
  type ReferenceOverlaySettings,
  type ReferenceOverlaysDocument,
  type ReferenceOverlaysState,
} from '../state/referenceOverlay';
import { useDesignStore } from '../state/store';

export interface ReferenceOverlayRuntime {
  id: string;
  settings: ReferenceOverlaySettings;
  imageUrl: string | null;
  naturalSize: { width: number; height: number } | null;
}

type ImageMap = Record<string, { imageUrl: string; naturalSize: { width: number; height: number } | null }>;

function assertImageFile(file: File): void {
  if (!isAllowedReferenceImageFile(file)) {
    throw new Error('Reference image must be a PNG, JPEG, or WebP file.');
  }
}

function softDropBodyOpacityForTracing(): void {
  const { settings: editor, setBodyOpacity } = useDesignStore.getState();
  if ((editor.bodyOpacity ?? 1) >= 0.99) setBodyOpacity(0.5);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !isAllowedImageDataUrl(result)) {
        reject(new Error('Reference image must be a PNG, JPEG, or WebP file.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function measureImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to decode reference image.'));
    img.src = url;
  });
}

/** Holds optional tracing reference images for the canvas.
 * Transform settings persist in localStorage; bitmaps are kept in-memory as
 * data URLs and embedded into design JSON on Save / restored on Load.
 */
export function useReferenceOverlay() {
  const [persisted, setPersisted] = useState<ReferenceOverlaysState>(() => loadReferenceOverlays());
  const [images, setImages] = useState<ImageMap>({});
  const imagesRef = useRef<ImageMap>({});

  const persistUpdate = useCallback((updater: (prev: ReferenceOverlaysState) => ReferenceOverlaysState) => {
    setPersisted((prev) => {
      const next = updater(prev);
      saveReferenceOverlays(next);
      return next;
    });
  }, []);

  const setImageEntry = useCallback((id: string, imageUrl: string, naturalSize: { width: number; height: number } | null) => {
    const nextImages = {
      ...imagesRef.current,
      [id]: { imageUrl, naturalSize },
    };
    imagesRef.current = nextImages;
    setImages(nextImages);
  }, []);

  const clearImageEntry = useCallback((id: string) => {
    const nextImages = { ...imagesRef.current };
    delete nextImages[id];
    imagesRef.current = nextImages;
    setImages(nextImages);
  }, []);

  const assignDataUrl = useCallback(
    async (id: string, dataUrl: string) => {
      const naturalSize = await measureImage(dataUrl);
      setImageEntry(id, dataUrl, naturalSize);
      softDropBodyOpacityForTracing();
    },
    [setImageEntry],
  );

  const assignImageFile = useCallback(
    async (id: string, file: File) => {
      assertImageFile(file);
      const dataUrl = await readFileAsDataUrl(file);
      await assignDataUrl(id, dataUrl);
    },
    [assignDataUrl],
  );

  const addImageFile = useCallback(
    async (file: File) => {
      assertImageFile(file);
      const emptyId = persisted.overlays.find((o) => !imagesRef.current[o.id])?.id;
      if (emptyId) {
        persistUpdate((prev) => ({
          overlays: prev.overlays.map((o) => (o.id === emptyId ? { ...o, visible: true } : o)),
          activeId: emptyId,
        }));
        await assignImageFile(emptyId, file);
        return;
      }
      // The top-view stage is scale(-1,-1) (a 180° turn of body space), so an
      // unrotated bitmap renders upside-down. Start new photos upright on screen.
      const item = createReferenceOverlayItem({ visible: true, rotation: 180 });
      persistUpdate((prev) => {
        if (prev.overlays.some((o) => o.id === item.id)) return { ...prev, activeId: item.id };
        return { overlays: [...prev.overlays, item], activeId: item.id };
      });
      await assignImageFile(item.id, file);
    },
    [assignImageFile, persistUpdate, persisted.overlays],
  );

  const replaceImageFile = useCallback(
    async (id: string, file: File) => {
      persistUpdate((prev) => {
        if (!prev.overlays.some((o) => o.id === id)) return prev;
        return {
          overlays: prev.overlays.map((o) => (o.id === id ? { ...o, visible: true } : o)),
          activeId: id,
        };
      });
      await assignImageFile(id, file);
    },
    [assignImageFile, persistUpdate],
  );

  const removeOverlay = useCallback(
    (id: string) => {
      clearImageEntry(id);
      persistUpdate((prev) => {
        const overlays = prev.overlays.filter((o) => o.id !== id);
        const activeId = prev.activeId === id ? (overlays[overlays.length - 1]?.id ?? null) : prev.activeId;
        return { overlays, activeId };
      });
    },
    [clearImageEntry, persistUpdate],
  );

  const setActiveId = useCallback(
    (id: string | null) => {
      persistUpdate((prev) => {
        if (id !== null && !prev.overlays.some((o) => o.id === id)) return prev;
        return { ...prev, activeId: id };
      });
    },
    [persistUpdate],
  );

  const updateOverlay = useCallback(
    (id: string, patch: Partial<ReferenceOverlaySettings>) => {
      persistUpdate((prev) => ({
        ...prev,
        overlays: prev.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      }));
    },
    [persistUpdate],
  );

  /** Snapshot for design JSON (settings + base64 images). */
  const toDocument = useCallback((): ReferenceOverlaysDocument => {
    return {
      activeId: persisted.activeId,
      overlays: persisted.overlays.map((item) => {
        const img = imagesRef.current[item.id];
        return img?.imageUrl && isAllowedImageDataUrl(img.imageUrl)
          ? { ...item, imageDataUrl: img.imageUrl }
          : { ...item };
      }),
    };
  }, [persisted.activeId, persisted.overlays]);

  /** Restore overlays from a loaded design JSON. */
  const hydrateFromDocument = useCallback(
    (raw: ReferenceOverlaysDocument | undefined | null) => {
      const doc = normalizeReferenceOverlaysDocument(raw);
      imagesRef.current = {};
      setImages({});

      const nextImages: ImageMap = {};
      for (const item of doc.overlays) {
        if (item.imageDataUrl && isAllowedImageDataUrl(item.imageDataUrl)) {
          nextImages[item.id] = { imageUrl: item.imageDataUrl, naturalSize: null };
        }
      }
      imagesRef.current = nextImages;
      setImages(nextImages);

      const settingsOnly: ReferenceOverlaysState = {
        activeId: doc.activeId,
        overlays: doc.overlays.map(({ imageDataUrl: _img, ...rest }) => rest),
      };
      setPersisted(settingsOnly);
      saveReferenceOverlays(settingsOnly);

      // Measure natural sizes asynchronously.
      for (const [id, entry] of Object.entries(nextImages)) {
        void measureImage(entry.imageUrl)
          .then((naturalSize) => {
            setImages((prev) => {
              const cur = prev[id];
              if (!cur || cur.imageUrl !== entry.imageUrl) return prev;
              const updated = { ...prev, [id]: { ...cur, naturalSize } };
              imagesRef.current = updated;
              return updated;
            });
          })
          .catch(() => {
            // Drop undecodable payloads so the UI stays usable.
            clearImageEntry(id);
          });
      }

      if (doc.overlays.some((o) => o.imageDataUrl)) softDropBodyOpacityForTracing();
    },
    [clearImageEntry],
  );

  useEffect(() => {
    // data URLs need no revoke; kept for symmetry if blob URLs ever return.
    return () => {
      imagesRef.current = {};
    };
  }, []);

  const overlays: ReferenceOverlayRuntime[] = persisted.overlays.map((item) => {
    const { id, ...settings } = item;
    const img = images[id];
    return {
      id,
      settings,
      imageUrl: img?.imageUrl ?? null,
      naturalSize: img?.naturalSize ?? null,
    };
  });

  const activeOverlay = overlays.find((o) => o.id === persisted.activeId) ?? overlays[0] ?? null;
  const hasAnyImage = overlays.some((o) => o.imageUrl !== null);
  const hasVisibleImage = overlays.some((o) => o.imageUrl !== null && o.settings.visible);

  const settings = activeOverlay?.settings ?? {
    visible: true,
    locked: false,
    opacity: 0.45,
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
  };

  return {
    overlays,
    activeId: activeOverlay?.id ?? null,
    activeOverlay,
    setActiveId,
    addImageFile,
    replaceImageFile,
    removeOverlay,
    updateOverlay,
    toDocument,
    hydrateFromDocument,
    hasAnyImage,
    hasVisibleImage,
    /** @deprecated use hasAnyImage / hasVisibleImage */
    hasImage: hasAnyImage,
    /** @deprecated use activeOverlay / updateOverlay */
    settings,
    /** @deprecated use updateOverlay(activeId, patch) */
    setSettings: (patch: Partial<ReferenceOverlaySettings>) => {
      const id = activeOverlay?.id;
      if (!id) return;
      updateOverlay(id, patch);
    },
    /** @deprecated use activeOverlay.imageUrl */
    imageUrl: activeOverlay?.imageUrl ?? null,
    /** @deprecated use activeOverlay.naturalSize */
    naturalSize: activeOverlay?.naturalSize ?? null,
    /** @deprecated use addImageFile / replaceImageFile */
    loadImageFile: (file: File) => {
      if (activeOverlay?.imageUrl) void replaceImageFile(activeOverlay.id, file);
      else void addImageFile(file);
    },
    /** @deprecated use removeOverlay */
    removeImage: () => {
      if (activeOverlay) removeOverlay(activeOverlay.id);
    },
    resetSettings: () => {
      imagesRef.current = {};
      setImages({});
      persistUpdate(() => ({ overlays: [], activeId: null }));
    },
  };
}

export type ReferenceOverlayApi = ReturnType<typeof useReferenceOverlay>;

export type { ReferenceOverlayItem };
