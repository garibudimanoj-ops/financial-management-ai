# Bento Dashboard Design — TaskTally Financial Management AI

**Version**: 1.0  
**Date**: 2026-09-17  
**Status**: Proposed — awaiting approval before implementation

---

## 1. Dashboard Overview

The Bento Dashboard replaces the current dashboard with a structured grid layout that organizes financial data into clearly defined zones. The design follows a bento-box pattern where content blocks of varying sizes create visual hierarchy and guide the user's eye from most important information to actionable items.

### 1.1 Design Principles

| Principle | Implementation |
|-----------|----------------|
| Information hierarchy | Most important metrics occupy largest space |
| Progressive disclosure | Details expand on interaction |
| Visual grouping | Related items share consistent spacing and styling |
| Action-oriented | Quick actions are always accessible |
| Contextual AI | CA Assistant provides insights based on current data |

---

## 2. Dashboard Layout Structure

### 2.1 Grid System

The dashboard uses a 12-column grid with the following structure:

```
┌─────────────────────────────────────────────────────────────┐
│  Top Bar (full width)                                       │
├──────────┬──────────────────────────────────────────────────┤
│          │  Zone 1: KPI Metrics (4 cards, 1x1 each)         │
│ Sidebar  ├──────────────────────────────────────────────────┤
│ (w-64)   │  Zone 2: Revenue Trend Chart (2x1)               │
│          ├──────────────┬───────────────────────────────────┤
│          │  Zone 3:     │  Zone 4: Quick Actions (1x1)      │
│          │  Financial   │                                   │
│          │  Snapshot    ├───────────────────────────────────┤
│          │  (2x1)       │  Zone 5: Alerts (1x1)             │
│          ├──────────────┴───────────────────────────────────┤
│          │  Zone 6: AI Insights (full width, 1x1)           │
├──────────┴──────────────────────────────────────────────────┤
│  Footer (full width)                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Responsive Layout

| Breakpoint | Layout |
|------------|--------|
| `xs` (<640px) | Single column, stacked zones, hamburger menu |
| `sm` (640px) | 2-column grid, sidebar collapsed to icons |
| `md` (768px) | 3-column grid, sidebar expanded |
| `lg` (1024px) | 4-column grid, full sidebar |
| `xl` (1280px) | 4-column grid, expanded layout |

---

## 3. Zone Definitions

### 3.1 Zone 1: KPI Metrics

**Position**: Top of content area, full width  
**Grid**: 4 columns (1x1 each)  
**Size**: Each card is `280px` wide on desktop

| KPI Card | Metric | Icon | Color | Format |
|----------|--------|------|-------|--------|
| Revenue | Total Revenue | `DollarSign` | `primary-500` | `$XX,XXX.XX` |
| Receivables | Amount Receivable | `Receipt` | `warning` | `$XX,XXX.XX` |
| Payments | Payments Received | `CreditCard` | `success` | `$XX,XXX.XX` |
| Expenses | Total Expenses | `ShoppingCart` | `error` | `$XX,XXX.XX` |

**Card Structure**:
```
┌─────────────────────────────┐
│  [Icon]  Metric Name        │
│  $XX,XXX.XX                 │
│  ───────┐                   │
│  Trend  │ +X.X% vs last     │
│  ───────┘  period           │
└─────────────────────────────┘
```

**Features**:
- Sparkline mini-chart showing 7-day trend
- Percentage change indicator (green up, red down)
- Click to expand into detailed view
- `text-4xl` font size for values
- `font-mono` for monetary values

### 3.2 Zone 2: Revenue Trend Chart

**Position**: Below KPI metrics, left side  
**Grid**: 2 columns wide, 1 row tall  
**Size**: `50%` of content width, `280px` height

**Chart Type**: Line chart with area fill  
**Data**: Revenue over last 30 days  
**X-axis**: Date (daily)  
**Y-axis**: Revenue amount  
**Interactions**:
- Hover shows date and amount tooltip
- Click to filter by date range
- Toggle between revenue, receivables, payments

**Card Structure**:
```
┌──────────────────────────────────────┐
│  Revenue Trend  [date range picker]  │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │     Line Chart Area            │  │
│  │                                │  │
│  │                                │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### 3.3 Zone 3: Financial Snapshot

