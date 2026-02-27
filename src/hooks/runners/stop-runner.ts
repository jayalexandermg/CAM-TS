#!/usr/bin/env node
/**
 * Stop hook runner — invoked by Claude Code when a session ends.
 * Finalizes UOCS session, writes learnings and summary.
 */

import 'dotenv/config';
import { StopHook } from '../StopHook';
import { UOCS } from '../../history/UOCS';
import { HistoryStorage } from '../../history/HistoryStorage';
import * as os from 'os';
import * as path from 'path';

async function main(): Promise<void> {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let event: Record<string, unknown> = {};
  try {
    event = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  try {
    const memoryBasePath = process.env.CAM_MEMORY_BASE_DIR
      ? process.env.CAM_MEMORY_BASE_DIR.replace('~', os.homedir())
      : path.join(os.homedir(), '.infinite-aura-ts', 'memory');

    const storage = new HistoryStorage(memoryBasePath);
    const uocs = new UOCS(storage);
    const hook = new StopHook(uocs);

    const sessionId = (event.session_id as string) || `cam-${Date.now()}`;
    await hook.execute({ sessionId, reason: 'complete' });
  } catch {
    // Non-fatal
  }

  process.exit(0);
}

main();
