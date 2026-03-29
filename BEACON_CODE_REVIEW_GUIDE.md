# Beacon Code Review Guide

## Project Overview

**Beacon** is a full-stack application with a GraphQL backend and React frontend. The project recently migrated from REST API to GraphQL for simplified frontend queries and prepared for future social features requiring a centralized backend.

**Tech Stack:**
- Backend: FastAPI (Python), GraphQL (Strawberry), SQLAlchemy ORM
- Frontend: React (TypeScript)
- Database: SQLite (development) / PostgreSQL (production-ready)
- Infrastructure: Docker, docker-compose
- Monitoring: OpenTelemetry, Prometheus, Jaeger

**Key Dates:**
- REST API: Initial implementation
- GraphQL Migration: In progress (recent change)
- Current Status: GraphQL API live, test suite needs updating for new endpoints

---

## What Changed Recently

### REST → GraphQL Migration
- **Old**: Multiple REST endpoints (`GET /items`, `POST /items`, etc.)
- **New**: Single `POST /graphql` endpoint with query/mutation language
- **Why**: Simpler frontend queries, single source of truth, better for multi-client scenarios

**Files Affected:**
- `backend/app/main.py` — GraphQL endpoint setup
- `backend/app/graphql/` — New GraphQL schema, resolvers
- `backend/tests/` — Test suite needs updating for GraphQL syntax

---

## Code Review Checklist

### 1. Backend Code (`backend/`)

#### GraphQL Schema & Resolvers
- [ ] **Types are defined clearly** — Check `app/graphql/types.py`
  - All fields have proper types (String, Int, List, custom types)
  - Nullable fields marked correctly (non-null should be `!`)
  - Custom scalars (DateTime, JSON) are documented

- [ ] **Resolvers handle errors gracefully**
  - Authentication errors (401) vs authorization errors (403)
  - Not exposing database internals in error messages
  - Proper HTTP status codes returned

- [ ] **Query depth limits** — Check if there's query complexity limiting
  - Prevent abuse: `depth_limit`, `query_size_limit`
  - Reasonable defaults (depth < 10, no infinite recursion)

- [ ] **Mutations are transactional**
  - Database commits/rollbacks work correctly
  - Partial failures handled properly
  - Side effects (cache invalidation, events) sequenced correctly

#### Database Layer (SQLAlchemy)
- [ ] **Models are properly defined** — Check `app/models/`
  - Foreign keys have proper relationships
  - Constraints match business rules
  - Indexes on frequently queried columns (e.g., user_id, created_at)

- [ ] **Migrations are versioned** — Check `alembic/versions/`
  - Each migration has a descriptive name
  - Migrations are idempotent (safe to rerun)
  - No data loss on rollback (preserve data in reverse)

- [ ] **Repositories/DAOs follow pattern**
  - Consistent method naming (get, create, update, delete)
  - No N+1 queries (eager loading where needed)
  - Proper pagination for large result sets

#### API Authentication & Authorization
- [ ] **JWT tokens validated on every request**
  - Check `app/auth.py` or middleware
  - Token expiry checked
  - Secret key is environment-managed (not in code)

- [ ] **Scope/permission checks** — Can user access this resource?
  - Users can only see their own data (unless admin)
  - Admin operations require admin token
  - No privilege escalation vectors

- [ ] **CORS configured properly** — If frontend is separate domain
  - Allowed origins are restricted (not `*`)
  - Credentials are handled securely

#### Performance
- [ ] **Database queries are efficient**
  - No N+1 queries (test with query logging)
  - Indexes used effectively
  - Large queries have pagination/limits

- [ ] **Caching strategy** — If needed
  - Cache invalidation is correct
  - No stale data being served
  - Cache TTL is reasonable

- [ ] **Async/await used properly** (if async code exists)
  - No blocking operations in async functions
  - Database connections properly managed
  - Timeouts set for external API calls

#### Testing
- [ ] **Unit tests cover resolvers**
  - Happy path + error cases
  - Edge cases (empty lists, null values, boundary values)
  - Mocks are used for external dependencies

- [ ] **Integration tests exist** — Especially for recent GraphQL changes
  - Tests hit real database (in test environment)
  - Tests verify full request/response cycle
  - Test isolation (transactions rolled back per test)

- [ ] **Test data is realistic**
  - Fixtures represent real-world scenarios
  - Edge case data (very long strings, special characters)

---

### 2. Frontend Code (`frontend/`)

