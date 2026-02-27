#!/usr/bin/env node
/**
 * SessionStart hook runner — invoked by Claude Code at session start.
 * Loads CORE context (USER.md, PREFERENCES.md, ACTIVE_PROJECTS.md) and
 * outputs confirmation to stderr.
 */

import 'dotenv/config';
import { SessionStartHook } from '../SessionStartHook';
import { CoreManager } from '../../memory/core/CoreManager';
import { PrepromptInjector } from '../../context/PrepromptInjector';
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

    const coreManager = new CoreManager(memoryBasePath);
    const prepromptInjector = new PrepromptInjector();

    const hook = new SessionStartHook(coreManager, prepromptInjector, {
      outputConfirmation: true,
      outputFn: (msg: string) => process.stderr.write(msg + '\n'),
    });

    const hookEvent = {
      type: 'session_start',
      metadata: {
        sessionId: (event.session_id as string) || `cam-${Date.now()}`,
        source: (event.session_source as string) || 'start',
        resuming: event.session_source === 'resume',
        timestamp: new Date().toISOString(),
      },
    };

    await hook.handle(hookEvent as never);
  } catch {
    // Non-fatal — never block session start
  }

  process.exit(0);
}

main();
