/**
 * Infinite Aura - Security Patterns
 *
 * Detection utilities for common attack vectors.
 * Adapted from Daniel's 10-tier attack patterns for comprehensive security.
 */

// ============================================================================
// Pattern Detection Result Types
// ============================================================================

export interface PatternMatch {
  matched: boolean;
  pattern?: string;
  position?: number;
  value?: string;
}

export interface ViolationDetails {
  detected: boolean;
  violations: PatternMatch[];
  message: string;
}

// ============================================================================
// Security Patterns Utility Class
// ============================================================================

export class SecurityPatterns {
  // -------------------------------------------------------------------------
  // Tier 1: Path Traversal Patterns
  // -------------------------------------------------------------------------

  private static readonly PATH_TRAVERSAL_PATTERNS: RegExp[] = [
    /\.\.\//g, // Unix parent directory
    /\.\.\\/g, // Windows parent directory
    /%2e%2e%2f/gi, // URL encoded ../
    /%2e%2e\//gi, // Mixed encoding ../
    /\.\.%2f/gi, // Mixed encoding ../
    /%2e%2e%5c/gi, // URL encoded ..\
    /%252e%252e%252f/gi, // Double URL encoded ../
    /\.\.%255c/gi, // Double encoded ..\
    /%%32%65%%32%65%%32%66/gi, // Triple encoded ../
    /\.\.;/g, // Path truncation variant
  ];

