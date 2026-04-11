import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, Plus, FolderOpen } from "lucide-react"
import { Spinner } from "../Loader"
import DocumentRow from "./DocumentRow"
import ProfileDropdown from "../ProfileDropdown"
import { staggerContainer, staggerItem, btnSubtle, fadeIn } from "../lib/animations"

export default function Sidebar({
  sidebarOpen, setSidebarOpen,
  documents, uploadedFile, switching,
  uploading, resolvedTheme, t,
  user, onLogout, themeMode, setThemeMode,
  onUpload, onSwitch, onPreview, onDownload, onDelete,
  openMenuId, setOpenMenuId
}) {
  const fileRef = useRef()

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            {...fadeIn}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            aria-label="Close sidebar"
          />
        )}
      </AnimatePresence>

      <aside className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        w-[min(88vw,18rem)] sm:w-72 fixed lg:static z-40 h-[100dvh]
        shrink-0 flex flex-col border-r
        transition-transform duration-300 ease-in-out
        ${t.sidebar}
      `}>

        {/* Logo */}
        <div className="shrink-0 px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0 shadow-lg">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <p className={`text-sm font-bold tracking-tight ${t.title}`}>DocMind AI</p>
              <p className={`text-xs ${t.subtext}`}>Document Intelligence</p>
            </div>
          </div>

          {/* Upload button */}
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onUpload} />
          <motion.button
            onClick={() => !uploading && fileRef.current.click()}
            disabled={uploading}
            {...btnSubtle}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold
              border transition-colors duration-200
              ${uploading ? "border-blue-300/50 bg-blue-50/50 text-blue-500 cursor-wait" : t.uploadIdle}`}
          >
            {uploading
              ? <><Spinner size="xs" /> Indexing...</>
              : <><Plus size={14} /> Upload New Document</>
            }
          </motion.button>
        </div>

        {/* Document list — scrolls, profile section stays pinned at bottom */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-2">
          {documents.length > 0 ? (
            <>
              <p className={`text-xs font-semibold uppercase tracking-wider px-2 mb-2 ${t.subtext}`}>
                Documents · {documents.length}
              </p>
              <motion.div
                className="flex flex-col gap-0.5"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {documents.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    isActive={doc.is_active}
                    resolvedTheme={resolvedTheme}
                    t={t}
                    onSwitch={onSwitch}
                    onPreview={onPreview}
                    onDownload={onDownload}
                    onDelete={onDelete}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    switching={switching}
                  />
                ))}
              </motion.div>
            </>
          ) : (
            <motion.div
              variants={staggerItem}
              initial="initial"
              animate="animate"
              className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.emptyIconBg}`}>
                <FolderOpen size={20} stroke={resolvedTheme === "dark" ? "#9ca3af" : "#86868b"} />
              </div>
              <p className={`text-xs ${t.subtext}`}>No documents yet</p>
              <p className={`text-xs ${t.subtext} opacity-60`}>Upload a PDF to get started</p>
            </motion.div>
          )}
        </div>

        {/* Bottom — user profile */}
        <div
          className={`shrink-0 border-t ${t.divider} p-3 ${resolvedTheme === "dark" ? "bg-black/25 backdrop-blur-xl" : "bg-white/75 backdrop-blur-xl"}`}
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <ProfileDropdown
            user={user}
            onLogout={onLogout}
            theme={resolvedTheme}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        </div>
      </aside>
    </>
  )
}
