// Hand-drawn doodle stickers for social media designs.
// All paths use stroke="currentColor" + fill="none" (or fill="currentColor" for solid pieces)
// so they can be colored via the iconColor system.
export const DOODLE_STICKERS = {
  SQUIGGLE: {
    label: "خط متموج",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M5,50 Q14,30 25,50 T48,50 T68,50 T88,50 T96,55"/></svg>`,
  },
  UNDERLINE_DOUBLE: {
    label: "تسطير مزدوج",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M6,42 Q24,38 50,40 T94,42"/><path d="M8,58 Q28,55 52,57 T92,60"/></svg>`,
  },
  ARROW_CURVED: {
    label: "سهم منحني",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M10,75 Q25,30 60,30 Q80,30 85,40"/><path d="M75,25 L88,40 L75,52"/></svg>`,
  },
  ARROW_STRAIGHT: {
    label: "سهم مستقيم",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M8,50 L88,50"/><path d="M72,32 L92,50 L72,68"/></svg>`,
  },
  ARROW_LOOP: {
    label: "سهم ملتف",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M15,80 Q15,40 50,40 Q70,40 70,55 Q70,70 55,68 Q42,66 45,55 Q48,46 60,48 Q78,52 80,68"/><path d="M70,58 L82,72 L88,55"/></svg>`,
  },
  HIGHLIGHT_CIRCLE: {
    label: "دائرة تمييز",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M30,15 Q60,10 80,30 Q92,55 75,80 Q50,95 25,82 Q5,65 12,40 Q18,22 30,15"/></svg>`,
  },
  HIGHLIGHT_OVAL: {
    label: "بيضاوي تمييز",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M15,52 Q12,38 35,32 Q62,28 80,38 Q92,48 88,58 Q82,68 60,72 Q35,74 18,66 Q12,60 15,52"/></svg>`,
  },
  STAR_DOODLE: {
    label: "نجمة يدوية",
    color: "#fbbf24",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M50,8 L60,38 L92,40 L66,58 L75,90 L50,72 L25,90 L34,58 L8,40 L40,38 Z"/></svg>`,
  },
  SPARKLE: {
    label: "بريق",
    color: "#fbbf24",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M50,8 L56,42 L92,50 L56,58 L50,92 L44,58 L8,50 L44,42 Z"/></svg>`,
  },
  SPARKLE_TRIPLE: {
    label: "بريق ثلاثي",
    color: "#fbbf24",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M30,15 L34,30 L48,34 L34,38 L30,52 L26,38 L12,34 L26,30 Z"/><path d="M70,40 L74,55 L88,59 L74,63 L70,78 L66,63 L52,59 L66,55 Z"/><path d="M22,72 L25,82 L34,85 L25,88 L22,98 L19,88 L10,85 L19,82 Z"/></svg>`,
  },
  HEART_DOODLE: {
    label: "قلب يدوي",
    color: "#ef4444",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M50,85 Q22,68 12,42 Q8,22 26,18 Q40,16 50,32 Q60,16 74,18 Q92,22 88,42 Q78,68 50,85 Z"/></svg>`,
  },
  HEART_FILLED: {
    label: "قلب ممتلئ",
    color: "#ef4444",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M50,85 Q22,68 12,42 Q8,22 26,18 Q40,16 50,32 Q60,16 74,18 Q92,22 88,42 Q78,68 50,85 Z"/></svg>`,
  },
  LIGHTNING_DOODLE: {
    label: "برق",
    color: "#fbbf24",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M55,5 L20,55 L45,55 L38,95 L80,40 L55,40 L60,5 Z"/></svg>`,
  },
  CHECK_DOODLE: {
    label: "علامة صح",
    color: "#22c55e",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M12,52 Q22,60 38,72 Q40,75 45,68 Q70,38 90,18"/></svg>`,
  },
  X_DOODLE: {
    label: "علامة خطأ",
    color: "#ef4444",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M18,18 Q50,52 82,82"/><path d="M82,18 Q50,52 18,82"/></svg>`,
  },
  FLOWER_DOODLE: {
    label: "زهرة يدوية",
    color: "#ec4899",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" stroke-width="2"><circle cx="50" cy="22" r="14"/><circle cx="78" cy="50" r="14"/><circle cx="50" cy="78" r="14"/><circle cx="22" cy="50" r="14"/><circle cx="50" cy="50" r="10" fill="#fbbf24"/></svg>`,
  },
  SMILE_DOODLE: {
    label: "وجه مبتسم",
    color: "#fbbf24",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="#000" stroke-width="3"><circle cx="50" cy="50" r="42"/><circle cx="36" cy="42" r="4" fill="#000"/><circle cx="64" cy="42" r="4" fill="#000"/><path d="M30,60 Q50,78 70,60" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  PLUS_DOODLE: {
    label: "علامة زائد",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M50,12 L50,88"/><path d="M12,50 L88,50"/></svg>`,
  },
  SCRIBBLE: {
    label: "خربشة",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M10,30 Q25,20 35,32 Q45,44 30,50 Q15,56 28,68 Q42,75 55,65 Q68,55 60,42 Q52,30 65,25 Q80,22 88,38 Q92,55 78,65 Q66,75 80,82"/></svg>`,
  },
  DOTS_THREE: {
    label: "ثلاث نقاط",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor"><circle cx="20" cy="50" r="7"/><circle cx="50" cy="50" r="7"/><circle cx="80" cy="50" r="7"/></svg>`,
  },
  DIAMOND_DOODLE: {
    label: "ماسة",
    color: "#06b6d4",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="#000" stroke-width="2.5" stroke-linejoin="round"><path d="M30,15 L70,15 L92,40 L50,90 L8,40 Z"/><path d="M30,15 L50,40 L70,15" fill="rgba(255,255,255,0.4)"/><path d="M8,40 L50,40 L92,40" fill="none" stroke="#000" stroke-width="2"/></svg>`,
  },
  CONFETTI: {
    label: "كونفيتي",
    color: "#ec4899",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor"><rect x="20" y="15" width="6" height="14" rx="2" transform="rotate(-25 23 22)"/><rect x="55" y="10" width="6" height="14" rx="2" fill="#3b82f6" transform="rotate(15 58 17)"/><rect x="78" y="28" width="6" height="14" rx="2" fill="#fbbf24" transform="rotate(45 81 35)"/><rect x="15" y="50" width="6" height="14" rx="2" fill="#22c55e" transform="rotate(60 18 57)"/><rect x="42" y="62" width="6" height="14" rx="2" fill="#a855f7" transform="rotate(-30 45 69)"/><rect x="68" y="68" width="6" height="14" rx="2" fill="#f97316" transform="rotate(20 71 75)"/><circle cx="35" cy="35" r="3" fill="#06b6d4"/><circle cx="60" cy="50" r="3" fill="#fbbf24"/><circle cx="85" cy="55" r="3" fill="#ec4899"/></svg>`,
  },
  SPEECH_TAIL: {
    label: "ذيل فقاعة",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M10,10 Q40,8 65,15 L60,55 Q35,90 18,72 Q12,42 22,28 Q15,18 10,10 Z"/></svg>`,
  },
  CIRCLE_OPEN: {
    label: "دائرة مفتوحة",
    color: "#000000",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M85,40 Q88,18 65,12 Q35,8 18,30 Q5,55 22,78 Q45,92 70,80 Q88,68 88,55"/></svg>`,
  },
};
