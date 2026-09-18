# Testing

## Test Stack

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | Latest | Unit/Integration tests |
| **jsdom** | Latest | DOM environment |
| **@testing-library/react** | Latest | React component testing |
| **@testing-library/user-event** | Latest | User interaction simulation |
| **MSW** | Latest | API mocking (planned) |

## Test Structure

```
src/
├── **/*.test.ts          # Unit tests (colocated)
├── **/*.test.tsx         # Component tests
├── __tests__/            # Integration tests
├── __mocks__/            # Mock implementations
└── test-utils/           # Test utilities
```

---

## Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- src/lib/auth.test.ts

# Watch mode
npm test -- --watch

# UI mode
npm test -- --ui
```

---

## Test Categories

### 1. Unit Tests (Server Actions)
```typescript
// src/actions/auth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { signup } from './auth';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
    },
  }));
});

describe('signup', () => {
  it('creates user and redirects on success', async () => {
    // ...
  });

  it('throws on invalid email', async () => {
    // ...
  });
});
```

### 2. Component Tests
```tsx
// src/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

it('renders and handles click', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  fireEvent.click(screen.getByRole('button', { name: /click me/i }));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### 3. Integration Tests (API Routes)
```typescript
// __tests__/auth.test.ts
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/auth/callback/route';

it('exchanges code for session', async () => {
  const { req } = createMocks({
    method: 'GET',
    url: '/auth/callback?code=abc123&next=/login',
  });
  
  const response = await POST(req);
  expect(response.status).toBe(307); // redirect
});
```

### 4. Database Tests (with Test DB)
```typescript
// __tests__/business.test.ts
import { prisma } from '@/lib/prisma';
import { onboardBusiness } from '@/actions/business';

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

it('creates business with owner membership', async () => {
  const result = await onboardBusiness({ ...validInput });
  expect(result.business).toBeDefined();
  expect(result.member.role).toBe('OWNER');
});
```

---

## Test Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Server Actions | 90% | ~85% |
| Components | 70% | ~60% |
| Utilities | 95% | ~90% |
| API Routes | 80% | ~70% |
| **Overall** | **80%** | **~75%** |

---

## Test Utilities

### Test Utilities (`src/test-utils/`)
```typescript
// test-utils/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <SessionProvider session={mockSession}>
        {children}
      </SessionProvider>
    ),
    ...options,
  );
}

// test-utils/mocks.ts
export const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    getSession: vi.fn(),
  },
};
```

### Custom Matchers
```typescript
// test-utils/matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeValidDecimal(received) {
    const pass = received instanceof Prisma.Decimal;
    return { pass, message: () => 'expected valid Prisma.Decimal' };
  },
});
```

---

## Test Data Factories

```typescript
// test-utils/factories.ts
import { Prisma } from '@prisma/client';

export const createTestUser = (overrides = {}) => ({
  id: `user-${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  supabaseUserId: `supabase-${Date.now()}`,
  ...overrides,
};

export const createTestBusiness = (overrides = {}) => ({
  id: `biz-${Date.now()}`,
  name: 'Test Business',
  accountType: 'INDIVIDUAL',
  businessType: 'SERVICES',
  country: 'India',
  state: 'Maharashtra',
  city: 'Mumbai',
  baseCurrency: 'INR',
  fiscalYearStart: 'APRIL',
  ...overrides,
};

export const createTestInvoice = (overrides = {}) => ({
  id: `inv-${Date.now()}`,
  businessId: 'biz-test',
  customerId: 'cust-test',
  invoiceNumber: `INV-${Date.now()}`,
  status: 'ISSUED',
  issueDate: new Date(),
  dueDate: new Date(Date.now() + 30*24*60*60*1000),
  subtotal: new Prisma.Decimal(1000),
  taxAmount: new Prisma.Decimal(180),
  totalAmount: new Prisma.Decimal(1180),
  paidAmount: new Prisma.Decimal(0),
  balanceDue: new Prisma.Decimal(1180),
  ...overrides,
};
```

---

## Mocking Strategies

### Supabase Mock
```typescript
// __mocks__/@supabase/ssr.ts
export const createServerClient = vi.fn(() => ({
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    signOut: vi.fn(),
  },
}));
```

### Prisma Mock
```typescript
// __mocks__/@prisma/client.ts
const mockPrisma = {
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  business: { findUnique: vi.fn(), create: vi.fn() },
  businessMember: { findUnique: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
  invoice: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn((fn) => fn(mockTx)),
};

export const prisma = mockPrisma;
```

---

## CI/CD Integration

### GitHub Actions (`.github/workflows/ci.yml`)
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
```

### Coverage Thresholds
```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 80,
        functions: 70,
        branches: 70,
        statements: 80,
      },
    },
  },
});
```

---

## Test Data Management

### Test Database
```bash
# Separate test database
DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/test_db

# Run tests with test DB
DATABASE_URL=$DATABASE_URL_TEST npm test
```

### Seeding Test Data
```typescript
// test-utils/seed.ts
export async function seedTestData() {
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();
  
  const user = await prisma.user.create({ data: createTestUser() });
  const business = await prisma.business.create({ data: createTestBusiness() });
  await prisma.businessMember.create({
    data: { businessId: business.id, userId: user.id, role: 'OWNER', status: 'ACTIVE' }
  });
  
  return { user, business };
}
```

---

## Debugging Tests

### Debug Single Test
```bash
npm test -- --reporter=verbose src/lib/auth.test.ts
```

### Debug with VS Code
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Test",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "src/lib/auth.test.ts"],
  "console": "integratedTerminal"
}
```

---

## Continuous Improvement

### Adding Tests for New Features
1. Write failing test first (TDD)
2. Implement feature
3. Verify test passes
2. Add edge cases
3. Update coverage thresholds if needed

### Test Review Checklist
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests cover edge cases
- [ ] No flaky tests
- [ ] No hardcoded test data
- [ ] Proper cleanup (afterEach/afterAll)
- [ ] No test interdependencies

---

*Generated: 2026-09-17*