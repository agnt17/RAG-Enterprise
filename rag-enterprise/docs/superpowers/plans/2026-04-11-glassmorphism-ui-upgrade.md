# Glassmorphism UI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade DocMind AI's frontend to a cinematic glassmorphism design system across 4 independent layers — animated mesh background, glass tokens, loading states, and cinematic transitions — without touching any backend, API, or feature logic.

**Architecture:** Eight focused file edits applied in dependency order: shared background component first, then design tokens, then loading animations, then the two complex orchestration files (App.jsx and ChatMessages.jsx). Each task is independently committable and visually verifiable in the dev server.

**Tech Stack:** React 19, Framer Motion (already installed), Tailwind CSS v4, Lucide React

**Dev server:** `cd frontend && npm run dev` — verify each task in browser at `http://localhost:5173`

---

## File Map

| File | Task | Change type |
|------|------|-------------|
| `frontend/src/MeshBackground.jsx` | 1 | Create |
| `frontend/src/index.css` | 2 | Edit — skeleton shimmer colors |
| `frontend/src/lib/themes.js` | 3 | Edit — all glass token values |
| `frontend/src/lib/animations.js` | 4 | Edit — stagger timing |
| `frontend/src/components/MessageBubble.jsx` | 5 | Edit — spring transition |
| `frontend/src/AuthPage.jsx` | 6 | Edit — remove manual blobs |
| `frontend/src/App.jsx` | 7 | Edit — MeshBackground mount, boot screen, AnimatePresence restructure |
| `frontend/src/components/ChatMessages.jsx` | 8 | Edit — slow-server nudge, exit choreography |

---

## Task 1: Create MeshBackground Component

**Files:**
- Create: `frontend/src/MeshBackground.jsx`

- [ ] **Step 1: Create the file with this exact content**

```jsx
import { motion } from "framer-motion"

const BLOBS = {
  dark: [
    { color: "#4f46e5", opacity: 0.10, size: 600, style: { top: -150, left: -150 },   delay: 0, duration: 14 },
    { color: "#7c3aed", opacity: 0.08, size: 500, style: { bottom: -150, right: -150 }, delay: 2, duration: 17 },
    { color: "#0891b2", opacity: 0.07, size: 400, style: { top: "40%", right: -100 },  delay: 1, duration: 13 },
    { color: "#1d4ed8", opacity: 0.06, size: 350, style: { bottom: "20%", left: -80 }, delay: 3, duration: 16 },
  ],
  light: [
    { color: "#818cf8", opacity: 0.08, size: 600, style: { top: -150, left: -150 },   delay: 0, duration: 14 },
    { color: "#67e8f9", opacity: 0.07, size: 500, style: { bottom: -150, right: -150 }, delay: 2, duration: 17 },
    { color: "#fda4af", opacity: 0.06, size: 400, style: { top: "40%", right: -100 },  delay: 1, duration: 13 },
    { color: "#c4b5fd", opacity: 0.06, size: 350, style: { bottom: "20%", left: -80 }, delay: 3, duration: 16 },
  ],
}

export default function MeshBackground({ resolvedTheme }) {
  const blobs = BLOBS[resolvedTheme] ?? BLOBS.dark
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -20, 0], x: [0, 12, 0], scale: [1, 1.05, 1] }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: b.delay,
          }}
          style={{
            position: "absolute",
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            backgroundColor: b.color,
            opacity: b.opacity,
            filter: "blur(80px)",
            willChange: "transform",
            ...b.style,
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls frontend/src/MeshBackground.jsx
```

