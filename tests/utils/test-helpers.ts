/**
 * Test Helpers for Infinite Aura
 *
 * Reusable utilities for testing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MemoryScaffold } from '../../src/memory/scaffold';
import { PathValidator } from '../../src/memory/path-validator';
import { SecurityAuditLogger, SecurityEvent } from '../../src/memory/security-audit';

/**
 * Create a temporary memory scaffold for testing
 */
export async function createTempMemoryScaffold(
  options: { enableSecurityAudit?: boolean; maxDepth?: number } = {}
): Promise<{ scaffold: MemoryScaffold; tempDir: string }> {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'infinite-aura-test-')
  );

  const scaffold = new MemoryScaffold(tempDir, {
    enableSecurityAudit: options.enableSecurityAudit ?? true,
    maxDepth: options.maxDepth ?? 3,
  });

  await scaffold.initialize();

  return { scaffold, tempDir };
}

/**
 * Cleanup temporary scaffold
 */
export async function cleanupTempScaffold(tempDir: string): Promise<void> {
  try {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Create a test file with content
 */
export async function createTestFile(
  basePath: string,
  relativePath: string,
  content: string
): Promise<string> {
  const fullPath = path.join(basePath, relativePath);
  const dir = path.dirname(fullPath);

  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(fullPath, content, 'utf-8');

  return fullPath;
}

/**
 * Assert that an audit log contains an expected entry
 */
export async function assertAuditLogContains(
  auditLogger: SecurityAuditLogger,
  expectedType: string,
  expectedMessagePart?: string
): Promise<SecurityEvent | undefined> {
  const events = await auditLogger.getRecentEvents(100);

  const found = events.find((event) => {
    if (event.type !== expectedType) return false;
    if (expectedMessagePart && !event.message.includes(expectedMessagePart)) return false;
    return true;
  });

  return found;
}

/**
 * Assert that an async function throws a specific error
 */
export async function assertThrowsAsync<T extends Error>(
  fn: () => Promise<unknown>,
  errorType: new (...args: unknown[]) => T,
  messagePart?: string
): Promise<T> {
  let threw = false;
  let error: T | undefined;

  try {
    await fn();
  } catch (e) {
    threw = true;
    if (e instanceof errorType) {
      error = e;
      if (messagePart && !e.message.includes(messagePart)) {
        throw new Error(
          `Expected error message to contain "${messagePart}" but got "${e.message}"`
        );
      }
    } else {
      throw new Error(
        `Expected error of type ${errorType.name} but got ${(e as Error).constructor.name}`
      );
    }
  }

  if (!threw) {
    throw new Error(`Expected function to throw ${errorType.name} but it did not throw`);
  }

  return error!;
}

/**
 * Generate random string for testing
 */
export function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Wait for a specified time (for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a temporary path validator
 */
export async function createTempPathValidator(): Promise<{
  pathValidator: PathValidator;
  tempDir: string;
}> {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'path-validator-test-')
  );

  const pathValidator = new PathValidator(tempDir);
  await pathValidator.ensureBasePathExists();

  return { pathValidator, tempDir };
}

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = Date.now();
  const result = await fn();
  const timeMs = Date.now() - start;
  return { result, timeMs };
}

/**
 * Run a function multiple times and measure average time
 */
export async function benchmark(
  fn: () => Promise<void>,
  iterations: number
): Promise<{ totalMs: number; avgMs: number; minMs: number; maxMs: number }> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { timeMs } = await measureTime(fn);
    times.push(timeMs);
  }

  return {
    totalMs: times.reduce((a, b) => a + b, 0),
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
  };
}

/**
 * Create large content for testing
 */
export function createLargeContent(sizeBytes: number): string {
  const line = 'This is a test line for large file testing.\n';
  const linesNeeded = Math.ceil(sizeBytes / line.length);
  return line.repeat(linesNeeded).slice(0, sizeBytes);
}

/**
 * Assert file exists
 */
export async function assertFileExists(filePath: string): Promise<void> {
  try {
    await fs.promises.access(filePath);
  } catch {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

/**
 * Assert file does not exist
 */
export async function assertFileNotExists(filePath: string): Promise<void> {
  try {
    await fs.promises.access(filePath);
    throw new Error(`Expected file NOT to exist: ${filePath}`);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw e;
    }
  }
}

/**
 * Assert directory exists
 */
export async function assertDirectoryExists(dirPath: string): Promise<void> {
  try {
    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Expected directory but found file: ${dirPath}`);
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error(`Expected directory to exist: ${dirPath}`);
    }
    throw e;
  }
}
