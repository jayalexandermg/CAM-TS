# Security Agent Context

## Security Audit Checklist

### Authentication
- [ ] Password policy enforcement (length, complexity, history)
- [ ] Multi-factor authentication availability
- [ ] Secure password storage (bcrypt, Argon2, scrypt)
- [ ] Account lockout mechanisms
- [ ] Session timeout and invalidation
- [ ] Secure credential transmission (HTTPS only)
- [ ] Protection against credential stuffing
- [ ] Secure password reset flow

### Authorization
- [ ] Role-based access control (RBAC) implementation
- [ ] Principle of least privilege applied
- [ ] Vertical privilege escalation prevention
- [ ] Horizontal privilege escalation prevention
- [ ] API endpoint authorization checks
- [ ] Resource-level permissions verified
- [ ] Admin functions properly protected

### Input Validation
- [ ] Server-side validation for all inputs
- [ ] Whitelist validation where possible
- [ ] Parameterized queries for database access
- [ ] File upload restrictions (type, size, content)
- [ ] Path traversal prevention
- [ ] XML External Entity (XXE) prevention
- [ ] JSON/YAML parsing safety

### Output Encoding
- [ ] HTML encoding for web output
- [ ] JavaScript encoding in scripts
- [ ] URL encoding for query parameters
- [ ] CSS encoding where needed
- [ ] Content-Type headers properly set
- [ ] X-Content-Type-Options: nosniff

### Session Management
- [ ] Secure session ID generation
- [ ] Session IDs not in URLs
- [ ] HttpOnly cookie flag
- [ ] Secure cookie flag (HTTPS)
- [ ] SameSite cookie attribute
- [ ] Session fixation prevention
- [ ] Session regeneration on privilege change

### Cryptography
- [ ] TLS 1.2+ for all connections
- [ ] Strong cipher suites only
- [ ] Certificate validation enabled
- [ ] Secure random number generation
- [ ] No hardcoded secrets or keys
- [ ] Proper key management
- [ ] Data at rest encryption where needed

### Error Handling
- [ ] Generic error messages to users
- [ ] Detailed errors logged server-side
- [ ] No stack traces exposed
- [ ] No sensitive data in error responses
- [ ] Consistent error responses

### Logging & Monitoring
- [ ] Authentication events logged
- [ ] Authorization failures logged
- [ ] Input validation failures logged
- [ ] No sensitive data in logs
- [ ] Log injection prevention
- [ ] Centralized log management

## Common Vulnerability Patterns

### SQL Injection
```javascript
// VULNERABLE
const query = `SELECT * FROM users WHERE id = ${userId}`;

// SECURE
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

### Cross-Site Scripting (XSS)
```javascript
// VULNERABLE
element.innerHTML = userInput;

// SECURE
element.textContent = userInput;
// Or use DOMPurify for HTML content
element.innerHTML = DOMPurify.sanitize(userInput);
```

### Path Traversal
```javascript
// VULNERABLE
const filePath = `./uploads/${filename}`;

// SECURE
const safeName = path.basename(filename);
const filePath = path.join('./uploads', safeName);
if (!filePath.startsWith('./uploads/')) {
  throw new Error('Invalid path');
}
```

### Insecure Deserialization
```javascript
// VULNERABLE
const obj = JSON.parse(untrustedData);
obj.constructor.prototype.isAdmin = true;

// SECURE - validate structure
const obj = JSON.parse(untrustedData);
const validated = schema.validate(obj);
```

### Command Injection
```javascript
// VULNERABLE
exec(`grep ${userInput} /var/log/app.log`);

// SECURE
execFile('grep', [userInput, '/var/log/app.log']);
```

## CVSS Scoring Reference

### Base Score Metrics

| Metric | Values |
|--------|--------|
| Attack Vector (AV) | Network (N), Adjacent (A), Local (L), Physical (P) |
| Attack Complexity (AC) | Low (L), High (H) |
| Privileges Required (PR) | None (N), Low (L), High (H) |
| User Interaction (UI) | None (N), Required (R) |
| Scope (S) | Unchanged (U), Changed (C) |
| Confidentiality (C) | None (N), Low (L), High (H) |
| Integrity (I) | None (N), Low (L), High (H) |
| Availability (A) | None (N), Low (L), High (H) |

### Severity Ratings

| Score | Rating |
|-------|--------|
| 0.0 | None |
| 0.1 - 3.9 | Low |
| 4.0 - 6.9 | Medium |
| 7.0 - 8.9 | High |
| 9.0 - 10.0 | Critical |

## Security Headers Checklist

```
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 0 (deprecated, use CSP instead)
```

## Audit Report Template

### Executive Summary
- Overall risk rating
- Critical findings count
- Key recommendations

### Scope
- Systems tested
- Testing methodology
- Limitations

### Findings
For each finding:
1. **Title**: Brief description
2. **Severity**: Critical/High/Medium/Low/Informational
3. **CVSS Score**: X.X (Vector string)
4. **Description**: Detailed explanation
5. **Impact**: Business and technical impact
6. **Evidence**: Screenshots, code snippets, requests
7. **Remediation**: Specific fix steps
8. **References**: CVE, CWE, OWASP links

### Recommendations
- Priority-ordered remediation steps
- Quick wins vs. long-term improvements
- Resource estimates