Expected: file path printed, no error.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/MeshBackground.jsx
git commit -m "feat: add MeshBackground animated gradient mesh component"
```

---

## Task 2: Update Skeleton Shimmer in index.css

**Files:**
- Modify: `frontend/src/index.css`

The current `skeleton-light` and `skeleton-dark` classes use flat grey values. Replace with glass-appropriate translucent colors that look good over the mesh background.

- [ ] **Step 1: Replace skeleton-light and skeleton-dark in `frontend/src/index.css`**

Find this block (lines 43–51):
```css
.skeleton-light {
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 400% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
.skeleton-dark {
  background: linear-gradient(90deg, #1c1c1e 25%, #2c2c2e 50%, #1c1c1e 75%);
  background-size: 400% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
```

Replace with:
```css
/* Light: indigo translucent shimmer over light mesh */
.skeleton-light {
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.05) 25%,
    rgba(99, 102, 241, 0.14) 50%,
    rgba(99, 102, 241, 0.05) 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
/* Dark: white translucent shimmer over dark mesh */
.skeleton-dark {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.13) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
```

- [ ] **Step 2: Verify dev server starts without CSS errors**

```bash
cd frontend && npm run dev
```

Open browser, check console — no CSS parse errors expected.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: upgrade skeleton shimmer to glass-style translucent colors"
```

---

## Task 3: Update Glass Token System in themes.js

**Files:**
- Modify: `frontend/src/lib/themes.js`

Replace the entire file with the glass-ready token values. Every component already consumes `t.<token>` so this instantly upgrades all surfaces.

- [ ] **Step 1: Replace `frontend/src/lib/themes.js` with this exact content**

```js
export const themes = {
  light: {
    // Layout
    page:    "bg-[#f0f4ff]",
    sidebar: "bg-white/50 backdrop-blur-2xl border-white/80",
    main:    "bg-transparent",
    card:    "bg-white/60 backdrop-blur-xl border-white/90",

    // Typography
    title:   "text-[#1d1d1f]",
    label:   "text-[#1d1d1f]",
    subtext: "text-[#86868b]",
    muted:   "text-[#86868b]",

    // Messages
    msgUser:    "bg-[#0071e3] text-white rounded-tr-sm shadow-sm",
    msgAi:      "bg-white/70 backdrop-blur-sm border border-white/90 text-[#1d1d1f] rounded-tl-sm shadow-sm",
    msgSystem:  "bg-indigo-50/80 border border-indigo-100/80 text-indigo-600 w-full",
    avatarUser: "bg-[#0071e3] text-white",
    avatarAi:   "bg-white/60 backdrop-blur-sm text-[#86868b] border border-white/80",
    thinkDot:   "text-[#86868b]",

    // UI elements
    badge:          "bg-white/60 text-[#86868b]",
    divider:        "border-white/60",
    sendBtn:        "bg-[#0071e3] hover:bg-[#0077ED] text-white",
    docRow:         "hover:bg-white/40 text-slate-600",
    docRowActive:   "bg-indigo-50/80 text-[#0071e3] border-l-2 border-[#0071e3]",
    docAction:      "text-slate-400 hover:text-slate-700 hover:bg-white/50",
    docActionDel:   "text-slate-400 hover:text-red-600 hover:bg-red-50/80",
    uploadIdle:     "border-white/60 bg-white/40 hover:bg-white/70 hover:border-white/90 text-slate-600",
    iconStroke:     "#86868b",
    fileIconBg:     "bg-white/60",
    emptyIconBg:    "bg-white/60",
    dropdownBg:     "bg-white/80 backdrop-blur-2xl border-white/90",
    citationDivider:"border-slate-200/60",
    inputBg:        "bg-white/60 backdrop-blur-md border-white/80 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3]/40 focus:bg-white/80",
    quickAction:    "border-white/60 bg-white/40 text-slate-600 hover:bg-[#0071e3]/5 hover:border-[#0071e3]/30 hover:text-[#0071e3]",

    // Shadows (elevation system)
    headerShadow: "shadow-[0_1px_0_rgba(0,0,0,0.04)]",
    cardShadow:   "shadow-[0_4px_24px_rgba(99,102,241,0.06)]",
    modalShadow:  "shadow-[0_16px_48px_rgba(99,102,241,0.12)]",
    sidebarShadow:"shadow-[0_8px_32px_rgba(99,102,241,0.08)]",
  },

  dark: {
    // Layout
    page:    "bg-[#000000]",
    sidebar: "bg-white/[0.04] backdrop-blur-2xl border-white/[0.08]",
    main:    "bg-transparent",
    card:    "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]",

    // Typography
    title:   "text-[#f5f5f7]",
    label:   "text-[#f5f5f7]",
    subtext: "text-[#86868b]",
    muted:   "text-[#86868b]",

    // Messages
    msgUser:    "bg-[#0a84ff] text-white rounded-tr-sm shadow-sm",
    msgAi:      "bg-white/[0.05] backdrop-blur-md border border-white/[0.08] text-[#f5f5f7] rounded-tl-sm",
    msgSystem:  "bg-blue-900/20 border border-blue-800/30 text-blue-400 w-full",
    avatarUser: "bg-[#0a84ff] text-white",
    avatarAi:   "bg-white/[0.08] backdrop-blur-sm text-[#86868b] border border-white/[0.1]",
    thinkDot:   "text-[#48484a]",

    // UI elements
    badge:          "bg-white/[0.08] text-[#86868b]",
    divider:        "border-white/[0.08]",
    sendBtn:        "bg-[#0a84ff] hover:bg-[#409cff] text-white",
    docRow:         "hover:bg-white/[0.06] text-[#86868b]",
    docRowActive:   "bg-[#0a84ff]/10 text-[#0a84ff] border-l-2 border-[#0a84ff]",
    docAction:      "text-[#48484a] hover:text-[#f5f5f7] hover:bg-white/[0.08]",
    docActionDel:   "text-[#48484a] hover:text-red-400 hover:bg-red-900/20",
    uploadIdle:     "border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.18] text-[#86868b]",
    iconStroke:     "#48484a",
    fileIconBg:     "bg-white/[0.08]",
    emptyIconBg:    "bg-white/[0.06]",
    dropdownBg:     "bg-white/[0.08] backdrop-blur-2xl border-white/[0.12]",
    citationDivider:"border-white/[0.08]",
    inputBg:        "bg-white/[0.06] backdrop-blur-md border-white/[0.1] text-[#f5f5f7] placeholder-[#48484a] focus:border-white/[0.2]",
    quickAction:    "border-white/[0.08] bg-white/[0.04] text-[#86868b] hover:bg-[#0a84ff]/10 hover:border-[#0a84ff]/30 hover:text-[#0a84ff]",

    // Shadows (elevation system)
    headerShadow: "shadow-[0_1px_0_rgba(255,255,255,0.04)]",
    cardShadow:   "shadow-[0_4px_24px_rgba(0,0,0,0.3)]",
    modalShadow:  "shadow-[0_16px_48px_rgba(0,0,0,0.5)]",
    sidebarShadow:"shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
  },
}
```

- [ ] **Step 2: Start dev server and verify both themes**

```bash
cd frontend && npm run dev
```

1. Open browser at `http://localhost:5173`
2. Log in (or if already logged in, check the app)
3. Toggle between light and dark mode — both should show frosted glass panels
4. Check for any obviously broken styles (invisible text, invisible borders)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/themes.js
git commit -m "feat: upgrade theme tokens to glass-ready translucent values"
```

---

## Task 4: Tune Stagger Timing in animations.js

**Files:**
- Modify: `frontend/src/lib/animations.js`

Slow the stagger slightly so message bubbles cascade with more presence.

- [ ] **Step 1: Update staggerContainer in `frontend/src/lib/animations.js`**

Find (lines 50–57):
```js
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren:   0.05,
    },
  },
}
```

Replace with:
```js
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren:   0.05,
    },
  },
}
```

No other changes to this file.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/animations.js
git commit -m "feat: tune stagger timing for more cinematic message reveal"
```

