# Beacon Code Review Guide
## Accurate Version Based on Actual Codebase

## Project Overview

**Beacon** is a Minecraft Save Tracker application with an Express.js backend and React frontend. It provides both REST API endpoints and a GraphQL interface for managing Minecraft saves, tracking game statistics, creating notes, and organizing worlds.

**Tech Stack:**
- **Backend**: Express.js + TypeScript (Node.js)
- **Database**: SQLite (better-sqlite3) - development and production
- **GraphQL**: Apollo Server (with string-based schema building)
- **Real-time**: Socket.io for live updates
- **Authentication**: JWT tokens (Bearer token scheme)
- **Testing**: Vitest
- **REST API**: Multiple route-based endpoints (auth, saves, folders, notes, tags, milestones, etc.)

**Key Architecture:**
- Express server with REST routes (legacy) + GraphQL endpoint (new)
- SQLite database with better-sqlite3 driver
- Custom pool-like interface wrapping better-sqlite3 for compatibility
- Authentication via JWT middleware
- Separate route handlers for different resource types
- Socket.io for real-time events

---

## Recent Changes

### REST → GraphQL Migration (In Progress)
- **Previous**: Pure REST API with individual endpoints
- **Current**: REST API + GraphQL endpoint (`POST /graphql`)
- **Status**: Both coexist; test suite needs updating for GraphQL

**Files Affected:**
- `src/index.ts` — GraphQL endpoint setup added
- `src/graphql/schema.ts` — Type definitions for GraphQL
- `src/graphql/resolvers.ts` — Resolver implementations
- `src/graphql/handler.ts` — GraphQL request handling
- Tests need updating to test GraphQL queries instead of REST

---

## Code Review Checklist

### 1. Backend Code (`backend/src/`)

#### Express Server Setup (`index.ts`)
- [ ] **CORS configuration is appropriate**
  - Check `allowedOrigins` list
  - Allows localhost dev ports (5173, 5174, 5175, 5176)
  - Consider production origins

- [ ] **Middleware ordering is correct**
  - `express.json()` before routes
  - Auth middleware applied where needed
  - CORS configured before routes

- [ ] **GraphQL endpoint is properly configured**
  - `POST /graphql` endpoint exists
  - Auth middleware applied to GraphQL endpoint
  - Schema building doesn't fail (no try/catch swallowing errors)

- [ ] **Socket.io setup is secure**
  - CORS configured for WebSocket
  - Connection/disconnection handlers exist
  - No unhandled socket errors

- [ ] **Health check endpoint exists**
  - `GET /health` for monitoring
  - Returns correct status

#### Database Connection (`db/connection.ts`)
- [ ] **SQLite connection is properly initialized**
  - File path is environment-aware (dev vs production)
  - Directory is created if missing
  - Foreign keys are enabled (`pragma('foreign_keys = ON')`)

- [ ] **Pool-like interface is correct**
  - `query()` method handles async/await pattern
  - Returns `{ rows: any[] }` consistently
  - Detects DML vs SELECT statements correctly
  - No synchronous calls blocking event loop

- [ ] **Error handling in connection**
  - Errors logged with context
  - Errors propagated (not swallowed)

#### Authentication Middleware (`middleware/auth.ts`)
- [ ] **Token validation is secure**
  - `Authorization: Bearer <token>` header parsed
  - Missing token returns 401
  - Invalid token returns 401
  - Token verified with JWT lib

- [ ] **User context is properly attached**
  - `req.user` populated from decoded token
  - Contains at least `uuid` field
  - Available to route handlers

- [ ] **Error messages don't leak info**
  - No "token signature invalid" vs "token expired" distinction (could be exploited)
  - Generic 401 errors

#### GraphQL Implementation
- [ ] **Schema type definitions are correct** (`schema.ts`)
  - All types have proper nullable/non-null markers (`!`)
  - Custom scalars (DateTime, if used) are documented
  - Relationships match database structure

- [ ] **Resolvers are implemented correctly** (`resolvers.ts`)
  - Each Query/Mutation has corresponding resolver
  - Resolvers check user authorization (can't access other users' data)
  - Error handling is consistent
  - No N+1 queries

