# SAGE Code Review Guide

## Project Overview

**SAGE** (Personal Analytics & AI System) is a comprehensive data aggregation platform that ingests data from 7 different API sources, stores it in a persistent database, and exposes it via GraphQL with real-time subscriptions. The system includes production-grade observability with OpenTelemetry, background job scheduling via Celery, and is designed for multi-client scenarios.

**Current Status:** Week 3 Complete
- ✅ Week 1: 7 API clients (GoogleCalendar, Gmail, Spotify, AppleHealth, OpenWeather, NewsAPI, Todoist)
- ✅ Week 2: Production infrastructure (database, Celery, Jaeger tracing, Docker)
- ✅ Week 3: GraphQL API with subscriptions

**Tech Stack:**
- Backend: FastAPI (Python), Strawberry GraphQL, SQLAlchemy ORM
- API Clients: httpx (async HTTP), custom metrics, OpenTelemetry
- Database: PostgreSQL + Alembic migrations
- Background Jobs: Celery + Redis
- Observability: OpenTelemetry, Prometheus, Jaeger
- Testing: pytest, pytest-asyncio, >90% coverage target
- Infrastructure: Docker, docker-compose, Kubernetes-ready

**Architecture Pattern:**
- Abstract base `APIClient` class inherited by all 7 clients
- `DataIngestionService` orchestrates concurrent client runs
- Dual metrics recording: custom in-memory + OpenTelemetry
- Async/await throughout; no blocking operations
- Type-safe Python with 100% type hints

---

## What Makes SAGE Unique

### Multi-Client Architecture
- **7 API clients** all inherit from `APIClient` base class
- Each client implements `fetch()` and `normalize()` methods
- Normalization converts external APIs → canonical `EventCreate` schema
- All clients use same metrics/error handling patterns

### Production-Grade Observability
- **OpenTelemetry** integration with Jaeger for distributed tracing
- **Dual metrics recording**: in-memory custom metrics + OTEL instruments
- **Structured logging** (JSON in prod, human-readable in dev)
- **Prometheus scraping** for metrics dashboards

### Offline-First with Sync
- Game logic + data operations all client-side where possible
- Async background sync via Celery
- Exponential backoff retry logic
- Dead-letter queue for permanently failed tasks

### Type Safety
- 100% type hints throughout
- Pydantic models for validation
- SQLAlchemy ORM for database
- GraphQL schema with Strawberry

---

## Code Review Checklist

### 1. API Client Code (`app/api_clients/`)

#### Base Class Pattern (`base.py`)
- [ ] **APIClient abstract base is correctly implemented**
  - `fetch()` method is async and returns raw API response
  - `normalize()` method converts to EventCreate schema
  - `_prepare_for_normalize()` hook for pre-processing
  - `pipeline()` orchestrates fetch → normalize → metric recording

- [ ] **Metrics are recorded correctly**
  - `record_fetch()` called with timing data
  - `record_normalize()` called with timing data
  - `record_error()` called with error type
  - `record_pipeline()` called for full cycle

- [ ] **OTEL integration**
  - Spans created for fetch, normalize, pipeline
  - Attributes include client name, user_id, success/failure
  - Trace context is preserved across operations

- [ ] **Error handling follows pattern**
  - `AuthenticationError` (401) handled
  - `RateLimitError` (429) handled with backoff
  - `APIUnavailableError` (5xx) handled with retry
  - Custom exceptions inherited from base

#### Client Implementations (e.g., `spotify.py`)
- [ ] **fetch() is correctly implemented**
  - Makes HTTP request with proper auth (token, API key)
  - Handles pagination correctly
  - Respects rate limits (pause if needed)
  - Returns raw API response (not normalized)

- [ ] **normalize() correctly transforms data**
  - Extracts only needed fields from API response
  - Converts to EventCreate schema (user_id, event_type, timestamp, value, metadata)
  - Handles missing/optional fields gracefully
  - Validates data types before returning

