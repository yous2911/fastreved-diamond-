# Test Setup Guide

This guide explains the test configuration and how to run tests for the RevEd Kids Fastify backend.

## 🧪 Test Structure

```
src/tests/
├── setup.ts           # Global test setup with mocks
├── mocks/
│   └── data.ts        # Mock data and helper functions
├── auth.test.ts       # Authentication route tests
├── students.test.ts   # Student management tests
└── monitoring.test.ts # Health/monitoring tests
```

## 🔧 Files Created

### 1. Test Setup (`src/tests/setup.ts`)
- Mocks database connections
- Mocks Redis connections  
- Mocks JWT authentication
- Prevents real external service calls

### 2. Mock Data (`src/tests/mocks/data.ts`)
- Sample students, exercises, subjects
- Mock authentication tokens
- Database query mocks
- Helper functions for tests

### 3. Test Environment (`.env.test`)
- Test-specific environment variables
- Disabled external services
- Safe test credentials

### 4. Test App (`src/app-test.ts`)
- Fastify instance with mocked dependencies
- Same routes as production but with mocks
- Error handling for tests

### 5. Test Files
- `auth.test.ts` - Login, logout, token refresh
- `students.test.ts` - Student data, attempts, progress
- `monitoring.test.ts` - Health checks, metrics

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test files
npm run test:auth
npm run test:students  
npm run test:monitoring

# Run performance tests only
npm run test:performance
```

## 🔍 Test Environment

The tests use a completely mocked environment:

- **Database**: All queries are mocked with predefined responses
- **Redis**: Cache operations return mock data
- **JWT**: Tokens are generated/verified with mock functions
- **External APIs**: No real external calls are made

## 📊 Mock Data

The mock data includes:

### Students
- Alice Dupont (CP, 150 points)
- Bob Martin (CE1, 200 points)  
- Charlie Dubois (CE2, 300 points)

### Exercises
- Math exercises (addition, subtraction)
- French exercises (reading)
- Different difficulty levels

### Authentication
- Mock JWT tokens
- Predefined user payloads
- Authentication middleware mocks

## 🛡️ Security

Test environment uses:
- Safe test-only JWT secrets
- Mock encryption keys
- Disabled external connections
- Isolated test database

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Ensure you're using the test environment
   NODE_ENV=test npm test
   ```

2. **Mock Not Working**
   ```bash
   # Clear the test cache
   npm run test:clean
   npm test
   ```

3. **Environment Variables**
   ```bash
   # Make sure .env.test exists
   cp .env.example .env.test
   # Edit .env.test with test values
   ```

4. **Redis Errors**
   ```bash
   # Redis is mocked in tests, but ensure REDIS_ENABLED=false in .env.test
   ```

### Debugging Tests

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run single test file
npm test src/tests/auth.test.ts

# Run specific test case
npm test -- --testNamePattern="should login successfully"
```

## 📈 Test Coverage

Coverage reports are generated in:
- `coverage/` directory
- HTML report: `coverage/index.html`
- LCOV format for CI/CD

Target coverage goals:
- **Lines**: > 80%
- **Functions**: > 85%
- **Branches**: > 75%
- **Statements**: > 80%

## 🔄 CI/CD Integration

Tests are configured for:
- GitHub Actions
- Pre-commit hooks
- Pre-push validation
- Automated coverage reporting

## 📝 Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { build } from '../app-test';
import { FastifyInstance } from 'fastify';

describe('New Feature Tests', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build();
    // Setup specific mocks
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('should test new feature', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/new-endpoint',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

### Mock Database Queries

```typescript
beforeEach(() => {
  vi.mocked(app.db.query).mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT')) {
      return [{ id: 1, name: 'Test' }];
    }
    return [];
  });
});
```

### Test Authentication

```typescript
const authToken = 'mock-token-1'; // Maps to Alice

const response = await app.inject({
  method: 'GET',
  url: '/api/protected-route',
  headers: {
    authorization: `Bearer ${authToken}`,
  },
});
```

## 🎯 Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock all external dependencies
3. **Cleanup**: Clear mocks between tests
4. **Coverage**: Aim for high test coverage
5. **Performance**: Tests should run quickly
6. **Readability**: Use descriptive test names
7. **Edge Cases**: Test error conditions
8. **Real Scenarios**: Test realistic use cases

## 📋 Checklist

- [ ] `.env.test` file created
- [ ] Test setup files in place
- [ ] Mock data configured
- [ ] All routes have tests
- [ ] Error cases covered
- [ ] Authentication tested
- [ ] Performance tests included
- [ ] Coverage targets met 