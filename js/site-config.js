/**
 * Kredora — site config (single source of truth for public identity strings)
 * ------------------------------------------------------------------------------
 * The only place a domain, site URL, tagline, or contact address should be
 * written. UI code and seed data read from here instead of hardcoding
 * "skillproof.me" (the old project name) or any other stale domain.
 *
 * This file is CONFIG ONLY — no logic, no DOM access beyond the window alias.
 * ------------------------------------------------------------------------------
 */

export const SITE_CONFIG = {
  /** Display name. Do not rename the project here without meaning to. */
  name: "Kredora",

  /**
   * The real, deployed site URL (GitHub Pages). Update this single value when
   * the project moves to a custom domain.
   */
  url: "https://namansikarwar.github.io/Kredora/",

  /** Public profile link used in marketing copy. */
  profileUrl: "https://namansikarwar.github.io/Kredora/profile.html",

  /**
   * Tagline. Shown in <title>, meta tags, and footers.
   */
  tagline: "Don't just claim a skill. Prove it.",

  /**
   * Domain used for seed/demo email addresses only. "example.com" is the
   * IETF-reserved safe default; replace with the project's real mail domain
   * if one ever exists. This is NOT used for any real email.
   */
  emailDomain: "example.com",
};

// Alias for classic scripts (auth.js seed data) that load before modules.
if (typeof window !== "undefined") {
  window.KredoraSiteConfig = SITE_CONFIG;
}
