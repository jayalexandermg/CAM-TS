#!/usr/bin/env node
/**
 * PostToolUse hook runner — invoked by Claude Code after every tool use.
 * Reads JSON from stdin, processes via PostToolUseHook, captures to UOCS.
 */

import 'dotenv/config';
import { PostToolUseHook } from '../PostToolUseHook';
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
    const hook = new PostToolUseHook({ uocs });

    await hook.handle(event as never);
  } catch {
    // Non-fatal — never block Claude Code due to CAM errors
  }

  process.exit(0);
}

main();
