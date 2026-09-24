# Kredora — Developer Proof Platform

> **Stop showing percentages. Show verified proof, executable test runs, and timestamped code evidence.**

Kredora is a next-generation developer verification and skill-proving platform designed to replace vague resumes and superficial scorecards with verifiable cryptographic and execution-backed proof.

---

## 🌟 Key Specialities & Features

### 1. ⚡ Real Code Arena & In-Browser IDE
* **LeetCode-Style Practice**: Solve algorithmic and systems-level coding problems directly in the browser.
* **Multi-Language Support**: Write and test solutions in **JavaScript**, **Python**, and **Java**.
* **Verified Unit Testing**: Instant feedback via automated test runners checking sample and hidden test cases for time complexity and functional correctness.
* **Starter Skeletons vs. Solutions**: Clean starter code skeletons ensuring authentic problem-solving without pre-solved code leaks.

### 2. 🛡️ Timestamped Evidence Ledger
* Every solved problem, passed test case, and verified commit is logged as an immutable, timestamped record.
* Tracks problem category, difficulty (Easy, Medium, Hard), execution time, language used, and code payload.

### 3. 📊 Skill Mastery & Confidence Score
* Dynamic competency calculation across the tracked skills defined in `js/skills.js` (the single source of truth): Java, JavaScript, SQL, and MongoDB.
* Generates a holistic **Confidence Score** and readiness badge based on verified execution data rather than self-reported claims.

### 4. 🌐 Shareable Public Developer Profiles
* Showcase your verified skill ledger with a dedicated public profile (`profile.html`).
* Easily shareable links with cryptographic proof badges and solved problem breakdowns to impress engineering hiring managers.

### 5. ✨ Classy, Premium Glassmorphic UI & Floating Pill Navigation
* **High-Blur Oval Navigation**: A floating frosted-glass navigation bar featuring 44px backdrop blur, subtle crimson rim glows, and responsive positioning.
* **Refined Micro-Interactions**: Smooth card elevations (`.lift-on-hover`), luminous button highlights, and a sophisticated warm-neutral dark palette (`#080c16`, `#0a0f1c`).

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, Tailwind CSS, Modern JavaScript (ES6+), Lucide Icons.
* **Backend & Persistence**: Node.js, Express, Cloud PostgreSQL / Supabase integration for reliable data synchronization.
* **Development & Build**: Vite, Esbuild, TypeScript.

---

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/kredora.git
   cd kredora
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📄 License

Built for high-performance developer verification. All rights reserved.
