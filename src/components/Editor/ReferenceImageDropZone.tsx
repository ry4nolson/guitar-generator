import { useRef, useState, type ReactNode } from 'react';
import { useReferenceOverlayContext } from '../../state/ReferenceOverlayContext';
import { isAllowedReferenceImageFile } from '../../state/referenceOverlay';

function isFileDrag(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  return Array.from(dt.types).includes('Files');
}

/**
 * Accepts PNG/JPEG/WebP file drops onto the editor and adds each as a
 * reference overlay image.
 */
export function ReferenceImageDropZone({ children }: { children: ReactNode }) {
  const { addImageFile } = useReferenceOverlayContext();
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  const onDragEnter = (e: React.DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current += 1;
    setActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setActive(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = async (e: React.DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current = 0;
    setActive(false);

    const files = Array.from(e.dataTransfer.files).filter(isAllowedReferenceImageFile);
    if (files.length === 0) {
      alert('Reference image must be a PNG, JPEG, or WebP file.');
      return;
    }
    try {
      for (const file of files) {
        await addImageFile(file);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div
      className={`editor-drop-zone${active ? ' is-dragging' : ''}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
      {active && (
        <div className="editor-drop-hint" aria-hidden="true">
          Drop to add reference image
        </div>
      )}
    </div>
  );
}
