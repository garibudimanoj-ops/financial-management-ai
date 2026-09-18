# Design System — TaskTally Financial Management AI

**Version**: 1.0  
**Date**: 2026-09-17  
**Status**: Proposed — awaiting approval before implementation

---

## 1. Color Tokens

### 1.1 Primary Palette

| Token | Value | Usage |
|-------|-------|-------|
| `primary-50` | `#eef2ff` | Light backgrounds, hover states |
| `primary-100` | `#e0e7ff` | Subtle backgrounds |
| `primary-200` | `#c7d2fe` | Borders, focus rings |
| `primary-300` | `#a5b4fc` | Icons, accents |
| `primary-400` | `#818cf8` | Active states, links |
| `primary-500` | `#6366f1` | Primary buttons, brand color |
| `primary-600` | `#4f46e5` | Hover states on primary |
| `primary-700` | `#4338ca` | Active states on primary |
| `primary-800` | `#3730a3` | Dark primary |
| `primary-900` | `#312e81` | Deep primary |

### 1.2 Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#10b981` | Success states, completed statuses |
| `success-bg` | `#064e3b` | Success backgrounds |
| `warning` | `#f59e0b` | Warnings, pending statuses |
| `warning-bg` | `#78350f` | Warning backgrounds |
| `error` | `#ef4444` | Errors, failed statuses |
| `error-bg` | `#7f1d1d` | Error backgrounds |
| `info` | `#3b82f6` | Information, neutral actions |
| `info-bg` | `#1e3a5f` | Information backgrounds |

### 1.3 Neutral Palette

| Token | Value | Usage |
|-------|-------|-------|
| `neutral-0` | `#ffffff` | White backgrounds |
| `neutral-50` | `#f9fafb` | Light backgrounds |
| `neutral-100` | `#f3f4f6` | Card backgrounds (light mode) |
| `neutral-200` | `#e5e7eb` | Borders (light mode) |
| `neutral-300` | `#d1d5db` | Secondary text (light mode) |
| `neutral-400` | `#9ca3af` | Placeholder text |
| `neutral-500` | `#6b7280` | Secondary text |
| `neutral-600` | `#4b5563` | Body text (light mode) |
| `neutral-700` | `#374151` | Heading text (light mode) |
| `neutral-800` | `#1f2937` | Card backgrounds (dark mode) |
| `neutral-900` | `#111827` | Page backgrounds (light mode) |

### 1.4 Dark Theme Palette

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0b0f19` | Main page background |
| `bg-secondary` | `#111827` | Card backgrounds |
| `bg-tertiary` | `#1f2937` | Sidebar, dropdown backgrounds |
| `bg-elevated` | `#1e293b` | Modals, dialogs |
| `text-primary` | `#f9fafb` | Primary text |
| `text-secondary` | `#d1d5db` | Secondary text |
| `text-tertiary` | `#9ca3af` | Muted text, placeholders |
| `border-default` | `#374151` | Default borders |
| `border-subtle` | `#1f2937` | Subtle borders |

### 1.5 Status Color Mapping

| Status | Color | Background |
|--------|-------|------------|
| `paid` | `success` | `success-bg` |
| `completed` | `success` | `success-bg` |
| `pending` | `warning` | `warning-bg` |
| `overdue` | `error` | `error-bg` |
| `draft` | `neutral-500` | `neutral-800` |
| `active` | `success` | `success-bg` |
| `inactive` | `neutral-500` | `neutral-800` |
| `archived` | `neutral-600` | `neutral-800` |
| `low-stock` | `warning` | `warning-bg` |
| `out-of-stock` | `error` | `error-bg` |

---

## 2. Typography

### 2.1 Font Family

| Token | Value | Usage |
|-------|-------|-------|
| `font-sans` | `Geist, sans-serif` | Primary font (already configured) |
| `font-mono` | `JetBrains Mono, monospace` | Code, numbers, financial data |

