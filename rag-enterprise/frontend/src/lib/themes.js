export const themes = {
  light: {
    // Layout — solid backgrounds, no glass dependency on AppRouter
    page:    "bg-slate-50",
    sidebar: "bg-white border-slate-200",
    main:    "bg-slate-50",
    card:    "bg-white border-slate-200",

    // Typography
    title:   "text-[#1d1d1f]",
    label:   "text-[#1d1d1f]",
    subtext: "text-[#94a3b8]",
    muted:   "text-[#94a3b8]",

    // Messages
    msgUser:    "bg-[#0071e3] text-white rounded-tr-sm shadow-sm",
    msgAi:      "bg-white border border-slate-200 text-[#1d1d1f] rounded-tl-sm shadow-sm",
    msgSystem:  "bg-indigo-50 border border-indigo-100 text-indigo-600 w-full",
    avatarUser: "bg-[#0071e3] text-white",
    avatarAi:   "bg-white text-[#86868b] border border-slate-200",
    thinkDot:   "text-[#86868b]",

    // UI elements
    badge:          "bg-slate-100 text-[#86868b]",
    divider:        "border-slate-200",
    sendBtn:        "bg-[#0071e3] hover:bg-[#0077ED] text-white",
    docRow:         "hover:bg-slate-100 text-slate-600",
    docRowActive:   "bg-indigo-50 text-[#0071e3] border-l-2 border-[#0071e3]",
    docAction:      "text-slate-400 hover:text-slate-700 hover:bg-slate-100",
    docActionDel:   "text-slate-400 hover:text-red-600 hover:bg-red-50",
    uploadIdle:     "border-[#0071e3]/30 bg-[#0071e3]/5 hover:bg-[#0071e3]/10 hover:border-[#0071e3]/50 text-[#0071e3]",
    iconStroke:     "#86868b",
    fileIconBg:     "bg-slate-100",
    emptyIconBg:    "bg-slate-100",
    dropdownBg:     "bg-white border-slate-200",
    citationDivider:"border-slate-200",
    inputBg:        "bg-white border-slate-200 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3]/50 focus:bg-white",
    quickAction:    "border-slate-200 bg-white text-slate-600 hover:bg-[#0071e3]/5 hover:border-[#0071e3]/30 hover:text-[#0071e3]",

    // Shadows
    headerShadow: "shadow-[0_1px_0_rgba(0,0,0,0.08)]",
    cardShadow:   "shadow-sm",
    modalShadow:  "shadow-xl",
    sidebarShadow:"shadow-[1px_0_0_rgba(0,0,0,0.06)]",
  },

  dark: {
    // Layout
    page:    "bg-[#09090b]",
    sidebar: "bg-[#111113] border-white/8",
    main:    "bg-[#09090b]",
    card:    "bg-[#111113] border-white/8",

    // Typography
    title:   "text-[#f5f5f7]",
    label:   "text-[#f5f5f7]",
    subtext: "text-[#86868b]",
    muted:   "text-[#86868b]",

    // Messages
    msgUser:    "bg-[#0a84ff] text-white rounded-tr-sm shadow-sm",
    msgAi:      "bg-[#1c1c1e] border border-white/8 text-[#f5f5f7] rounded-tl-sm",
    msgSystem:  "bg-blue-900/20 border border-blue-800/30 text-blue-400 w-full",
    avatarUser: "bg-[#0a84ff] text-white",
    avatarAi:   "bg-[#1c1c1e] text-[#cbd5e1] border border-white/8",
    thinkDot:   "text-[#9ca3af]",

    // UI elements
    badge:          "bg-white/8 text-[#cbd5e1]",
    divider:        "border-white/8",
    sendBtn:        "bg-[#0a84ff] hover:bg-[#409cff] text-white",
    docRow:         "hover:bg-white/6 text-[#cbd5e1]",
    docRowActive:   "bg-[#0a84ff]/10 text-[#0a84ff] border-l-2 border-[#0a84ff]",
    docAction:      "text-[#d1d5db] hover:text-white hover:bg-white/10",
    docActionDel:   "text-[#d1d5db] hover:text-red-300 hover:bg-red-900/30",
    uploadIdle:     "border-[#0a84ff]/30 bg-[#0a84ff]/8 hover:bg-[#0a84ff]/14 hover:border-[#0a84ff]/50 text-[#0a84ff]",
    iconStroke:     "#9ca3af",
    fileIconBg:     "bg-white/8",
    emptyIconBg:    "bg-white/6",
    dropdownBg:     "bg-[#1c1c1e] border-white/10",
    citationDivider:"border-white/8",
    inputBg:        "bg-white/6 border-white/10 text-[#f5f5f7] placeholder-[#9ca3af] focus:border-white/20",
    quickAction:    "border-white/8 bg-white/4 text-[#cbd5e1] hover:bg-[#0a84ff]/10 hover:border-[#0a84ff]/30 hover:text-[#0a84ff]",

    // Shadows
    headerShadow: "shadow-[0_1px_0_rgba(255,255,255,0.04)]",
    cardShadow:   "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
    modalShadow:  "shadow-[0_16px_48px_rgba(0,0,0,0.6)]",
    sidebarShadow:"shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
  },
}