- [ ] **Pagination is handled properly**
  - Cursor-based or offset-based pagination implemented correctly
  - Iteration stops when no more pages available
  - All data is fetched, not just first page
  - Rate limits respected during pagination

- [ ] **Error handling is specific**
  - Each error condition mapped to appropriate exception
  - Error messages are descriptive (for logging)
  - No generic catches hiding real errors

- [ ] **Type hints are complete**
  - Method signatures have type hints
  - Return types specified
  - No `Any` types unless necessary

#### Testing API Clients (`tests/api_clients/test_*.py`)
- [ ] **Mocks are realistic**
  - Mock responses match actual API format
  - Edge cases covered (missing fields, null values, empty lists)
  - Error responses included (401, 429, 5xx)

- [ ] **Fixtures use AsyncMock for httpx**
  - Async nature of httpx respected
  - Mock configured to return realistic responses
  - Multiple calls handled (pagination)

- [ ] **Test coverage > 90%**
  - Happy path tested
  - Error paths tested
  - Edge cases tested (empty data, boundary values)
  - Metrics recording tested

- [ ] **Pipeline tests exist**
  - Full fetch → normalize → metric flow tested
  - Timing metrics verified
  - Error metrics recorded correctly

---

### 2. Data Layer (`app/`)

#### Database Models (`models/`)
- [ ] **Event model matches EventCreate schema**
  - Fields: user_id, event_type, timestamp, value, metadata
  - Indexes on (user_id, timestamp) and (user_id, event_type)
  - Constraints enforce business rules
  - Foreign key to User table

- [ ] **User model exists**
  - uid, email, created_at, last_ingest fields
  - Proper relationship to events

#### Database Setup (`database.py`)
- [ ] **SQLAlchemy engine configuration**
  - Using asyncpg for PostgreSQL (async)
  - Connection pooling configured
  - Echo disabled in production

- [ ] **Session management**
  - `get_session()` context manager works
  - Sessions properly closed/committed
  - Transactions handled correctly

#### Migrations (`alembic/`)
- [ ] **Migrations are versioned**
  - Each migration has descriptive name with timestamp
  - Migration can be applied and rolled back
  - No data loss on rollback

- [ ] **Migration scripts are correct**
  - SQL/ORM operations are proper
  - Indexes created where needed
  - Foreign keys properly defined

#### Repository Pattern (`repositories/`)
- [ ] **EventRepository implements CRUD**
  - `create()`, `get_by_id()`, `get_by_user()` methods
  - Filtering by event_type, date range works
  - Pagination with limit/offset or cursor
  - No N+1 queries

- [ ] **Queries are optimized**
  - Indexes being used (verify with query plans)
  - Eager loading for relationships
  - No unnecessary joins

---

### 3. Data Ingestion (`app/services/`)

#### DataIngestionService (`data_ingestion.py`)
- [ ] **Orchestration logic is correct**
  - Can run clients concurrently (asyncio.gather)
  - Can run clients sequentially (option for testing)
  - Error in one client doesn't crash others

- [ ] **Result aggregation works**
  - `IngestResult` properly accumulates events
  - Failed clients tracked in `failed_clients`
  - `to_dict()` serialization works

- [ ] **Metrics are recorded**
  - Total events count correct
  - Per-client metrics available
  - Failures attributed correctly

---

### 4. Celery Background Jobs (`app/tasks/`)

#### Celery App (`celery_app.py`)
- [ ] **Configuration is production-ready**
  - Broker URL properly set (Redis)
  - Result backend configured
  - Serializer set to JSON (not pickle)
  - Timezone is UTC

- [ ] **Beat schedule exists** (for periodic tasks)
  - Hourly ingest task scheduled
  - Schedule can be modified without code change

#### Task Definition (`ingestion_tasks.py`)
- [ ] **Tasks are properly decorated**
  - `@celery_app.task` decorator applied
  - `bind=True` for task context
  - Max retries and retry delays configured
  - `retry_on` exceptions specified