### 2.2 Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xs` | `12px` | `400` | `16px` | Captions, labels, badges |
| `text-sm` | `14px` | `400` | `20px` | Body small, helper text |
| `text-base` | `16px` | `400` | `24px` | Body text |
| `text-lg` | `18px` | `500` | `28px` | Section headings |
| `text-xl` | `20px` | `600` | `28px` | Page section titles |
| `text-2xl` | `24px` | `700` | `32px` | Page titles |
| `text-3xl` | `30px` | `700` | `36px` | Dashboard hero metrics |
| `text-4xl` | `36px` | `800` | `44px` | KPI values, key numbers |

### 2.3 Heading Hierarchy

```
<h1> — text-2xl font-bold — Page title (one per page)
<h2> — text-xl font-semibold — Section title
<h3> — text-lg font-medium — Subsection title
<h4> — text-base font-medium — Card title
<h5> — text-sm font-semibold — Label heading
<h6> — text-xs font-semibold — Caption heading
```

### 2.4 Text Utility Classes

| Class | Usage |
|-------|-------|
| `text-truncate` | Single line truncation with ellipsis |
| `text-line-clamp-2` | Two line clamp |
| `font-mono` | Monospace for financial numbers |
| `tabular-nums` | Tabular numbers for tables |

---

## 3. Spacing

### 3.1 Spacing Scale

All spacing uses a 4px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | `4px` | Tight spacing, icon gaps |
| `space-2` | `8px` | Small gaps, inline elements |
| `space-3` | `12px` | Input padding, small cards |
| `space-4` | `16px` | Card padding, section gaps |
| `space-5` | `20px` | Medium spacing |
| `space-6` | `24px` | Page padding, card inner spacing |
| `space-8` | `32px` | Section spacing |
| `space-10` | `40px` | Major section breaks |
| `space-12` | `48px` | Page section margins |

### 3.2 Page Layout Spacing

| Element | Spacing |
|---------|---------|
| Page padding (desktop) | `space-6` (24px) |
| Page padding (tablet) | `space-4` (16px) |
| Page padding (mobile) | `space-3` (12px) |
| Section gap | `space-8` (32px) |
| Card inner padding | `space-4` (16px) |
| Between cards | `space-4` (16px) |
| Between form fields | `space-4` (16px) |
| Between table rows | `space-2` (8px) |

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | `0` | No rounding |
| `radius-sm` | `4px` | Small inputs, badges |
| `radius-md` | `8px` | Cards, buttons, inputs |
| `radius-lg` | `12px` | Larger cards, modals |
| `radius-xl` | `16px` | Glass cards, dropdowns |
| `radius-2xl` | `20px` | Hero elements |
| `radius-full` | `9999px` | Pills, avatars, circles |

---

## 5. Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle card elevation |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Default card shadow |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Modals |
| `shadow-glass` | `0 8px 32px rgba(0,0,0,0.3)` | Glass card effect |
| `shadow-glow` | `0 0 20px rgba(99,102,241,0.3)` | Primary action glow |
| `shadow-none` | `none` | Flat elements |

---

## 6. Components

### 6.1 Button

| Variant | Background | Text | Border | Radius | Padding |
|---------|------------|------|--------|--------|---------|
| `primary` | `primary-500` | `white` | `primary-500` | `radius-md` | `space-2 space-3` |
| `primary-outline` | `transparent` | `primary-400` | `primary-400` | `radius-md` | `space-2 space-3` |
| `secondary` | `neutral-800` | `text-primary` | `neutral-700` | `radius-md` | `space-2 space-3` |
| `ghost` | `transparent` | `text-secondary` | `none` | `radius-md` | `space-2 space-3` |
| `danger` | `error` | `white` | `error` | `radius-md` | `space-2 space-3` |
| `success` | `success` | `white` | `success` | `radius-md` | `space-2 space-3` |

| Size | Height | Font Size | Icon Size |
|------|--------|-----------|-----------|
| `sm` | `32px` | `text-sm` | `w-4 h-4` |
| `md` | `40px` | `text-base` | `w-4 h-4` |
| `lg` | `48px` | `text-lg` | `w-5 h-5` |

| State | Style |
|-------|-------|
| `hover` | Opacity 0.9, slight scale |
| `active` | Scale 0.98 |
| `disabled` | Opacity 0.5, cursor not-allowed |
| `loading` | Spinner + reduced opacity |

