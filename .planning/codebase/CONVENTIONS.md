# Conventions

## TypeScript

### Type Safety
- **Strict Mode**: Enabled (`tsconfig.json: "strict": true`)
- **No `any`**: Use `unknown` + type guards; `any` only for external lib interop
- **Strict Null Checks**: Enabled
- **Exact Optional Properties**: Enabled (`exactOptionalPropertyTypes: true`)
- **No Implicit Returns**: Enforced

### Type Patterns
```typescript
// Prefer interfaces for object shapes
interface UserContext {
  userId: string;
  businessId: string;
  role: Role;
}

// Use type for unions/primitives
type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

// Zod for runtime validation + inferred types
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
});
type Input = z.infer<typeof schema>;
```

### Imports
- **Absolute imports** from `src/` root: `import { prisma } from '@/lib/prisma'`
- **Relative imports** for co-located files: `import { Button } from './Button'`
- **Type-only imports**: `import type { User } from '@/types'`
- **Side-effect imports**: `import '@/styles/globals.css'`

---

## Code Style

### Formatting (Prettier via ESLint)
- **Single quotes** for strings
- **Trailing commas** (es5)
- **Print width**: 100
- **Tab width**: 2 spaces
- **Semi-colons**: Required
- **Arrow functions** for callbacks
- **Arrow functions** for component declarations

### Naming Conventions
| Category | Convention | Example |
|----------|------------|---------|
| Files (components) | PascalCase | `InvoiceCard.tsx` |
| Files (utilities) | camelCase | `formatCurrency.ts` |
| Components | PascalCase | `InvoiceCard` |
| Functions | camelCase | `formatCurrency` |
| Variables | camelCase | `invoiceTotal` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `InvoiceData` |
| Enums | PascalCase | `InvoiceStatus` |
| Type Parameters | PascalCase | `T, TData` |
| Zod Schemas | `*Schema` suffix | `signupSchema` |
| Types from Zod | `z.infer<typeof schema>` | `SignupInput` |

---

## React Patterns

### Components
```tsx
// Functional components with explicit types
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ children, variant = 'primary', onClick, disabled }: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn-${variant}`)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

### Server Components (Default)
```tsx
// Default to Server Components
async function InvoiceList({ businessId }: { businessId: string }) {
  const invoices = await getInvoices(businessId);
  return <InvoiceList invoices={invoices} />;
}
```

### Client Components (Explicit)
```tsx
'use client';

import { useState } from 'react';

export function SearchInput() {
  const [query, setQuery] = useState('');
  // ...
}
```

### Server Actions
```ts
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

const schema = z.object({ email: z.string().email() });

export async function signup(formData: FormData) {
  const parsed = schema.parse(Object.fromEntries(formData));
  // ... logic
  redirect('/onboarding');
}
```

### Forms (Server Action Pattern)
```tsx
<form action={async (formData: FormData) => {
  'use server';
  const email = formData.get('email');
  // ... process
}}>
  <input name="email" type="email" required />
  <button type="submit">Submit</button>
</form>
```

### Forms with Client State (useFormState)
```tsx
'use client';
import { useFormState } from 'react-dom';
import { signup } from '@/actions/auth';

export default function SignupForm() {
  const [state, formAction] = useFormState(signup, { message: '', success: false });
  
  return (
    <form action={formAction}>
      {/* fields */}
      {state.message && <p>{state.message}</p>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Database Patterns

### Prisma Queries
```ts
// Always scope by businessId
const invoices = await prisma.invoice.findMany({
  where: { businessId: context.businessId },
  include: { items: true, customer: true },
  orderBy: { issueDate: 'desc' },
  take: 50,
});

// Use Decimal for money
const total = new Prisma.Decimal(invoice.totalAmount);

// Decimal arithmetic
const total = items.reduce((sum, item) => 
  sum.plus(item.lineTotal), new Prisma.Decimal(0));
```

### Transactions
```ts
await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.create({ data: ... });
  await tx.invoiceItem.createMany({ data: items });
  await tx.customerLedgerEntry.create({ data: ... });
  await tx.transaction.create({ data: ... });
});
```

### Decimal Arithmetic
```ts
import { Decimal } from '@prisma/client/runtime/library';

// Create
const amount = new Prisma.Decimal('100.50');

// Arithmetic
const total = amount.plus(tax).minus(discount);

// Comparison
if (amount.greaterThan(limit)) { ... }

// Serialization
const json = amount.toString(); // "100.50"
```

---

## Error Handling

### Custom Errors
```ts
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Usage
if (!user) throw new AppError('User not found', 'NOT_FOUND', 404);
```

### Error Handling in Server Actions
```ts
export async function createInvoice(formData: FormData) {
  try {
    const parsed = schema.parse(formData);
    // ...
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0].message };
    }
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: 'Internal server error' };
  }
}
```

### Client-Side Error Display
```tsx
{error && (
  <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
    {error}
  </div>
)}
```

---

## File Organization

### Component Files
```
ComponentName/
├── ComponentName.tsx      # Main component
├── ComponentName.test.tsx # Unit tests
├── index.ts               # Barrel export
└── ComponentName.stories.tsx # Storybook (optional)
```

### Server Action Files
```
actions/
├── invoices.ts      # Invoice actions
├── auth.ts          # Auth actions
└── index.ts         # Barrel export
```

---

## Import Order
```ts
// 1. External libraries
import { redirect } from 'next/navigation';
import { z } from 'zod';

// 2. Internal aliases (absolute)
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// 3. Relative imports
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/formatters';

// 4. Types
import type { Invoice } from '@/types/invoice';
```

---

## Git Conventions

### Commit Messages
```
feat: add invoice PDF generation
fix: handle null session in onboarding
refactor: extract invoice calculation to service
test: add invoice creation tests
chore: update dependencies
docs: update API documentation
```

### Branch Names
```
feat/invoice-pdf-generation
fix/onboarding-redirect-loop
refactor/accounting-engine
```

---

*Generated: 2026-09-17*