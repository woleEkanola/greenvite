# Greenvites Design System — Linear + Cal.com

> **Version**: 1.0  
> **Date**: 2026-06-01  
> **Design Direction**: Linear.app (admin surfaces) + Cal.com (public surfaces)  
> **Stack**: Next.js 14 App Router + Tailwind CSS 3.3 + shadcn/ui + Radix UI + Framer Motion

---

## 1. Design Philosophy

Four north star principles govern every pixel:

| Principle | Description | Anti-pattern |
|---|---|---|
| **Speed** | Reduce clicks, reduce chrome, reduce cognitive load. Admins should complete tasks in <3 interactions. | Dense forms, multi-step wizards when unnecessary |
| **Clarity** | Every element has one purpose. No decorative noise. Data is legible at a glance. | Pie charts for non-compositional data, redundant labels |
| **Trust** | Actions are confirmable, undoable, and traceable. Errors are specific and actionable. | Silent failures, destructive actions without confirmation |
| **Delight** | Micro-interactions reward completion. Empty states guide, not mock. | Aggressive animations, confetti on every action |

**Design target**: "Linear for event management" — the same feeling of precision, speed, and polish that Linear brings to issue tracking, applied to invitation management.

---

## 2. Color System

### 2.1 Emerald (Primary Brand)

| Token | Hex | Usage |
|---|---|---|
| `emerald-50` | `#ecfdf5` | Lightest backgrounds, hover states on light surfaces |
| `emerald-100` | `#d1fae5` | Badge backgrounds, subtle highlights |
| `emerald-200` | `#a7f3d0` | Disabled state tints, progress bar track |
| `emerald-300` | `#6ee7b7` | Secondary accents, hover borders |
| `emerald-400` | `#34d399` | Icon fills, decorative elements |
| `emerald-500` | `#10b981` | **Primary buttons**, active states, links |
| `emerald-600` | `#059669` | Button hover, focus rings |
| `emerald-700` | `#047857` | Button active, dark surface accents |
| `emerald-800` | `#065f46` | Dark mode primary, text on light emerald |
| `emerald-900` | `#064e3b` | Dark mode text, deepest backgrounds |
| `emerald-950` | `#022c22` | Dark mode surface base |

### 2.2 Neutral Gray (Surfaces & Text)

| Token | Hex | Usage |
|---|---|---|
| `gray-50` | `#fafafa` | Page background (light), input backgrounds |
| `gray-100` | `#f4f4f5` | Card backgrounds, hover on light surfaces |
| `gray-200` | `#e4e4e7` | Borders, dividers, disabled borders |
| `gray-300` | `#d4d4d8` | Placeholder text, inactive icons |
| `gray-400` | `#a1a1aa` | Secondary text, disabled text |
| `gray-500` | `#71717a` | Tertiary text, icon strokes |
| `gray-600` | `#52525b` | Body text (secondary), labels |
| `gray-700` | `#3f3f46` | Heading text, primary labels |
| `gray-800` | `#27272a` | Dark mode card surfaces |
| `gray-900` | `#18181b` | Dark mode sidebar, deep surfaces |
| `gray-950` | `#09090b` | Dark mode page background |

### 2.3 Semantic Colors

| Token | Light Hex | Dark Hex | Usage |
|---|---|---|---|
| `success` | `#10b981` (emerald-500) | `#34d399` (emerald-400) | Success states, confirmed, admitted |
| `error` | `#ef4444` (red-500) | `#f87171` (red-400) | Errors, cancelled, failed invites |
| `warning` | `#f59e0b` (amber-500) | `#fbbf24` (amber-400) | Pending, partial, attention needed |
| `info` | `#3b82f6` (blue-500) | `#60a5fa` (blue-400) | Info badges, links, help text |

### 2.4 Semantic Color Usage Map

| Context | Token | Example |
|---|---|---|
| Primary CTA button | `bg-emerald-500 hover:bg-emerald-600 text-white` | "Send Invites" |
| Secondary button | `bg-gray-100 hover:bg-gray-200 text-gray-700` | "Cancel" |
| Danger button | `bg-red-500 hover:bg-red-600 text-white` | "Delete Event" |
| Ghost button | `hover:bg-gray-100 text-gray-600` | Icon-only actions |
| Link | `text-emerald-600 hover:text-emerald-700` | Inline links |
| Active nav item | `bg-emerald-500 text-white` (sidebar) | Current page |
| Success badge | `bg-emerald-50 text-emerald-700 border-emerald-200` | "Sent" |
| Error badge | `bg-red-50 text-red-700 border-red-200` | "Failed" |
| Warning badge | `bg-amber-50 text-amber-700 border-amber-200` | "Pending" |
| Info badge | `bg-blue-50 text-blue-700 border-blue-200` | "Draft" |
| Focus ring | `ring-2 ring-emerald-500 ring-offset-2` | All interactive elements |
| Border | `border border-gray-200` | Cards, inputs, tables |
| Input error border | `border-red-300 focus:ring-red-500` | Invalid form fields |

---

## 3. Typography

### 3.1 Font Families

| Role | Font | Fallback | Import |
|---|---|---|---|
| **UI / Body** | `Inter` | `system-ui, sans-serif` | Already loaded |
| **Monospace** | `JetBrains Mono` | `ui-monospace, monospace` | Add via `next/font` |
| **Public headings** | `Inter` (same) | — | Keep consistent |

