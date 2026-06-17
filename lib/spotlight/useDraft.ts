'use client';
// lib/spotlight/useDraft.ts
// ─────────────────────────────────────────────────────────────────────────────
// React hook managing the full draft lifecycle.
//
// WHAT IT DOES:
//   1. On mount: checks localStorage for existing draft token
//   2. If found: loads draft from API, returns restored state
//   3. If not found: waits for participant to start (initDraft called on first answer)
//   4. Exposes triggerSave() — debounced, so it won't fire on every keystroke
//   5. Tracks save status for the AutoSaveIndicator
//
// USED BY: QuestionnaireFlow.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  DraftData,
  SaveDraftPayload,
  AutoSaveStatus,
} from './types';
import {
  getDraftToken,
  storeDraftToken,
  clearDraftToken,
  createDraft,
  loadDraft,
  saveDraft,
} from './draft';

const DEBOUNCE_MS = 2000; // 2 seconds after last change before saving

export type UseDraftReturn = {
  /** True while the initial draft restore is in progress */
  isRestoring: boolean;
  /** Null until a draft is created or restored */
  draftToken: string | null;
  /** Current auto-save indicator state */
  saveStatus: AutoSaveStatus;
  /** Restored draft data — null if starting fresh */
  restoredDraft: DraftData | null;
  /** Initialises a new draft — call when participant begins their first answer */
  initDraft: () => Promise<string | null>;
  /** Debounced save — safe to call on every state change */
  triggerSave: (payload: SaveDraftPayload) => void;
  /** Clears the draft token from localStorage (for start-over) */
  clearDraft: () => void;
};

export function useDraft(): UseDraftReturn {
  const [draftToken,    setDraftToken]    = useState<string | null>(null);
  const [saveStatus,    setSaveStatus]    = useState<AutoSaveStatus>('idle');
  const [isRestoring,   setIsRestoring]   = useState(true);
  const [restoredDraft, setRestoredDraft] = useState<DraftData | null>(null);

  const debounceTimer  = useRef<ReturnType<typeof setTimeout>>();
  const pendingPayload = useRef<SaveDraftPayload | null>(null);
  const tokenRef       = useRef<string | null>(null);

  // ── RESTORE ON MOUNT ──────────────────────────────────────────────────
  useEffect(() => {
    async function restore() {
      const stored = getDraftToken();
      if (!stored) {
        setIsRestoring(false);
        return;
      }
      try {
        const draft = await loadDraft(stored);
        if (draft) {
          setDraftToken(stored);
          tokenRef.current = stored;
          setRestoredDraft(draft);
        } else {
          // Token invalid (draft deleted or expired) — clear and start fresh
          clearDraftToken();
        }
      } catch {
        // Network error — clear token so we don't block the flow
        clearDraftToken();
      } finally {
        setIsRestoring(false);
      }
    }
    restore();
  }, []);

  // ── INIT (create a new draft) ─────────────────────────────────────────
  const initDraft = useCallback(async (): Promise<string | null> => {
    // Don't create a second draft if one already exists
    if (tokenRef.current) return tokenRef.current;

    try {
      const { draft_token } = await createDraft();
      storeDraftToken(draft_token);
      setDraftToken(draft_token);
      tokenRef.current = draft_token;
      return draft_token;
    } catch (err) {
      console.error('[useDraft] createDraft failed:', err);
      return null;
    }
  }, []);

  // ── SAVE (debounced) ──────────────────────────────────────────────────
  const executeSave = useCallback(async () => {
    const token   = tokenRef.current;
    const payload = pendingPayload.current;
    if (!token || !payload) return;

    setSaveStatus('saving');
    try {
      await saveDraft(token, payload);
      setSaveStatus('saved');
      // Reset to idle after 2s so the checkmark doesn't linger
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[useDraft] saveDraft failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, []);

  const triggerSave = useCallback((payload: SaveDraftPayload) => {
    pendingPayload.current = payload;

    // If no draft yet, create one first then save
    if (!tokenRef.current) {
      initDraft().then(token => {
        if (token) executeSave();
      });
      return;
    }

    // Debounce: reset the timer on every call
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(executeSave, DEBOUNCE_MS);
  }, [initDraft, executeSave]);

  const clearDraft = useCallback(() => {
    clearDraftToken();
    setDraftToken(null);
    tokenRef.current = null;
    setRestoredDraft(null);
    setSaveStatus('idle');
  }, []);

  return {
    isRestoring,
    draftToken,
    saveStatus,
    restoredDraft,
    initDraft,
    triggerSave,
    clearDraft,
  };
}
