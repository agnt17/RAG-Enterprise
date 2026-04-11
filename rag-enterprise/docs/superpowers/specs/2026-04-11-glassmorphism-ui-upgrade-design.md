# DocMind AI — Glassmorphism UI Upgrade Design Spec
**Date:** 2026-04-11  
**Branch:** Load_state_management  
**Author:** Aditya Gupta  
**Status:** Approved for implementation

---

## Overview

Upgrade the DocMind AI frontend from a flat Apple-style aesthetic to a cinematic glassmorphism system — layered frosted glass panels over an animated gradient mesh background, with skeleton+progressive-reveal loading and cinematic state transitions. No features are added or removed. Zero risk of breaking existing RAG functionality.

**Design direction:** Glassmorphism + depth (Linear/Vercel-style)  
**Theme support:** Both dark and light, equally polished  
**Motion:** Cinematic for key moments, invisible for everyday interactions  
**Background:** Animated gradient mesh (slow-moving color blobs)

---

## Layer 1 — Background (Animated Gradient Mesh)

### What
A new `MeshBackground.jsx` component mounted once at the root of `App.jsx` and replacing the manual blob divs in `AuthPage.jsx`.

### Implementation
- 4–5 absolutely-positioned divs, each a large circle (`border-radius: 50%`) with heavy `blur` and a solid color
- Animated with Framer Motion `animate` on an infinite loop with staggered offsets (12–18s cycles per blob)
- `pointer-events: none`, `z-index: -1`, positioned with `fixed inset-0 overflow-hidden`
- `will-change: transform` on each blob for GPU compositing

### Dark mode colors
| Blob | Color | Opacity |
|------|-------|---------|
| Top-left | Indigo `#4f46e5` | 10% |
| Bottom-right | Violet `#7c3aed` | 8% |
| Center-right | Cyan `#0891b2` | 7% |
| Bottom-left | Blue `#1d4ed8` | 6% |

### Light mode colors
| Blob | Color | Opacity |
|------|-------|---------|
| Top-left | Indigo `#818cf8` | 8% |
| Bottom-right | Cyan `#67e8f9` | 7% |
| Center-right | Rose `#fda4af` | 6% |
| Bottom-left | Violet `#c4b5fd` | 6% |

### Base background colors
- Dark: `#000000` (unchanged)
- Light: `#f0f4ff` (currently `#f5f5f7` — slightly cooler blue-tinted to let light blobs read)

### Files touched
- `MeshBackground.jsx` — new file
- `App.jsx` — mount `<MeshBackground resolvedTheme={resolvedTheme} />` before layout
- `AuthPage.jsx` — remove 2 manual motion blob divs, rely on shared component
- `index.css` — update light bg variable if needed

---

## Layer 2 — Glass Token System

### What
Update `themes.js` token values so every surface renders as frosted glass over the mesh background. No component logic changes — only token string values change.

### Dark mode token changes

| Token | Current | Upgraded |
|-------|---------|----------|
| `page` | `bg-[#000000]` | `bg-[#000000]` (unchanged — mesh shows through) |
| `sidebar` | `bg-[#1c1c1e]/90 backdrop-blur-xl border-[#2c2c2e]` | `bg-white/[0.04] backdrop-blur-2xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]` |
| `card` | `bg-[#1c1c1e]/90 backdrop-blur-sm border-[#2c2c2e]` | `bg-white/[0.06] backdrop-blur-xl border-white/[0.1] shadow-[0_4px_24px_rgba(0,0,0,0.3)]` |
| `msgAi` | `bg-[#1c1c1e] border-[#2c2c2e] text-[#f5f5f7] rounded-tl-sm` | `bg-white/[0.05] backdrop-blur-md border-white/[0.08] text-[#f5f5f7] rounded-tl-sm` |
| `inputBg` | `bg-[#1c1c1e] border-[#2c2c2e] text-[#f5f5f7] ...` | `bg-white/[0.06] backdrop-blur-md border-white/[0.1] text-[#f5f5f7] ...` |
| `dropdownBg` | `bg-[#1c1c1e]/95 backdrop-blur-xl border-[#2c2c2e]` | `bg-white/[0.08] backdrop-blur-2xl border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.5)]` |
| `uploadIdle` | `border-[#2c2c2e] bg-[#1c1c1e]/60 ...` | `border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.18]` |
| `quickAction` | `border-[#2c2c2e] bg-[#1c1c1e] ...` | `border-white/[0.08] bg-white/[0.04] hover:bg-[#0a84ff]/10 hover:border-[#0a84ff]/30 ...` |

### Light mode token changes

| Token | Current | Upgraded |
|-------|---------|----------|
| `page` | `bg-[#f5f5f7]` | `bg-[#f0f4ff]` (cooler blue-tinted base so light blobs read clearly) |
| `sidebar` | `bg-white/80 backdrop-blur-xl border-slate-200/60` | `bg-white/50 backdrop-blur-2xl border-white/80 shadow-[0_8px_32px_rgba(99,102,241,0.08)]` |
| `card` | `bg-white/90 backdrop-blur-sm border-slate-200/60` | `bg-white/60 backdrop-blur-xl border-white/90 shadow-[0_4px_24px_rgba(99,102,241,0.06)]` |
| `msgAi` | `bg-white border-slate-200/80 ...` | `bg-white/70 backdrop-blur-sm border-white/90 shadow-sm ...` |
| `inputBg` | `bg-white/80 border-slate-200/60 ...` | `bg-white/60 backdrop-blur-md border-white/80 ...` |
| `dropdownBg` | `bg-white/95 backdrop-blur-xl border-slate-200/60` | `bg-white/80 backdrop-blur-2xl border-white/90 shadow-[0_16px_48px_rgba(99,102,241,0.12)]` |

