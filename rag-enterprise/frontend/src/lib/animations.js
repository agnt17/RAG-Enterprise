// ── Easing curves ─────────────────────────────────────────
// Apple's standard cubic-bezier — smooth, professional
export const ease = {
  smooth:  [0.4, 0, 0.2, 1],
  out:     [0, 0, 0.2, 1],
  in:      [0.4, 0, 1, 1],
  spring:        { type: "spring", stiffness: 420, damping: 32 },
  springGentle:  { type: "spring", stiffness: 300, damping: 28 },
  springBouncy:  { type: "spring", stiffness: 500, damping: 25, mass: 0.8 },
}

// ── Duration scale (seconds) ──────────────────────────────
export const dur = {
  fast:    0.13,
  normal:  0.22,
  slow:    0.32,
  enter:   0.38,
}

// ── Shared entrance variants ──────────────────────────────
export const fadeIn = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
  transition: { duration: dur.normal, ease: ease.smooth },
}

export const fadeInUp = {
  initial:  { opacity: 0, y: 10 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -6 },
  transition: { duration: dur.normal, ease: ease.smooth },
}

export const fadeInScale = {
  initial:  { opacity: 0, scale: 0.97 },
  animate:  { opacity: 1, scale: 1 },
  exit:     { opacity: 0, scale: 0.97 },
  transition: { duration: dur.normal, ease: ease.smooth },
}

export const slideInLeft = {
  initial:  { opacity: 0, x: -14 },
  animate:  { opacity: 1, x: 0 },
  exit:     { opacity: 0, x: -14 },
  transition: { duration: dur.normal, ease: ease.smooth },
}

// ── Stagger containers ────────────────────────────────────
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren:   0.05,
    },
  },
}

export const staggerContainerFast = {
  animate: {
    transition: {
      staggerChildren: 0.025,
      delayChildren:   0.03,
    },
  },
}

// ── Stagger children ──────────────────────────────────────
export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.normal, ease: ease.smooth } },
}

export const staggerItemLeft = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: dur.normal, ease: ease.smooth } },
}

// ── Button interaction presets ────────────────────────────
// Primary CTA (send button, upload, etc.)
export const btnPrimary = {
  whileHover: { scale: 1.06 },
  whileTap:   { scale: 0.92 },
  transition: ease.spring,
}

// Secondary / subtle buttons
export const btnSubtle = {
  whileHover: { scale: 1.02 },
  whileTap:   { scale: 0.97 },
  transition: ease.spring,
}

// Icon-only buttons (close, dots, etc.)
export const btnIcon = {
  whileHover: { scale: 1.1 },
  whileTap:   { scale: 0.88 },
  transition: ease.springBouncy,
}

// List row items — nudge right to convey clickability
export const rowHover = {
  whileHover: { x: 2 },
  transition: ease.springGentle,
}

// ── Overlays & modals ─────────────────────────────────────
export const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: { duration: dur.normal },
}

export const modalVariants = {
  initial:  { opacity: 0, scale: 0.96, y: 10 },
  animate:  { opacity: 1, scale: 1,    y: 0  },
  exit:     { opacity: 0, scale: 0.96, y: 10 },
  transition: { duration: dur.slow, ease: ease.smooth },
}

export const dropdownVariants = {
  initial:  { opacity: 0, scale: 0.95, y: -6 },
  animate:  { opacity: 1, scale: 1,    y: 0  },
  exit:     { opacity: 0, scale: 0.95, y: -6 },
  transition: { duration: dur.fast, ease: ease.smooth },
}

// ── Page / section ────────────────────────────────────────
export const pageEnter = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  transition: { duration: dur.enter, ease: ease.smooth },
}
