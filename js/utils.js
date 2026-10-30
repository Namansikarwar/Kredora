/**
 * Kredora — shared DOM utilities.
 * escapeHtml is the single source of truth for interpolating any value that
 * could originate from a user, localStorage, or the Supabase database into
 * an HTML string (innerHTML templates). It escapes &, <, >, " and ', so it
 * is safe for both text nodes and double/single-quoted attribute values.
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Classic (non-module) inline scripts cannot use ES imports; register the
// helper on window so those scripts can call escapeHtml(...) as well.
if (typeof window !== "undefined") {
  window.escapeHtml = escapeHtml;
}