- [ ] **Retry logic uses exponential backoff**
  - First retry after X seconds
  - Delay doubles with each retry
  - Max retries limit prevents infinite loops

- [ ] **Error handling in tasks**
  - Exceptions logged with context
  - Dead-letter queue records permanent failures
  - Task doesn't leak exceptions (proper try/except)

- [ ] **Async/await properly used**
  - `asyncio.run()` wraps async code
  - No blocking operations in Celery
  - Database session lifecycle managed

#### Testing Celery (`tests/integration/test_celery_tasks.py`)
- [ ] **Task execution tested**
  - Task can be called via `.apply()`
  - Task parameters passed correctly
  - Task result available

- [ ] **Retry logic tested**
  - Mock retry delays
  - Verify exponential backoff
  - Verify max retries stops recursion

- [ ] **Error handling tested**
  - Exceptions caught and logged
  - Dead-letter queue recorder called
  - Task doesn't crash on error

---

### 5. GraphQL API (Week 3, `app/graphql/`)

#### Schema & Types (`types.py`)
- [ ] **GraphQL types match database models**
  - `UserType`, `EventType` properly defined
  - Scalar types correct (DateTime, JSON)
  - Nullable fields marked correctly

- [ ] **Types are documented**
  - Fields have descriptions (doc strings)
  - Custom scalars explained

#### Resolvers (`resolvers/`)
- [ ] **Query resolvers are implemented**
  - `user(id)` returns user by ID
  - `events(userId, filters, pagination)` with filtering
  - `eventStats(userId, period)` for aggregations

- [ ] **Mutations are transactional**
  - `createUser()`, `loginUser()` properly create/authenticate
  - Database consistency maintained
  - Errors handled gracefully

- [ ] **Subscriptions work**
  - `onEventCreated(userId)` real-time stream
  - WebSocket connection handling
  - Message filtering by user

- [ ] **Authentication is enforced**
  - `require_auth()` guard on protected queries
  - `require_own_resource()` prevents user A viewing user B's data
  - Context contains authenticated user

#### Context (`context.py`)
- [ ] **GraphQL context is set up**
  - `get_context()` FastAPI dependency
  - Database session injected
  - Authenticated user extracted from token
  - Request/response headers accessible

#### Pub/Sub (`pubsub.py`)
- [ ] **In-memory pub/sub works**
  - `subscribe()` and `publish()` methods
  - Subscriptions properly cleaned up
  - No memory leaks (old subscriptions removed)

- [ ] **Scalability path clear**
  - Code structure supports Redis pub/sub swap
  - Message format independent of transport

---

### 6. Observability (`app/`)

#### OTEL Setup (`otel_init.py`)
- [ ] **MeterProvider configured**
  - PrometheusMetricReader set up
  - Global meter accessible
  - Shutdown hook graceful

#### OTEL Metrics (`otel_metrics.py`)
- [ ] **Core metrics defined**
  - `sage_client_fetch_duration` histogram
  - `sage_client_normalize_duration` histogram
  - `sage_client_pipeline_duration` histogram
  - `sage_client_items_fetched` counter
  - `sage_client_pipeline_errors_total` counter

- [ ] **Metrics are recorded with attributes**
  - Client name included
  - User ID included
  - Success/error type included
  - Timing data accurate

#### Custom Metrics (`metrics.py`)
- [ ] **In-memory metrics work**
  - `record_fetch()`, `record_normalize()`, `record_pipeline()` update state
  - `get_metrics_summary()` returns aggregated data
  - No memory leaks (old data cleared)

#### Structured Logging (`main.py`)
- [ ] **JSON logging in production**
  - Log level, timestamp, message structured
  - Error context included (user_id, event_type, etc.)
  - Sensitive data not logged