### 6.2 Input

| Property | Value |
|----------|-------|
| Background | `bg-secondary` |
| Border | `border border-border-default` |
| Border radius | `radius-md` |
| Padding | `space-3` (12px) vertical, `space-4` (16px) horizontal |
| Font size | `text-base` |
| Focus ring | `ring-2 ring-primary-500/50 border-primary-500` |
| Error state | `border-error ring-error/50` |
| Success state | `border-success ring-success/50` |
| Placeholder | `text-tertiary` |
| Height | `44px` |

| Input Type | Additional Styles |
|------------|-------------------|
| `text` | Standard input |
| `search` | Left icon slot, rounded-full |
| `select` | Right icon slot, `appearance-none` |
| `textarea` | `min-height: 120px`, resize vertical |
| `date` | Standard input |
| `number` | `font-mono`, `tabular-nums` |
| `file` | `cursor-pointer`, dashed border |

### 6.3 Card

| Variant | Background | Border | Radius | Shadow | Padding |
|---------|------------|--------|--------|--------|---------|
| `glass` | `bg-secondary/80` | `border border-border-subtle` | `radius-xl` | `shadow-glass` | `space-4` |
| `elevated` | `bg-secondary` | `border border-border-default` | `radius-lg` | `shadow-md` | `space-4` |
| `flat` | `bg-secondary` | `border border-border-subtle` | `radius-md` | `shadow-none` | `space-4` |
| `interactive` | `bg-secondary` | `border border-border-subtle` | `radius-lg` | `shadow-sm` | `space-4` |

| Card State | Style |
|------------|-------|
| `hover` (interactive) | `border-primary-500/50`, `shadow-md`, slight lift |
| `active` (interactive) | `border-primary-500`, `shadow-lg` |

### 6.4 Badge

| Variant | Background | Text | Radius | Padding |
|---------|------------|------|--------|---------|
| `success` | `success-bg` | `success` | `radius-full` | `space-1 space-2` |
| `warning` | `warning-bg` | `warning` | `radius-full` | `space-1 space-2` |
| `error` | `error-bg` | `error` | `radius-full` | `space-1 space-2` |
| `info` | `info-bg` | `info` | `radius-full` | `space-1 space-2` |
| `neutral` | `neutral-800` | `text-secondary` | `radius-full` | `space-1 space-2` |
| `primary` | `primary-500/20` | `primary-400` | `radius-full` | `space-1 space-2` |

| Size | Font Size | Padding |
|------|-----------|---------|
| `sm` | `text-xs` | `space-1 space-2` |
| `md` | `text-sm` | `space-1 space-3` |

### 6.5 Table

| Property | Value |
|----------|-------|
| Background | `bg-secondary` |
| Border radius | `radius-lg` |
| Header background | `bg-tertiary` |
| Row hover | `bg-primary-500/5` |
| Row selected | `bg-primary-500/10` |
| Border | `border border-border-subtle` |
| Cell padding | `space-3 space-4` |
| Font size | `text-sm` |
| Sticky header | `sticky top-0` |
| Zebra striping | `odd:bg-secondary`, `even:bg-tertiary/30` |

| Table Feature | Implementation |
|---------------|----------------|
| Pagination | Bottom pagination bar, 10/25/50/100 rows |
| Sorting | Clickable headers, sort indicator icons |
| Column visibility | Toggle dropdown in table header |
| Row selection | Checkbox in first column |
| Responsive | Horizontal scroll with indicator |
| Empty state | Centered empty state component |
| Loading | Skeleton rows |

### 6.6 Modal

| Property | Value |
|----------|-------|
| Background overlay | `bg-black/60` |
| Modal background | `bg-bg-elevated` |
| Border radius | `radius-xl` |
| Shadow | `shadow-xl` |
| Max width | `560px` (default), `720px` (large), `960px` (full) |
| Padding | `space-6` |
| Animation | `fadeIn + scaleIn` |

