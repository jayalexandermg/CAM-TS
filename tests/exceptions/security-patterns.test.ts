import { SecurityPatterns } from '../../src/exceptions/security-patterns';

describe('SecurityPatterns', () => {
  describe('detectPathTraversal', () => {
    it('should detect ../', () => {
      const result = SecurityPatterns.detectPathTraversal('../secret');

      expect(result.detected).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should detect ..\\', () => {
      const result = SecurityPatterns.detectPathTraversal('..\\windows');

      expect(result.detected).toBe(true);
    });

    it('should detect URL encoded ../', () => {
      const result = SecurityPatterns.detectPathTraversal('..%2f');

      expect(result.detected).toBe(true);
    });

    it('should detect mixed encoding ../', () => {
      const result = SecurityPatterns.detectPathTraversal('../');

      expect(result.detected).toBe(true);
    });

    it('should detect double URL encoded', () => {
      const result = SecurityPatterns.detectPathTraversal('%252e%252e%252f');

      expect(result.detected).toBe(true);
    });

    it('should detect multiple traversal sequences', () => {
      const result = SecurityPatterns.detectPathTraversal('../../etc/passwd');

      expect(result.detected).toBe(true);
      expect(result.violations.length).toBe(2);
    });

    it('should not detect safe paths', () => {
      const result = SecurityPatterns.detectPathTraversal('safe/path/file.txt');

      expect(result.detected).toBe(false);
      expect(result.violations).toEqual([]);
    });

    it('should handle null input', () => {
      const result = SecurityPatterns.detectPathTraversal(null);

      expect(result.detected).toBe(false);
      expect(result.message).toContain('null');
    });

    it('should handle undefined input', () => {
      const result = SecurityPatterns.detectPathTraversal(undefined);

      expect(result.detected).toBe(false);
      expect(result.message).toContain('undefined');
    });

    it('should handle empty string', () => {
      const result = SecurityPatterns.detectPathTraversal('');

      expect(result.detected).toBe(false);
      expect(result.message).toContain('empty');
    });

    it('should detect path truncation variant (..;)', () => {
      const result = SecurityPatterns.detectPathTraversal('..;/etc/passwd');

      expect(result.detected).toBe(true);
    });

    it('should provide violation details', () => {
      const result = SecurityPatterns.detectPathTraversal('../secret');
      const violation = result.violations[0];

      expect(violation.matched).toBe(true);
      expect(violation.position).toBeDefined();
      expect(violation.value).toBe('../');
    });
  });

  describe('detectCommandInjection', () => {
    it('should detect semicolon', () => {
      const result = SecurityPatterns.detectCommandInjection('file; rm -rf /');

      expect(result.detected).toBe(true);
    });

    it('should detect pipe', () => {
      const result = SecurityPatterns.detectCommandInjection('ls | grep secret');

      expect(result.detected).toBe(true);
    });

    it('should detect ampersand', () => {
      const result = SecurityPatterns.detectCommandInjection('cmd && evil');

      expect(result.detected).toBe(true);
    });

    it('should detect command substitution $()', () => {
      const result = SecurityPatterns.detectCommandInjection('echo $(whoami)');

      expect(result.detected).toBe(true);
    });

    it('should detect backtick substitution', () => {
      const result = SecurityPatterns.detectCommandInjection('echo `id`');

      expect(result.detected).toBe(true);
    });

    it('should detect variable expansion', () => {
      const result = SecurityPatterns.detectCommandInjection('${PATH}');

      expect(result.detected).toBe(true);
    });

    it('should detect redirect to absolute path', () => {
      const result = SecurityPatterns.detectCommandInjection('> /etc/passwd');

      expect(result.detected).toBe(true);
    });

    it('should detect newline injection', () => {
      const result = SecurityPatterns.detectCommandInjection('cmd\nevil');

      expect(result.detected).toBe(true);
    });

    it('should not detect safe filenames', () => {
      const result = SecurityPatterns.detectCommandInjection('safe_filename.txt');

      expect(result.detected).toBe(false);
    });

    it('should handle null input', () => {
      const result = SecurityPatterns.detectCommandInjection(null);

      expect(result.detected).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = SecurityPatterns.detectCommandInjection(undefined);

      expect(result.detected).toBe(false);
    });

    it('should handle empty string', () => {
      const result = SecurityPatterns.detectCommandInjection('');

      expect(result.detected).toBe(false);
    });
  });

  describe('detectNullByte', () => {
    it('should detect literal null byte', () => {
      const result = SecurityPatterns.detectNullByte('file\x00.txt');

      expect(result.detected).toBe(true);
    });

    it('should detect URL encoded null', () => {
      const result = SecurityPatterns.detectNullByte('file%00.txt');

      expect(result.detected).toBe(true);
    });

    it('should detect escaped null', () => {
      const result = SecurityPatterns.detectNullByte('file\\0.txt');

      expect(result.detected).toBe(true);
    });

    it('should detect unicode null', () => {
      const result = SecurityPatterns.detectNullByte('file\u0000.txt');

      expect(result.detected).toBe(true);
    });

    it('should detect unicode URL encoded null', () => {
      const result = SecurityPatterns.detectNullByte('file%u0000.txt');

      expect(result.detected).toBe(true);
    });

    it('should not detect safe strings', () => {
      const result = SecurityPatterns.detectNullByte('normal_file.txt');

      expect(result.detected).toBe(false);
    });

    it('should handle null input', () => {
      const result = SecurityPatterns.detectNullByte(null);

      expect(result.detected).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = SecurityPatterns.detectNullByte(undefined);

      expect(result.detected).toBe(false);
    });

    it('should handle empty string', () => {
      const result = SecurityPatterns.detectNullByte('');

      expect(result.detected).toBe(false);
    });
  });

  describe('detectAbsolutePath', () => {
    it('should detect Unix absolute path', () => {
      const result = SecurityPatterns.detectAbsolutePath('/etc/passwd');

      expect(result.detected).toBe(true);
    });

    it('should detect Windows drive letter path', () => {
      const result = SecurityPatterns.detectAbsolutePath('C:\\Windows\\System32');

      expect(result.detected).toBe(true);
    });

    it('should detect Windows lowercase drive', () => {
      const result = SecurityPatterns.detectAbsolutePath('c:/users/admin');

      expect(result.detected).toBe(true);
    });

    it('should detect Windows UNC path', () => {
      const result = SecurityPatterns.detectAbsolutePath('\\\\server\\share');

      expect(result.detected).toBe(true);
    });

    it('should detect file:// URI', () => {
      const result = SecurityPatterns.detectAbsolutePath('file:///etc/passwd');

      expect(result.detected).toBe(true);
    });

    it('should not detect relative paths', () => {
      const result = SecurityPatterns.detectAbsolutePath('relative/path/file.txt');

      expect(result.detected).toBe(false);
    });

    it('should not detect paths starting with ./', () => {
      const result = SecurityPatterns.detectAbsolutePath('./local/file.txt');

      expect(result.detected).toBe(false);
    });

    it('should handle null input', () => {
      const result = SecurityPatterns.detectAbsolutePath(null);

      expect(result.detected).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = SecurityPatterns.detectAbsolutePath(undefined);

      expect(result.detected).toBe(false);
    });

    it('should handle empty string', () => {
      const result = SecurityPatterns.detectAbsolutePath('');

      expect(result.detected).toBe(false);
    });
  });

  describe('detectSpecialFile', () => {
    it('should detect /dev/ files', () => {
      const result = SecurityPatterns.detectSpecialFile('/dev/null');

      expect(result.detected).toBe(true);
    });

    it('should detect /proc/ files', () => {
      const result = SecurityPatterns.detectSpecialFile('/proc/self/environ');

      expect(result.detected).toBe(true);
    });

    it('should detect /sys/ files', () => {
      const result = SecurityPatterns.detectSpecialFile('/sys/class/net');

      expect(result.detected).toBe(true);
    });

    it('should detect /etc/passwd', () => {
      const result = SecurityPatterns.detectSpecialFile('/etc/passwd');

      expect(result.detected).toBe(true);
    });

    it('should detect /etc/shadow', () => {
      const result = SecurityPatterns.detectSpecialFile('/etc/shadow');

      expect(result.detected).toBe(true);
    });

    it('should detect Windows .lnk files', () => {
      const result = SecurityPatterns.detectSpecialFile('shortcut.lnk');

      expect(result.detected).toBe(true);
    });

    it('should detect Windows reserved names', () => {
      expect(SecurityPatterns.detectSpecialFile('CON').detected).toBe(true);
      expect(SecurityPatterns.detectSpecialFile('PRN').detected).toBe(true);
      expect(SecurityPatterns.detectSpecialFile('AUX').detected).toBe(true);
      expect(SecurityPatterns.detectSpecialFile('NUL').detected).toBe(true);
      expect(SecurityPatterns.detectSpecialFile('COM1').detected).toBe(true);
      expect(SecurityPatterns.detectSpecialFile('LPT1').detected).toBe(true);
    });

    it('should not detect regular files', () => {
      const result = SecurityPatterns.detectSpecialFile('normal/path/file.txt');

      expect(result.detected).toBe(false);
    });

    it('should handle null input', () => {
      const result = SecurityPatterns.detectSpecialFile(null);

      expect(result.detected).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = SecurityPatterns.detectSpecialFile(undefined);

      expect(result.detected).toBe(false);
    });

    it('should handle empty string', () => {
      const result = SecurityPatterns.detectSpecialFile('');

      expect(result.detected).toBe(false);
    });
  });

  describe('detectDangerousProtocol', () => {
    it('should detect javascript: protocol', () => {
      const result = SecurityPatterns.detectDangerousProtocol('javascript:alert(1)');

      expect(result.detected).toBe(true);
    });

    it('should detect data: URI', () => {
      const result = SecurityPatterns.detectDangerousProtocol('data:text/html,<script>');

      expect(result.detected).toBe(true);
    });

    it('should detect vbscript: protocol', () => {
      const result = SecurityPatterns.detectDangerousProtocol('vbscript:msgbox');

      expect(result.detected).toBe(true);
    });

    it('should detect file: protocol', () => {
      const result = SecurityPatterns.detectDangerousProtocol('file:///etc/passwd');

      expect(result.detected).toBe(true);
    });

    it('should detect ftp: protocol', () => {
      const result = SecurityPatterns.detectDangerousProtocol('ftp://evil.com');

      expect(result.detected).toBe(true);
    });

    it('should detect ldap: protocol', () => {
      const result = SecurityPatterns.detectDangerousProtocol('ldap://dc.local');

      expect(result.detected).toBe(true);
    });

    it('should not detect http: protocol', () => {
      const result = SecurityPatterns.detectDangerousProtocol('http://example.com');

      expect(result.detected).toBe(false);
    });

    it('should not detect https: protocol', () => {
      const result = SecurityPatterns.detectDangerousProtocol('https://example.com');

      expect(result.detected).toBe(false);
    });

    it('should handle null input', () => {
      const result = SecurityPatterns.detectDangerousProtocol(null);

      expect(result.detected).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = SecurityPatterns.detectDangerousProtocol(undefined);

      expect(result.detected).toBe(false);
    });

    it('should handle empty string', () => {
      const result = SecurityPatterns.detectDangerousProtocol('');

      expect(result.detected).toBe(false);
    });
  });

  describe('detectEncodingAttack', () => {
    it('should detect consecutive URL encoding', () => {
      const result = SecurityPatterns.detectEncodingAttack('%2e%2f%2e');

      expect(result.detected).toBe(true);
    });

    it('should detect hex encoding', () => {
      const result = SecurityPatterns.detectEncodingAttack('\\x2e\\x2e');

      expect(result.detected).toBe(true);
    });

    it('should detect unicode encoding', () => {
      const result = SecurityPatterns.detectEncodingAttack('\\u002e\\u002e');

      expect(result.detected).toBe(true);
    });

    it('should detect HTML entity encoding', () => {
      const result = SecurityPatterns.detectEncodingAttack('&#46;&#46;');

      expect(result.detected).toBe(true);
    });

    it('should detect hex HTML entities', () => {
      const result = SecurityPatterns.detectEncodingAttack('&#x2e;');

      expect(result.detected).toBe(true);
    });

    it('should detect octal encoding', () => {
      const result = SecurityPatterns.detectEncodingAttack('\\56\\56');

      expect(result.detected).toBe(true);
    });

    it('should not detect regular text', () => {
      const result = SecurityPatterns.detectEncodingAttack('normal text');

      expect(result.detected).toBe(false);
    });

    it('should handle null input', () => {
      const result = SecurityPatterns.detectEncodingAttack(null);

      expect(result.detected).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = SecurityPatterns.detectEncodingAttack(undefined);

      expect(result.detected).toBe(false);
    });

    it('should handle empty string', () => {
      const result = SecurityPatterns.detectEncodingAttack('');

      expect(result.detected).toBe(false);
    });
  });

  describe('checkAll', () => {
    it('should return results for all checks', () => {
      const results = SecurityPatterns.checkAll('safe/path');

      expect(results.pathTraversal).toBeDefined();
      expect(results.commandInjection).toBeDefined();
      expect(results.nullByte).toBeDefined();
      expect(results.absolutePath).toBeDefined();
      expect(results.specialFile).toBeDefined();
      expect(results.dangerousProtocol).toBeDefined();
      expect(results.encodingAttack).toBeDefined();
    });

    it('should detect multiple violation types', () => {
      const results = SecurityPatterns.checkAll('../;ls|grep /etc/passwd');

      expect(results.pathTraversal.detected).toBe(true);
      expect(results.commandInjection.detected).toBe(true);
      expect(results.specialFile.detected).toBe(true);
    });

    it('should handle null input', () => {
      const results = SecurityPatterns.checkAll(null);

      expect(Object.keys(results).length).toBe(7);
      expect(results.pathTraversal.detected).toBe(false);
    });
  });

  describe('hasAnyViolation', () => {
    it('should return true for any violation', () => {
      expect(SecurityPatterns.hasAnyViolation('../secret')).toBe(true);
      expect(SecurityPatterns.hasAnyViolation('/etc/passwd')).toBe(true);
      expect(SecurityPatterns.hasAnyViolation('file%00.txt')).toBe(true);
    });

    it('should return false for safe input', () => {
      expect(SecurityPatterns.hasAnyViolation('safe_file.txt')).toBe(false);
    });

    it('should handle null input', () => {
      expect(SecurityPatterns.hasAnyViolation(null)).toBe(false);
    });
  });

  describe('getAllViolations', () => {
    it('should return all violations as flat array', () => {
      const violations = SecurityPatterns.getAllViolations('../;rm');

      expect(Array.isArray(violations)).toBe(true);
      expect(violations.length).toBeGreaterThan(1);
    });

    it('should return empty array for safe input', () => {
      const violations = SecurityPatterns.getAllViolations('safe.txt');

      expect(violations).toEqual([]);
    });

    it('should handle null input', () => {
      const violations = SecurityPatterns.getAllViolations(null);

      expect(violations).toEqual([]);
    });
  });
});
