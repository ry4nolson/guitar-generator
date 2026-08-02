import { useReferenceOverlayContext } from '../../state/ReferenceOverlayContext';

/**
 * Renders the optional tracing reference image in body-local mm space,
 * behind the SVG geometry. Excluded from exports because svgExport builds
 * documents from geometry alone and never mounts this component.
 */
export function ReferenceImageOverlay() {
  const { settings, imageUrl, naturalSize, hasImage } = useReferenceOverlayContext();
  if (!hasImage || !imageUrl || !naturalSize || !settings.visible) return null;

  // Map pixel image into mm roughly: default width ≈ body-ish 450mm.
  const baseWidthMm = 450;
  const aspect = naturalSize.height / naturalSize.width;
  const width = baseWidthMm * settings.scale;
  const height = width * aspect;
  const x = settings.offsetX;
  const y = settings.offsetY - height / 2;

  return (
    <image
      href={imageUrl}
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={settings.opacity}
      preserveAspectRatio="none"
      style={{ pointerEvents: settings.locked ? 'none' : 'none' }}
      data-reference-overlay="true"
    />
  );
}