| Modal Part | Style |
|------------|-------|
| Header | `flex items-center justify-between`, `border-b border-border-subtle`, `pb-4` |
| Body | `space-y-4`, `overflow-y-auto`, `max-height: 70vh` |
| Footer | `flex justify-end gap-3`, `border-t border-border-subtle`, `pt-4` |
| Close button | `text-tertiary`, hover `text-primary` |

### 6.7 Dialog (Confirm)

| Property | Value |
|----------|-------|
| Background overlay | `bg-black/70` |
| Dialog background | `bg-bg-elevated` |
| Border radius | `radius-lg` |
| Shadow | `shadow-xl` |
| Max width | `400px` |
| Padding | `space-6` |

| Dialog Part | Style |
|-------------|-------|
| Icon | `w-12 h-12`, `text-error` for destructive, `text-warning` for caution |
| Title | `text-xl font-bold` |
| Description | `text-sm text-secondary` |
| Actions | `flex justify-end gap-3`, `mt-6` |

### 6.8 Alert

| Variant | Background | Border | Icon | Radius | Padding |
|---------|------------|--------|------|--------|---------|
| `info` | `info-bg/20` | `border-info/30` | `info` icon | `radius-md` | `space-3 space-4` |
| `success` | `success-bg/20` | `border-success/30` | `success` icon | `radius-md` | `space-3 space-4` |
| `warning` | `warning-bg/20` | `border-warning/30` | `warning` icon | `radius-md` | `space-3 space-4` |
| `error` | `error-bg/20` | `border-error/30` | `error` icon | `radius-md` | `space-3 space-4` |

| Alert State | Style |
|-------------|-------|
| `dismissible` | Close button in top-right |
| `with-action` | Action button in footer |

### 6.9 Form Field

| Property | Value |
|----------|-------|
| Label | `text-sm font-medium text-secondary`, `mb-2` |
| Input | Standard input styles |
| Helper text | `text-xs text-tertiary`, `mt-1` |
| Error text | `text-xs text-error`, `mt-1` |
| Required indicator | `text-error`, `*` |
| Field group | `space-y-2` |

### 6.10 Navigation

| Component | Style |
|-----------|-------|
| Sidebar | `w-64`, `bg-bg-tertiary`, `border-r border-border-subtle`, fixed left |
| Sidebar item | `flex items-center gap-3`, `px-4 py-3`, `rounded-lg`, `text-secondary` |
| Sidebar item active | `bg-primary-500/10`, `text-primary-400`, `border-l-2 border-primary-500` |
| Sidebar item hover | `bg-primary-500/5`, `text-primary` |
| Sidebar icon | `w-5 h-5` |
| Sidebar label | `text-sm font-medium` |
| Top bar | `h-16`, `bg-bg-secondary`, `border-b border-border-subtle`, `flex items-center justify-between`, `px-6` |
| Breadcrumb | `flex items-center gap-2`, `text-sm`, `text-tertiary` |
| Breadcrumb separator | `text-tertiary/50` |
| Breadcrumb active | `text-primary` |

### 6.11 Avatar

| Property | Value |
|----------|-------|
| Size | `32px` (sm), `40px` (md), `48px` (lg), `64px` (xl) |
| Border radius | `radius-full` |
| Border | `2px border-border-subtle` |
| Fallback | `bg-primary-500`, `text-white`, `font-semibold` |

### 6.12 Icon

| Property | Value |
|----------|-------|
| Size | `w-4 h-4` (sm), `w-5 h-5` (md), `w-6 h-6` (lg), `w-8 h-8` (xl) |
| Color | `text-tertiary` (default), `text-secondary` (interactive), `text-primary` (active) |
| Stroke width | `1.5` |

---

## 7. Responsive Rules

### 7.1 Breakpoints

| Breakpoint | Min Width | Layout |
|------------|-----------|--------|
| `xs` | `<640px` | Single column, stacked layout |
| `sm` | `640px` | Two column, compact sidebar |
| `md` | `768px` | Three column, standard layout |
| `lg` | `1024px` | Four column, full sidebar |
| `xl` | `1280px` | Five column, expanded layout |

### 7.2 Sidebar Behavior

