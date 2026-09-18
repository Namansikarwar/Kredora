/**
 * SkillProof — Authentication and Navigation Guard Module
 * Handles session state, user registration, login, logout,
 * password validation, and secure route transitions.
 */

(function () {
  const USERS_KEY = "skillproof_users";
  const SESSION_KEY = "skillproof_session";
  const LEGACY_USER_KEY = "skillproof_demo_user";
  const LEGACY_LOGGED_IN_KEY = "skillproof_demo_logged_in";

  // Pre-seeded demo account so testing login works instantly
  const DEFAULT_USERS = [
    {
      username: "naman",
      name: "Naman Rathi",
      email: "naman@skillproof.me",
      password: "password123",
      role: "student",
      createdAt: "2026-09-01",
    },
    {
      username: "demo",
      name: "Demo Student",
      email: "demo@skillproof.me",
      password: "password123",
      role: "student",
      createdAt: "2026-09-10",
    },
  ];

  function getUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULT_USERS;
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  const Auth = {
    getUsers,

    getCurrentUser() {
      try {
        const rawSession = localStorage.getItem(SESSION_KEY);
        if (rawSession) {
          return JSON.parse(rawSession);
        }
        // Fallback to legacy key if present
        if (localStorage.getItem(LEGACY_LOGGED_IN_KEY) === "true") {
          const legacyUser = localStorage.getItem(LEGACY_USER_KEY) || "naman";
          return {
            username: legacyUser,
            name: legacyUser.charAt(0).toUpperCase() + legacyUser.slice(1),
          };
        }
      } catch (e) {
        console.error("Auth: Error parsing session", e);
      }
      return null;
    },

    getUser() {
      return this.getCurrentUser();
    },

    isAuthenticated() {
      return !!this.getCurrentUser();
    },

    login(username, password, remember = true) {
      if (!username || !password) {
        return { success: false, message: "Username and password are required." };
      }

      const cleanUser = username.trim().toLowerCase();
      const users = getUsers();
      const matched = users.find(
        (u) => u.username.toLowerCase() === cleanUser
      );

      if (!matched) {
        return {
          success: false,
          message: "No account found with this username. Please sign up first.",
        };
      }

      if (matched.password && matched.password !== password) {
        return {
          success: false,
          message: "Incorrect password. Please verify and try again.",
        };
      }

      const session = {
        username: matched.username,
        name: matched.name || matched.username,
        email: matched.email || "",
        loginTime: new Date().toISOString(),
        token: "sp_tok_" + Math.random().toString(36).substring(2) + Date.now(),
      };

      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        // Keep legacy compatibility
        localStorage.setItem(LEGACY_USER_KEY, matched.username);
        localStorage.setItem(LEGACY_LOGGED_IN_KEY, "true");
      } catch (e) {
        console.error("Storage error:", e);
      }

      return { success: true, user: session };
    },

    signup(data) {
      const { username, password, confirmPassword, name } = data;

      if (!username || !password) {
        return { success: false, message: "Username and password are required." };
      }

      const cleanUser = username.trim().toLowerCase();
      if (cleanUser.length < 3) {
        return { success: false, message: "Username must be at least 3 characters long." };
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
        return {
          success: false,
          message: "Username can only contain letters, numbers, hyphens, and underscores.",
        };
      }

      if (password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters long." };
      }

      if (password !== confirmPassword) {
        return { success: false, message: "Passwords do not match." };
      }

      const users = getUsers();
      const exists = users.some(
        (u) => u.username.toLowerCase() === cleanUser
      );

      if (exists) {
        return {
          success: false,
          message: "An account with that username already exists. Try logging in.",
        };
      }

      const newUser = {
        username: cleanUser,
        name: name ? name.trim() : cleanUser,
        password: password,
        role: "student",
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      saveUsers(users);

      // New account starts with zero solved problems and zero progress
      localStorage.setItem("skillproof_solved_problems", JSON.stringify({}));
      localStorage.setItem("skillproof_problem_submissions", JSON.stringify({}));
      localStorage.setItem("skillproof_user_evidence", JSON.stringify([]));

      // Automatically sign in upon signup
      this.login(cleanUser, password);

      return { success: true, user: newUser };
    },

    logout() {
      try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LEGACY_LOGGED_IN_KEY);
      } catch (e) {
        console.error(e);
      }
      window.location.href = "login.html?loggedOut=true";
    },

    requireAuth(redirectUrl = null) {
      if (!this.isAuthenticated()) {
        const dest = redirectUrl || encodeURIComponent(window.location.pathname.split("/").pop() || "dashboard.html");
        window.location.href = `login.html?redirect=${dest}&msg=auth_required`;
        return false;
      }
      return true;
    },

    redirectIfAuthenticated(destination = "dashboard.html") {
      if (this.isAuthenticated()) {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        window.location.href = redirect ? decodeURIComponent(redirect) : destination;
        return true;
      }
      return false;
    },

    getInitials(name) {
      if (!name) return "SP";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    initNavAuth() {
      const user = this.getCurrentUser();
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
                <button type="button" class="flex items-center gap-2 py-1 px-2.5 rounded-full bg-white/5 border border-white/10 hover:border-gold/50 transition-colors" id="user-menu-btn" aria-haspopup="true">
                  <span class="w-7 h-7 rounded-full bg-gradient-to-br from-gold to-amber-600 grid place-items-center font-display font-semibold text-[11px] text-base">
                    ${initials}
                  </span>
                  <span class="text-xs text-ink font-medium max-w-[100px] truncate hidden sm:inline">
                    ${user.name || user.username}
                  </span>
                  <svg class="w-3.5 h-3.5 text-inkdim" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
                <div class="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#131a2b] shadow-2xl py-1 text-sm hidden group-hover:block hover:block z-50">
                  <div class="px-4 py-2 border-b border-white/5">
                    <p class="text-xs text-inkdim font-mono">Signed in as</p>
                    <p class="text-sm font-semibold text-white truncate">${user.name || user.username}</p>
                  </div>
                  <a href="dashboard.html" class="block px-4 py-2 text-inkdim hover:text-white hover:bg-white/5 transition-colors">Dashboard</a>
                  <a href="profile.html" class="block px-4 py-2 text-inkdim hover:text-white hover:bg-white/5 transition-colors">Your Profile</a>
                  <a href="evidence.html" class="block px-4 py-2 text-inkdim hover:text-white hover:bg-white/5 transition-colors">Evidence Log</a>
                  <div class="h-px bg-white/5 my-1"></div>
                  <button type="button" onclick="Auth.logout()" class="w-full text-left px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2">
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
              <a href="signup.html" class="text-sm font-medium bg-gold text-base px-4 py-2 rounded-full hover:bg-amber-300 transition-colors">
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
              <button onclick="Auth.logout()" class="text-xs font-semibold text-red-400 hover:text-red-300">Log out</button>
            </div>
          `;
        } else {
          slot.innerHTML = `
            <div class="h-px bg-white/5 my-2"></div>
            <a href="login.html" class="py-2.5 text-inkdim hover:text-ink">Log in</a>
            <a href="signup.html" class="mt-1 text-center font-medium bg-gold text-base px-4 py-2.5 rounded-full">Sign up</a>
          `;
        }
      });
    },
  };

  window.Auth = Auth;

  // Auto initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => Auth.initNavAuth());
  } else {
    Auth.initNavAuth();
  }
})();
