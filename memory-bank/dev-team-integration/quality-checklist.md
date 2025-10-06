# Quality Verification Checklist

Standard checklist for verifying work completed by dev-team agents.

## Universal Quality Criteria

Use this checklist when reviewing ANY task, regardless of agent type:

### ✅ Basic Requirements
- [ ] Task requirements fully met
- [ ] No obvious bugs or errors
- [ ] Code runs without crashes
- [ ] No compiler/linter errors
- [ ] Follows project coding standards
- [ ] Clear variable/function names
- [ ] Appropriate comments for complex logic
- [ ] No hardcoded values (uses config/env)
- [ ] Error handling implemented
- [ ] Edge cases considered

### ✅ Documentation
- [ ] README updated (if needed)
- [ ] API documentation current (if applicable)
- [ ] Code comments explain "why", not "what"
- [ ] Complex algorithms documented
- [ ] Setup instructions clear

### ✅ Security
- [ ] No exposed secrets/API keys
- [ ] Input validation present
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized output)
- [ ] Authentication/authorization correct
- [ ] No obvious security vulnerabilities

### ✅ Performance
- [ ] No obvious performance issues
- [ ] Efficient algorithms used
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Resources cleaned up properly

---

## Agent-Specific Criteria

### Frontend Agent Quality Checks

**React/Vue/Angular Components**:
- [ ] Component props properly typed
- [ ] State management appropriate for complexity
- [ ] No unnecessary re-renders
- [ ] Memoization used where beneficial
- [ ] Event handlers properly bound
- [ ] Component cleanup in useEffect/onUnmounted

**Styling**:
- [ ] Responsive design implemented
- [ ] Mobile, tablet, desktop tested
- [ ] CSS follows BEM or similar methodology
- [ ] No inline styles (unless necessary)
- [ ] Theme variables used consistently

**Accessibility**:
- [ ] Semantic HTML elements used
- [ ] ARIA labels where appropriate
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG 2.1 AA

**Forms**:
- [ ] Form validation works
- [ ] Error messages clear and helpful
- [ ] Loading states shown
- [ ] Success feedback provided
- [ ] Form reset on successful submission

**API Integration**:
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Retry logic for failed requests (if appropriate)
- [ ] Optimistic updates (if appropriate)

---

### Backend Agent Quality Checks

**API Endpoints**:
- [ ] RESTful conventions followed
- [ ] Proper HTTP status codes used
- [ ] Request validation middleware
- [ ] Error responses consistent
- [ ] Rate limiting considered
- [ ] CORS configured correctly

**Database**:
- [ ] Schema normalized appropriately
- [ ] Indexes on foreign keys
- [ ] Constraints (NOT NULL, UNIQUE, etc.) set
- [ ] Migrations reversible
- [ ] Seed data for development
- [ ] No sensitive data in migrations

**Authentication/Authorization**:
- [ ] Passwords hashed (bcrypt, argon2)
- [ ] JWT tokens properly signed
- [ ] Token expiration implemented
- [ ] Refresh token flow (if needed)
- [ ] Permission checks on all protected routes
- [ ] Session management secure

**Business Logic**:
- [ ] Transactions used for multi-step operations
- [ ] Idempotency for critical operations
- [ ] Race conditions prevented
- [ ] Data consistency maintained
- [ ] Audit logging (if required)

---

### QA Agent Quality Checks

**Unit Tests**:
- [ ] Test coverage ≥80% for new code
- [ ] All edge cases tested
- [ ] Mock external dependencies
- [ ] Test names descriptive
- [ ] Arrange-Act-Assert pattern
- [ ] Tests are independent

**Integration Tests**:
- [ ] API endpoints tested
- [ ] Database operations tested
- [ ] Authentication flows tested
- [ ] Error handling tested
- [ ] Happy path and sad path covered

**E2E Tests**:
- [ ] Critical user flows automated
- [ ] Tests run reliably
- [ ] Proper wait/retry logic
- [ ] Screenshots on failure
- [ ] Clear test reporting

**Code Quality**:
- [ ] ESLint/Prettier passing
- [ ] No code smells detected
- [ ] Cyclomatic complexity reasonable
- [ ] No duplicate code
- [ ] Dead code removed

**Security**:
- [ ] npm audit/pip-audit clean
- [ ] OWASP Top 10 considered
- [ ] SQL injection tests
- [ ] XSS tests
- [ ] Authentication bypass tests

---

### DevOps Agent Quality Checks