**Position**: Below KPI metrics, center-left  
**Grid**: 2 columns wide, 1 row tall  
**Size**: `50%` of content width, `280px` height

**Content**: Summary of key financial indicators

| Section | Content |
|---------|---------|
| Income Summary | Total income, average per invoice |
| Expense Breakdown | Top 3 expense categories |
| Cash Flow | Net cash flow (positive/negative) |
| Profit Margin | Current profit margin percentage |

**Card Structure**:
```
┌──────────────────────────────────────┐
│  Financial Snapshot                  │
│  ┌────────────┐  ┌──────────────┐   │
│  │ Income     │  │ Expenses     │   │
│  │ $XX,XXX    │  │ $XX,XXX      │   │
│  └────────────┘  └──────────────┘   │
│  ┌────────────┐  ┌──────────────┐   │
│  │ Cash Flow  │  │ Profit       │   │
│  │ +$X,XXX    │  │ XX.X%        │   │
│  └────────────┘  └──────────────┘   │
└──────────────────────────────────────┘
```

### 3.4 Zone 4: Quick Actions

**Position**: Right side of content area  
**Grid**: 1 column, 1 row  
**Size**: `250px` wide, `280px` height

**Actions**:

| Action | Icon | Description |
|--------|------|-------------|
| New Invoice | `FilePlus` | Create a new invoice |
| Add Customer | `UserPlus` | Register a new customer |
| Record Payment | `CreditCard` | Log a payment received |
| Add Product | `Package` | Add new product |
| Generate Report | `FileText` | Create a new report |
| Open CA Assistant | `Bot` | Ask AI for financial advice |

**Card Structure**:
```
┌──────────────────────────┐
│  Quick Actions           │
│                          │
│  [+ New Invoice]         │
│  [+ Add Customer]        │
│  [+ Record Payment]      │
│  [+ Add Product]         │
│  [+ Generate Report]     │
│  [🤖 CA Assistant]       │
│                          │
└──────────────────────────┘
```

**Features**:
- Each action is a `ghost` button with icon
- Hover shows tooltip with description
- Click triggers corresponding action/modal
- `primary` button style for most important action (New Invoice)

### 3.5 Zone 5: Alerts

**Position**: Below Quick Actions, right side  
**Grid**: 1 column, 1 row  
**Size**: `250px` wide, `200px` height

**Alert Types**:

| Alert | Condition | Severity |
|-------|-----------|----------|
| Low Stock | Product below threshold | `warning` |
| Overdue Invoice | Invoice past due date | `error` |
| Upcoming Payment | Payment due in 3 days | `info` |
| High Receivables | Receivables > threshold | `warning` |

**Card Structure**:
```
┌──────────────────────────┐
│  ⚠ Alerts (4)            │
│                          │
│  🔴 Overdue: INV-001     │
│     $500.00 - 5 days     │
│                          │
│  🟡 Low Stock: Widget A  │
│     3 units remaining    │
│                          │
│  🔵 Payment Due: INV-003 │
│     $300.00 - 2 days     │
│                          │
│  [View All Alerts]       │
└──────────────────────────┘
```

**Features**:
- Color-coded severity indicators
- Click to navigate to relevant page
- `View All` link to alerts page
- Auto-refresh every 30 seconds

### 3.6 Zone 6: AI Insights

**Position**: Bottom of content area, full width  
**Grid**: Full width, 1 row  
**Size**: `100%` width, `200px` height

**Content**: CA Assistant contextual insights

