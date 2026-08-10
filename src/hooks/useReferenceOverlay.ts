import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createReferenceOverlayItem,
  loadReferenceOverlays,
  saveReferenceOverlays,
  type ReferenceOverlayItem,
  type ReferenceOverlaySettings,
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
  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    throw new Error('Reference image must be a PNG, JPEG, or WebP file.');
  }
}

function softDropBodyOpacityForTracing(): void {
  const { settings: editor, setBodyOpacity } = useDesignStore.getState();
  if ((editor.bodyOpacity ?? 1) >= 0.99) setBodyOpacity(0.5);
}

/** Holds optional tracing reference images for the canvas.
 * Settings (opacity/scale/rotation/offset/flags) persist in localStorage; the
 * image bytes stay in-memory as object URLs for the session only.
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

  const revoke = useCallback((id: string) => {
    const entry = imagesRef.current[id];
    if (entry?.imageUrl) URL.revokeObjectURL(entry.imageUrl);
  }, []);

  const assignImage = useCallback(
    (id: string, file: File) => {
      assertImageFile(file);
      const url = URL.createObjectURL(file);
      revoke(id);
      const nextImages = {
        ...imagesRef.current,
        [id]: { imageUrl: url, naturalSize: null },
      };
      imagesRef.current = nextImages;
      setImages(nextImages);
      const img = new Image();
      img.onload = () => {
        setImages((prev) => {
          const cur = prev[id];
          if (!cur || cur.imageUrl !== url) return prev;
          const updated = {
            ...prev,
            [id]: { ...cur, naturalSize: { width: img.naturalWidth, height: img.naturalHeight } },
          };
          imagesRef.current = updated;
          return updated;
        });
      };
      img.src = url;
      softDropBodyOpacityForTracing();
    },
    [revoke],
  );

  const addImageFile = useCallback(
    (file: File) => {
      assertImageFile(file);
      const emptyId = persisted.overlays.find((o) => !imagesRef.current[o.id])?.id;
      if (emptyId) {
        persistUpdate((prev) => ({
          overlays: prev.overlays.map((o) => (o.id === emptyId ? { ...o, visible: true } : o)),
          activeId: emptyId,
        }));
        assignImage(emptyId, file);
        return;
      }
      const item = createReferenceOverlayItem({ visible: true });
      persistUpdate((prev) => {
        if (prev.overlays.some((o) => o.id === item.id)) return { ...prev, activeId: item.id };
        return { overlays: [...prev.overlays, item], activeId: item.id };
      });
      assignImage(item.id, file);
    },
    [assignImage, persistUpdate, persisted.overlays],
  );

  const replaceImageFile = useCallback(
    (id: string, file: File) => {
      persistUpdate((prev) => {
        if (!prev.overlays.some((o) => o.id === id)) return prev;
        return {
          overlays: prev.overlays.map((o) => (o.id === id ? { ...o, visible: true } : o)),
          activeId: id,
        };
      });
      assignImage(id, file);
    },
    [assignImage, persistUpdate],
  );

  const removeOverlay = useCallback(
    (id: string) => {
      revoke(id);
      const nextImages = { ...imagesRef.current };
      delete nextImages[id];
      imagesRef.current = nextImages;
      setImages(nextImages);
      persistUpdate((prev) => {
        const overlays = prev.overlays.filter((o) => o.id !== id);
        const activeId = prev.activeId === id ? (overlays[overlays.length - 1]?.id ?? null) : prev.activeId;
        return { overlays, activeId };
      });
    },
    [persistUpdate, revoke],
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

  useEffect(() => {
    return () => {
      for (const id of Object.keys(imagesRef.current)) {
        const entry = imagesRef.current[id];
        if (entry?.imageUrl) URL.revokeObjectURL(entry.imageUrl);
      }
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
      if (activeOverlay?.imageUrl) replaceImageFile(activeOverlay.id, file);
      else addImageFile(file);
    },
    /** @deprecated use removeOverlay */
    removeImage: () => {
      if (activeOverlay) removeOverlay(activeOverlay.id);
    },
    resetSettings: () => {
      for (const id of Object.keys(imagesRef.current)) revoke(id);
      imagesRef.current = {};
      setImages({});
      persistUpdate(() => ({ overlays: [], activeId: null }));
    },
  };
}

export type ReferenceOverlayApi = ReturnType<typeof useReferenceOverlay>;

export type { ReferenceOverlayItem };