- [ ] **GraphQL handler works** (`handler.ts`)
  - Parses incoming GraphQL query/variables
  - Calls resolvers with proper context
  - Returns errors in GraphQL format

#### REST API Routes (`api/*.ts`)
- [ ] **Authentication is enforced**
  - `authMiddleware` applied to protected routes
  - `req.user` available in handlers
  - Proper 401/403 responses

- [ ] **Input validation exists**
  - Query parameters validated (limit, offset bounds)
  - Request body validated (required fields, type checking)
  - SQL injection prevented (parameterized queries)

- [ ] **Database queries are safe**
  - Parameterized queries (not string concatenation)
  - User UUID is included in WHERE clause
  - Soft deletes used where appropriate (deleted_at IS NULL)

- [ ] **Pagination is implemented**
  - `limit` and `offset` parameters
  - Limit is capped (e.g., max 100)
  - Response includes pagination info

- [ ] **Error handling is consistent**
  - Try/catch on database operations
  - Specific error messages logged
  - Generic error messages returned to client
  - Proper HTTP status codes (201 for POST, 404 for not found, 500 for errors)

- [ ] **Response format is consistent**
  - Single resource vs list responses
  - Include pagination metadata where applicable
  - Consistent field naming

#### Database Initialization (`db/init.ts`)
- [ ] **Tables are created correctly**
  - Schema matches GraphQL types and REST routes
  - Proper column types (UUID for IDs, INT for integers, etc.)
  - Foreign keys defined
  - Indexes on frequently queried columns

- [ ] **Migrations are versioned** (if using `db/migrate.ts`)
  - Each migration has version/timestamp
  - Migration can be applied and rolled back
  - No data loss on rollback

#### TypeScript Configuration
- [ ] **Types are properly defined**
  - `AuthenticatedRequest` interface extends Request
  - User object typed correctly
  - No `any` types unless necessary

- [ ] **No type errors**
  - `npm run build` succeeds
  - No type mismatches in resolvers/routes

### 2. Frontend Code (`web/`)

*(Not scanning in detail, but when reviewing:)*

- [ ] **GraphQL queries match schema**
  - Query fields exist in schema
  - Variables properly typed
  - No fetch of extra fields

- [ ] **API calls updated for GraphQL**
  - No lingering REST calls to GraphQL-migrated endpoints
  - Error handling for GraphQL errors (exists in response, not HTTP status)

- [ ] **WebSocket integration works**
  - Socket.io client connects properly
  - Event handlers for real-time updates
  - Graceful disconnect handling

### 3. Testing

#### Test Structure
- [ ] **Tests use Vitest**
  - Config in `vitest.config.ts`
  - Tests in `__tests__` directory
  - Can run with `npm test`

- [ ] **Tests cover happy path**
  - GET requests return data
  - POST requests create data
  - Auth required routes reject unauthenticated requests

- [ ] **Tests cover error cases**
  - Invalid input rejected
  - Missing required fields rejected
  - Not found returns 404
  - Database errors handled gracefully

- [ ] **Database isolation in tests**
  - Each test uses clean database (or mocked)
  - No test pollution (test A affecting test B)

#### Specific Test Files
- `__tests__/integration.test.ts` — Full API integration tests
- `__tests__/scanner.test.ts` — Save file scanning logic
- `__tests__/scanner-mods.test.ts` — Mod detection logic

---

## Key Patterns to Validate

### Express Route Pattern
```typescript
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate input
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    // Query database
    const result = await pool.query(sql, params);

    // Return response
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

Every route should follow this pattern:
1. Auth middleware
2. Input validation
3. Database query with parameters
4. Response with proper status code
5. Error handling

### GraphQL Resolver Pattern
```typescript
Query: {
  saves: async (_, { limit, offset }, context) => {
    // Check auth
    if (!context.user) throw new Error('Unauthorized');

    // Validate
    limit = Math.min(limit || 20, 100);

    // Query
    const result = await pool.query(...);

    // Return
    return result.rows;
  }
}
```

### Database Query Pattern
```typescript
// Parameterized query - GOOD
const result = await pool.query(
  'SELECT * FROM saves WHERE user_uuid = ? AND deleted_at IS NULL',
  [req.user.uuid]
);