### 3.2 Type Scale

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `display` | 36px / 2.25rem | 700 | 1.1 | -0.02em | Dashboard hero numbers |
| `h1` | 24px / 1.5rem | 600 | 1.3 | -0.01em | Page titles |
| `h2` | 20px / 1.25rem | 600 | 1.3 | -0.01em | Section headers |
| `h3` | 16px / 1rem | 600 | 1.4 | 0 | Card titles, modal titles |
| `h4` | 14px / 0.875rem | 600 | 1.4 | 0 | Subsection headers |
| `body` | 14px / 0.875rem | 400 | 1.5 | 0 | Default body text |
| `body-sm` | 13px / 0.8125rem | 400 | 1.5 | 0 | Secondary text |
| `body-xs` | 12px / 0.75rem | 400 | 1.4 | 0 | Captions, timestamps |
| `code` | 13px / 0.8125rem | 400 | 1.5 | 0 | Registration codes, IDs |
| `button` | 14px / 0.875rem | 500 | 1 | 0 | Button text |
| `button-sm` | 13px / 0.8125rem | 500 | 1 | 0 | Small button text |

### 3.3 Usage Rules

- **Never** use `font-bold` (700) for body text — reserve for display numbers only
- **Never** use `text-gray-400` for readable content — minimum `text-gray-500`
- **Code/IDs** always use monospace: `font-mono text-xs tracking-wide`
- **Numbers in tables** use tabular-nums: `tabular-nums`
- **Public pages** use `16px` body (not 14px) for readability

### 3.4 Tailwind Mapping

```js
// tailwind.config.js — fontSize
fontSize: {
  'xs':   ['12px',  { lineHeight: '1.4', letterSpacing: '0' }],
  'sm':   ['13px',  { lineHeight: '1.5', letterSpacing: '0' }],
  'base': ['14px',  { lineHeight: '1.5', letterSpacing: '0' }],
  'lg':   ['16px',  { lineHeight: '1.4', letterSpacing: '0' }],
  'xl':   ['20px',  { lineHeight: '1.3', letterSpacing: '-0.01em' }],
  '2xl':  ['24px',  { lineHeight: '1.3', letterSpacing: '-0.01em' }],
  '3xl':  ['36px',  { lineHeight: '1.1', letterSpacing: '-0.02em' }],
}
```

---

## 4. Spacing & Layout Grid

### 4.1 Spacing Scale

All spacing uses a **4px base unit**.

| Token | Value | Usage |
|---|---|---|
| `1` | 4px | Tight gaps between related elements |
| `2` | 8px | Icon spacing, padding inside badges |
| `3` | 12px | Input padding, small gaps |
| `4` | 16px | Card padding, section gaps |
| `5` | 20px | — |
| `6` | 24px | Page section gaps |
| `7` | 28px | — |
| `8` | 32px | Major section gaps |
| `10` | 40px | — |
| `12` | 48px | Page margins, large gaps |
| `16` | 64px | Hero section padding |

### 4.2 Layout Grid

| Context | Max Width | Columns | Gutter | Padding |
|---|---|---|---|---|
| Dashboard content | 1280px | 12 | 24px | 24px (mobile: 16px) |
| Public event page | 768px | — | — | 24px (mobile: 16px) |
| Modal content | 480px (sm), 640px (md) | — | — | 24px |
| Sidebar expanded | 256px | — | — | 16px |
| Sidebar collapsed | 64px | — | — | 8px |

### 4.3 Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| `sm` | 640px | Mobile landscape, tablet portrait |
| `md` | 768px | Tablet, sidebar overlay mode |
| `lg` | 1024px | Desktop, sidebar inline mode |
| `xl` | 1280px | Wide desktop, 4-column grids |
| `2xl` | 1536px | Ultra-wide, constrained content |

---

## 5. Elevation & Shadows

| Level | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `card` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | `0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)` | Cards, stat boxes, table containers |
| `dropdown` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` | `0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.3)` | Dropdown menus, popovers |
| `modal` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` | `0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -2px rgba(0,0,0,0.3)` | Modal containers, dialogs |
| `toast` | `0 4px 12px rgba(0,0,0,0.15)` | `0 4px 12px rgba(0,0,0,0.4)` | Toast notifications |
| `overlay` | `0 0 0 1px rgba(0,0,0,0.05)` + backdrop blur | `0 0 0 1px rgba(255,255,255,0.05)` + backdrop blur | Modal backdrop, sidebar overlay |

### Tailwind Mapping

```js
boxShadow: {
  'card':     '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  'dropdown': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  'modal':    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
  'toast':    '0 4px 12px rgba(0,0,0,0.15)',
}
```

---

## 6. Border Radius

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Badges, small tags |
| `sm` | 6px | Input fields, checkboxes |
| `md` | 8px | Buttons, dropdown items |
| `lg` | 12px | Cards, modal containers |
| `xl` | 16px | Hero sections, large containers |
| `full` | 9999px | Avatar circles, pill badges, toggle switches |

### Component Radius Map

| Component | Radius |
|---|---|
| Button | `md` (8px) |
| Input / Select / Textarea | `sm` (6px) |
| Card | `lg` (12px) |
| Modal | `lg` (12px) |
| Badge | `full` (pill) or `xs` (rectangular) |
| Table | `lg` (12px) on container |
| Avatar | `full` |
| Tooltip | `sm` (6px) |

---

## 7. Component Specifications

> Each component is specified with: **anatomy**, **variants**, **states**, **dark mode**, and **Tailwind implementation**.

---

### 7.1 Button

**Anatomy**: `[icon] [label] [spinner]`

#### Variants

| Variant | Light Mode Classes | Dark Mode Classes | Usage |
|---|---|---|---|
| `primary` | `bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm` | `bg-emerald-600 hover:bg-emerald-500 text-white` | Primary CTA, submit actions |
| `secondary` | `bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200` | `bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700` | Cancel, back, secondary actions |
| `outline` | `border border-gray-300 hover:bg-gray-50 text-gray-700` | `border border-gray-600 hover:bg-gray-800 text-gray-300` | Tertiary actions, filters |
| `ghost` | `hover:bg-gray-100 text-gray-600` | `hover:bg-gray-800 text-gray-400` | Icon-only actions, toolbar buttons |
| `danger` | `bg-red-500 hover:bg-red-600 text-white` | `bg-red-600 hover:bg-red-500 text-white` | Delete, remove, destructive |
| `link` | `text-emerald-600 hover:text-emerald-700 underline-offset-2 hover:underline` | `text-emerald-400 hover:text-emerald-300` | Inline links, "View all" |

