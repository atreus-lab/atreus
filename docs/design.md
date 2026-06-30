# Atreus Design System

> Apple HIG + Notion-style. Manrope for headings. Inter for body. Semantic classes only.
> **If you change `.card-title` font weight in globals.css, every card in the app changes. That is the point.**

---

## 1. Typography

| Element   | Font      | Weight         | Size       | Line-Height | Letter-Spacing |
| --------- | --------- | -------------- | ---------- | ----------- | -------------- |
| H1        | Manrope   | Bold (700)     | 3.75 rem   | 1.1         | -0.02 em       |
| H2        | Manrope   | Bold (700)     | 1.5 rem    | 1.2         | -0.01 em       |
| H3        | Manrope   | SemiBold (600) | 1.25 rem   | 1.2         | normal         |
| Body      | Inter     | Normal (400)   | 1 rem      | 1.6         | normal         |
| Label     | Inter     | Medium (500)   | 0.875 rem  | 1.4         | +0.01 em       |
| Caption   | Inter     | Normal (400)   | 0.75 rem   | 1.4         | normal         |
| Mono      | JetBrains Mono / SF Mono | Normal (400) | 0.75 rem | 1.4 | normal |

- **Headings** use Manrope for its geometric, Apple-style character.
- **Body** uses Inter for crisp readability at any size.
- **Mono** is reserved for code, secrets, and hashes.
- Fonts are loaded via `next/font/google` in `layout.tsx` (not CSS `@import`).

### CSS Variables

```css
:root {
  --font-inter: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-manrope: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

These are set by `next/font` — do not hardcode font stacks in components.

---

## 2. Spacing & Sizing (8 px grid)

Use multiples of 0.5 rem (8 px) for all margins, paddings, gaps:

| Token    | rem | px | Usage                  |
| -------- | --- | --- | ---------------------- |
| space-1  | 0.5 | 8  | tight spacing          |
| space-2  | 1   | 16 | default gap            |
| space-3  | 1.5 | 24 | section separation     |
| space-4  | 2   | 32 | card padding           |
| space-5  | 2.5 | 40 | large separation       |
| space-8  | 4   | 64 | page margins (desktop) |

Do **not** use arbitrary values. Stick to this scale.

---

## 3. Color Palette (Dark theme)

| Token              | Hex       | Tailwind Eq    | Usage                   |
| ------------------ | --------- | -------------- | ----------------------- |
| background-primary | `#020617` | `slate-950`    | main background         |
| background-card    | `#0f172a` | `slate-900`    | card/container          |
| background-elevated| `#1e293b` | `slate-800`    | elevated surfaces       |
| background-input   | `#020617` | `slate-950`    | input background        |
| foreground-primary | `#f8fafc` | `slate-50`     | primary text            |
| foreground-secondary | `#94a3b8` | `slate-400` | secondary label         |
| accent-primary     | `#3b82f6` | `blue-500`     | primary action          |
| accent-hover       | `#2563eb` | `blue-600`     | hover state             |
| border-default     | `#1e293b` | `slate-800`    | borders                 |
| border-subtle      | `#0f172a` | `slate-900`    | subtle borders          |
| success            | `#22c55e` | `green-500`    | success indicators      |
| error              | `#f87171` | `red-400`      | error text              |

All colors are defined as CSS custom properties on `:root` and used via `var(--...)` in component classes. Do **not** reference Tailwind color utilities directly in components.

---

## 4. Component Classes

Every visual element in the app is a **semantic class** defined in `globals.css` using `@apply` and CSS custom properties.

### Layout

| Class     | Purpose                   | Definition                                  |
| --------- | ------------------------- | ------------------------------------------- |
| `.page`   | Full-page wrapper         | `min-h-screen flex flex-col items-center justify-center p-8` |
| `.page-title` | Page heading          | Manrope, `text-6xl font-bold tracking-tight` |
| `.page-subtitle` | Page subtitle     | `text-xl`, foreground-secondary color       |

### Cards

