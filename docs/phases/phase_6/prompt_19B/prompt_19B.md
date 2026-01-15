PROMPT 19B: Production Config + Logging
Phase: 6 (Production Ready)
Parallel: ✅ Can run with 19A

⚠️ PACKAGE MANAGER: PNPM ONLY
📋 OBJECTIVE
Add production configuration and logging system.

📦 REQUIREMENTS
1. Configuration System
Create src/config/types.ts:

typescript
Copy
export interface CAMConfig {
  memory: {
    baseDir: string;
  };
  orchestrator: {
    maxConcurrentTasks: number;
    defaultTimeout: number;
  };
  llm: {
    provider: string;
    model: string;
    apiKey?: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
}
Create src/config/ConfigManager.ts:

Load from file (~/.infinite-aura-ts/config.json)
Environment variable overrides
Default values
2. Logger
Create src/utils/Logger.ts:

Log levels (debug, info, warn, error)
File output option
Structured logging (JSON)
3. Tests
Create tests for config and logging.

📁 FILES TO CREATE
src/config/types.ts
src/config/ConfigManager.ts
src/config/index.ts
src/utils/Logger.ts
tests/config/ConfigManager.test.ts (10-12 tests)
tests/utils/Logger.test.ts (8-10 tests)
Total: 6 files, 18-22 tests

✅ SUCCESS CRITERIA
✅ ConfigManager loads/saves config
✅ Logger works with levels
✅ 18-22 tests passing
END OF PROMPT 19B