---

## Task 5: Add Spring Physics to MessageBubble

**Files:**
- Modify: `frontend/src/components/MessageBubble.jsx`

Replace the linear transition with spring physics for a more tactile entrance feel.

- [ ] **Step 1: Update motion.div transition in `frontend/src/components/MessageBubble.jsx`**

Find (lines 8–12):
```jsx
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.normal, ease: ease.smooth }}
```

Replace with:
```jsx
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
```

Remove the `dur` import if it becomes unused — but keep `ease` since it's used elsewhere in the file for source citation buttons.

Check line 4: `import { ease, dur } from "../lib/animations"` — since `dur` is still used on line 74 (`transition={{ delay: 0.18, duration: dur.slow }}`), keep both imports.

- [ ] **Step 2: Verify in browser**

Navigate to any document with chat history and reload — bubbles should spring in with a subtle bounce, not ease linearly.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MessageBubble.jsx
git commit -m "feat: apply spring physics to message bubble entrance animation"
```

---

## Task 6: Remove Manual Blobs from AuthPage

**Files:**
- Modify: `frontend/src/AuthPage.jsx`

The auth page has two manually hardcoded blob divs. Remove them — `MeshBackground` (mounted in App.jsx in Task 7) will provide the background for all screens.

- [ ] **Step 1: Remove the fixed blob container from `frontend/src/AuthPage.jsx`**

Find and delete this entire block (lines 187–199):
```jsx
      {/* Animated background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-96 h-96 bg-blue-700 rounded-full opacity-10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 16, 0], x: [0, -10, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500 rounded-full opacity-10 blur-3xl"
        />
      </div>
```

After deletion, line 186 should be the opening `<div className="fixed inset-0 overflow-hidden pointer-events-none">` gone, and the next element should be `<motion.div variants={staggerContainer} ...>` (the form card).

Also update the root div background: line 185 currently reads:
```jsx
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
```

Change to:
```jsx
    <div className="min-h-screen flex items-center justify-center px-4">
```

(Background comes from MeshBackground + the page token, not a hardcoded class.)

- [ ] **Step 2: Verify auth page still renders correctly**

Log out, navigate to auth page. Should show login form with the mesh background behind it (once Task 7 is done, the mesh shows properly — for now the bg will be transparent/white which is fine).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/AuthPage.jsx
git commit -m "feat: remove manual blob divs from AuthPage, rely on shared MeshBackground"
```

---

## Task 7: Restructure App.jsx — MeshBackground, Boot Screen, Cinematic Transitions

**Files:**
- Modify: `frontend/src/App.jsx`

This is the largest task. It restructures the three early `return` statements into a single `return` with `AnimatePresence` for cinematic transitions. Read the current file carefully before editing.

### What changes
1. Import `MeshBackground`
2. Remove the two early `if (appLoading) return` and `if (!token) return` statements
3. Replace with a single `return` wrapping all three states in `AnimatePresence mode="wait"`
4. Upgrade the boot screen: glow ring on logo icon, progress bar instead of pulse dots
5. Wrap auth in a slide/fade motion.div (exit when login succeeds)
6. Wrap main app in a fade-up motion.div (enter after auth)

- [ ] **Step 1: Update framer-motion import and add MeshBackground import in `frontend/src/App.jsx`**

Line 3 currently reads:
```jsx
import { motion } from "framer-motion"
```

Change to:
```jsx
import { motion, AnimatePresence } from "framer-motion"
```

Then after line 6 (`import { FileText } from "lucide-react"`), add:
```jsx
import MeshBackground from "./MeshBackground"
```

- [ ] **Step 2: Remove the early appLoading return block**

Delete lines 292–315 entirely:
```jsx
  // ── Loading screen ───────────────────────────────────────
  if (appLoading) return (
    <div className={`min-h-screen flex items-center justify-center ${resolvedTheme === "dark" ? "bg-[#000000]" : "bg-[#f5f5f7]"}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-center gap-5"
      >
        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-slate-800 to-slate-950 flex items-center justify-center shadow-2xl">
          <FileText size={22} className="text-white" />
        </div>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full animate-pulse-dot
                animate-pulse-dot-${i === 0 ? "" : i === 1 ? "2" : "3"}
                ${resolvedTheme === "dark" ? "bg-[#0a84ff]" : "bg-[#86868b]"}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
```

- [ ] **Step 3: Remove the early !token return block**

Delete lines 317–322:
```jsx
  if (!token) return (
    <>
      <AuthPage onLogin={handleLogin} />
      <ToastContainer resolvedTheme="dark" />
    </>
  )
```

- [ ] **Step 4: Replace the main return with the consolidated AnimatePresence structure**

The current main `return` starts at line 324. Replace the entire `return (...)` block (from `return (` to the closing `)` at the end of the function) with:

```jsx
  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <MeshBackground resolvedTheme={resolvedTheme} />

      <AnimatePresence mode="wait">
        {/* Boot screen */}
        {appLoading && (
          <motion.div
            key="boot"
            className="fixed inset-0 flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center gap-5"
            >
              <div
                className="w-14 h-14 rounded-2xl bg-linear-to-br from-slate-800 to-slate-950 flex items-center justify-center"
                style={{
                  boxShadow: resolvedTheme === "dark"
                    ? "0 0 0 1px rgba(255,255,255,0.08), 0 0 32px rgba(99,102,241,0.3), 0 8px 32px rgba(0,0,0,0.4)"
                    : "0 0 0 1px rgba(255,255,255,0.6), 0 0 32px rgba(99,102,241,0.2), 0 8px 32px rgba(99,102,241,0.1)"
                }}
              >
                <FileText size={22} className="text-white" />
              </div>
              <div className={`w-24 h-0.5 rounded-full overflow-hidden ${resolvedTheme === "dark" ? "bg-white/10" : "bg-black/10"}`}>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 2, ease: [0, 0, 0.2, 1] }}
                  className="h-full w-full origin-left bg-gradient-to-r from-indigo-400 to-cyan-400"
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Auth screen */}
        {!appLoading && !token && (
          <motion.div
            key="auth"
            className="fixed inset-0"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 1, 1] }}
          >
            <AuthPage onLogin={handleLogin} />
          </motion.div>
        )}

        {/* Main app */}
        {!appLoading && token && (
          <motion.div
            key="app"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className={`h-screen flex overflow-hidden ${t.page} transition-colors duration-300`}
          >
            <Sidebar
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              documents={documents}
              uploadedFile={uploadedFile}
              switching={switching}
              uploading={uploading}
              resolvedTheme={resolvedTheme}
              t={t}
              user={user}
              onLogout={handleLogout}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              onUpload={uploadPDF}
              onSwitch={switchDocument}
              onPreview={previewDocument}
              onDownload={downloadDocument}
              onDelete={deleteDocument}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
            />

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <ChatHeader
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                uploadedFile={uploadedFile}
                userMsgCount={userMsgCount}
                resolvedTheme={resolvedTheme}
                t={t}
              />

              <ChatMessages
                messages={messages}
                loading={loading}
                switching={switching}
                documents={documents}
                user={user}
                resolvedTheme={resolvedTheme}
                t={t}
                onSourceClick={setSourceModal}
              />

              {/* Input bar */}
              <div className={`shrink-0 border-t ${t.divider} px-4 py-3`}>
                <QuickActions
                  user={user}
                  uploadedFile={uploadedFile}
                  loading={loading}
                  resolvedTheme={resolvedTheme}
                  t={t}
                  onSendQuery={sendQuery}
                />
                <ChatInput
                  question={question}
                  setQuestion={setQuestion}
                  onSend={sendMessage}
                  uploadedFile={uploadedFile}
                  loading={loading}
                  switching={switching}
                  t={t}
                  resolvedTheme={resolvedTheme}
                />
                <p className={`text-center text-xs ${t.subtext} mt-2 opacity-40`}>
                  Powered by LLaMA-3.3-70b · Pinecone · Cohere
                </p>
              </div>
            </div>

            <SourceModal
              sourceModal={sourceModal}
              resolvedTheme={resolvedTheme}
              onClose={() => setSourceModal(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer resolvedTheme={!appLoading && !token ? "dark" : resolvedTheme} />
    </>
  )
```

- [ ] **Step 5: Verify the app works end-to-end**

```bash
cd frontend && npm run dev
```

1. Hard refresh — boot screen should appear with glow logo + animated progress bar, then transition out smoothly
2. Auth page should be visible with the mesh behind it
3. Log in — auth card should fade/scale out, app slides up in
4. Toggle dark/light — mesh background changes color family
5. Upload a document and ask a question — verify all existing features still work

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: mount MeshBackground, upgrade boot screen, add cinematic auth-to-app transitions"
```

---

## Task 8: Update ChatMessages — Slow-Server Nudge + Exit Choreography

**Files:**
- Modify: `frontend/src/components/ChatMessages.jsx`

Add three improvements:
1. Slow-server nudge: after 6 seconds of loading, fade in a gentle message below the thinking dots
2. Skeleton exit: slide up + fade out when doc switch completes
3. Empty state exit: shrink + fade when first message arrives

- [ ] **Step 1: Add useState to imports in `frontend/src/components/ChatMessages.jsx`**

Line 1 currently reads:
```jsx
import { useRef, useEffect } from "react"
```

Change to:
```jsx
import { useRef, useEffect, useState } from "react"
```

- [ ] **Step 2: Add isDelayed state and useEffect below the existing useEffect in ChatMessages**

After line 31 (`}, [messages])`), add:
```jsx
  const [isDelayed, setIsDelayed] = useState(false)
  useEffect(() => {
    if (!loading) { setIsDelayed(false); return }
    const timer = setTimeout(() => setIsDelayed(true), 6000)
    return () => clearTimeout(timer)
  }, [loading])
```

- [ ] **Step 3: Update the skeleton motion.div to add slide exit animation**

Find (inside the `{switching && ...}` block, lines ~39–54):
```jsx
        {switching && (
          <motion.div
            key="skeleton"
            {...fadeIn}
            className="max-w-3xl mx-auto w-full flex flex-col gap-5 pt-2"
          >
```

Replace `{...fadeIn}` with explicit props for directional slide:
```jsx
        {switching && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-3xl mx-auto w-full flex flex-col gap-5 pt-2"
          >
```

- [ ] **Step 4: Update empty state exit animation**

Find (the `!switching && messages.length === 0` block):
```jsx
        {!switching && messages.length === 0 && (
          <motion.div
            key="empty"
            {...fadeInScale}
```

Replace `{...fadeInScale}` with:
```jsx
        {!switching && messages.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
```

- [ ] **Step 5: Add exit animation to messages container and add slow-server nudge**

Find the messages container (the `!switching && messages.length > 0` block):
```jsx
        {!switching && messages.length > 0 && (
          <motion.div
            key="messages"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="max-w-3xl mx-auto w-full flex flex-col gap-4"
          >
```

Add `exit` prop:
```jsx
        {!switching && messages.length > 0 && (
          <motion.div
            key="messages"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            className="max-w-3xl mx-auto w-full flex flex-col gap-4"
          >
```

Then find the thinking indicator block and add the delayed nudge after it (after the closing `</motion.div>` of the thinking indicator, before `<div ref={bottomRef} />`):

Current:
```jsx
            {loading && (
              <motion.div
                {...fadeIn}
                className="flex gap-3"
              >
                ...
              </motion.div>
            )}
            <div ref={bottomRef} />
```

Replace with:
```jsx
            {loading && (
              <motion.div
                {...fadeIn}
                className="flex gap-3"
              >
                <div className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 border ${t.avatarAi}`}>
                  AI
                </div>
                <div className={`px-4 py-3 rounded-2xl ${t.msgAi}`}>
                  <div className="flex gap-[5px] items-center h-4">
                    <span className={`w-1.5 h-1.5 rounded-full bg-current ${t.muted} animate-pulse-dot`} />
                    <span className={`w-1.5 h-1.5 rounded-full bg-current ${t.muted} animate-pulse-dot animate-pulse-dot-2`} />
                    <span className={`w-1.5 h-1.5 rounded-full bg-current ${t.muted} animate-pulse-dot animate-pulse-dot-3`} />
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {loading && isDelayed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`text-xs text-center ${t.subtext} mt-1`}
                >
                  Taking longer than usual — server may be warming up.
                </motion.p>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
```

Note: The thinking indicator content is unchanged — copy it exactly from the current file.

- [ ] **Step 6: Remove unused fadeInScale import if no longer referenced**

Check line 5: `import { staggerContainer, staggerItem, fadeIn, fadeInScale, dur, ease } from "../lib/animations"`

After the changes above, `fadeInScale` and `staggerItem` are no longer used in ChatMessages.jsx. Remove them:
```jsx
import { staggerContainer, fadeIn, dur, ease } from "../lib/animations"
```

Check the file for any remaining uses of `staggerItem`, `dur`, and `ease` before removing — `dur` and `ease` may not be used either. Only keep what is actually referenced in the file after your edits.

- [ ] **Step 7: Verify all loading states in browser**

```bash
cd frontend && npm run dev
```

1. **Doc switch:** Upload 2 docs, switch between them — see current chat slide up, skeleton with glass shimmer, new content slide up from below
2. **Empty → first message:** Clear chat (switch to fresh doc), ask a question — empty state should shrink-fade out before first bubble appears
3. **Slow-server nudge:** Hard to test naturally; temporarily change `6000` to `500` in the setTimeout, ask a question, verify the nudge appears — then change back to `6000`
4. **Loading dots:** Thinking indicator should still show correctly during queries

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ChatMessages.jsx
git commit -m "feat: add slow-server nudge, glass skeleton exit, empty-state shrink-exit choreography"
```

---

## Final Verification

- [ ] **Full smoke test**

```bash
cd frontend && npm run dev
```

Walk through the complete user journey:
1. Hard refresh — boot screen glow logo + progress bar → smooth exit
2. Auth page — mesh background visible, glassmorphism card
3. Log in with email or Google — cinematic auth→app transition
4. Upload a PDF — uploading state, indexing toast
5. Ask 3 questions — glass message bubbles, spring entrance, thinking dots
6. Switch document — page-turn choreography with glass skeleton
7. Toggle light/dark — light mesh (indigo/cyan/rose) vs dark mesh (indigo/violet/cyan)
8. Log out — returns to auth page with mesh

- [ ] **Final commit (if any last-minute fixes)**

```bash
git add -p
git commit -m "fix: glassmorphism UI polish"
```