| Class           | Purpose                      | Definition                                |
| --------------- | ---------------------------- | ----------------------------------------- |
| `.card`         | Default container            | `w-full p-8 rounded-2xl border space-y-6`, card background |
| `.card-sm`      | Small container              | `p-3 rounded border`, card background     |
| `.card-title`   | Card heading                 | Manrope, `text-2xl font-bold`             |
| `.card-body`    | Card body text               | `text-base`, secondary color              |

### Buttons

| Class           | Purpose                      | Definition                                |
| --------------- | ---------------------------- | ----------------------------------------- |
| `.btn-primary`  | Primary action               | Full-width, accent background, bold       |
| `.btn-secondary`| Secondary action             | Elevated background, semibold             |
| `.btn-ghost`    | Ghost/inline action          | Accent background, semibold               |
| `.btn-claim`    | Claim-specific button        | Full-width, accent, flex with gap         |

### Forms

| Class           | Purpose                      | Definition                                |
| --------------- | ---------------------------- | ----------------------------------------- |
| `.input`        | Text input                   | Full-width, dark background, focus ring   |
| `.input-label`  | Label for input              | `text-sm`, secondary color                |

### Utility

| Class           | Purpose                      |
| --------------- | ---------------------------- |
| `.mono-text`    | Monospace text (secrets)     |
| `.status-badge` | Status/code badge            |
| `.status-success` | Success message anim       |
| `.status-error` | Error text                   |
| `.flex-center`  | Flex center                  |
| `.flex-gap`     | Flex row with gap            |

### Do vs Don't

**Don't:**
```tsx
<div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
  <h2 className="text-2xl font-bold">Title</h2>
  <button className="w-full bg-blue-500 hover:bg-blue-600 p-4 rounded-lg font-bold transition">
    Submit
  </button>
</div>
```

**Do:**
```tsx
<div className="card">
  <h2 className="card-title">Title</h2>
  <button className="btn-primary">Submit</button>
</div>
```

If you need to override one property, use inline `style` or `tailwind-merge`:
```tsx
<div className={twMerge("card", "max-w-lg")}>...</div>
```

### Adding New Classes

1. Write the Tailwind composition in `@layer components` using `@apply`.
2. Reference CSS variables where possible (`var(--foreground-secondary)`).
3. Use the class in your `.tsx` file.
4. Never use raw Tailwind utilities in components.

---

## 5. Animation & Interaction

- **Buttons**: `transition` on hover/active states. 150 ms ease-out.
- **Cards**: No animations on entry (MVP). Simple border-color transitions on hover.
- **Success states**: `animate-bounce` for brief celebration, then settle.
- **Loading**: Fade-in spinners. No skeleton screens in MVP.
- **Disabled states**: Reduced opacity, no pointer events.

---

## 6. CSS File Organization (`globals.css`)

```
1. @tailwind directives (base, components, utilities)
2. @layer base {
     :root variables
     body defaults
     heading defaults
     border-color reset
   }
3. @layer components {
     Layout classes      (.page, .page-title, .page-subtitle)
     Card classes        (.card, .card-sm, .card-title, .card-body)
     Button classes      (.btn-primary, .btn-secondary, .btn-ghost, .btn-claim)
     Form classes        (.input, .input-label)
     Utility classes     (.mono-text, .status-badge, .flex-center, .flex-gap)
     State classes       (.status-success, .status-error)
   }
```

---

## 7. Responsive Design

- **Mobile-first.** Breakpoints match Tailwind defaults.
- `sm: 640px`, `md: 768px`, `lg: 1024px`
- Cards are full width on mobile, `max-w-md` on tablet+.
- Page padding: `p-8` default, expand on desktop.
- No hamburger menus in MVP. Keep it simple.

---

## 8. Icons

Use `lucide-react` for all icons. Import by name:

```tsx
import { Send, QrCode } from "lucide-react";
<Send className="w-5 h-5" />
```

Icon sizes: `w-4 h-4` (inline), `w-5 h-5` (buttons), `w-6 h-6` (standalone).