| Breakpoint | Sidebar |
|------------|---------|
| `xs` | Hidden, hamburger menu overlay |
| `sm` | Collapsed icon-only sidebar (`w-16`) |
| `md` | Expanded sidebar (`w-64`) |
| `lg+` | Expanded sidebar (`w-64`) |

### 7.3 Grid Behavior

| Breakpoint | Dashboard Grid | Table Columns | Card Layout |
|------------|----------------|---------------|-------------|
| `xs` | 1 column | 2 columns scroll | 1 column |
| `sm` | 2 columns | 3 columns scroll | 2 columns |
| `md` | 3 columns | 4 columns scroll | 2 columns |
| `lg` | 4 columns | 5 columns | 3 columns |
| `xl` | 4 columns | 6 columns | 4 columns |

### 7.4 Touch Targets

| Element | Minimum Size |
|---------|-------------|
| Buttons | `44px` height |
| Links | `44px` padding |
| Checkboxes | `44px` |
| Radio buttons | `44px` |
| Toggle switches | `51px` |

---

## 8. Accessibility Rules

### 8.1 ARIA Requirements

| Element | Required ARIA |
|---------|---------------|
| Navigation | `role="navigation"`, `aria-label` |
| Main content | `role="main"` |
| Sidebar | `role="complementary"`, `aria-label` |
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Alert | `role="alert"`, `aria-live="polite"` |
| Table | `role="table"`, `aria-label` |
| Button | `aria-label` if icon-only |
| Input | `aria-label` or associated `<label>` |
| Tab list | `role="tablist"`, `aria-selected` |
| Tooltip | `role="tooltip"`, `aria-describedby` |

### 8.2 Focus Management

| Rule | Implementation |
|------|----------------|
| Focus visible | `ring-2 ring-primary-500 ring-offset-2 ring-offset-bg-primary` |
| Focus trap (modal) | Trap focus within modal, return focus on close |
| Skip link | `skip-to-content` link at top of page |
| Focus order | Logical DOM order, no tab jumps |
| Focus on error | Auto-focus first error field on form submit |

### 8.3 Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` | Move focus to next element |
| `Shift+Tab` | Move focus to previous element |
| `Enter` | Activate button/link |
| `Escape` | Close modal/dialog |
| `Ctrl+K` | Open global search |
| `Ctrl+N` | New item (context-dependent) |
| `Ctrl+S` | Save current form |
| `Alt+1-9` | Navigate to sidebar items |

### 8.4 Screen Reader Support

| Rule | Implementation |
|------|----------------|
| Live regions | `aria-live="polite"` for dynamic content |
| Status messages | `aria-live="assertive"` for errors |
| Loading states | `aria-busy="true"` during loading |
| Expanded/collapsed | `aria-expanded` on collapsible elements |
| Selected/deselected | `aria-selected` on tabs, rows |
| Invalid fields | `aria-invalid="true"`, `aria-describedby` to error message |

### 8.5 Reduced Motion

| Rule | Implementation |
|------|----------------|
| `prefers-reduced-motion` | Disable all animations and transitions |
| Animation duration | `0ms` when reduced motion preferred |
| Transition | `none` when reduced motion preferred |

### 8.6 Color Contrast

| Element | Minimum Contrast Ratio |
|---------|----------------------|
| Large text (18px+) | `3:1` |
| Normal text | `4.5:1` |
| UI components | `3:1` |
| Graphical objects | `3:1` |

---

## 9. Animation & Transition Rules

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `fast` | `150ms` | `ease-out` | Hover states, icon transitions |
| `normal` | `250ms` | `ease-out` | Fade in, slide in |
| `slow` | `350ms` | `ease-out` | Modal open, page transitions |
| `slower` | `500ms` | `ease-out` | Page load, large transitions |

| Animation | Keyframes | Usage |
|-----------|-----------|-------|
| `fadeIn` | `opacity: 0 → 1` | Page transitions, content appear |
| `slideUp` | `transform: translateY(20px) → 0` | Modal, dropdown |
| `slideIn` | `transform: translateX(-20px) → 0` | Sidebar, alert |
| `scaleIn` | `transform: scale(0.95) → 1` | Modal, dialog |
| `spin` | `transform: rotate(360deg)` | Loading spinner |
| `pulse` | `opacity: 1 → 0.5 → 1` | Loading indicator |
| `shimmer` | `background-position` animation | Skeleton loading |

