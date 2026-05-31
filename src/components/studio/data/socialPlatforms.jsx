// socialPlatforms.jsx — definitions for every social platform the user
// can add to a "contact box" on a card. Each entry is the single source
// of truth for how that platform renders in:
//   • The platform-picker (small thumbnail in the editor list)
//   • The card preview (medium icon next to the handle)
//   • The canvas export (icon SVG → Blob → Image → drawImage)
//
// Visual rule for unity: solid coloured circle (brand colour, overridable)
// + simplified white glyph (overridable). All icons live in a 100×100
// viewBox so they line up at any size.
//
// `svg(bg, fg)` accepts both colours so we can:
//   bg = brand, fg = "#fff"     → brand chips (default)
//   bg = "#000", fg = "#fff"    → monochrome dark
//   bg = "transparent", fg = brand → outline-only
//
// Glyph design notes (v2):
//   • Each icon's bounding box sits roughly inside a 60×60 rect centred
//     in the viewBox, so the brand-colour circle has visible breathing
//     room around the glyph at every size.
//   • Stroke-only glyphs (Email, Website, Instagram, …) use stroke-width
//     scaled to 6 so they read at 24px and don't disappear at 12px.

export const SOCIAL_PLATFORMS = [
  // ── WhatsApp ──────────────────────────────────────────────────────────
  {
    id: "whatsapp",
    nameAr: "واتساب",
    nameEn: "WhatsApp",
    brandColor: "#25D366",
    placeholderAr: "+966 5X XXX XXXX",
    placeholderEn: "+966 5X XXX XXXX",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Speech-bubble outline with a corner tail — the WhatsApp silhouette -->
      <path d="M 50 22 a 28 28 0 0 0 -24 42 l -3 12 12 -3 a 28 28 0 1 0 15 -51 z" fill="${fg}"/>
      <!-- Phone-receiver glyph cut OUT of the bubble using brand-colour fill -->
      <path d="M 38 38 q -2 0 -3 2 q -2 4 0 9 q 5 11 16 16 q 5 2 9 0 q 2 -1 2 -3 v -4 q 0 -2 -2 -2 l -5 -2 q -2 -1 -3 1 l -1 2 q -7 -3 -10 -10 l 2 -1 q 2 -1 1 -3 l -2 -5 q 0 -2 -2 -2 z" fill="${bg}"/>
    </svg>`,
  },

  // ── Instagram ─────────────────────────────────────────────────────────
  {
    id: "instagram",
    nameAr: "إنستقرام",
    nameEn: "Instagram",
    // Real IG logo is a gradient — using flat pink for consistency.
    brandColor: "#E4405F",
    placeholderAr: "@username",
    placeholderEn: "@username",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Rounded square camera body -->
      <rect x="26" y="26" width="48" height="48" rx="12" fill="none" stroke="${fg}" stroke-width="5"/>
      <!-- Lens circle -->
      <circle cx="50" cy="50" r="11" fill="none" stroke="${fg}" stroke-width="5"/>
      <!-- Flash / lens accent dot -->
      <circle cx="64" cy="36" r="3" fill="${fg}"/>
    </svg>`,
  },

  // ── Snapchat ─────────────────────────────────────────────────────────
  {
    id: "snapchat",
    nameAr: "سناب شات",
    nameEn: "Snapchat",
    brandColor: "#FFFC00",
    // Note: yellow + white = low contrast. Use brand fg colour (dark
    // grey ghost) and let the caller override if they want pure white.
    placeholderAr: "username",
    placeholderEn: "username",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Snapchat ghost: rounded crown + slight ear bulges + scallop bottom -->
      <path d="M 50 22 c -10 0 -17 7 -17 17 v 13 q 0 4 -3 6 l -3 2 q -1 1 0 2 q 2 1 4 1 q 2 0 4 -1 l 1 -1 q 0 4 4 7 q 6 4 14 4 t 14 -4 q 4 -3 4 -7 l 1 1 q 2 1 4 1 q 2 0 4 -1 q 1 -1 0 -2 l -3 -2 q -3 -2 -3 -6 V 39 c 0 -10 -7 -17 -17 -17 z" fill="${fg}"/>
      <!-- Tiny eyes — keep them brand-coloured so the ghost has presence -->
      <circle cx="42" cy="48" r="2" fill="${bg}"/>
      <circle cx="58" cy="48" r="2" fill="${bg}"/>
    </svg>`,
  },

  // ── TikTok ───────────────────────────────────────────────────────────
  {
    id: "tiktok",
    nameAr: "تيك توك",
    nameEn: "TikTok",
    brandColor: "#000000",
    placeholderAr: "@username",
    placeholderEn: "@username",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Musical note - "d" shape with hook -->
      <!-- Note stem -->
      <path d="M 53 28 v 28 q 0 8 -8 8 t -8 -8 t 8 -8 v -7 q -15 0 -15 15 t 15 15 t 15 -15 V 38 q 4 5 12 6 v -8 q -8 -1 -12 -8 z" fill="${fg}"/>
    </svg>`,
  },

  // ── X (Twitter) ──────────────────────────────────────────────────────
  {
    id: "x",
    nameAr: "إكس (تويتر)",
    nameEn: "X (Twitter)",
    brandColor: "#000000",
    placeholderAr: "@username",
    placeholderEn: "@username",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- The X mark: two crossed strokes built from filled triangles so
           they look like brush-painted slashes (matches the official X). -->
      <path d="M 31 28 h 11 l 14 19 16 -19 h 7 L 60 53 75 72 H 64 L 49 52 32 72 h -7 L 45 47 z" fill="${fg}"/>
    </svg>`,
  },

  // ── Facebook ─────────────────────────────────────────────────────────
  {
    id: "facebook",
    nameAr: "فيسبوك",
    nameEn: "Facebook",
    brandColor: "#1877F2",
    placeholderAr: "facebook.com/...",
    placeholderEn: "facebook.com/...",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Iconic Facebook "f" — vertical bar with crossbar at the top -->
      <path d="M 54 78 V 52 h 9 l 1.5 -10 H 54 v -7 q 0 -5 5 -5 h 6 V 22 q -3 -1 -10 -1 q -12 0 -12 12 v 9 h -8 v 10 h 8 v 26 z" fill="${fg}"/>
    </svg>`,
  },

  // ── YouTube ──────────────────────────────────────────────────────────
  {
    id: "youtube",
    nameAr: "يوتيوب",
    nameEn: "YouTube",
    brandColor: "#FF0000",
    placeholderAr: "youtube.com/@...",
    placeholderEn: "youtube.com/@...",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Rounded-rectangle play button — the YouTube logo silhouette -->
      <rect x="20" y="32" width="60" height="36" rx="10" fill="${fg}"/>
      <!-- Play triangle in brand colour so it punches through -->
      <path d="M 44 41 L 62 50 L 44 59 z" fill="${bg}"/>
    </svg>`,
  },

  // ── LinkedIn ─────────────────────────────────────────────────────────
  {
    id: "linkedin",
    nameAr: "لينكدإن",
    nameEn: "LinkedIn",
    brandColor: "#0A66C2",
    placeholderAr: "linkedin.com/in/...",
    placeholderEn: "linkedin.com/in/...",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <!-- LinkedIn uses a rounded square, not a circle, to match its real logo -->
      <rect x="6" y="6" width="88" height="88" rx="14" fill="${bg}"/>
      <!-- Dot above the "i" -->
      <circle cx="30" cy="32" r="5.5" fill="${fg}"/>
      <!-- "i" stem -->
      <rect x="25" y="42" width="10" height="34" fill="${fg}"/>
      <!-- "n" shape -->
      <path d="M 44 42 h 9 v 5 q 4 -6 12 -6 q 12 0 12 14 v 21 h -10 V 60 q 0 -7 -6 -7 t -7 7 v 16 h -10 z" fill="${fg}"/>
    </svg>`,
  },

  // ── Telegram ─────────────────────────────────────────────────────────
  {
    id: "telegram",
    nameAr: "تيليجرام",
    nameEn: "Telegram",
    brandColor: "#229ED9",
    placeholderAr: "@username",
    placeholderEn: "@username",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Paper plane — tilted forward, with the iconic Telegram inner fold -->
      <path d="M 76 28 L 22 50 L 38 55 L 64 38 L 44 60 L 62 76 Z" fill="${fg}"/>
      <!-- Inner crease — slightly darker so the plane reads 3D -->
      <path d="M 44 60 L 50 70 L 52 56 z" fill="${bg}" opacity="0.35"/>
    </svg>`,
  },

  // ── Phone ────────────────────────────────────────────────────────────
  {
    id: "phone",
    nameAr: "اتصال",
    nameEn: "Phone",
    brandColor: "#10B981",
    placeholderAr: "+966 5X XXX XXXX",
    placeholderEn: "+966 5X XXX XXXX",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Classic phone-receiver mark -->
      <path d="M 32 30 q 0 -4 4 -4 h 6 q 3 0 4 3 l 3 9 q 1 3 -2 5 l -4 3 q 6 11 17 17 l 3 -4 q 2 -3 5 -2 l 9 3 q 3 1 3 4 v 6 q 0 4 -4 4 q -25 0 -44 -25 q -20 -20 -20 -19 z" fill="${fg}"/>
    </svg>`,
  },

  // ── Email ────────────────────────────────────────────────────────────
  {
    id: "email",
    nameAr: "إيميل",
    nameEn: "Email",
    brandColor: "#6366F1",
    placeholderAr: "you@example.com",
    placeholderEn: "you@example.com",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Envelope body + flap visible -->
      <rect x="24" y="34" width="52" height="32" rx="3" fill="none" stroke="${fg}" stroke-width="5"/>
      <path d="M 24 38 L 50 56 L 76 38" fill="none" stroke="${fg}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`,
  },

  // ── Website ──────────────────────────────────────────────────────────
  {
    id: "website",
    nameAr: "موقع إلكتروني",
    nameEn: "Website",
    brandColor: "#0EA5E9",
    placeholderAr: "https://...",
    placeholderEn: "https://...",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Outer globe -->
      <circle cx="50" cy="50" r="22" fill="none" stroke="${fg}" stroke-width="4"/>
      <!-- Equator -->
      <line x1="28" y1="50" x2="72" y2="50" stroke="${fg}" stroke-width="4"/>
      <!-- Meridians as curved ovals -->
      <ellipse cx="50" cy="50" rx="11" ry="22" fill="none" stroke="${fg}" stroke-width="4"/>
    </svg>`,
  },

  // ── Location / Map ───────────────────────────────────────────────────
  {
    id: "location",
    nameAr: "الموقع",
    nameEn: "Location",
    brandColor: "#EF4444",
    placeholderAr: "العنوان",
    placeholderEn: "Address",
    svg: (bg, fg) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <!-- Pin teardrop -->
      <path d="M 50 24 q -16 0 -16 16 q 0 14 16 36 q 16 -22 16 -36 q 0 -16 -16 -16 z" fill="${fg}"/>
      <!-- Hollow centre — brand-colour circle punched through the pin -->
      <circle cx="50" cy="40" r="6" fill="${bg}"/>
    </svg>`,
  },
];

// Quick lookup
export const findPlatform = (id) => SOCIAL_PLATFORMS.find((p) => p.id === id);