#### Tracing Setup (if configured)
- [ ] **Jaeger integration works**
  - Traces exported to Jaeger
  - Span correlation across processes (Celery)
  - Trace sampling configured

---

### 7. Testing (`tests/`)

#### Test Structure
- [ ] **Tests are organized by type**
  - `unit/` for isolated tests
  - `integration/` for full-stack tests (with real DB)
  - `load/` for performance tests

- [ ] **Fixtures are reusable**
  - `sample_events` provides realistic test data
  - `sample_users` for user-related tests
  - `db_session` fixture with rollback isolation

#### Coverage Targets
- [ ] **> 90% coverage on all new code**
  - Use pytest-cov to measure
  - Exclude boilerplate (e.g., migrations, __init__.py)
  - Missing coverage has reason (skip with comment)

#### Integration Tests
- [ ] **Database integration tested**
  - Real SQLite engine in-memory for speed
  - Transactions rolled back after each test
  - No test pollution (test A doesn't affect test B)

- [ ] **Full pipeline tested**
  - Mock API clients + real database
  - Events persisted correctly
  - Filtering/pagination works on persisted data

#### Load Tests
- [ ] **Concurrent user simulation**
  - 20+ concurrent users
  - Per-user isolation verified
  - Bulk insert performance acceptable

---

### 8. Docker & Infrastructure

#### Dockerfile
- [ ] **Multi-stage build**
  - Base image with dependencies
  - Runtime image slim
  - Non-root user
  - Health checks defined

- [ ] **Production-ready**
  - Uvicorn running with multiple workers
  - Graceful shutdown on SIGTERM
  - Logs to stdout

#### docker-compose.yml
- [ ] **All services start cleanly**
  - PostgreSQL + initialization
  - Redis for Celery
  - Jaeger for tracing
  - Prometheus for metrics
  - Grafana for dashboards

- [ ] **Services can communicate**
  - Environment variables set correctly
  - Network aliases work
  - Health checks prevent race conditions

#### Environment Configuration (`app/config.py`)
- [ ] **Settings use environment variables**
  - Database URL from env
  - API keys from env (not in code)
  - Feature flags configurable
  - Per-environment configs (dev/staging/prod)

---

## Key Patterns to Validate

### APIClient Pattern
Every client should follow this:
1. Inherit from `APIClient`
2. Implement `fetch()` → raw API response
3. Implement `normalize()` → EventCreate
4. Call `pipeline()` in controller
5. Metrics recorded automatically

### Error Handling
Standard pattern across all clients:
```python
- AuthenticationError (401) → Log, propagate
- RateLimitError (429) → Backoff, retry
- APIUnavailableError (5xx) → Retry with backoff
- ValueError (data) → Log, skip event
```

### Async/Await
- All I/O is async (httpx, database)
- No blocking operations in async code
- Database sessions properly managed (context managers)

### Type Safety
- Pydantic models for validation
- SQLAlchemy ORM for database
- Type hints on all functions
- No `Any` unless truly necessary

---

## Anti-Patterns to Watch For

❌ **Don't find these:**

1. **Client doesn't use base class pattern**
   ```python
   # BAD: Duplicate code in every client
   class MyClient:
       def pipeline(self): ...  # repeated in every client

   # GOOD: Inherited from APIClient
   class MyClient(APIClient):
       async def fetch(self): ...
       def normalize(self, data): ...
   ```

2. **Metrics not recorded**
   ```python
   # BAD: No metrics
   events = await client.pipeline(user_id)

   # GOOD: Metrics recorded automatically in pipeline()
   events = await client.pipeline(user_id)
   ```

3. **Blocking operations in async**
   ```python
   # BAD: Blocking in async function
   async def fetch(self):
       response = requests.get(...)  # Blocks!
       return response

   # GOOD: Use async httpx
   async def fetch(self):
       async with httpx.AsyncClient() as client:
           response = await client.get(...)
       return response
   ```

4. **N+1 queries in repository**
   ```python
   # BAD: Loop queries database per iteration
   for event in events:
       user = db.query(User).filter(User.id == event.user_id).first()

   # GOOD: Eager load
   events = db.query(Event).options(joinedload(Event.user)).all()
   ```

5. **Error handling too broad**
   ```python
   # BAD: Catch all
   try:
       response = await self.fetch()
   except Exception:
       return None

   # GOOD: Specific error handling
   try:
       response = await self.fetch()
   except AuthenticationError:
       raise
   except Exception as e:
       logger.error(f"Unexpected error: {e}")
       raise
   ```

6. **No test isolation**
   ```python
   # BAD: Tests affect each other
   def test_create_event():
       db.insert(...)  # Never deleted

   def test_count_events():
       # Sees event from previous test!

   # GOOD: Rollback per test
   @pytest.fixture
   def session(db):
       transaction = db.begin()
       yield db
       transaction.rollback()
   ```

7. **Secrets in code**
   ```python
   # BAD
   API_KEY = "sk-1234567890"

   # GOOD
   API_KEY = os.getenv("API_KEY")
   ```

---

## Performance Validation

### Backend
- [ ] **API client fetch times**
  - Typical: < 500ms
  - Slow: 1-2s (network bound, OK)
  - Red flag: > 5s (likely timeout/retry loop)

- [ ] **Normalization is fast**
  - Should be < 50ms per event
  - If slower, check for blocking operations

- [ ] **Database queries**
  - Simple queries < 10ms
  - Complex queries < 100ms
  - No N+1 queries (verify with logging)

- [ ] **GraphQL query times**
  - Simple queries < 100ms
  - Complex aggregations < 500ms
  - Use Apollo DevTools to inspect

- [ ] **Celery task execution**
  - Tasks complete within timeout
  - No memory leaks on retry
  - Queue processing keeps up with demand

---

## Security Validation

### API Keys & Auth
- [ ] **No API keys in code** — All from environment
- [ ] **Database credentials secured** — From env, not code
- [ ] **JWT tokens signed** — Secret is strong (>32 chars)
- [ ] **Token expiry set** — Reasonable duration (e.g., 1 hour)

### Data Access
- [ ] **Users can only see own data** — Verified in GraphQL context
- [ ] **Admin operations require admin role** — Checked in resolvers
- [ ] **No user enumeration** — 404 for non-existent users (not "access denied")

### Database
- [ ] **SQL injection prevented** — Using ORM/parameterized queries
- [ ] **Input validation** — Pydantic models validate all inputs

### Logging
- [ ] **No sensitive data logged** — No API keys, passwords, tokens
- [ ] **Error messages non-leaking** — Don't expose database schema in errors

---

## Testing Checklist

- [ ] **Unit tests > 80% coverage**
  - Normalize functions tested with diverse inputs
  - Metrics recording tested
  - Error handling tested

- [ ] **Integration tests**
  - Full pipeline with real database
  - Concurrent client runs tested
  - Celery tasks tested end-to-end

- [ ] **Load tests**
  - 20 concurrent users
  - Throughput measured
  - No memory leaks on retry

- [ ] **Type checking**
  - `mypy` passes (no type errors)
  - No `Any` types unless justified

---

## Week 1-3 Validation Checklist

### Week 1 (API Clients)
- [ ] All 7 clients implement base class pattern
- [ ] Each client has fetch() + normalize()
- [ ] Metrics recorded (custom + OTEL)
- [ ] Error handling consistent
- [ ] Tests > 90% coverage
- [ ] Type hints complete

### Week 2 (Infrastructure)
- [ ] Database schema matches models
- [ ] Migrations are reversible
- [ ] Celery retries with exponential backoff
- [ ] Dead-letter queue works
- [ ] Jaeger tracing integrated
- [ ] Docker/compose stack starts cleanly
- [ ] Integration + load tests pass

### Week 3 (GraphQL API)
- [ ] GraphQL schema matches database
- [ ] Resolvers authenticate properly
- [ ] Users can't access other users' data
- [ ] Subscriptions work (WebSocket)
- [ ] Query complexity limited
- [ ] Tests updated for GraphQL syntax
- [ ] Test coverage maintained > 90%

---

## Review Process

### Step 1: Understand Changes
- Read commit message / PR description
- Understand intent (bug, feature, refactor)
- Map changes to architecture

### Step 2: Architecture Review
- Does pattern match established SAGE patterns?
- Any new dependencies? Justified?
- Breaking changes documented?

### Step 3: Code Review
- Use checklist above
- Look for pattern consistency
- Verify error handling

### Step 4: Test Review
- Are tests comprehensive?
- Do tests cover error paths?
- Is coverage > 90%?
- Do tests match code?

### Step 5: Performance Review
- Database queries optimal?
- No N+1 queries?
- Metrics recording correct?
- Async/await used properly?

### Step 6: Security Review
- No secrets in code?
- API keys from environment?
- User data access controlled?
- Input validated?

### Step 7: Approve/Request Changes
- Approve if all checks pass
- Request changes with specifics
- Suggest improvements (not required)

---

## Common SAGE Issues to Watch For

1. **Client doesn't inherit from APIClient**
   - Duplicate metrics/error handling code
   - Inconsistent patterns

2. **Metrics not recorded or recorded incorrectly**
   - Missing custom metrics calls
   - OTEL attributes incomplete (missing user_id, etc.)

3. **N+1 queries in repositories**
   - Loop with query inside loop
   - No eager loading

4. **Blocking operations in async code**
   - `requests.get()` instead of `httpx`
   - Database sync instead of async ORM

5. **Celery tasks without proper error handling**
   - Exceptions not caught
   - Dead-letter queue not used
   - No retry logic

6. **GraphQL over-fetching**
   - Queries fetch fields not used
   - No field-level authorization

7. **Test isolation broken**
   - Tests not rolled back
   - Stale data affecting other tests

8. **Missing or incomplete tests**
   - Coverage < 90%
   - Error paths not tested
   - Edge cases missed

---

## Questions to Ask During Review

1. "Why inherit from APIClient instead of duplicate code?"
2. "How are metrics recorded for this client?"
3. "What happens if the API is down?"
4. "Could this cause an N+1 query?"
5. "Is this blocking or async?"
6. "How is user data isolation enforced here?"
7. "What are the test scenarios?"
8. "How does this scale with 1M users?"

---

## Sign-Off Checklist

Before approving, verify:
- [ ] Code follows SAGE patterns
- [ ] Tests are comprehensive (>90%)
- [ ] No security issues
- [ ] Performance acceptable
- [ ] Metrics recorded correctly
- [ ] Error handling complete
- [ ] Database queries optimized
- [ ] Documentation clear
- [ ] Type hints complete
- [ ] No secrets in code

**Ready to review!**

---

## Reference Architecture

```
SAGE Architecture Overview:

┌─────────────────────────────────────────────┐
│         7 API Clients (Week 1)              │
│  GoogleCalendar, Gmail, Spotify, etc.       │
│   ├── Async fetch (httpx)                   │
│   ├── Normalize to EventCreate              │
│   └── Metrics: custom + OTEL                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│   DataIngestionService (Week 1)             │
│   ├── Concurrent client orchestration       │
│   ├── Error isolation (one fails, others OK)│
│   └── Result aggregation                    │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   Database    Celery     GraphQL
  (Week 2)     Tasks      API
              (Week 2)   (Week 3)
        │          │         │
        ▼          ▼         ▼
   PostgreSQL  Redis   WebSocket
   with Async           Subscriptions
   Session

All layers:
- 100% type hints
- >90% test coverage
- OpenTelemetry tracing
- Structured logging
```

---

**Last Updated:** March 2026
**SAGE Status:** Week 3 Complete (API Clients, Database, GraphQL API)