---

## 10. Icon System

### 10.1 Icon Library

- **Primary**: `lucide-react` (already in use)
- **Size mapping**: `w-4 h-4` (sm), `w-5 h-5` (md), `w-6 h-6` (lg), `w-8 h-8` (xl)
- **Stroke width**: `1.5` (default), `2` (bold)

### 10.2 Icon Naming Convention

| Category | Prefix | Examples |
|----------|--------|----------|
| Navigation | `nav-` | `nav-dashboard`, `nav-invoices`, `nav-customers` |
| Action | `action-` | `action-plus`, `action-edit`, `action-delete` |
| Status | `status-` | `status-check`, `status-clock`, `status-alert` |
| File | `file-` | `file-invoice`, `file-receipt`, `file-report` |
| Communication | `comm-` | `comm-email`, `comm-message`, `comm-notification` |
| Media | `media-` | `media-chart`, `media-graph`, `media-calendar` |

---

## 11. Component Usage Rules

### 11.1 When to Use Which Component

| Scenario | Component |
|----------|-----------|
| Clickable action | `Button` |
| User input | `Input` |
| Data display container | `Card` |
| Status indicator | `Badge` |
| Data in rows/columns | `Table` |
| Overlay content | `Modal` |
| Confirmation | `Dialog` |
| System message | `Alert` |
| Form field with label | `FormField` |
| User profile | `Avatar` |
| Visual element | `Icon` |
| Navigation | `Sidebar`, `Breadcrumb` |

### 11.2 Composition Rules

| Rule | Description |
|------|-------------|
| Card + Table | Use `Card` as wrapper for `Table` |
| Card + Form | Use `Card` as wrapper for `FormField` group |
| Alert + Button | Use `Alert` with action `Button` for actionable messages |
| Modal + Form | Use `Modal` as wrapper for multi-field forms |
| Table + Pagination | Always pair `Table` with `Pagination` |
| Form + Alert | Use `Alert` above form for form-level errors |

---

## 12. Dark Mode

### 12.1 Current State

The application currently uses a dark-only theme with `#0b0f19` background.

### 12.2 Proposed Implementation

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Background | `neutral-50` | `bg-primary` |
| Card background | `neutral-100` | `bg-secondary` |
| Text primary | `neutral-900` | `text-primary` |
| Text secondary | `neutral-600` | `text-secondary` |
| Border | `neutral-200` | `border-default` |
| Sidebar | `neutral-100` | `bg-bg-tertiary` |

### 12.3 Toggle

- Location: Top-right corner of header
- Icon: `Sun` (light) / `Moon` (dark)
- Persistence: `localStorage` preference
- Animation: Smooth color transition (`slow`)

---

## 13. Implementation Checklist

- [ ] Define CSS custom properties for all tokens
- [ ] Create shared Button component
- [ ] Create shared Input component
- [ ] Create shared Card component
- [ ] Create shared Badge component
- [ ] Create shared Table component with pagination
- [ ] Create shared Modal component
- [ ] Create shared Dialog component
- [ ] Create shared Alert component
- [ ] Create shared FormField component
- [ ] Create shared Sidebar component
- [ ] Create shared Breadcrumb component
- [ ] Create shared Avatar component
- [ ] Create shared Icon component wrapper
- [ ] Implement responsive breakpoints
- [ ] Implement focus management
- [ ] Implement ARIA attributes
- [ ] Implement keyboard navigation
- [ ] Implement reduced motion support
- [ ] Implement dark/light mode toggle
- [ ] Add skeleton loading components
- [ ] Add error boundary component
- [ ] Add 404 page
- [ ] Add global search
- [ ] Add notification system
- [ ] Add confirmation dialog utility
- [ ] Add form validation utility
- [ ] Add auto-save utility
- [ ] Add animation utility classes

---

*This design system is proposed for implementation. All tokens, components, and rules should be reviewed and approved before coding begins.*