**Card Structure**:
```
┌──────────────────────────────────────────────────────┐
│  🤖 AI Financial Insights    [Chat] [Settings]       │
│                                                      │
│  💡 Revenue increased 12% this month vs last month   │
│     Top performing: Product A (+$2,400)              │
│                                                      │
│  ⚠ Cash flow may be tight next week                  │
│     3 invoices due on Friday totaling $1,800         │
│                                                      │
│  💡 Consider offering early payment discount         │
│     to improve receivables collection                │
│                                                      │
│  [Ask CA Assistant]                                  │
└──────────────────────────────────────────────────────┘
```

**Features**:
- Auto-generated insights based on current financial data
- Refresh button for new insights
- Click "Ask CA Assistant" to open full chat
- Contextual insights change based on data
- `info` alert style with `Bot` icon

---

## 4. Card Design Specifications

### 4.1 KPI Card

| Property | Value |
|----------|-------|
| Background | `bg-secondary/80` |
| Border | `border border-border-subtle` |
| Border radius | `radius-xl` |
| Shadow | `shadow-glass` |
| Padding | `space-4` |
| Animation | `fadeIn` on load |

**KPI Value**:
- Font: `text-4xl font-extrabold font-mono`
- Color: `text-primary`
- Format: `$XX,XXX.XX`

**KPI Trend**:
- Font: `text-sm font-medium`
- Up: `text-success` with `↑` icon
- Down: `text-error` with `↓` icon

### 4.2 Chart Card

| Property | Value |
|----------|-------|
| Background | `bg-secondary/80` |
| Border | `border border-border-subtle` |
| Border radius | `radius-xl` |
| Shadow | `shadow-glass` |
| Padding | `space-4` |
| Height | `280px` |

**Header**:
- Font: `text-lg font-semibold`
- Right-aligned date range picker

### 4.3 Action Card

| Property | Value |
|----------|-------|
| Background | `bg-secondary/80` |
| Border | `border border-border-subtle` |
| Border radius | `radius-xl` |
| Shadow | `shadow-glass` |
| Padding | `space-4` |
| Animation | `slideUp` on load |

**Action Button**:
- `ghost` variant with `w-10 h-10` icon
- `text-sm font-medium` label
- `hover:bg-primary-500/10`
- `hover:text-primary`

### 4.4 Alert Card

| Property | Value |
|----------|-------|
| Background | `bg-secondary/80` |
| Border | `border border-border-subtle` |
| Border radius | `radius-xl` |
| Shadow | `shadow-glass` |
| Padding | `space-4` |
| Animation | `slideIn` on load |

**Alert Item**:
- Severity dot: `w-3 h-3`, `radius-full`
- Text: `text-sm`
- Time: `text-xs text-tertiary`

### 4.5 AI Insights Card

| Property | Value |
|----------|-------|
| Background | `bg-gradient-to-r from-primary-500/10 to-purple-500/10` |
| Border | `border border-primary-500/20` |
| Border radius | `radius-xl` |
| Shadow | `shadow-glass` |
| Padding | `space-4` |
| Animation | `fadeIn` on load |

**Insight Item**:
- Icon: `Bot` (primary-400)
- Text: `text-sm text-secondary`
- Separator: `border-t border-border-subtle`

---

## 5. Navigation Design

### 5.1 Sidebar

| Property | Value |
|----------|-------|
| Width | `w-64` (expanded), `w-16` (collapsed) |
| Background | `bg-bg-tertiary` |
| Border | `border-r border-border-subtle` |
| Position | Fixed left |
| Height | Full viewport |
| Z-index | `z-50` |
| Animation | `slideIn` on expand/collapse |

**Sidebar Items**:

| Item | Icon | Label | Route |
|------|------|-------|-------|
| Dashboard | `LayoutDashboard` | Dashboard | `/dashboard` |
| Invoices | `FileText` | Invoices | `/invoices` |
| Customers | `Users` | Customers | `/customers` |
| Suppliers | `Truck` | Suppliers | `/suppliers` |
| Products | `Package` | Products | `/products` |
| Payments | `CreditCard` | Payments | `/payments` |
| Expenses | `ShoppingCart` | Expenses | `/expenses` |
| Reports | `BarChart3` | Reports | `/reports` |
| Inventory | `Package` | Inventory | `/inventory` |
| Audit Logs | `ShieldCheck` | Audit Logs | `/audit-logs` |
| CA Assistant | `Bot` | CA Assistant | `/ca-assistant` |
| Settings | `Settings` | Settings | `/settings` |

**Active State**:
- `bg-primary-500/10`
- `text-primary-400`
- `border-l-2 border-primary-500`
- `font-semibold`

**Collapsed State**:
- Show only icons
- Tooltip on hover
- `w-16` width

### 5.2 Top Bar

| Property | Value |
|----------|-------|
| Height | `h-16` |
| Background | `bg-bg-secondary` |
| Border | `border-b border-border-subtle` |
| Padding | `px-6` |
| Position | Sticky top |
| Z-index | `z-40` |

**Top Bar Elements**:

| Element | Position | Style |
|---------|----------|-------|
| Breadcrumb | Left | `text-sm text-tertiary` |
| Search | Center | `w-64`, `glass-input` |
| Notifications | Right | `w-8 h-8`, badge indicator |
| User Avatar | Right | `w-8 h-8` |
| Theme Toggle | Right | `w-8 h-8` |
| Sidebar Toggle | Left | `w-8 h-8` (mobile) |

### 5.3 Breadcrumb

| Property | Value |
|----------|-------|
| Font | `text-sm` |
| Color | `text-tertiary` |
| Separator | `ChevronRight` icon, `w-4 h-4` |
| Active | `text-primary` |
| Padding | `py-2` |

---

## 6. Data Visualization

### 6.1 Chart Library

- **Primary**: Recharts (React-native, lightweight)
- **Fallback**: Chart.js via `react-chartjs-2`

### 6.2 Chart Types

| Chart | Usage | Size |
|-------|-------|------|
| Line (area) | Revenue trend | `50%` width, `280px` height |
| Bar | Expense breakdown | `50%` width, `280px` height |
| Doughnut | Payment methods | `50%` width, `280px` height |
| Line | Invoice status over time | `50%` width, `280px` height |
| Bar | Monthly comparison | `50%` width, `280px` height |

### 6.3 Chart Colors

| Data Series | Color |
|-------------|-------|
| Revenue | `primary-500` |
| Receivables | `warning` |
| Payments | `success` |
| Expenses | `error` |
| Income | `primary-400` |
| Profit | `emerald-400` |

### 6.4 Chart Interactions

| Interaction | Behavior |
|-------------|----------|
| Hover | Show tooltip with exact values |
| Click | Filter data by date range |
| Legend click | Toggle series visibility |
| Zoom | Drag to select date range |
| Export | Download as PNG |

---

## 7. Alert System

### 7.1 Alert Types

| Type | Color | Icon | Behavior |
|------|-------|------|----------|
| Low Stock | `warning` | `AlertTriangle` | Navigate to inventory |
| Overdue Invoice | `error` | `AlertCircle` | Navigate to invoices |
| Upcoming Payment | `info` | `Clock` | Navigate to payments |
| High Receivables | `warning` | `AlertTriangle` | Navigate to reports |
| Cash Flow Warning | `error` | `AlertCircle` | Navigate to dashboard |

### 7.2 Alert Card Design

| Property | Value |
|----------|-------|
| Background | `bg-secondary/80` |
| Border | `border-border-subtle` |
| Left border | `border-l-4` with severity color |
| Border radius | `radius-lg` |
| Padding | `space-3 space-4` |
| Animation | `slideIn` |

### 7.3 Alert Behavior

- Auto-refresh every 30 seconds
- Click to navigate to relevant page
- `View All` link to alerts page
- Dismissible with `X` button
- Badge count on sidebar item