#### React Component Structure
- [ ] **Components are single-responsibility**
  - One component = one purpose
  - Props are clearly defined (PropTypes or TypeScript)
  - No prop drilling (use Context or state management if needed)

- [ ] **State management is clear**
  - Where is state kept? (local, Context, Redux, etc.)
  - State updates are predictable
  - No unnecessary re-renders

- [ ] **GraphQL queries are optimized**
  - Only fetch fields actually used
  - No over-fetching or under-fetching
  - Variables used to parameterize queries (not string interpolation)

#### TypeScript (if used)
- [ ] **Types are strict**
  - `noImplicitAny` enabled
  - Return types specified on functions
  - Avoid `any` type (use specific types)

- [ ] **GraphQL types match backend schema**
  - Codegen tools used to auto-generate types (if yes, verify setup)
  - No type mismatches between frontend/backend

#### Performance
- [ ] **Components don't re-render unnecessarily**
  - `useMemo`, `useCallback` used sparingly (not everywhere)
  - List items have stable keys
  - Images are lazy-loaded if long lists

- [ ] **Bundle size is reasonable**
  - No duplicate dependencies
  - Code splitting for large routes
  - Minification/compression enabled

#### Testing
- [ ] **Components are tested**
  - Render tests + user interaction tests
  - Mocked GraphQL queries
  - Accessibility checks (alt text, ARIA labels)

- [ ] **Integration tests exist**
  - End-to-end flows (login → view data → submit form)
  - Error states handled visually

---

### 3. Infrastructure & DevOps

#### Docker & Compose
- [ ] **Dockerfile is production-ready**
  - Multi-stage build (separate base, runtime)
  - Non-root user running container
  - Health checks defined
  - .dockerignore excludes unnecessary files

- [ ] **docker-compose.yml for local dev**
  - All services can start with `docker compose up`
  - Volumes for hot reload
  - Environment variables managed (not secrets in file)

#### CI/CD (if exists)
- [ ] **Automated tests run on PR**
  - Linting passes
  - Unit tests pass
  - Coverage threshold met (e.g., >80%)

- [ ] **Deployment is safe**
  - Database migrations run before app starts
  - Rollback strategy documented
  - Zero-downtime deployments (if applicable)

---

## Key Patterns to Validate

### GraphQL Best Practices (Post-Migration)
- [ ] **Query complexity is bounded** — Prevent expensive queries from crashing server
- [ ] **Mutations return success/error** — Consistent error handling
- [ ] **Subscriptions are tested** (if used) — WebSocket connections stable
- [ ] **Pagination works** — Cursor or offset-based, tested with large datasets

### FastAPI Best Practices
- [ ] **Dependency injection used** — `Depends()` for auth, db sessions
- [ ] **Exception handlers are global** — Consistent error format
- [ ] **OpenAPI docs generated** — `/docs` endpoint works
- [ ] **Lifespan events** (if async) — Startup/shutdown hooks clean up properly

### REST-to-GraphQL Migration Validation
- [ ] **All old REST endpoints have GraphQL equivalents**
  - Compare REST routes to GraphQL queries/mutations
  - No missing functionality
  - Performance is comparable or better

- [ ] **Frontend updated to use GraphQL**
  - All API calls use Apollo Client or similar
  - No lingering REST calls (unless to third-party APIs)
  - Error handling works for GraphQL errors

- [ ] **Tests updated for GraphQL**
  - Old REST tests replaced with GraphQL tests
  - Mocks use GraphQL schema, not REST response shapes

---

## Anti-Patterns to Watch For

❌ **Don't find these:**

1. **N+1 Query Problem**
   ```python
   # BAD: Loop triggers query per iteration
   for user in users:
       print(user.profile.bio)  # Queries user.profile for each user

   # GOOD: Eager load
   users = db.query(User).options(joinedload(User.profile)).all()
   ```

2. **GraphQL Over-Fetching**
   ```graphql
   # BAD: Fetches fields not used
   query GetUser {
     user(id: "123") {
       id name email address phone verified createdAt ...
     }
   }

   # GOOD: Only what's needed
   query GetUser {
     user(id: "123") {
       id name email
     }
   }
   ```

3. **Missing Error Handling**
   ```python
   # BAD: No try/except
   def resolver_function(obj, info):
       return db.query(User).filter(...).first()

   # GOOD: Proper error handling
   def resolver_function(obj, info):
       try:
           return db.query(User).filter(...).first()
       except Exception as e:
           logger.error(f"Failed to fetch user: {e}")
           raise GraphQLError("User not found")
   ```

