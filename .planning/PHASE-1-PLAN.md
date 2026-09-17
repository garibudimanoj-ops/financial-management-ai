# Phase 1: UI Foundation & Design System Implementation

**Date**: 2026-09-17  
**Scope**: Global design tokens, typography, spacing, color system, shared primitives, application shell, sidebar, topbar, responsive navigation, loading/error/empty states  
**Status**: In Progress

---

## Task Breakdown

### Group 1: CSS Design Tokens (1 task)
1. Update `globals.css` with indigo/purple primary palette, semantic colors, CSS custom properties

### Group 2: Shared Primitives (5 tasks)
2. Create `src/components/ui/Button.tsx`
3. Create `src/components/ui/Input.tsx`
4. Create `src/components/ui/FormField.tsx`
5. Create `src/components/ui/Card.tsx`
6. Create `src/components/ui/Badge.tsx`

### Group 3: Feedback Components (3 tasks)
7. Create `src/components/ui/Alert.tsx`
8. Create `src/components/ui/Skeleton.tsx`
9. Create `src/components/ui/ErrorBoundary.tsx`

### Group 4: Layout Components (4 tasks)
10. Create `src/components/ui/EmptyState.tsx`
11. Create `src/components/layout/Sidebar.tsx`
12. Create `src/components/layout/TopBar.tsx`
13. Create `src/components/layout/Breadcrumb.tsx`

### Group 5: Application Shell (1 task)
14. Update `src/app/layout.tsx` with sidebar + topbar shell

### Group 6: Responsive Navigation (1 task)
15. Add mobile hamburger menu and responsive behavior

### Group 7: Verification (1 task)
16. Run tsc --noEmit, lint, test, build

---

## Implementation Order

1. CSS tokens → 2. Primitives → 3. Feedback → 4. Layout → 5. Shell → 6. Responsive → 7. Verify

## Constraints
- Preserve all backend/business logic
- Preserve authentication/RBAC
- Preserve financial calculations
- Preserve API contracts
- Use existing component/library architecture
- Do not duplicate components
- Do not introduce unnecessary dependencies
- Use `lucide-react` for icons (already in use)
- Use Tailwind CSS (already configured)