#### Sizes

| Size | Classes | Icon Size |
|---|---|---|
| `xs` | `h-7 px-2.5 text-xs` | 14px |
| `sm` | `h-8 px-3 text-sm` | 16px |
| `md` | `h-10 px-4 text-base` | 18px |
| `lg` | `h-12 px-6 text-lg` | 20px |

#### States

| State | Classes |
|---|---|
| `disabled` | `opacity-50 cursor-not-allowed pointer-events-none` |
| `loading` | Button content replaced with `<Loader2 className="animate-spin h-4 w-4" />` |
| `focus` | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2` |

#### Loading Pattern

```tsx
<Button variant="primary" size="md" disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="animate-spin h-4 w-4 mr-2" />
      Sending...
    </>
  ) : (
    <>
      <Send className="h-4 w-4 mr-2" />
      Send Invites
    </>
  )}
</Button>
```

---

### 7.2 Card

**Anatomy**: `[CardHeader] [CardBody] [CardFooter]`

#### Variants

| Variant | Classes | Usage |
|---|---|---|
| `default` | `bg-white border border-gray-200 rounded-lg shadow-card` | Standard content container |
| `elevated` | `bg-white border border-gray-200 rounded-lg shadow-dropdown` | Interactive cards (hoverable) |
| `interactive` | `bg-white border border-gray-200 rounded-lg shadow-card hover:shadow-dropdown hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer` | Clickable cards (event cards, table cards) |
| `bordered` | `bg-white border-2 border-gray-200 rounded-lg` | Forms, modals |
| `ghost` | `bg-transparent` | Inline content, no visual boundary |

#### Dark Mode

```
bg-gray-900 border-gray-800
hover:border-gray-700
```

#### Slots

```tsx
<Card variant="interactive">
  <CardHeader>
    <CardTitle>Johnson Wedding</CardTitle>
    <CardDescription>Dec 15, 2026 • Lagos</CardDescription>
  </CardHeader>
  <CardBody>
    <StatGrid stats={eventStats} />
  </CardBody>
  <CardFooter>
    <Button variant="link" size="sm">View event →</Button>
  </CardFooter>
</Card>
```

---

### 7.3 DataTable

**Anatomy**: `[Header (search + filters)] [Table (thead + tbody)] [Footer (pagination)]`

#### Visual Spec

| Element | Classes |
|---|---|
| Container | `bg-white border border-gray-200 rounded-lg overflow-hidden` |
| Header row | `bg-gray-50 border-b border-gray-200` |
| Header cell | `px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left` |
| Sortable header | `cursor-pointer hover:text-gray-700 select-none` + sort icon on hover |
| Body row | `border-b border-gray-100 hover:bg-gray-50 transition-colors` |
| Body cell | `px-4 py-3 text-sm text-gray-700` |
| Last row | `border-b-0` |
| Empty state | `py-12 text-center` with illustration + CTA |

#### Sortable Column

```tsx
<th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none group">
  <div className="flex items-center gap-1">
    Name
    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
      {sortField === 'name' ? (
        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3" />
      )}
    </span>
  </div>
