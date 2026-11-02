/**
 * Kredora Coding Arena — In-Browser Safe Code Runner & Judge
 * Executes code against test suites with deep comparison, console capture,
 * runtime measurement, and LeetCode-grade validation.
 *
 * User code never runs on the main thread: each execute() call spawns a
 * dedicated Web Worker (js/runner-worker.js, resolved through Vite's
 * new URL(..., import.meta.url) worker pipeline), which builds the
 * function factory, captures console output, invokes the solution per
 * test case and judges results with deep comparison. This module only
 * transports the job, enforces a 3-second timeout (terminating an
 * unresponsive worker — e.g. an infinite loop — instead of freezing the
 * tab), and wraps the worker's reply in the same result shape the
 * synchronous runner produced, so callers need no changes.
 *
 * EVIDENCE STATES: everything this module produces is a LOCAL execution
 * against bundled sample tests in the browser. It is a development aid and
 * can NEVER produce VERIFIED evidence — only the run-submission Edge
 * Function (Judge0 + server-side hidden tests) may mint VERIFIED results.
 */

const EvidenceStates = {
  LOCAL: "LOCAL",           // browser-executed against samples; never evidence
  SUBMITTED: "SUBMITTED",   // sent to the server, awaiting/neutral outcome
  VERIFIED: "VERIFIED",     // server-graded pass on authoritative hidden tests
  FAILED: "FAILED",         // server-graded non-pass
};

// Wall-clock budget for one worker run. On expiry the worker is
// terminated outright — a busy loop inside it can't be interrupted any
// other way — and the caller gets the usual error-shaped result.
const WORKER_TIMEOUT_MS = 3000;

const CodeRunner = {
  /**
   * Runs code against a list of test cases.
   * @param {string} userCode - The user's JavaScript code
   * @param {string} functionName - Function to invoke
   * @param {Array} testCases - Array of { input: any[], expected: any, inputDisplay?: string }
   * @param {boolean} stopOnFirstFailure - Whether to stop at first failure
   * @returns {Promise<Object>} result in the same shape the synchronous
   *   runner returned (state/origin/statusLabel/status/allPassed/
   *   failingCase/runtime/memory/passedCount/totalCount/testResults/logs)
   */
  async execute(userCode, functionName, testCases, stopOnFirstFailure = false) {
    const startTime = performance.now();
    // Log lines streamed live by the worker while it runs. Only needed
    // if the worker is killed by the timeout — a completed run carries
    // its own complete log array in the "done" message.
    const streamedLogs = [];

    let worker;
    try {
      worker = new Worker(new URL("./runner-worker.js", import.meta.url), {
        type: "module",
      });
    } catch (err) {
      return this._errorResult(err.message, testCases, [], "0 ms");
    }

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId = null;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) clearTimeout(timeoutId);
        worker.terminate();
        resolve(result);
      };

      timeoutId = setTimeout(() => {
        finish(
          this._errorResult(
            `Execution timed out after ${WORKER_TIMEOUT_MS / 1000} seconds (possible infinite loop)`,
            testCases,
            streamedLogs.slice(),
            `${WORKER_TIMEOUT_MS} ms`
          )
        );
      }, WORKER_TIMEOUT_MS);

      worker.onmessage = (event) => {
        const msg = event.data;
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "log") {
          // Live console line — kept only in case the timeout kills the
          // worker before it can send its complete log.
          streamedLogs.push(msg.line);
          return;
        }

        if (msg.type !== "done") return;

        if (msg.kind === "factoryError") {
          // Could not build/invoke the user's function (syntax error,
          // missing function, throw during evaluation).
          finish(
            this._errorResult(msg.error, testCases, msg.logs || [], "0 ms")
          );
          return;
        }

        // Normal run — same verdict logic the synchronous runner used,
        // now derived from the per-case results the worker judged.
        const results = Array.isArray(msg.results) ? msg.results : [];
        const passedCount = results.filter((r) => r.passed).length;
        const failingCase = results.find((r) => !r.passed) || null;
        const status = failingCase
          ? failingCase.error
            ? "Runtime Error"
            : "Wrong Answer"
          : "Accepted";
        const totalElapsed =
          typeof msg.runtimeMs === "number"
            ? msg.runtimeMs
            : Math.max(1, Math.round(performance.now() - startTime));

        finish({
          state: EvidenceStates.LOCAL,
          origin: "LOCAL",
          statusLabel: "LOCAL RUN — not verified evidence",
          status,
          allPassed: !failingCase,
          failingCase,
          runtime: `${totalElapsed} ms`,
          memory: "n/a (local run)",
          passedCount,
          totalCount: testCases.length,
          testResults: results,
          logs: Array.isArray(msg.logs) ? msg.logs : [],
        });
      };

      worker.onerror = (event) => {
        // Worker script failed to load, or an error escaped runJob's
        // try/catch. preventDefault keeps the browser from also logging
        // a redundant uncaught-error report for a handled failure.
        if (typeof event.preventDefault === "function") event.preventDefault();
        finish(
          this._errorResult(
            event.message || "Code runner worker failed to start",
            testCases,
            streamedLogs.slice(),
            "0 ms"
          )
        );
      };

      worker.postMessage({ userCode, functionName, testCases, stopOnFirstFailure });
    });
  },

  /**
   * The error-shaped result the UI already knows how to render: no test
   * results, zero passes, and an explanatory `error` string. Used for
   * factory errors, worker startup failures and timeouts alike.
   */
  _errorResult(error, testCases, logs, runtime) {
    return {
      state: EvidenceStates.LOCAL,
      origin: "LOCAL",
      statusLabel: "LOCAL RUN — not verified evidence",
      status: "Runtime Error",
      error,
      runtime,
      memory: "n/a (local run)",
      passedCount: 0,
      totalCount: testCases.length,
      testResults: [],
      logs,
    };
  },
};

window.CodeRunner = CodeRunner;
window.EvidenceStates = EvidenceStates;

export {};