---

## 8. Quick Actions Design

### 8.1 Action Button Design

| Property | Value |
|----------|-------|
| Background | `transparent` |
| Border | `border border-border-subtle` |
| Border radius | `radius-lg` |
| Padding | `space-3` |
| Width | `100%` |
| Animation | `fadeIn` stagger |

**Hover State**:
- `border-primary-500/50`
- `bg-primary-500/5`
- `text-primary`
- `shadow-sm`

**Active State**:
- `bg-primary-500/10`
- `border-primary-500`

### 8.2 Action Order

| Priority | Action | Icon |
|----------|--------|------|
| 1 | New Invoice | `FilePlus` |
| 2 | Add Customer | `UserPlus` |
| 3 | Record Payment | `CreditCard` |
| 4 | Add Product | `Package` |
| 5 | Generate Report | `FileText` |
| 6 | CA Assistant | `Bot` |

### 8.3 Stagger Animation

Each action button fades in sequentially:
- Button 1: `0ms` delay
- Button 2: `100ms` delay
- Button 3: `200ms` delay
- Button 4: `300ms` delay
- Button 5: `400ms` delay
- Button 6: `500ms` delay

---

## 9. AI Insights Design

### 9.1 Insight Card

| Property | Value |
|----------|-------|
| Background | `bg-gradient-to-r from-primary-500/10 to-purple-500/10` |
| Border | `border border-primary-500/20` |
| Border radius | `radius-xl` |
| Padding | `space-4` |
| Animation | `fadeIn` |

### 9.2 Insight Item

| Property | Value |
|----------|-------|
| Icon | `Bot`, `w-5 h-5`, `text-primary-400` |
| Text | `text-sm text-secondary` |
| Separator | `border-t border-border-subtle`, `my-3` |
| Animation | `slideUp` stagger |

### 9.3 Insight Generation

- Triggered on dashboard load
- Refreshed every 5 minutes
- Based on current financial data
- Contextual to user's business
- Can be manually refreshed

### 9.4 CA Assistant Integration

| Feature | Implementation |
|---------|----------------|
| Inline insights | Auto-generated on dashboard |
| Full chat | Click "Ask CA Assistant" to open |
| Context | Current dashboard data passed to AI |
| Feedback | Thumbs up/down on insights |
| Persistence | Chat history saved to localStorage |

---

## 10. Loading States

### 10.1 Skeleton Screens

| Component | Skeleton Style |
|-----------|----------------|
| KPI Card | `rounded-xl`, `h-24`, `bg-tertiary/50`, `shimmer` |
| Chart Card | `rounded-xl`, `h-280px`, `bg-tertiary/50`, `shimmer` |
| Table Row | `rounded`, `h-16`, `bg-tertiary/50`, `shimmer` |
| Action Button | `rounded-lg`, `h-12`, `bg-tertiary/50`, `shimmer` |
| Alert Item | `rounded-lg`, `h-16`, `bg-tertiary/50`, `shimmer` |

### 10.2 Spinner

| Property | Value |
|----------|-------|
| Size | `w-8 h-8` |
| Color | `text-primary-500` |
| Animation | `spin` |
| Position | Center of container |

### 10.3 Loading Sequence

1. Page loads with skeleton screens
2. Data fetches asynchronously
3. Skeletons replace with actual content
4. Content fades in (`fadeIn`, `250ms`)
5. Charts animate in (`slideUp`, `350ms` stagger)

---

## 11. Error States

### 11.1 Error Boundary

| Property | Value |
|----------|-------|
| Background | `bg-secondary` |
| Border | `border border-error/30` |
| Border radius | `radius-xl` |
| Padding | `space-6` |
| Icon | `AlertCircle`, `w-12 h-12`, `text-error` |

**Error Content**:
- Title: `Something went wrong`
- Description: `We encountered an error loading this section.`
- Action: `Retry` button (`primary` variant)
- Secondary: `Go to Dashboard` link