</th>
```

#### Pagination

```tsx
<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
  <div className="text-sm text-gray-500">
    Showing {start}-{end} of {total}
  </div>
  <div className="flex items-center gap-1">
    <Button variant="outline" size="xs" disabled={page === 1}>Previous</Button>
    {pages.map(p => (
      <button key={p} className={`h-7 w-7 text-xs rounded-md ${page === p ? 'bg-emerald-500 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
        {p}
      </button>
    ))}
    <Button variant="outline" size="xs" disabled={page === totalPages}>Next</Button>
  </div>
</div>
```

#### Responsive Column Hiding

| Column | sm (<640) | md (<768) | lg (<1024) | xl |
|---|---|---|---|---|
| Name | ✅ | ✅ | ✅ | ✅ |
| Email | ❌ | ❌ | ✅ | ✅ |
| Phone | ❌ | ❌ | ✅ | ✅ |
| Type | ❌ | ✅ | ✅ | ✅ |
| Table | ❌ | ❌ | ✅ | ✅ |
| Status | ✅ | ✅ | ✅ | ✅ |
| Actions | ✅ | ✅ | ✅ | ✅ |

#### Empty State

```tsx
<div className="py-12 text-center">
  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
  <h3 className="text-lg font-medium text-gray-700 mb-1">No guests yet</h3>
  <p className="text-sm text-gray-500 mb-4">Send your first invites to get started</p>
  <Button variant="primary" size="sm">Send Invites</Button>
</div>
```

---

### 7.4 Sidebar (Admin)

**Anatomy**: `[Brand] [User] [Nav Groups] [Footer]`

#### Structure

```
┌──────────────────────────┐
│ [logo] Greenvites        │  ← Brand (always visible)
├──────────────────────────┤
│ [avatar] Jesse O.        │  ← User + role badge
│          Admin           │
├──────────────────────────┤
│ 📊 Dashboard             │  ← Single item (no group)
├── EVENTS ────────────────│  ← Group header (collapsible)
│ 📅 All Events            │
│ ➕ Create Event          │
├── SETUP ─────────────────│
│ 💬 WhatsApp              │
│ 👥 Manage Admins         │
├──────────────────────────┤
│ [collapse icon]          │  ← Footer toggle
└──────────────────────────┘
```

#### Expanded State (256px)

| Element | Classes |
|---|---|
| Container | `fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 flex flex-col` |
| Brand | `h-14 px-4 flex items-center gap-3 border-b border-gray-200` |
| Brand logo | `h-7 w-7 rounded-md bg-emerald-500` |
| Brand text | `text-base font-semibold text-gray-900` |
| User section | `px-4 py-3 border-b border-gray-200` |
| Avatar | `h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium` |
| User name | `text-sm font-medium text-gray-900 truncate` |
| User role | `text-xs text-gray-500` |
| Group header | `px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider` |
| Nav item (default) | `flex items-center gap-3 px-4 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-100 transition-colors` |
| Nav item (active) | `flex items-center gap-3 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-md` |
| Nav item (collapsed) | `flex items-center justify-center w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100` |
| Nav icon | `h-4 w-4 flex-shrink-0` |
| Collapse button | `absolute bottom-4 right-2 h-6 w-6 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 text-gray-400` |

#### Collapsed State (64px)

| Element | Classes |
|---|---|
| Container | `fixed top-0 left-0 h-full w-16 bg-white border-r border-gray-200 z-30 flex flex-col items-center py-4` |
| Brand | `h-10 w-10 rounded-md bg-emerald-500 flex items-center justify-center mb-4` |
| Brand icon only | `h-5 w-5 text-white` |
| Nav item | `flex items-center justify-center w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 transition-colors relative` |
| Nav item (active) | `flex items-center justify-center w-10 h-10 rounded-md bg-emerald-500 text-white` |
| Tooltip | `absolute left-full ml-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none` |

#### Dark Mode

```
Container: bg-gray-950 border-gray-800
Nav item (default): text-gray-400 hover:bg-gray-800
Nav item (active): bg-emerald-600 text-white
Group header: text-gray-500
User section: border-gray-800
```

#### Event Sub-Navigation (Grouped)

The event-level sidebar (currently 14 flat items) becomes **4 collapsible groups**:

```
┌──────────────────────────┐
│ ← Back to Events         │
│ 📅 Johnson Wedding       │
├──────────────────────────┤
│ ▼ INVITATIONS            │  ← Expanded by default
│   📨 Send Invites        │
│   📬 Sent Invites        │
│   🎫 Registration Codes  │
│   💬 Message Templates   │
├── GUESTS ────────────────│  ← Collapsed
│   👥 RSVPs               │
│   🎟️ Access Codes        │
│   📱 Mobile Access       │
│   📋 QR Codes            │
├── SEATING ───────────────│  ← Collapsed
│   🪑 Tables              │
│   🗺️ Floor Plans         │
├── SETUP ─────────────────│  ← Collapsed
│   🌐 Event Page          │
│   📱 WhatsApp Settings   │
│   👤 Hosts               │
│   🎁 Souvenirs           │
└──────────────────────────┘
```

**Group header**: `px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 flex items-center justify-between`

**Group items**: Indented 16px from left, `pl-12` in expanded state.

---

### 7.5 Modal / Dialog

**Anatomy**: `[Backdrop] [Container] [Header] [Body] [Footer]`

#### Visual Spec

| Element | Classes |
|---|---|
| Backdrop | `fixed inset-0 bg-black/40 backdrop-blur-sm z-40` |
| Container (desktop) | `fixed inset-0 z-50 flex items-center justify-center p-4` |
| Container (mobile) | `fixed inset-x-0 bottom-0 z-50` (bottom sheet) |
| Dialog panel | `bg-white rounded-lg shadow-modal w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col` |
| Header | `px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0` |
| Header title | `text-lg font-semibold text-gray-900` |
| Close button | `h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400` |
| Body | `px-6 py-4 overflow-y-auto flex-1` |
| Footer | `px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2 flex-shrink-0 bg-gray-50` |

#### Mobile Bottom Sheet

```tsx
// On screens < 768px, modal becomes a bottom sheet:
className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-xl shadow-modal max-h-[85vh] overflow-hidden flex flex-col"
// Backdrop remains the same
```

#### Animation (Framer Motion)

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
/>
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 10 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
  className="bg-white rounded-lg shadow-modal w-full max-w-md"
>
```

#### Behavior

- ESC closes
- Backdrop click closes
- Body scroll locked when open
- Focus trapped inside
- `aria-modal="true"`, `role="dialog"`, `aria-labelledby` required

---

### 7.6 Form Elements

#### Input

| State | Classes |
|---|---|
| Default | `h-10 px-3 text-sm bg-white border border-gray-200 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all` |
| Error | `border-red-300 focus:ring-red-500` |
| Disabled | `bg-gray-50 text-gray-400 cursor-not-allowed` |
| With icon | `pl-10` + icon absolutely positioned at `left-3 top-1/2 -translate-y-1/2` |

#### Select

Same as Input + chevron icon on right: `pr-10` + `<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />`

#### Textarea

```
min-h-[100px] px-3 py-2 text-sm bg-white border border-gray-200 rounded-md
text-gray-900 placeholder:text-gray-400
focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
resize-y
```

#### Checkbox

```tsx
// Use Radix UI Checkbox or styled native:
<input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
```

#### Toggle / Switch

```
// Radix UI Switch styled:
w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer
[data-state="checked"]:bg-emerald-500
thumb: w-4 h-4 bg-white rounded-full shadow-sm absolute top-0.5 left-0.5
[data-state="checked"]:translate-x-5
transition-transform duration-200
```

#### FormField Wrapper

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    Email Address
    <span className="text-red-500 ml-1">*</span>
  </label>
  <Input type="email" placeholder="guest@example.com" />
  <p className="text-xs text-gray-500">We'll send the invite to this address</p>
  {error && <p className="text-xs text-red-500">{error}</p>}
</div>
```

---

### 7.7 Badge / Tag

| Variant | Classes | Usage |
|---|---|---|
| `success` | `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200` | Sent, Admitted, Confirmed |
| `error` | `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200` | Failed, Cancelled, Bounced |
| `warning` | `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200` | Pending, Partial |
| `info` | `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200` | Draft, New |
| `default` | `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200` | Generic |
| `dot` | Add `<span className="w-1.5 h-1.5 rounded-full bg-current" />` before text | Live status indicators |

#### Dark Mode

```
success: bg-emerald-900/30 text-emerald-400 border-emerald-800
error:   bg-red-900/30 text-red-400 border-red-800
warning: bg-amber-900/30 text-amber-400 border-amber-800
info:    bg-blue-900/30 text-blue-400 border-blue-800
default: bg-gray-800 text-gray-300 border-gray-700
```

---

### 7.8 Tabs

#### Underline Style (Linear-like) — For page navigation

```
flex items-center gap-0 border-b border-gray-200
tab: px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent transition-colors
tab (active): text-gray-900 border-b-2 border-emerald-500
```

#### Pill Style — For filters, toggles

```
inline-flex items-center gap-1 p-1 bg-gray-100 rounded-md
tab: px-3 py-1.5 text-sm font-medium text-gray-600 rounded-sm hover:text-gray-900 transition-colors
tab (active): bg-white text-gray-900 shadow-sm
```

---

### 7.9 Breadcrumbs

```tsx
<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm mb-4">
  <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700">Dashboard</Link>
  <ChevronRight className="h-3 w-3 text-gray-400" />
  <Link href="/admin/dashboard/events" className="text-gray-500 hover:text-gray-700">Events</Link>
  <ChevronRight className="h-3 w-3 text-gray-400" />
  <span className="text-gray-900 font-medium truncate">Johnson Wedding</span>
</nav>
```

**Mobile**: Truncate middle items, show first + last:
```
Dashboard > ... > Johnson Wedding
```

---

### 7.10 Toast / Notification

Using **Sonner** (already installed):

```tsx
import { toast } from 'sonner'

toast.success('Invite sent successfully')
toast.error('Failed to send invites')
toast.info('Draft saved')
toast.warning('5 invites bounced')
```

**Visual**: Slide in from top-right, green/red/amber/blue left border, auto-dismiss after 4s, progress bar at bottom.

**Dark mode**: `bg-gray-900 text-gray-100 border-gray-800`

---

### 7.11 Progress Bar

```tsx
<div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
  <div
    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
    style={{ width: `${progress}%` }}
  />
</div>
```

**Variants**: `emerald` (default), `blue` (info), `amber` (warning), `red` (error)

**With label**:
```
<div className="flex items-center justify-between mb-1">
  <span className="text-sm text-gray-600">Sending invites</span>
  <span className="text-sm font-medium text-gray-900">{sent}/{total}</span>
</div>
```

---

## 8. Page Layout Blueprints

### 8.1 Admin Dashboard Landing

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Welcome back, Jesse!                    [🔔] [👤] │
│           ├─────────────────────────────────────────────────────┤
│  Dashboard│  Quick Actions          Active Event                │
│  Events   │  ┌────────────┐        ┌──────────────────────┐    │
│  WhatsApp │  │ Create     │        │ 📅 Johnson Wedding   │    │
│           │  │ Event      │        │ ─────────────────── │    │
│           │  └────────────┘        │ RSVPs: ██████░░ 60% │    │
│           │  ┌────────────┐        │ Tables: ████░░ 40%  │    │
│           │  │ Send       │        │ Today: +12 check-ins│    │
│           │  │ Invites    │        │ [View Event →]      │    │
│           │  └────────────┘        └──────────────────────┘    │
│           │                                                     │
│           │  ── Performance at a Glance ──                      │
│           │  ┌────────┬────────┬────────┬────────┐             │
│           │  │ Invites│ RSVPs  │Admitted│Souvenir│             │
│           │  │   320  │  192   │  145   │   89   │             │
│           │  │  ↑12%  │  ↑8%   │  ↑15%  │  ↑5%   │             │
│           │  └────────┴────────┴────────┴────────┘             │
│           │                                                     │
│           │  ── Recent Activity ──                              │
│           │  • 5 min ago: Jane Doe RSVP'd (Johnson Wed)        │
│           │  • 12 min ago: Bulk invite sent (Smith Corp)       │
│           │  • 1h ago: Table 4 assigned to Dr. Williams        │
└───────────┴─────────────────────────────────────────────────────┘
```

**Layout grid**: 2 columns on lg+, 1 column on mobile.

**Stat cards**: 4-column grid on xl, 2-column on md, 1-column on mobile.

**Activity feed**: Max 5 items, "View all" link, each item has timestamp + avatar/icon + description.

### 8.2 Event Detail / Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Events           Johnson Wedding                     │
│  📅 Dec 15, 2026  📍 Lagos  🟢 Published    [Edit] [Preview]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────┬────────┬────────┬────────┐                          │
│  │  Reg   │  RSVP  │ Tables │Invites │                          │
│  │  Codes │        │        │        │                          │
│  │  320   │  192   │   24   │  280   │                          │
│  │        │ (60%)  │        │ (88%)  │                          │
│  └────────┴────────┴────────┴────────┘                          │
│                                                                   │
│  ── Funnel ──                                                     │
│  Invited (320) → RSVP'd (192) → Admitted (145) → Souvenir (89)  │
│  ████████████████████████████████████████████████████            │
│                                                                   │
│  ── Recent Activity ──                                            │
│  • 5 min ago: Jane Doe RSVP'd                                     │
│  • 12 min ago: Table 3 filled                                     │
│  • 1h ago: Bulk invite sent (45 recipients)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Hero bar**: Event title + date + location + status badge + action buttons. No colored background — clean white with subtle border-bottom.

**Stats**: 4-card grid with trend indicators (↑12%, ↓3%).

**Funnel**: Horizontal bar chart with labeled stages.

### 8.3 Tables Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Tables for Johnson Wedding                    [+ Add] [Bulk]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┬────────────┬────────────┐                       │
│  │ Total: 24  │ Occupied:  │ Vacant:    │                       │
│  │ Tables     │ 156/240    │ 84 seats   │                       │
│  └────────────┴────────────┴────────────┘                       │
│                                                                   │
│  [🔍 Search tables...]  [All Tables ▼]  [Grid] [List]           │
│                                                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│  │ Table 1    │ │ Table 2    │ │ Table 3    │                   │
│  │ ██████░░░░ │ │ ████░░░░░░ │ │ ██████████ │                   │
│  │ 8/10       │ │ 4/10       │ │ 10/10 Full │                   │
│  │ [Hosts]    │ │ [Hosts]    │ │ [Hosts]    │                   │
│  │ [Occupants]│ │ [Occupants]│ │ [Occupants]│                   │
│  └────────────┘ └────────────┘ └────────────┘                   │
│                                                                   │
│  ┌────────────┐ ┌────────────┐                                   │
│  │ Table 4    │ │ Table 5    │                                   │
│  │ ░░░░░░░░░░ │ │ ██████░░░░ │                                   │
│  │ 0/10 Empty │ │ 6/10       │                                   │
│  │ [Hosts]    │ │ [Hosts]    │                                   │
│  │ [Occupants]│ │ [Occupants]│                                   │
│  └────────────┘ └────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Stats bar**: 3-column stat summary at top (total tables, occupancy rate, vacant seats).

**Cards**: Progress bar fills with color: green (>50%), amber (1-50%), red (0%), gray (empty).

**Status badge**: Top-right corner — "Full" (red), "Empty" (gray), "6 Free" (amber).

### 8.4 Invites Page (Send Invites)

```
┌─────────────────────────────────────────────────────────────────┐
│  Send Invites — Johnson Wedding                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─ Recipients (127) ─────────────┐ ┌─ Message ───────────────┐ │
│  │                                 │ │                         │ │
│  │ [🔍 Search or add...]           │ │ Subject: You're invited!│ │
│  │                                 │ │                         │ │
│  │ ┌─────────────────────────────┐ │ │ Dear {{name}},          │ │
│  │ │ Jane Doe  jane@email.com    │ │ │                         │ │
│  │ │          📧 📱              │ │ │ Join us for...          │ │
│  │ │─────────────────────────────│ │ │                         │ │
│  │ │ John Smith john@email.com   │ │ │ [Preview] [Templates ▼] │ │
│  │ │          📧 📱              │ │ │                         │ │
│  │ │─────────────────────────────│ │ │ WhatsApp message:       │ │
│  │ │ ...                         │ │ │ Hey {{name}}! 🎉        │ │
│  │ └─────────────────────────────┘ │ │ You're invited to...    │ │
│  │                                 │ │                         │ │
│  │ [+ Add from file] [+ Add one]   │ │ [127 chars / 1024]      │ │
│  └─────────────────────────────────┘ └─────────────────────────┘ │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  [Draft saved 2 min ago]              [Send to 127 recipients →] │
└─────────────────────────────────────────────────────────────────┘
```

**Layout**: Two-column split (recipients | message editor) on lg+, stacked on mobile.

**Recipient list**: Scrollable, max-height 400px, each row has channel toggles (email/WhatsApp).

**Message editor**: Rich text for email (React Quill), plain text for WhatsApp with character counter.

**Auto-save**: "Draft saved X min ago" indicator in footer.

**Progress on send**: Button becomes progress bar with per-recipient count: `Sending... 45/127`

### 8.5 Public Event / RSVP Page (Cal.com-inspired)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │              [hero image — full bleed]                    │  │
│  │                                                           │  │
│  │              Johnson & Williams Wedding                   │  │
│  │              December 15, 2026                            │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐                       │  │
│  │  │ 📅 Date      │  │ 📍 Location  │                       │  │
│  │  │ Dec 15, 2026 │  │ The Eko Hotel│                       │  │
│  │  │ 4:00 PM      │  │ Lagos, NG    │                       │  │
│  │  └──────────────┘  └──────────────┘                       │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  You're invited!                                    │  │  │
│  │  │                                                     │  │  │
│  │  │  We'd love to celebrate with you. Please confirm    │  │  │
│  │  │  your attendance below.                             │  │  │
│  │  │                                                     │  │  │
│  │  │  [Enter your registration code]                     │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌────┬────┬────┬────┬────┐                         │  │  │
│  │  │  │ A  │ B  │ 3  │ X  │ 7  │  ← 5-box code input    │  │  │
│  │  │  └────┴────┴────┴────┴────┘                         │  │  │
│  │  │                                                     │  │  │
│  │  │  [Confirm Attendance]                               │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Powered by Greenvites                                          │
└─────────────────────────────────────────────────────────────────┘
```

**RSVP Step Form** (after code entry):

```
Step 1 of 3: Your Information
┌───────────────────────────────────┐
│ Full Name *                       │
│ [Jane Doe                        ]│
│                                   │
│ Email Address *                   │
│ [jane@email.com                  ]│
│                                   │
│ Phone Number                      │
│ [+234 801 234 5678               ]│
│                                   │
│ [Continue →]                      │
└───────────────────────────────────┘
```

**Progress indicator**: 3 dots or "Step 1 of 3" at top.

**Success view**: Full-page confirmation with checkmark animation, event details, "Add to Calendar" button, share link.

---

## 9. Dark Mode

### 9.1 Color Overrides

| Light Token | Dark Token |
|---|---|
| `bg-white` | `bg-gray-900` |
| `bg-gray-50` | `bg-gray-950` |
| `bg-gray-100` | `bg-gray-800` |
| `text-gray-900` | `text-gray-100` |
| `text-gray-700` | `text-gray-300` |
| `text-gray-600` | `text-gray-400` |
| `text-gray-500` | `text-gray-500` |
| `text-gray-400` | `text-gray-600` |
| `border-gray-200` | `border-gray-800` |
| `border-gray-300` | `border-gray-700` |
| `shadow-card` | `shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)` |
| `bg-emerald-500` | `bg-emerald-600` |
| `hover:bg-emerald-600` | `hover:bg-emerald-500` |
| `bg-emerald-50` | `bg-emerald-900/30` |
| `text-emerald-700` | `text-emerald-400` |
| `border-emerald-200` | `border-emerald-800` |

### 9.2 Implementation

Add to `tailwind.config.js`:
```js
darkMode: 'class',
```

Toggle button in admin header:
```tsx
<button onClick={() => document.documentElement.classList.toggle('dark')}>
  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
</button>
```

Persist preference in `localStorage`.

### 9.3 Special Dark Mode Considerations

| Component | Issue | Fix |
|---|---|---|
| SweetAlert2 | No built-in dark theme | Replace with Radix UI Dialog (has dark mode) |
| React Quill | Limited dark theme | Use `ql-snow` with custom CSS overrides, or replace with Tiptap |
| Konva.js canvas | Canvas is transparent | Set canvas background to `bg-gray-900` |
| QR codes | Always black on white | Keep QR codes white background (required for scanning) |
| Charts (Recharts) | Default colors clash | Override chart colors for dark mode palette |

---

## 10. Animation & Micro-interactions

### 10.1 Timing Scale

| Duration | Easing | Usage |
|---|---|---|
| 100ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Hover states, button press, icon rotation |
| 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Toggle switches, checkbox, sidebar collapse |
| 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Modal open/close, page transitions, card hover |
| 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Progress bar, skeleton fade-in |

### 10.2 Standard Easing

```js
// Linear's signature easing — spring-like ease-out
transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
```

### 10.3 Micro-interaction Catalog

| Interaction | Trigger | Effect |
|---|---|---|
| Card hover | Mouse enter | `translateY(-2px)` + `shadow-card → shadow-dropdown` |
| Button press | Mouse down | `scale(0.98)` for 100ms |
| Sidebar collapse | Click toggle | Width `256px → 64px`, text fades out, icons center |
| Modal open | Trigger | Backdrop fade in 200ms, panel scale 0.95→1 + fade in 200ms |
| Page transition | Route change | Old page fade out 100ms, new page fade in + 5px upward slide 200ms |
| Form submit success | Response | Button → spinner → checkmark animation (300ms) → reset |
| Toast appear | `toast.success()` | Slide in from top-right 300ms, progress bar countdown 4s |
| Row highlight | Data refresh | Shimmer pulse on updated rows (500ms) |
| Empty state load | Data loaded | SVG illustration fade in 300ms, text fade in 400ms (staggered) |
| RSVP success | Form submit | Checkmark scale animation + confetti burst |
| Badge dot | Status change | Pulse animation (2s cycle) for live statuses |

### 10.4 prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

All animations must respect this. No repeating animations (the shake animation is banned).

### 10.5 Tailwind Animation Config

```js
animation: {
  'fade-in': 'fadeIn 0.2s ease-out',
  'slide-up': 'slideUp 0.2s ease-out',
  'slide-down': 'slideDown 0.2s ease-out',
  'scale-in': 'scaleIn 0.2s ease-out',
  'shimmer': 'shimmer 1.5s infinite',
  'pulse-dot': 'pulseDot 2s infinite',
},
keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  slideUp: {
    '0%': { opacity: '0', transform: 'translateY(5px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  slideDown: {
    '0%': { opacity: '0', transform: 'translateY(-5px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  scaleIn: {
    '0%': { opacity: '0', transform: 'scale(0.95)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  pulseDot: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
}
```

---

## 11. Mobile Adaptations

### 11.1 Navigation

| Screen | Navigation |
|---|---|
| ≥ 1024px (lg) | Inline sidebar (expanded or collapsed) |
| 768px–1023px (md) | Overlay sidebar with backdrop |
| < 768px (sm) | Bottom tab bar (5 tabs: Home, Events, Guests, Tables, More) |

### 11.2 Bottom Tab Bar (Mobile)

```
┌──────────────────────────────────────┐
│                                      │
│           [content]                  │
│                                      │
├──────────────────────────────────────┤
│  🏠      📅      👥      🪑      ☰  │
│  Home   Events  Guests  Tables  More │
└──────────────────────────────────────┘
```

| Tab | Icon | Active Color |
|---|---|---|
| Home | `Home` | `text-emerald-500` |
| Events | `Calendar` | `text-emerald-500` |
| Guests | `Users` | `text-emerald-500` |
| Tables | `Utensils` | `text-emerald-500` |
| More | `Menu` | Opens overlay menu |

**Classes**: `fixed bottom-0 inset-x-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-30`

### 11.3 Responsive Behavior by Page

| Page | Desktop | Mobile |
|---|---|---|
| Dashboard | 4-column stat grid | 1-column stack, charts hidden (text summary only) |
| Tables | Grid view (3 cols) | Single column stack, larger touch targets (48px min) |
| Invites | Two-column split | Stacked: recipients → message → send |
| DataTable | All columns visible | Hide non-critical columns, swipe actions |
| RSVP page | Centered modal | Full-width bottom sheet |
| Event page | Centered content (768px max) | Full-width, larger inputs |

### 11.4 Touch Target Minimum

All interactive elements must have a minimum touch target of **44×44px** on mobile:

```css
@media (max-width: 767px) {
  button, [role="button"], a, input[type="checkbox"], input[type="radio"] {
    min-height: 44px;
    min-width: 44px;
  }
}
```

---

## 12. Tailwind Configuration

### 12.1 Full Extended Theme

```js
// tailwind.config.js
const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
        mono: ['JetBrains Mono', ...fontFamily.mono],
      },
      fontSize: {
        'xs':   ['12px',  { lineHeight: '1.4', letterSpacing: '0' }],
        'sm':   ['13px',  { lineHeight: '1.5', letterSpacing: '0' }],
        'base': ['14px',  { lineHeight: '1.5', letterSpacing: '0' }],
        'lg':   ['16px',  { lineHeight: '1.4', letterSpacing: '0' }],
        'xl':   ['20px',  { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        '2xl':  ['24px',  { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        '3xl':  ['36px',  { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        'dropdown': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        'modal':    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        'toast':    '0 4px 12px rgba(0,0,0,0.15)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
```

### 12.2 CSS Variables (globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 160 84% 39%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 160 84% 39%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 160 84% 39%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 160 84% 39%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 13. shadcn/ui Integration

### 13.1 Components to Use

| shadcn Component | Greenvites Equivalent | Notes |
|---|---|---|
| `button` | Button | Override with emerald theme |
| `dialog` | Modal/Dialog | Replace all SweetAlert2 usage |
| `input` | Input | Already matches spec |
| `select` | Select | Add custom chevron |
| `textarea` | Textarea | Already matches spec |
| `checkbox` | Checkbox | Style with emerald check |
| `switch` | Toggle | Style with emerald thumb |
| `badge` | Badge | Override colors with semantic palette |
| `tabs` | Tabs | Use underline variant |
| `table` | DataTable base | Extend with our sorting/pagination |
| `dropdown-menu` | — | For user menu, action menus |
| `tooltip` | — | For collapsed sidebar icons |
| `toast` (Sonner) | Toast | Already installed |
| `separator` | — | For dividers, section breaks |
| `skeleton` | — | For loading states |
| `avatar` | — | For user avatars |
| `card` | Card | Extend with slots |
| `label` | — | For form labels |
| `popover` | — | For template selector, filters |
| `command` | — | For Ctrl+K command palette (future) |

### 13.2 Components to Build Custom

| Component | Reason |
|---|---|
| `DataTable` | shadcn table is too basic — needs sorting, pagination, responsive columns |
| `Sidebar` | Too specific to Greenvites' nav structure |
| `FormField` | Wrapper pattern not in shadcn |
| `StatCard` | Dashboard-specific |
| `ProgressBar` | Simple enough to build inline |
| `Breadcrumb` | shadcn has one but ours is simpler |
| `FunnelChart` | Custom Recharts composition |

### 13.3 Installation Command

```bash
npx shadcn@latest add button dialog input select textarea checkbox switch badge tabs table dropdown-menu tooltip toast separator skeleton avatar card label popover
```

### 13.4 Theme Override (components.json)

```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

## 14. Migration Checklist

Phase-by-phase migration from current UI to new design system:

### Phase 1: Foundation (Days 1-3)

- [ ] Update `tailwind.config.js` with extended theme
- [ ] Update `globals.css` with CSS variables + dark mode
- [ ] Install shadcn/ui base components
- [ ] Create `Button` component with all variants
- [ ] Create `Card` component with slots
- [ ] Create `Badge` component with semantic colors
- [ ] Create `Input`, `Select`, `Textarea` with consistent styling

### Phase 2: Navigation (Days 4-6)

- [ ] Rebuild admin sidebar with grouped sections
- [ ] Rebuild event sub-navigation with collapsible groups
- [ ] Add breadcrumbs component
- [ ] Add user dropdown menu (replaces inline logout)
- [ ] Add mobile bottom tab bar

### Phase 3: Data Display (Days 7-9)

- [ ] Rebuild `DataTable` with sorting, pagination, responsive columns
- [ ] Replace all stat cards with new `StatCard` component
- [ ] Replace pie charts with funnel visualization
- [ ] Add skeleton loading states
- [ ] Add empty state illustrations

### Phase 4: Forms & Modals (Days 10-12)

- [ ] Replace SweetAlert2 with Radix Dialog everywhere
- [ ] Create `FormField` wrapper component
- [ ] Style all form elements consistently
- [ ] Add form validation error states
- [ ] Add `beforeunload` protection to multi-field forms

### Phase 5: Pages (Days 13-16)

- [ ] Redesign dashboard landing page
- [ ] Redesign event detail / overview page
- [ ] Redesign tables page (grid + list views)
- [ ] Redesign invites page (split layout)
- [ ] Redesign RSVPs page
- [ ] Redesign public event / RSVP page
- [ ] Redesign login / signup pages

### Phase 6: Polish (Days 17-20)

- [ ] Add Framer Motion page transitions
- [ ] Add micro-interactions (hover, press, success)
- [ ] Add dark mode pass to all components
- [ ] Add `prefers-reduced-motion` support
- [ ] Mobile responsive pass on all pages
- [ ] Accessibility audit (aria labels, focus trapping, keyboard nav)
- [ ] Remove production `console.log` statements

---

## 15. Reference Links

| Resource | URL |
|---|---|
| Linear Design | https://linear.app |
| Cal.com Design | https://cal.com |
| shadcn/ui | https://ui.shadcn.com |
| Radix UI | https://www.radix-ui.com |
| Framer Motion | https://www.framer.com/motion |
| Tailwind CSS | https://tailwindcss.com |
| Inter Font | https://rsms.me/inter/ |
| JetBrains Mono | https://www.jetbrains.com/lp/mono/ |
| Lucide Icons | https://lucide.dev |
| Sonner Toast | https://sonner.emilkowal.ski |
