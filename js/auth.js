/**
 * Kredora — Authentication and Navigation Guard Module
 * ------------------------------------------------------------------------------
 * Supabase Auth is the ONLY source of truth for authentication. There is no
 * client-side account store: no user list, no session token, and no demo
 * credentials live in localStorage. The signed-in identity is whatever
 * Supabase Auth says it is, and every user-scoped operation uses the
 * authenticated user id (auth.uid()) — never an id read from localStorage,
 * a URL parameter, or a client-side variable.
 *
 * All methods are async because they talk to Supabase Auth. RLS policies in
 * supabase/schema.sql scope every row to auth.uid().
 */
import { getSupabase } from "./supabase-client.js";

function friendlyAuthError(message) {
  const msg = String(message || "").toLowerCase();
  if (msg.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "An account with that email already exists. Try logging in.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email address first — check your inbox.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }
  if (msg.includes("unable to validate email") || msg.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Could not reach the authentication service. Check your connection and Supabase configuration.";
  }
  return message || "Authentication error. Please try again.";
}

const Auth = {
  /**
   * Raw Supabase session ({ session, user }) or null.
   * This is the single place session state is read from.
   */
  async getSession() {
    const db = getSupabase();
    const client = await db.init();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data || !data.session) return null;
      return data.session;
    } catch (e) {
      return null;
    }
  },

  /**
   * The authenticated Supabase user, shaped for the UI:
   * { id, email, name, username }. `name` comes from the user metadata that
   * signup writes — the same metadata the profile_summaries view reads.
   * Returns null when nobody is signed in. Never reads localStorage.
   */
  async getCurrentUser() {
    const session = await this.getSession();
    if (!session || !session.user) return null;
    const user = session.user;
    const meta = user.user_metadata || {};
    const username = meta.username || (user.email ? user.email.split("@")[0] : "developer");
    return {
      id: user.id, // auth.uid() — the only user id the app trusts
      email: user.email || "",
      name: meta.name || meta.full_name || username,
      username,
    };
  },

  async isAuthenticated() {
    return Boolean(await this.getSession());
  },

  /**
   * Sign in with email + password via Supabase Auth.
   * Returns { success, message? } — session persistence is handled entirely
   * by Supabase Auth (no client-side token is ever stored by this app).
   */
  async login(email, password) {
    if (!email || !password) {
      return { success: false, message: "Email and password are required." };
    }
    const db = getSupabase();
    const client = await db.init();
    if (!client) {
      return { success: false, message: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in." };
    }
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: String(email).trim(),
        password,
      });
      if (error) return { success: false, message: friendlyAuthError(error.message) };
      if (!data || !data.session) {
        return { success: false, message: "Sign-in did not return a session. Please confirm your email and try again." };
      }
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, message: friendlyAuthError(e && e.message) };
    }
  },

  /**
   * Create a Supabase Auth account. `name` and `username` are stored in the
   * user metadata (read by the profile_summaries view for display names).
   * If the project requires email confirmation, there is no session yet and
   * the caller should send the user to login.html?registered=true.
   */
  async signup(data) {
    const { name, username, email, password, confirmPassword } = data || {};
    if (!email || !password) {
      return { success: false, message: "Email and password are required." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return { success: false, message: "Please enter a valid email address." };
    }
    if (password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long." };
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { success: false, message: "Passwords do not match." };
    }

    const db = getSupabase();
    const client = await db.init();
    if (!client) {
      return { success: false, message: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-up." };
    }

    const meta = {};
    if (name && String(name).trim()) meta.name = String(name).trim();
    if (username && String(username).trim()) {
      const cleanUser = String(username).trim().toLowerCase();
      if (cleanUser.length < 3) {
        return { success: false, message: "Username must be at least 3 characters long." };
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
        return { success: false, message: "Username can only contain letters, numbers, hyphens, and underscores." };
      }
      meta.username = cleanUser;
    }

    try {
      const { data: result, error } = await client.auth.signUp({
        email: String(email).trim(),
        password,
        options: { data: meta },
      });
      if (error) return { success: false, message: friendlyAuthError(error.message) };

      const hasSession = Boolean(result && result.session);
      return { success: true, user: result ? result.user : null, needsConfirmation: !hasSession };
    } catch (e) {
      return { success: false, message: friendlyAuthError(e && e.message) };
    }
  },

  /**
   * Send a password-reset email through Supabase Auth. Requires the email
   * to already be entered in the login form.
   */
  async requestPasswordReset(email) {
    if (!email) {
      return { success: false, message: "Enter your email above first, then click 'Forgot password?' again." };
    }
    const db = getSupabase();
    const client = await db.init();
    if (!client) {
      return { success: false, message: "Supabase is not configured — password reset is unavailable." };
    }
    try {
      const { error } = await client.auth.resetPasswordForEmail(String(email).trim());
      if (error) return { success: false, message: friendlyAuthError(error.message) };
      return { success: true, message: "Password reset email sent — check your inbox." };
    } catch (e) {
      return { success: false, message: friendlyAuthError(e && e.message) };
    }
  },

  /** Sign out through Supabase Auth and clear nothing else — there is nothing client-side to clear. */
  async logout() {
    const db = getSupabase();
    const client = await db.init();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.error("Auth: signOut error", e);
      }
    }
    window.location.href = "login.html?loggedOut=true";
  },

  /**
   * Protected-page guard. Waits for the Supabase session; redirects to the
   * login page when there is none. Returns true when authenticated.
   */
  async requireAuth(redirectUrl = null) {
    const authenticated = await this.isAuthenticated();
    if (!authenticated) {
      const dest = redirectUrl || encodeURIComponent(window.location.pathname.split("/").pop() || "dashboard.html");
      window.location.href = `login.html?redirect=${dest}&msg=auth_required`;
      return false;
    }
    return true;
  },

  getInitials(name) {
    if (!name) return "SP";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  /** Subscribe to Supabase Auth changes (single subscription for the app). */
  onChange(callback) {
    const db = getSupabase();
    return db.init().then((client) => {
      if (!client) return null;
      const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
      return data;
    });
  },

  /**
   * Render the nav auth slots from the Supabase session. Re-runs whenever
   * auth state changes, so the navbar is always a reflection of Supabase.
   */
  async initNavAuth() {
    const user = await this.getCurrentUser();
    const authSlots = document.querySelectorAll("[data-auth-nav]");

    authSlots.forEach((slot) => {
      if (user) {
        const initials = this.getInitials(user.name || user.username);
        slot.innerHTML = `
          <div class="flex items-center gap-3">
            <a href="dashboard.html" class="hidden sm:inline-flex text-xs font-mono text-inkdim hover:text-ink transition-colors">
              Dashboard
            </a>
            <div class="relative group">
              <button type="button" class="flex items-center gap-2 py-1 px-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:border-brand/50 transition-colors" id="user-menu-btn" aria-haspopup="true">
                <span class="w-7 h-7 rounded-full bg-brand grid place-items-center font-display font-semibold text-[11px] text-white">
                  ${initials}
                </span>
                <span class="text-xs text-ink font-medium max-w-[100px] truncate hidden lg:inline">
                  ${user.name || user.username}
                </span>
                <svg class="w-3.5 h-3.5 text-inkdim" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
              <div class="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-elevated/95 backdrop-blur-xl shadow-2xl py-1 text-sm hidden group-hover:block hover:block z-50">
                <div class="px-4 py-2 border-b border-white/5">
                  <p class="text-xs text-inkdim font-mono">Signed in as</p>
                  <p class="text-sm font-semibold text-white truncate">${user.name || user.username}</p>
                </div>
                <a href="dashboard.html" class="block px-4 py-2 text-inkdim hover:text-white hover:bg-white/5 transition-colors">Dashboard</a>
                <a href="profile.html" class="block px-4 py-2 text-inkdim hover:text-white hover:bg-white/5 transition-colors">Your Profile</a>
                <a href="evidence.html" class="block px-4 py-2 text-inkdim hover:text-white hover:bg-white/5 transition-colors">Evidence Log</a>
                <div class="h-px bg-white/5 my-1"></div>
                <button type="button" onclick="Auth.logout()" class="w-full text-left px-4 py-2 text-inkdim hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  Log out
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        slot.innerHTML = `
          <div class="flex items-center gap-3">
            <a href="login.html" class="text-sm text-inkdim hover:text-ink transition-colors px-3 py-2">Log in</a>
            <a href="signup.html" class="text-sm font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-bright transition-colors">
              Sign up
            </a>
          </div>
        `;
      }
    });

    // Update mobile menus if present
    const mobileAuthSlots = document.querySelectorAll("[data-mobile-auth-nav]");
    mobileAuthSlots.forEach((slot) => {
      if (user) {
        slot.innerHTML = `
          <div class="px-2 py-2 border-t border-white/5 flex items-center justify-between">
            <span class="text-xs text-inkdim font-mono">Logged in as ${user.name || user.username}</span>
            <button onclick="Auth.logout()" class="text-xs font-semibold text-inkdim hover:text-white transition-colors">Log out</button>
          </div>
        `;
      } else {
        slot.innerHTML = `
          <div class="h-px bg-white/5 my-2"></div>
          <a href="login.html" class="py-2.5 text-inkdim hover:text-ink">Log in</a>
          <a href="signup.html" class="mt-1 text-center font-medium bg-brand text-white px-4 py-2.5 rounded-lg">Sign up</a>
        `;
      }
    });
  },
};

window.Auth = Auth;

// Auto initialize when DOM is ready, then keep the nav in sync with
// Supabase Auth state changes (sign-in on another tab, sign-out, etc.).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Auth.initNavAuth());
} else {
  Auth.initNavAuth();
}
Auth.onChange(() => Auth.initNavAuth());

export {};
