import { motion } from "framer-motion"

const BLOBS = {
  dark: [
    { color: "#4f46e5", opacity: 0.22, size: 600, style: { top: -150, left: -150 },   delay: 0, duration: 14 },
    { color: "#7c3aed", opacity: 0.18, size: 500, style: { bottom: -150, right: -150 }, delay: 2, duration: 17 },
    { color: "#0891b2", opacity: 0.14, size: 400, style: { top: "40%", right: -100 },  delay: 1, duration: 13 },
    { color: "#1d4ed8", opacity: 0.12, size: 350, style: { bottom: "20%", left: -80 }, delay: 3, duration: 16 },
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
