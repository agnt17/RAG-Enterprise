export const themes = {
  light: {
    // Layout — AppRouter GlobalBackground provides base color, panels use visible glass
    page:    "bg-transparent",
    sidebar: "bg-white/85 backdrop-blur-2xl border-slate-200/50 shadow-[0_8px_32px_rgba(99,102,241,0.08)]",
    main:    "bg-transparent",
    card:    "bg-white/80 backdrop-blur-xl border-slate-200/50",

    // Typography
    title:   "text-[#1d1d1f]",
    label:   "text-[#1d1d1f]",
    subtext: "text-[#86868b]",
    muted:   "text-[#86868b]",

    // Messages
    msgUser:    "bg-[#0071e3] text-white rounded-tr-sm shadow-sm",
    msgAi:      "bg-white/85 backdrop-blur-sm border border-slate-200/50 text-[#1d1d1f] rounded-tl-sm shadow-sm",
    msgSystem:  "bg-indigo-50/80 border border-indigo-100/80 text-indigo-600 w-full",
    avatarUser: "bg-[#0071e3] text-white",
    avatarAi:   "bg-white/80 text-[#86868b] border border-slate-200/60",
    thinkDot:   "text-[#86868b]",

    // UI elements
    badge:          "bg-slate-100/80 text-[#86868b]",
    divider:        "border-slate-200/60",
    sendBtn:        "bg-[#0071e3] hover:bg-[#0077ED] text-white",
    docRow:         "hover:bg-white/60 text-slate-600",
    docRowActive:   "bg-indigo-50/80 text-[#0071e3] border-l-2 border-[#0071e3]",
    docAction:      "text-slate-400 hover:text-slate-700 hover:bg-white/70",
    docActionDel:   "text-slate-400 hover:text-red-600 hover:bg-red-50/80",
    uploadIdle:     "border-[#0071e3]/25 bg-[#0071e3]/5 hover:bg-[#0071e3]/10 hover:border-[#0071e3]/40 text-[#0071e3]",
    iconStroke:     "#86868b",
    fileIconBg:     "bg-white/80",
    emptyIconBg:    "bg-white/80",
    dropdownBg:     "bg-white/90 backdrop-blur-2xl border-slate-200/60",
    citationDivider:"border-slate-200/60",
    inputBg:        "bg-white/75 backdrop-blur-md border-slate-200/50 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3]/40 focus:bg-white/90",
    quickAction:    "border-slate-200/60 bg-white/60 text-slate-600 hover:bg-[#0071e3]/5 hover:border-[#0071e3]/30 hover:text-[#0071e3]",

    // Shadows (elevation system)
    headerShadow: "shadow-[0_1px_0_rgba(0,0,0,0.06)]",
    cardShadow:   "shadow-[0_4px_24px_rgba(99,102,241,0.06)]",
    modalShadow:  "shadow-[0_16px_48px_rgba(99,102,241,0.12)]",
    sidebarShadow:"shadow-[0_8px_32px_rgba(99,102,241,0.08)]",
  },

  dark: {
    // Layout — AppRouter GlobalBackground provides base color
    page:    "bg-transparent",
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
    uploadIdle:     "border-[#0a84ff]/30 bg-[#0a84ff]/8 hover:bg-[#0a84ff]/14 hover:border-[#0a84ff]/50 text-[#0a84ff]",
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
