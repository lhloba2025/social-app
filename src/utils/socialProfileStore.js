// socialProfileStore — persistent contact-box "profile" shared between
// the design studio (StudioEditor) and the greeting-cards page.
//
// Motivation: re-entering @handle, platform list, colours, layout, font
// every single time the user opens a new design is busywork. The profile
// stores the user's preferred contact strip once and restores it as the
// default whenever they open either page. They can still override any
// field per-design (the in-memory state diverges as soon as they touch
// it) but they don't start from zero.
//
// What we persist:
//   • items[]          — the user's accounts (platform + handle), in order
//   • styling defaults — layout, colorMode, monoColor, textColor, sizes,
//                        background (solid/gradient + colors + opacity +
//                        radius + padding), font, rotation. Position
//                        (x/y) is intentionally NOT persisted because
//                        every design has its own canvas size and a
//                        previous (x,y) often lands in the wrong place.
//   • show             — also skipped; the user toggles per-design.
//
// What we DON'T persist:
//   • x, y, show, rotation — these are positional/visual per-design.
//     (Actually we DO save rotation because users often have a brand
//     preference. Skip x/y/show only.)
//
// Storage key — bumped if the schema changes.
const KEY = "social_profile_v1";

// Fields we explicitly persist from the box state. Listed in one place
// so the save/load paths are guaranteed to agree on shape.
const PERSISTED_FIELDS = [
  "items",
  "layout",
  "colorMode",
  "monoColor",
  "textColor",
  "iconSize",
  "spacing",
  "bgEnabled",
  "bgMode",
  "bgColor",
  "bgGradColor2",
  "bgGradAngle",
  "bgOpacity",
  "bgRadius",
  "bgPadding",
  "showLabels",
  "fontFamily",
  "rotation",
  "alignment",
];

// Returns the saved profile object, or `null` if nothing was saved
// (lets the caller distinguish "fresh user" from "user with empty list").
export function loadSocialProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Defensive — ignore malformed payloads that don't carry items[].
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch { return null; }
}

// Convenience — just the items array. Used by the panel's "restore"
// button when the user wants to re-apply only their accounts without
// stomping their current styling.
export function loadSocialItems() {
  const p = loadSocialProfile();
  return p?.items || null;
}

// Persist the picked subset of the box state. Pass the whole box; we
// extract only the persisted fields so adding new positional fields to
// the box doesn't accidentally leak them into the profile.
//
// Special rule for items[]: an empty items[] does NOT overwrite the
// previously-saved accounts. This lets the user "clear" the box on a
// single design (start blank for one greeting card) without nuking
// their saved profile. To explicitly forget accounts, call
// `clearSocialProfile()` from a UI control.
export function saveSocialProfile(box) {
  if (!box) return false;
  const existing = loadSocialProfile() || {};
  const payload = { ...existing }; // keep any fields we no longer touch
  for (const k of PERSISTED_FIELDS) {
    if (box[k] === undefined) continue;
    // Don't overwrite saved items with an empty list — see comment above.
    if (k === "items" && Array.isArray(box.items) && box.items.length === 0
        && Array.isArray(existing.items) && existing.items.length > 0) {
      continue;
    }
    payload[k] = box[k];
  }
  // Belt-and-braces: if neither current nor existing has items, write [].
  if (!Array.isArray(payload.items)) payload.items = [];
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch { return false; /* quota exceeded — silently ignore */ }
}

// Wipe the saved profile entirely. After this the next page open
// behaves like a fresh user (no auto-restore).
export function clearSocialProfile() {
  try { localStorage.removeItem(KEY); return true; } catch { return false; }
}

// Quick yes/no — has the user ever saved a profile? Used to decide
// whether to show the "Restore" button at all.
export function hasSocialProfile() {
  return loadSocialProfile() !== null;
}

// Merge saved styling onto a default box. Used at parent init to bootstrap
// `useState` from a profile if one exists. The default box wins for any
// field the profile doesn't carry, the profile wins for the rest.
//   defaultBox — the hardcoded fallback used when there's no profile
//   options    — { applyItems: bool } — default true. Lets the caller
//                decide whether to also restore the items[] array (the
//                studio wants items, the cards page wants items, no
//                difference today but kept extensible).
export function applyProfileTo(defaultBox, options = {}) {
  const { applyItems = true } = options;
  const profile = loadSocialProfile();
  if (!profile) return defaultBox;
  const merged = { ...defaultBox };
  for (const k of PERSISTED_FIELDS) {
    if (profile[k] === undefined) continue;
    if (k === "items" && !applyItems) continue;
    merged[k] = profile[k];
  }
  return merged;
}
