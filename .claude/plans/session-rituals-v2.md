# CAM Session Rituals v2 — Greeting, SOS Brief, EOS Passdown

## Architecture: Session Journal Pattern

Instead of truncating raw conversation history for EOS generation, use a
session-scoped append-only JSONL journal that captures structured events
in real-time. The journal is the single source for EOS passdown generation.

### Journal Lifecycle
1. Session start → journal wiped, `session_start` entry logged
2. During session → turns auto-logged, mode switches logged
3. EOS → LLM reads journal (5-20KB structured) + 4-step checkin → writes passdown
4. Journal wiped after passdown saved. Passdown is the durable artifact.

## Files

### New Files
| File | Purpose |
|------|---------|
| `src/memory/passdown/types.ts` | Journal entry types, passdown types |
| `src/memory/passdown/SessionJournal.ts` | Append-only JSONL session journal |
| `src/memory/passdown/EOSPassdownManager.ts` | EOS/SOS file I/O |
| `tests/memory/passdown/SessionJournal.test.ts` | Journal tests |
| `tests/memory/passdown/EOSPassdownManager.test.ts` | Passdown manager tests |

### Modified Files
| File | Change |
|------|--------|
| `src/cli/OrchestratorBridge.ts` | +generateGreeting(), +generateSOSBrief(), +generateEOSPassdown() |
| `src/cli/InteractiveMode.ts` | Wire rituals into start/exit, add skipRituals option |

## Fixes from Review

| # | Fix | How |
|---|-----|-----|
| 1 | readline close race | EOS checkin runs on existing `rl` before `rl.close()` |
| 2 | userName extraction | `sessionStartHook.getLastLoadedContext()?.user` with regex, fallback to `'there'` |
| 3 | passdownManager construction | Created in `start()` with config-driven base path |
| 4 | Blocking LLM calls at startup | `Promise.all()` for greeting + brief, 5s timeout on greeting |
| 5 | Test breakage | `skipRituals` option; when true, old code path runs unchanged |

## Implementation

### 1. types.ts
```typescript
type JournalEntryType = 'session_start' | 'session_end' | 'turn' | 'decision'
  | 'action' | 'iteration' | 'blocker' | 'discovery' | 'note' | 'mode_switch';

interface JournalEntry {
  t: JournalEntryType;
  ts: string;       // ISO timestamp
  what: string;     // human-readable description
  meta?: Record<string, unknown>;
}
```

### 2. SessionJournal
- Constructor takes `memoryBasePath`, writes to `{base}/session-journal.jsonl`
- `start(sessionId)` — wipes file, logs session_start
- `log(type, what, meta?)` — appends JSONL line
- `getEntries()` — reads all entries
- `getFormattedSummary()` — groups by type, returns markdown
- `wipe()` — deletes file

### 3. EOSPassdownManager
- Constructor takes `memoryBasePath`
- `initialize()` — creates `eos-passdowns/` and `session-briefs/` dirs
- `writeEOS(sessionId, content)` — saves markdown, returns path
- `getLatestEOS()` — reads dir, sorts by filename, returns latest content
- `writeSOS(sessionId, content)` — saves brief

### 4. OrchestratorBridge — 3 new methods
- `generateGreeting(userName)` — 1-2 sentence casual greeting via llmClient.chat()
- `generateSOSBrief(eosPassdown, userName)` — Northstar-first session brief
- `generateEOSPassdown(journalSummary, sessionMeta, userName, checkinResponses)` — structured passdown

All three have try/catch with static fallback strings.

### 5. InteractiveMode changes

**Options**: Add `skipRituals?: boolean` (default false)

**start()**: After triggerSessionStart, if !skipRituals:
- Create passdownManager + journal
- `displayWelcomeAndBrief()` — parallel greeting + brief with timeout

**processInput()**: For exit/quit:
- If journal active → `runEOSCheckin()` on existing rl → then rl.close()

**processNaturalLanguage()**: If journal active → log turn entry

**runEOSCheckin()**: 4 steps using rl.question():
1. Open threads prompt
2. Energy level (1-5)
3. Brain dump
4. Generate passdown from journal + checkin → save → wipe journal

**extractUserName()**: sessionStartHook?.getLastLoadedContext()?.user → regex → fallback 'there'

## Storage Layout
```
~/.infinite-aura-ts/memory/
├── session-journal.jsonl          ← ephemeral, wiped each session
├── eos-passdowns/
│   └── 2026-03-03-171833.md       ← durable, one per session
└── session-briefs/
    └── 2026-03-04-091200.md       ← SOS brief, one per session
```

## Verification
1. `pnpm build` — clean compile
2. `pnpm test` — all passing
3. Manual: `node dist/cli/main.js` → greeting + fresh start message → type → exit → EOS passdown saved
4. Manual: second run → greeting + SOS brief from last EOS