### 11.2 Empty State

| Property | Value |
|----------|-------|
| Background | `bg-secondary` |
| Border | `border border-border-subtle` |
| Border radius | `radius-xl` |
| Padding | `space-8` |
| Icon | Context-specific, `w-16 h-16`, `text-tertiary` |

**Empty State Content**:
- Title: `No [items] yet`
- Description: Contextual message
- Action: `Create [item]` button (`primary` variant)

### 11.3 404 Page

| Property | Value |
|----------|-------|
| Background | `bg-primary` |
| Content | Centered |
| Icon | `FileX`, `w-24 h-24`, `text-tertiary` |
| Title | `404` |
| Description | `The page you're looking for doesn't exist.` |
| Action | `Go to Dashboard` button (`primary` variant) |

---

## 12. Responsive Behavior

### 12.1 Mobile (`xs`, <640px)

| Element | Behavior |
|---------|----------|
| Sidebar | Hidden, hamburger menu overlay |
| KPI Cards | 2 columns, stacked |
| Chart | Full width, `200px` height |
| Quick Actions | Full width, horizontal scroll |
| Alerts | Full width, stacked |
| AI Insights | Full width, stacked |
| Navigation | Bottom tab bar |

### 12.2 Tablet (`sm`, 640px)

| Element | Behavior |
|---------|----------|
| Sidebar | Collapsed icon-only (`w-16`) |
| KPI Cards | 2 columns |
| Chart | 2 columns |
| Quick Actions | 2 columns |
| Alerts | 2 columns |
| AI Insights | Full width |

### 12.3 Desktop (`md+`, 768px+)

| Element | Behavior |
|---------|----------|
| Sidebar | Expanded (`w-64`) |
| KPI Cards | 4 columns |
| Chart | 2 columns |
| Quick Actions | 1 column |
| Alerts | 1 column |
| AI Insights | Full width |

---

## 13. Performance Considerations

| Optimization | Implementation |
|--------------|----------------|
| Chart lazy loading | Charts load only when visible |
| Data pagination | KPI data fetched in chunks |
| Skeleton screens | Shown immediately, replaced on data load |
| Image optimization | `next/image` for any icons |
| Code splitting | Dashboard components lazy loaded |
| Caching | KPI data cached for 5 minutes |
| Debounced search | Search input debounced 300ms |
| Virtual scrolling | Tables use virtual scrolling for >100 rows |

---

## 14. Animation Specifications

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Page load | `350ms` | `ease-out` | Dashboard mount |
| Card enter | `250ms` | `ease-out` | Each card stagger |
| Chart appear | `500ms` | `ease-out` | Chart data loaded |
| Hover | `150ms` | `ease-out` | Mouse over |
| Click | `100ms` | `ease-out` | Button press |
| Modal open | `300ms` | `ease-out` | Modal trigger |
| Alert slide | `350ms` | `ease-out` | Alert appear |
| Skeleton shimmer | `1500ms` | `ease-in-out` | Loading state |

---

## 15. Implementation Checklist

- [ ] Create sidebar navigation component
- [ ] Create top bar with breadcrumb
- [ ] Create KPI card component with sparkline
- [ ] Create chart card component (Recharts)
- [ ] Create financial snapshot component
- [ ] Create quick actions component
- [ ] Create alerts component
- [ ] Create AI insights component
- [ ] Create skeleton loading components
- [ ] Create error boundary component
- [ ] Create 404 page
- [ ] Implement responsive grid layout
- [ ] Implement stagger animations
- [ ] Implement lazy loading for charts
- [ ] Implement data caching
- [ ] Add keyboard navigation to dashboard
- [ ] Add ARIA labels to all dashboard elements
- [ ] Add reduced motion support
- [ ] Add dark/light mode toggle
- [ ] Test on all breakpoints

---

*This Bento Dashboard design is proposed for implementation. All layout, components, and specifications should be reviewed and approved before coding begins.*