  /**
   * Detect path traversal attempts in a string
   */
  static detectPathTraversal(input: string | null | undefined): ViolationDetails {
    if (input === null || input === undefined) {
      return { detected: false, violations: [], message: 'Input is null or undefined' };
    }

    if (typeof input !== 'string') {
      return { detected: false, violations: [], message: 'Input is not a string' };
    }

    if (input === '') {
      return { detected: false, violations: [], message: 'Input is empty' };
    }

    const violations: PatternMatch[] = [];

    for (const pattern of this.PATH_TRAVERSAL_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(input)) !== null) {
        violations.push({
          matched: true,
          pattern: pattern.source,
          position: match.index,
          value: match[0],
        });
      }
    }

    return {
      detected: violations.length > 0,
      violations,
      message:
        violations.length > 0
          ? `Path traversal detected: ${violations.length} violation(s) found`
          : 'No path traversal detected',
    };
  }

  // -------------------------------------------------------------------------
  // Tier 2: Command Injection Patterns
  // -------------------------------------------------------------------------

  private static readonly COMMAND_INJECTION_PATTERNS: RegExp[] = [
    /;/g, // Command separator
    /\|/g, // Pipe
    /&/g, // Background/AND
    /\$\(/g, // Command substitution
    /`/g, // Backtick command substitution
    /\$\{/g, // Variable expansion
    />\s*\//g, // Redirect to absolute path
    /<\s*\//g, // Input redirect from absolute path
    /\n/g, // Newline injection
    /\r/g, // Carriage return injection
  ];

  /**
   * Detect command injection attempts in a string
   */
  static detectCommandInjection(input: string | null | undefined): ViolationDetails {
    if (input === null || input === undefined) {
      return { detected: false, violations: [], message: 'Input is null or undefined' };
    }

    if (typeof input !== 'string') {
      return { detected: false, violations: [], message: 'Input is not a string' };
    }

    if (input === '') {
      return { detected: false, violations: [], message: 'Input is empty' };
    }

    const violations: PatternMatch[] = [];

    for (const pattern of this.COMMAND_INJECTION_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(input)) !== null) {
        violations.push({
          matched: true,
          pattern: pattern.source,
          position: match.index,
          value: match[0],
        });
      }
    }

    return {
      detected: violations.length > 0,
      violations,
      message:
        violations.length > 0
          ? `Command injection detected: ${violations.length} violation(s) found`
          : 'No command injection detected',
    };
  }

  // -------------------------------------------------------------------------
  // Tier 3: Null Byte Injection Patterns
  // -------------------------------------------------------------------------

  private static readonly NULL_BYTE_PATTERNS: RegExp[] = [
    // eslint-disable-next-line no-control-regex
    /\x00/g, // Literal null byte
    /%00/gi, // URL encoded null
    /\\0/g, // Escaped null
    // eslint-disable-next-line no-control-regex
    /\u0000/g, // Unicode null
    /%u0000/gi, // Unicode URL encoded null
  ];

  /**
   * Detect null byte injection attempts
   */
  static detectNullByte(input: string | null | undefined): ViolationDetails {
    if (input === null || input === undefined) {
      return { detected: false, violations: [], message: 'Input is null or undefined' };
    }

    if (typeof input !== 'string') {
      return { detected: false, violations: [], message: 'Input is not a string' };
    }

    if (input === '') {
      return { detected: false, violations: [], message: 'Input is empty' };
    }

    const violations: PatternMatch[] = [];

    for (const pattern of this.NULL_BYTE_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(input)) !== null) {
        violations.push({
          matched: true,
          pattern: pattern.source,
          position: match.index,
          value: match[0],
        });
      }
    }

    return {
      detected: violations.length > 0,
      violations,
      message:
        violations.length > 0
          ? `Null byte injection detected: ${violations.length} violation(s) found`
          : 'No null byte injection detected',
    };
  }

  // -------------------------------------------------------------------------
  // Tier 4: Absolute Path Detection
  // -------------------------------------------------------------------------

  private static readonly ABSOLUTE_PATH_PATTERNS: RegExp[] = [
    /^\//, // Unix absolute path
    /^[A-Za-z]:[/\\]/, // Windows drive letter
    /^\\\\/, // Windows UNC path
    /^file:\/\//i, // File URI
  ];

  /**
   * Detect absolute path usage
   */
  static detectAbsolutePath(input: string | null | undefined): ViolationDetails {
    if (input === null || input === undefined) {
      return { detected: false, violations: [], message: 'Input is null or undefined' };
    }

    if (typeof input !== 'string') {
      return { detected: false, violations: [], message: 'Input is not a string' };
    }

    if (input === '') {
      return { detected: false, violations: [], message: 'Input is empty' };
    }

    const violations: PatternMatch[] = [];

    for (const pattern of this.ABSOLUTE_PATH_PATTERNS) {
      if (pattern.test(input)) {
        violations.push({
          matched: true,
          pattern: pattern.source,
          position: 0,
          value: input.match(pattern)?.[0] ?? '',
        });
      }
    }

    return {
      detected: violations.length > 0,
      violations,
      message:
        violations.length > 0
          ? `Absolute path detected: ${violations.length} violation(s) found`
          : 'No absolute path detected',
    };
  }

  // -------------------------------------------------------------------------
  // Tier 5: Symlink/Special File Patterns
  // -------------------------------------------------------------------------

  private static readonly SPECIAL_FILE_PATTERNS: RegExp[] = [
    /\/dev\//i, // Device files
    /\/proc\//i, // Process filesystem
    /\/sys\//i, // Sysfs
    /\/etc\/passwd/i, // Password file
    /\/etc\/shadow/i, // Shadow file
    /\.lnk$/i, // Windows shortcut
    /^CON$/i, // Windows reserved: CON
    /^PRN$/i, // Windows reserved: PRN
    /^AUX$/i, // Windows reserved: AUX
    /^NUL$/i, // Windows reserved: NUL
    /^COM[1-9]$/i, // Windows reserved: COM ports
    /^LPT[1-9]$/i, // Windows reserved: LPT ports
  ];

  /**
   * Detect symlink or special file references
   */
  static detectSpecialFile(input: string | null | undefined): ViolationDetails {
    if (input === null || input === undefined) {
      return { detected: false, violations: [], message: 'Input is null or undefined' };
    }

    if (typeof input !== 'string') {
      return { detected: false, violations: [], message: 'Input is not a string' };
    }

    if (input === '') {
      return { detected: false, violations: [], message: 'Input is empty' };
    }

    const violations: PatternMatch[] = [];

    for (const pattern of this.SPECIAL_FILE_PATTERNS) {
      if (pattern.test(input)) {
        const match = input.match(pattern);
        violations.push({
          matched: true,
          pattern: pattern.source,
          position: match?.index ?? 0,
          value: match?.[0] ?? '',
        });
      }
    }

    return {
      detected: violations.length > 0,
      violations,
      message:
        violations.length > 0
          ? `Special file pattern detected: ${violations.length} violation(s) found`
          : 'No special file patterns detected',
    };
  }

  // -------------------------------------------------------------------------
  // Tier 6: URL/Protocol Injection
  // -------------------------------------------------------------------------

  private static readonly PROTOCOL_PATTERNS: RegExp[] = [
    /^javascript:/i, // JavaScript protocol
    /^data:/i, // Data URI
    /^vbscript:/i, // VBScript
    /^file:/i, // File protocol
    /^ftp:/i, // FTP
    /^gopher:/i, // Gopher
    /^ldap:/i, // LDAP
  ];

  /**
   * Detect dangerous protocol usage
   */
  static detectDangerousProtocol(input: string | null | undefined): ViolationDetails {
    if (input === null || input === undefined) {
      return { detected: false, violations: [], message: 'Input is null or undefined' };
    }

    if (typeof input !== 'string') {
      return { detected: false, violations: [], message: 'Input is not a string' };
    }

    if (input === '') {
      return { detected: false, violations: [], message: 'Input is empty' };
    }

    const violations: PatternMatch[] = [];

    for (const pattern of this.PROTOCOL_PATTERNS) {
      if (pattern.test(input)) {
        violations.push({
          matched: true,
          pattern: pattern.source,
          position: 0,
          value: input.match(pattern)?.[0] ?? '',
        });
      }
    }

    return {
      detected: violations.length > 0,
      violations,
      message:
        violations.length > 0
          ? `Dangerous protocol detected: ${violations.length} violation(s) found`
          : 'No dangerous protocols detected',
    };
  }

  // -------------------------------------------------------------------------
  // Tier 7: Encoding Attack Patterns
  // -------------------------------------------------------------------------

  private static readonly ENCODING_ATTACK_PATTERNS: RegExp[] = [
    /%[0-9A-Fa-f]{2}%[0-9A-Fa-f]{2}/g, // Double encoding
    /\\x[0-9A-Fa-f]{2}/g, // Hex encoding
    /\\u[0-9A-Fa-f]{4}/g, // Unicode encoding
    /&#x?[0-9A-Fa-f]+;/g, // HTML entity encoding
    /\\[0-7]{1,3}/g, // Octal encoding
  ];

  /**
   * Detect encoding-based attack patterns
   */
  static detectEncodingAttack(input: string | null | undefined): ViolationDetails {
    if (input === null || input === undefined) {
      return { detected: false, violations: [], message: 'Input is null or undefined' };
    }

    if (typeof input !== 'string') {
      return { detected: false, violations: [], message: 'Input is not a string' };
    }

    if (input === '') {
      return { detected: false, violations: [], message: 'Input is empty' };
    }

    const violations: PatternMatch[] = [];

    for (const pattern of this.ENCODING_ATTACK_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(input)) !== null) {
        violations.push({
          matched: true,
          pattern: pattern.source,
          position: match.index,
          value: match[0],
        });
      }
    }

    return {
      detected: violations.length > 0,
      violations,
      message:
        violations.length > 0
          ? `Encoding attack pattern detected: ${violations.length} violation(s) found`
          : 'No encoding attacks detected',
    };
  }

  // -------------------------------------------------------------------------
  // Combined Security Check
  // -------------------------------------------------------------------------

  /**
   * Run all security pattern checks on input
   */
  static checkAll(input: string | null | undefined): Record<string, ViolationDetails> {
    return {
      pathTraversal: this.detectPathTraversal(input),
      commandInjection: this.detectCommandInjection(input),
      nullByte: this.detectNullByte(input),
      absolutePath: this.detectAbsolutePath(input),
      specialFile: this.detectSpecialFile(input),
      dangerousProtocol: this.detectDangerousProtocol(input),
      encodingAttack: this.detectEncodingAttack(input),
    };
  }

  /**
   * Check if any security pattern is detected
   */
  static hasAnyViolation(input: string | null | undefined): boolean {
    const results = this.checkAll(input);
    return Object.values(results).some((result) => result.detected);
  }

  /**
   * Get all detected violations as a flat array
   */
  static getAllViolations(input: string | null | undefined): PatternMatch[] {
    const results = this.checkAll(input);
    return Object.values(results).flatMap((result) => result.violations);
  }
}
