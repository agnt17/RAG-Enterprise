export function getTime() {
  return new Date().toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export function formatTimestamp(isoString) {
  if (!isoString) return ""
  return new Date(isoString).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function formatSize(bytes) {
  if (!bytes) return ""
  const b = parseInt(bytes)
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
