import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { Spinner } from "../Loader"
import { Check, File, MoreVertical, Eye, Download, Trash2 } from "lucide-react"
import { formatDate, formatSize } from "../lib/utils"
import { staggerItemLeft, dropdownVariants, ease } from "../lib/animations"

export default function DocumentRow({
  doc, isActive, resolvedTheme, t,
  onSwitch, onPreview, onDownload, onDelete,
  openMenuId, setOpenMenuId, switching
}) {
  const isPending = doc.status === "pending"
  const actionButtonRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const isOpen = openMenuId === doc.id

  useEffect(() => {
    if (!isOpen || !actionButtonRef.current) return
    const rect = actionButtonRef.current.getBoundingClientRect()
    const menuWidth = 144
    const margin = 8
    const fitsRight = rect.right + margin + menuWidth <= window.innerWidth - margin
    const left = fitsRight
      ? rect.right + margin
      : Math.max(margin, rect.left - menuWidth - margin)
    setMenuPosition({
      top: rect.top + rect.height / 2,
      left,
    })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const closeMenu = () => setOpenMenuId(null)
    window.addEventListener("resize", closeMenu)
    window.addEventListener("scroll", closeMenu, true)
    return () => {
      window.removeEventListener("resize", closeMenu)
      window.removeEventListener("scroll", closeMenu, true)
    }
  }, [isOpen, setOpenMenuId])

  return (
    <motion.div
      variants={staggerItemLeft}
      layout
      onClick={() => !switching && !isPending && onSwitch(doc)}
      whileHover={!isActive && !isPending ? { x: 2 } : {}}
      transition={ease.springGentle}
      className={`group relative flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl
        ${isPending ? "cursor-default opacity-60" : "cursor-pointer"}
        transition-colors duration-150
        ${isActive ? t.docRowActive : t.docRow}`}
    >
      {/* File icon */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-150
        ${isActive ? "bg-blue-500/15" : t.fileIconBg}`}>
        {isPending
          ? <Spinner size="xs" />
          : isActive
            ? <Check size={13} className="text-emerald-500" strokeWidth={2.5} />
            : <File size={14} stroke={resolvedTheme === "dark" ? "#9ca3af" : "#86868b"} />
        }
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0 pr-1">
        <p className={`text-xs font-medium truncate leading-tight
          ${isActive
            ? resolvedTheme === "dark" ? "text-[#0a84ff]" : "text-[#0071e3]"
            : t.label}`}>
          {doc.filename}
        </p>
        <p className={`text-xs mt-0.5 ${isPending ? "text-blue-400" : t.subtext}`}>
          {isPending
            ? "Indexing..."
            : `${formatDate(doc.uploaded_at)}${doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}`
          }
        </p>
      </div>

      {/* 3-dot menu */}
      <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
        <motion.button
          ref={actionButtonRef}
          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === doc.id ? null : doc.id) }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          transition={ease.springBouncy}
          className={`w-7 h-7 sm:w-6 sm:h-6 rounded-md flex items-center justify-center
            opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150 ${t.docAction}`}
        >
          <MoreVertical size={14} />
        </motion.button>

        {isOpen && createPortal(
          <motion.div
            {...dropdownVariants}
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            onClick={e => e.stopPropagation()}
            className={`fixed -translate-y-1/2 z-[80] w-36 rounded-xl border shadow-xl overflow-hidden ${t.dropdownBg}`}
          >
            {[
              { label: "Preview",  icon: <Eye size={12} />,      action: onPreview,  cls: t.docAction },
              { label: "Download", icon: <Download size={12} />,  action: onDownload, cls: t.docAction },
              null,
              { label: "Delete",   icon: <Trash2 size={12} />,    action: onDelete,   cls: t.docActionDel },
            ].map((item, i) =>
              item === null
                ? <div key={i} className={`h-px mx-2 my-0.5 ${t.divider}`} />
                : (
                  <motion.button
                    key={item.label}
                    whileHover={{ x: 3 }}
                    transition={ease.springGentle}
                    onClick={e => { item.action(doc, e); setOpenMenuId(null) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors duration-100 ${item.cls}`}
                  >
                    {item.icon} {item.label}
                  </motion.button>
                )
            )}
          </motion.div>,
          document.body
        )}
      </div>
    </motion.div>
  )
}