### Elevation system (both themes)
Three perceived depth levels via shadow intensity:
- **Level 1** (sidebar, main area): `shadow-[0_8px_32px_rgba(0,0,0,X)]`
- **Level 2** (cards, message bubbles): `shadow-[0_4px_24px_rgba(0,0,0,X)]`
- **Level 3** (modals, dropdowns): `shadow-[0_16px_48px_rgba(0,0,0,X)]`

### Files touched
- `themes.js` — update token string values only

---

## Layer 3 — Loading States

### Glass-shimmer skeleton
Replace `skeleton-light` and `skeleton-dark` CSS class values in `index.css` with glass-appropriate translucent colors per theme. The `resolvedTheme` conditional in `MessageSkeleton` is kept — only the color values change.

```css
@keyframes shimmer {
  0%   { background-position: -400% 0; }
  100% { background-position:  400% 0; }
}
/* Dark: white translucent shimmer over dark mesh */
.skeleton-dark {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.13) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
/* Light: indigo translucent shimmer over light mesh */
.skeleton-light {
  background: linear-gradient(
    90deg,
    rgba(99,102,241,0.05) 25%,
    rgba(99,102,241,0.14) 50%,
    rgba(99,102,241,0.05) 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
```

- `MessageSkeleton` in `ChatMessages.jsx` keeps the `resolvedTheme` conditional (`skeleton-light` / `skeleton-dark`) — class names unchanged
- Skeleton shape remains identical — only the shimmer colors change

### Progressive reveal (stagger tuning)
`staggerContainer` in `animations.js`:
- `staggerChildren`: `0.04s` → `0.06s`
- `MessageBubble` entrance: `opacity: 0→1`, `y: 12→0`, spring `stiffness: 280, damping: 24`

### Boot screen upgrade
`App.jsx` boot screen (currently: logo + pulse dots):
- Logo icon gets a glass card background + subtle `box-shadow: 0 0 32px rgba(99,102,241,0.3)` glow ring
- Pulse dots replaced with a slim progress bar (`w-24 h-0.5`) that animates from `scaleX: 0` to `scaleX: 1` over 2s with ease-out — communicating active loading without implying completion
- Progress bar color: `bg-gradient-to-r from-indigo-400 to-cyan-400`

### Slow-server nudge
In `ChatMessages.jsx`, when `loading === true`: after 6 seconds, fade in a small inline text below the thinking dots:

> *"Taking longer than usual — server may be warming up."*

Implementation: `useEffect` with a `setTimeout(6000)` that sets local `isDelayed` state. Renders as `<motion.p>` with `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` fade. Clears when `loading` goes false.

### Files touched
- `index.css` — replace `skeleton-light`/`skeleton-dark` with `skeleton-glass`
- `ChatMessages.jsx` — `skeleton-glass` usage + slow-server nudge
- `animations.js` — stagger timing
- `App.jsx` — boot screen glow + progress bar

---

## Layer 4 — Cinematic Moments

### 1. Auth → App transition
When `onLogin` is called in `App.jsx`, the auth card exit and app entrance are choreographed:
- Auth card: `scale: 1 → 0.96, opacity: 1 → 0`, duration 350ms, ease `[0.4, 0, 1, 1]`
- App layout: `opacity: 0 → 1, y: 16 → 0`, duration 400ms, starts 200ms after auth exits
- Implemented via `AnimatePresence` around the `!token` / app split in `App.jsx`

### 2. Boot screen exit
When `appLoading` flips false:
- Boot screen exits: `opacity: 1 → 0, scale: 1.04`, duration 500ms — feels like the screen "opens up"
- App layout enters underneath with `opacity: 0 → 1`, 400ms

### 3. Document switch
Currently: skeleton appears instantly.  
Upgraded choreography in `ChatMessages.jsx`:
1. Current messages exit: `AnimatePresence` exit `y: -8, opacity: 0`, duration 200ms
2. Skeleton enters: `opacity: 0 → 1`, duration 150ms
3. New messages enter: staggered `y: 8 → 0, opacity: 0 → 1` per bubble

### 4. Empty state → first message
In `ChatMessages.jsx`, the `AnimatePresence` between `key="empty"` and `key="messages"` states:
- Empty state exit: `scale: 1 → 0.88, opacity: 1 → 0`, duration 250ms
- First messages enter: staggered reveal per bubble (Layer 3 stagger)
- No layout jump — both states use `flex-1` container

### Files touched
- `App.jsx` — auth→app transition, boot screen exit
- `ChatMessages.jsx` — doc switch choreography, empty→messages choreography

---

## Constraints & Non-Goals

- No new npm packages — Framer Motion already installed
- No WebGL, canvas, or 3D — pure CSS + Framer Motion
- No changes to backend, API, or RAG pipeline
- No changes to routing, auth logic, or state management
- `document.id` = Pinecone namespace contract: untouched
- Alembic: not used (irrelevant — frontend only)
- All existing features (upload, query, switch doc, delete, preview, download) must work identically after each layer

---

## File Change Summary

| File | Layer | Type |
|------|-------|------|
| `frontend/src/MeshBackground.jsx` | 1 | New |
| `frontend/src/App.jsx` | 1, 3, 4 | Edit |
| `frontend/src/AuthPage.jsx` | 1 | Edit |
| `frontend/src/index.css` | 1, 3 | Edit |
| `frontend/src/lib/themes.js` | 2 | Edit |
| `frontend/src/lib/animations.js` | 3 | Edit |
| `frontend/src/components/ChatMessages.jsx` | 3, 4 | Edit |
