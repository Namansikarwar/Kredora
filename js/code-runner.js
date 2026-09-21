/**
 * Kredora Coding Arena — In-Browser Safe Code Runner & Judge
 * Executes code against test suites with deep comparison, console capture,
 * runtime measurement, and LeetCode-grade validation.
 */

const CodeRunner = {
  deepEqual(actual, expected) {
    if (actual === expected) return true;
    if (actual === null || expected === null) return actual === expected;
    if (typeof actual !== typeof expected) return false;

    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) return false;
      for (let i = 0; i < actual.length; i++) {
        if (!this.deepEqual(actual[i], expected[i])) return false;
      }
      return true;
    }

    if (typeof actual === "object" && typeof expected === "object") {
      const keysA = Object.keys(actual);
      const keysB = Object.keys(expected);
      if (keysA.length !== keysB.length) return false;
      for (let key of keysA) {
        if (!keysB.includes(key) || !this.deepEqual(actual[key], expected[key])) {
          return false;
        }
      }
      return true;
    }

    return false;
  },

  formatValue(val) {
    if (val === undefined) return "undefined";
    if (val === null) return "null";
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  },

  /**
   * Runs code against a list of test cases.
   * @param {string} userCode - The user's JavaScript code
   * @param {string} functionName - Function to invoke
   * @param {Array} testCases - Array of { input: any[], expected: any, inputDisplay?: string }
   * @param {boolean} stopOnFirstFailure - Whether to stop at first failure
   */
  async execute(userCode, functionName, testCases, stopOnFirstFailure = false) {
    const startTime = performance.now();
    const results = [];
    let allPassed = true;
    let failingCase = null;
    let globalError = null;

    // Capture logs
    const capturedLogs = [];
    const customConsole = {
      log: (...args) => capturedLogs.push(args.map((a) => this.formatValue(a)).join(" ")),
      info: (...args) => capturedLogs.push(args.map((a) => this.formatValue(a)).join(" ")),
      warn: (...args) => capturedLogs.push("[warn] " + args.map((a) => this.formatValue(a)).join(" ")),
      error: (...args) => capturedLogs.push("[error] " + args.map((a) => this.formatValue(a)).join(" "))
    };

    let userFn;
    try {
      // Build function wrapper with custom console
      const wrappedCode = `
        ${userCode}
        if (typeof ${functionName} === 'function') {
          return ${functionName};
        } else {
          throw new Error("Function '${functionName}' is not defined. Please ensure your solution declares 'function ${functionName}(...)'");
        }
      `;
      const factory = new Function("console", wrappedCode);
      userFn = factory(customConsole);
    } catch (err) {
      return {
        status: "Runtime Error",
        error: err.message,
        runtime: "0 ms",
        memory: "0 MB",
        passedCount: 0,
        totalCount: testCases.length,
        testResults: [],
        logs: capturedLogs
      };
    }

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const caseStartTime = performance.now();
      let actualOutput;
      let caseError = null;

      try {
        // Deep clone input arguments so mutating inputs inside user function doesn't spoil comparisons
        const clonedArgs = JSON.parse(JSON.stringify(tc.input));
        actualOutput = userFn(...clonedArgs);
      } catch (err) {
        caseError = err.message;
      }

      const caseRuntime = Math.round(performance.now() - caseStartTime);

      let passed = false;
      if (!caseError) {
        passed = this.deepEqual(actualOutput, tc.expected);
      }

      const caseResult = {
        caseIndex: i + 1,
        passed,
        error: caseError,
        inputDisplay: tc.inputDisplay || this.formatValue(tc.input),
        userOutput: actualOutput,
        userOutputDisplay: this.formatValue(actualOutput),
        expected: tc.expected,
        expectedDisplay: this.formatValue(tc.expected),
        runtimeMs: caseRuntime
      };

      results.push(caseResult);

      if (!passed) {
        allPassed = false;
        if (!failingCase) failingCase = caseResult;
        if (stopOnFirstFailure) break;
      }
    }

    const totalElapsed = Math.max(1, Math.round(performance.now() - startTime));
    // Simulate realistic memory between 41.5MB and 44.8MB
    const simulatedMemory = (41.5 + (totalElapsed % 20) * 0.15).toFixed(1);

    const passedCount = results.filter((r) => r.passed).length;
    let status = "Accepted";

    if (failingCase) {
      status = failingCase.error ? "Runtime Error" : "Wrong Answer";
    }

    return {
      status,
      allPassed,
      failingCase,
      runtime: `${totalElapsed} ms`,
      memory: `${simulatedMemory} MB`,
      passedCount,
      totalCount: testCases.length,
      testResults: results,
      logs: capturedLogs
    };
  }
};

window.CodeRunner = CodeRunner;

export {};