**Containerization**:
- [ ] Dockerfile optimized (multi-stage if beneficial)
- [ ] Base image minimal/secure
- [ ] No secrets in image layers
- [ ] Health checks defined
- [ ] Proper signal handling
- [ ] Non-root user used

**CI/CD**:
- [ ] Pipeline triggers correct
- [ ] All tests run in pipeline
- [ ] Build artifacts cached
- [ ] Deployment stages defined
- [ ] Rollback procedure exists
- [ ] Pipeline secrets secure

**Infrastructure**:
- [ ] Resources properly sized
- [ ] Auto-scaling configured
- [ ] Backup strategy defined
- [ ] Disaster recovery plan
- [ ] Monitoring and alerting
- [ ] Cost optimization considered

**Configuration**:
- [ ] Environment variables documented
- [ ] Secrets management proper
- [ ] Configuration validation
- [ ] Different configs for environments
- [ ] No hardcoded values

---

### MCP Agent Quality Checks

**Server Implementation**:
- [ ] MCP protocol compliance
- [ ] Error handling for all tools
- [ ] Tool inputs validated
- [ ] Tool outputs formatted correctly
- [ ] Server metadata complete
- [ ] Proper initialization/cleanup

**Tools**:
- [ ] Tool descriptions clear
- [ ] Input schema complete
- [ ] Examples provided
- [ ] Error messages helpful
- [ ] Timeout handling
- [ ] Rate limiting (if needed)

**Resources**:
- [ ] Resource URIs valid
- [ ] Content type correct
- [ ] Large resources paginated
- [ ] Resource updates handled
- [ ] Error states covered

**Documentation**:
- [ ] README with setup instructions
- [ ] Tool usage examples
- [ ] Integration guide
- [ ] Troubleshooting section
- [ ] API reference

---

## Severity Levels

When issues are found, categorize by severity:

### 🔴 Critical (Block Approval)
- Security vulnerabilities
- Data loss potential
- Application crashes
- Incorrect core functionality
- Performance degradation >50%

### 🟡 Major (Request Changes)
- Missing key features
- Poor error handling
- Accessibility failures
- Missing critical tests
- Documentation gaps

### 🟢 Minor (Note for Future)
- Code style inconsistencies
- Optimization opportunities
- Nice-to-have features
- Enhanced error messages
- Additional documentation

---

## Quick Reference: Pass/Fail Guidelines

### ✅ Pass if:
- All critical and major criteria met
- Minor issues noted for future improvement
- Code quality score ≥7/10
- Test coverage ≥75% (or 80% for critical code)
- No security vulnerabilities
- All requirements implemented

### ⚠️ Request Changes if:
- Any critical issue present
- Multiple major issues (3+)
- Missing core requirements
- Test coverage <75%
- Security concerns unresolved
- Poor code quality (<6/10)

### 🔄 Need More Context if:
- Requirements unclear
- Expected behavior ambiguous
- Integration points undefined
- Technical approach questionable

---

## Review Process Template

Use this template when providing feedback:

```markdown
## Task Review: [Task Name]

### Summary
[Overall assessment in 1-2 sentences]

### Quality Score: [X/10]
[Brief justification for score]

### ✅ What Worked Well
- [Positive point 1]
- [Positive point 2]
- [Positive point 3]

### ⚠️ Issues Found

#### Critical Issues
- [ ] [Issue with specific location/line]
  - **Impact**: [What could go wrong]
  - **Fix**: [Specific solution]

#### Major Issues
- [ ] [Issue with specific location]
  - **Impact**: [How it affects functionality]
  - **Fix**: [Specific solution]

#### Minor Issues (for future improvement)
- [ ] [Issue with location]
  - **Suggestion**: [Optional improvement]

### ✅ Verification Steps Passed
- [x] Code compiles/runs
- [x] Tests passing
- [x] Requirements met
- [x] Documentation updated

### Decision: [APPROVE | REQUEST CHANGES | NEED CLARIFICATION]

**Rationale**: [Explain decision]

### Next Steps
[What happens next - resubmit, move to next task, etc.]
```

---

## Automated Checks

These should be run automatically (when possible):

### Code Quality
```bash
# JavaScript/TypeScript
npm run lint
npm run type-check
npm run test

# Python
pylint src/
mypy src/
pytest
```

### Security
```bash
# JavaScript
npm audit
# Python
pip-audit
# General
git secrets --scan
```

### Build
```bash
# Ensure clean build
npm run build
# or
docker build .
```

---

## Last Updated
2025-01-10 - Initial checklist created