// String concatenation - BAD
const result = await pool.query(
  `SELECT * FROM saves WHERE user_uuid = ${req.user.uuid}`
);
```

---

## Anti-Patterns to Watch For

❌ **Don't find these:**

1. **Unparameterized queries (SQL injection risk)**
   ```typescript
   // BAD
   const query = `SELECT * FROM saves WHERE id = ${saveId}`;

   // GOOD
   const query = `SELECT * FROM saves WHERE id = ?`;
   await pool.query(query, [saveId]);
   ```

2. **Missing user authorization**
   ```typescript
   // BAD: User can fetch anyone's saves
   const query = `SELECT * FROM saves WHERE id = ?`;
   const result = await pool.query(query, [req.params.id]);

   // GOOD: Include user UUID check
   const query = `SELECT * FROM saves WHERE id = ? AND user_uuid = ?`;
   const result = await pool.query(query, [req.params.id, req.user.uuid]);
   ```

3. **No input validation**
   ```typescript
   // BAD: Trust user input
   const limit = req.query.limit; // Could be -1, 999999, etc.

   // GOOD: Validate and cap
   const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
   ```

4. **Exposing database errors to client**
   ```typescript
   // BAD
   res.status(500).json({ error: error.message }); // Could say "unique constraint violated"

   // GOOD
   console.error('Database error:', error);
   res.status(500).json({ error: 'Internal server error' });
   ```

5. **Async/await misuse with better-sqlite3**
   ```typescript
   // BAD: Blocking synchronous call in async function
   const result = db.prepare(sql).all(...);

   // GOOD: Use the pool interface which handles it
   const result = await pool.query(sql, params);
   ```

6. **No error handling in routes**
   ```typescript
   // BAD
   router.get('/', async (req, res) => {
     const result = await pool.query(sql); // Could throw
     res.json(result);
   });

   // GOOD
   router.get('/', async (req, res) => {
     try {
       const result = await pool.query(sql);
       res.json(result);
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Internal server error' });
     }
   });
   ```

7. **Auth middleware not applied**
   ```typescript
   // BAD: Public route accessing user data
   router.get('/my-saves', async (req, res) => { // No authMiddleware!
     const result = await pool.query(`SELECT * FROM saves WHERE user_uuid = ?`);
   });

   // GOOD
   router.get('/my-saves', authMiddleware, async (req: AuthenticatedRequest, res) => {
     // ...
   });
   ```

---

## Performance Validation

### Database Performance
- [ ] **Queries are efficient**
  - No N+1 queries (fetching user for each save, etc.)
  - Indexes used on frequently queried columns (user_uuid, deleted_at, etc.)
  - Large queries have pagination

- [ ] **Connection pooling works**
  - Better-sqlite3 allows only one writer
  - Concurrent reads are fine
  - No connection exhaustion errors

### API Performance
- [ ] **Response times are acceptable**
  - Simple GET requests < 100ms
  - Complex queries with joins < 500ms
  - GraphQL queries comparable to REST

- [ ] **Pagination prevents loading entire table**
  - `limit` capped at reasonable value (e.g., 100)
  - Default offset/limit sensible (e.g., 20 items)

---

## Security Validation

### Authentication & Authorization
- [ ] **JWT secret is secure**
  - Check `auth/oauth.ts` for secret management
  - Secret is environment variable (not hardcoded)
  - Sufficient length (>32 characters recommended)

- [ ] **Token expiry is set**
  - Tokens expire after reasonable time (e.g., 24 hours)
  - Refresh tokens if implemented

- [ ] **User data isolation**
  - Users can only see their own saves
  - WHERE clause includes user_uuid in all queries
  - No privilege escalation vectors

- [ ] **Admin operations** (if any)
  - Marked with admin role check
  - Not accessible via normal user token

### SQL Injection Prevention
- [ ] **All queries are parameterized**
  - Use `?` placeholders
  - Parameters passed to `pool.query()` second argument
  - No string interpolation

### Input Validation
- [ ] **All inputs validated**
  - Query parameters checked (limit bounds, pagination)
  - Request body validated (required fields, types)
  - File uploads (if any) validated for type/size

### Secrets Management
- [ ] **No secrets in code**
  - Database URL from environment
  - JWT secret from environment
  - API keys (if any) from environment, not hardcoded

---

## Testing Checklist

- [ ] **Unit tests for routes**
  - Happy path (200/201 response)
  - Auth failures (401)
  - Validation failures (400)
  - Not found (404)
  - Server errors (500)

- [ ] **Integration tests**
  - Full request/response cycle
  - Database integration
  - Multiple requests in sequence

- [ ] **GraphQL tests**
  - Query execution
  - Mutation execution
  - Error handling
  - Authorization checks

- [ ] **Test coverage**
  - Aim for >80% coverage
  - Core routes/resolvers 100%
  - Error handling paths covered

---

## Review Process for Beacon

### Step 1: Understand Changes
- What REST endpoints were changed to GraphQL?
- Any new database schema changes?
- Any auth-related changes?

### Step 2: Security Review
- [ ] All queries parameterized
- [ ] User data isolation enforced
- [ ] No secret leakage
- [ ] Auth middleware applied where needed

### Step 3: Code Review
- [ ] Pattern consistency (routes follow established pattern)
- [ ] Error handling complete
- [ ] Input validation present
- [ ] Type safety (no unnecessary `any`)

### Step 4: Test Review
- [ ] Tests match code changes
- [ ] GraphQL tests written (not just REST)
- [ ] Error cases covered
- [ ] Coverage maintained

### Step 5: Performance Review
- [ ] No N+1 queries
- [ ] Pagination implemented
- [ ] Indexes used
- [ ] Response times acceptable

---

## Common Beacon Issues to Watch For

1. **GraphQL resolvers missing authorization checks**
   - User can fetch other users' saves
   - Need to verify `context.user.uuid` matches queried data

2. **REST routes not updated when REST endpoint removed**
   - Old endpoint still called from frontend
   - Need to switch to GraphQL query

3. **Database queries missing user_uuid filter**
   - User can see global data
   - Add `WHERE user_uuid = ?` to all queries

4. **Pagination not implemented**
   - Fetching entire table on large datasets
   - Add limit/offset with caps

5. **No soft deletes**
   - Data permanently deleted instead of marked deleted_at
   - Should use `WHERE deleted_at IS NULL`

6. **Type mismatches between GraphQL and database**
   - Schema says `String!` but column is nullable
   - Schema says `Int` but column stores float
   - Sync schema with database

7. **Tests still using REST instead of GraphQL**
   - Old tests hitting REST endpoints
   - Need to update to GraphQL queries

8. **Socket.io events not secure**
   - Broadcasting to all users instead of specific user
   - Should verify user owns resource before broadcasting

---

## Questions to Ask During Review

1. "Why was this moved from REST to GraphQL?"
2. "Is this query safe from SQL injection?"
3. "Does this check that the user owns this resource?"
4. "How does this handle errors?"
5. "Is pagination implemented?"
6. "Are there tests for this?"
7. "What happens if the database is down?"
8. "Could this cause N+1 queries?"

---

## Sign-Off Checklist

Before approving, verify:
- [ ] Code follows Beacon patterns
- [ ] All queries parameterized
- [ ] User data isolation enforced
- [ ] Auth middleware applied
- [ ] Input validation present
- [ ] Error handling complete
- [ ] Tests updated for GraphQL
- [ ] No SQL injection vectors
- [ ] No secret leakage
- [ ] Performance acceptable

**Ready to review!**

---

## Reference

- **Better-sqlite3 Docs**: https://github.com/better-sqlite3/better-sqlite3
- **Express.js Guide**: https://expressjs.com/
- **Apollo Server**: https://www.apollographql.com/docs/apollo-server/
- **JWT Security**: https://tools.ietf.org/html/rfc7519

**Last Updated:** March 2026
**Beacon Status:** REST → GraphQL migration in progress
