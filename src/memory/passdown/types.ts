/**
 * Session Journal & EOS Passdown Types
 *
 * Types for the session journal pattern: structured events captured
 * in real-time during a session, used to generate EOS passdowns.
 */

/** Journal entry type tags */
export type JournalEntryType =
  | 'session_start'
  | 'session_end'
  | 'turn'
  | 'decision'
  | 'action'
  | 'iteration'
  | 'blocker'
  | 'discovery'
  | 'note'
  | 'mode_switch';

/** A single structured journal entry (one JSONL line) */
export interface JournalEntry {
  /** Entry type tag */
  t: JournalEntryType;
  /** ISO timestamp */
  ts: string;
  /** Human-readable description */
  what: string;
  /** Optional structured metadata */
  meta?: Record<string, unknown>;
}

/** Session metadata passed to EOS generation */
export interface SessionMeta {
  duration: string;
  turnCount: number;
}

/** Responses from the 4-step EOS checkin */
export interface EOSCheckinResponses {
  questions?: string;
  energy?: string;
  brainDump?: string;
}
