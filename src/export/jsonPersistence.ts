import type { DesignDocument } from '../state/store';
import { DESIGN_DOCUMENT_VERSION } from '../state/store';
import { defaultLayers } from '../state/layers';

export function serializeDocument(doc: DesignDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function deserializeDocument(json: string): DesignDocument {
  const parsed = JSON.parse(json);
  if (!parsed.bodyParams || !parsed.bodyAnchors || !parsed.neckParams || !parsed.hardware || !parsed.templateId) {
    throw new Error('Invalid design file: missing required sections.');
  }
  if (parsed.version === undefined) parsed.version = DESIGN_DOCUMENT_VERSION;
  if (parsed.version !== DESIGN_DOCUMENT_VERSION) {
    throw new Error(
      `This file was saved with design format v${parsed.version}, but this build expects v${DESIGN_DOCUMENT_VERSION}. No migration is available yet.`,
    );
  }
  if (!parsed.layers) parsed.layers = defaultLayers();
  if (parsed.settings && parsed.settings.showDebugOverlay === undefined) parsed.settings.showDebugOverlay = false;
  return parsed as DesignDocument;
}

export function downloadJson(doc: DesignDocument, filename = 'guitar-design.json') {
  const blob = new Blob([serializeDocument(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
