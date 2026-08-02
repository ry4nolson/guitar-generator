import type { DesignDocument } from '../state/store';
import { DESIGN_DOCUMENT_VERSION } from './migrateDocument';
import { migrateDesignDocument } from './migrateDocument';

export function serializeDocument(doc: DesignDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function deserializeDocument(json: string): DesignDocument {
  const parsed = JSON.parse(json);
  if (!parsed.bodyParams || !parsed.bodyAnchors || !parsed.neckParams || !parsed.hardware || !parsed.templateId) {
    throw new Error('Invalid design file: missing required sections.');
  }
  if (parsed.version === undefined) parsed.version = DESIGN_DOCUMENT_VERSION;
  const migrated = migrateDesignDocument(parsed);
  return migrated as unknown as DesignDocument;
}

export function downloadJson(doc: DesignDocument, filename = 'fretforge-design.json') {
  const blob = new Blob([serializeDocument(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