4. **Secret Leakage**
   - API keys in code (should be env vars)
   - Error messages exposing database schema
   - Debug mode enabled in production

5. **No Input Validation**
   ```python
   # BAD: Trust user input
   def update_user(name):
       return db.update(User).set(name=name)

   # GOOD: Validate
   def update_user(name: str):
       if not name or len(name) > 255:
           raise ValueError("Invalid name")
       return db.update(User).set(name=name)
   ```

---

## Performance Validation

### Backend
- [ ] **GraphQL query times** — Use Apollo DevTools or server logging
  - Typical queries < 200ms
  - Complex queries < 500ms
  - Identify slow resolvers

- [ ] **Database query times**
  - Enable query logging: `logging.getLogger('sqlalchemy.engine')`
  - Identify N+1 queries
  - Check indexes are being used

### Frontend
- [ ] **Initial load time** < 3s on 4G
- [ ] **Interaction latency** < 100ms (user perceives instant)
- [ ] **GraphQL bundle size** < 50KB gzipped

---

## Security Validation

### Backend
- [ ] **SQL Injection prevention** — Using parameterized queries (SQLAlchemy does this)
- [ ] **CSRF protection** (if form submissions) — Check for CSRF tokens
- [ ] **Rate limiting** — Prevent brute force / DoS
  - Login endpoints rate limited
  - GraphQL queries rate limited
- [ ] **Input validation** — Sanitize all user input
- [ ] **Auth token security**
  - Tokens signed with strong secret
  - Expiry time set (e.g., 1 hour)
  - Refresh token rotation (if refresh tokens used)

### Frontend
- [ ] **No sensitive data in localStorage** — Tokens only (or sessionStorage)
- [ ] **XSS prevention** — No `dangerouslySetInnerHTML` without sanitization
- [ ] **HTTPS only** — Production enforces HTTPS
- [ ] **CSP headers** (Content Security Policy) — Restrict external script loading

---

## Testing Checklist

- [ ] **Unit tests** — Functions, resolvers in isolation
  - ≥80% coverage
  - Mocks for external dependencies

- [ ] **Integration tests** — Full request/response cycle
  - Real database (test instance)
  - Realistic data
  - Test teardown cleans up

- [ ] **End-to-end tests** — User flows
  - Login → view data → logout
  - Error scenarios

- [ ] **Load tests** (optional but recommended)
  - 100 concurrent users
  - Identify bottlenecks

---

## Review Process

### Step 1: Understand the Change
- Read the PR description/commit message
- Understand the intent: bug fix, feature, refactor
- Check if tests match the change

### Step 2: Architecture Review
- Does the change fit the existing architecture?
- Any new dependencies? Are they appropriate?
- Any breaking changes? Is migration documented?

### Step 3: Code Review
- Use the checklist above
- Look for style/pattern consistency
- Verify error handling

### Step 4: Test Review
- Are tests comprehensive?
- Do tests match the code?
- Are edge cases covered?

### Step 5: Approve/Request Changes
- Approve if all checks pass
- Request changes with specific feedback
- Suggest improvements (not required to merge)

---

## Common Beacon Issues to Watch For

1. **GraphQL Migration Incomplete**
   - Frontend still using old REST endpoints
   - Tests not updated to GraphQL syntax
   - Type mismatches between schema and code

2. **Missing Tests for New GraphQL Resolvers**
   - Each resolver should have corresponding test
   - Error cases tested

3. **Query N+1 Problems in Resolvers**
   - Loop in resolver → multiple queries
   - Use eager loading (joinedload)

4. **No Pagination on Large Lists**
   - Fetching entire table into memory
   - Add limit/offset or cursor-based pagination

5. **Auth Not Properly Scoped**
   - Users seeing other users' data
   - Admin operations without admin check

---

## Questions to Ask During Review

1. "Why did you choose this approach over X?"
2. "How is this tested?"
3. "What happens if this fails?"
4. "Is there a performance concern here?"
5. "Does this follow our existing patterns?"
6. "Is there a simpler way to do this?"

---

## Reference Links

- **GraphQL Best Practices**: https://graphql.org/learn/best-practices/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **SQLAlchemy Performance**: https://docs.sqlalchemy.org/en/20/
- **React Best Practices**: https://react.dev/learn

---

## Sign-Off Checklist

Before approving, verify:
- [ ] Code follows style guide
- [ ] Tests are comprehensive
- [ ] No security issues
- [ ] Performance is acceptable
- [ ] Documentation is clear
- [ ] Breaking changes are documented
- [ ] Migration path (if any) is clear

**Ready to review!**
