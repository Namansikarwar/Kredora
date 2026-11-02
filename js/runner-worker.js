/**
 * Kredora Coding Arena — user-code execution worker.
 *
 * Runs the user's JavaScript off the main thread so a runaway loop can
 * never freeze the tab. code-runner.js creates one worker per run, posts
 * the job here, and terminates this worker if no result arrives within
 * 3 seconds.
 *
 * Everything the old synchronous execute() did inside the page now runs
 * here — the function factory, console capture, per-case invocation with
 * deep-cloned inputs, and deep-equal judging — and the finished per-case
 * results are posted back with the exact same fields. Only plain,
 * clone-safe data crosses the boundary (display strings, flags, logs);
 * raw output values are sent only when structured clone accepts them,
 * because one non-cloneable return (a function, say) would otherwise
 * abort the whole postMessage.
 */

// Deep comparison — moved verbatim from code-runner.js so the verdict is
// computed here, on the raw values, before anything crosses the boundary.
const deepEqual = (actual, expected) => {
  if (actual === expected) return true;
  if (actual === null || expected === null) return actual === expected;
  if (typeof actual !== typeof expected) return false;

  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      if (!deepEqual(actual[i], expected[i])) return false;
    }
    return true;
  }

  if (typeof actual === "object" && typeof expected === "object") {
    const keysA = Object.keys(actual);
    const keysB = Object.keys(expected);
    if (keysA.length !== keysB.length) return false;
    for (let key of keysA) {
      if (!keysB.includes(key) || !deepEqual(actual[key], expected[key])) {
        return false;
      }
    }
    return true;
  }

  return false;
};

const formatValue = (val) => {
  if (val === undefined) return "undefined";
  if (val === null) return "null";
  try {
    return JSON.stringify(val);
  } catch (e) {
    return String(val);
  }
};

// Cap on live-streamed log lines. The complete log always travels with
// the final result; this stream exists only so output printed before an
// infinite loop survives the timeout — and it stays bounded so a
// log-spamming loop can't flood the main thread.
const MAX_LIVE_LOGS = 500;

/** Send a value only if structured clone accepts it, else undefined. */
function cloneIfPossible(value) {
  try {
    structuredClone(value);
    return value;
  } catch (err) {
    return undefined;
  }
}

function runJob({ userCode, functionName, testCases, stopOnFirstFailure }) {
  const startTime = performance.now();
  const capturedLogs = [];
  let liveLogCount = 0;

  // Console capture — same formatting as the old synchronous runner.
  const emitLog = (line) => {
    capturedLogs.push(line);
    if (liveLogCount < MAX_LIVE_LOGS) {
      liveLogCount++;
      self.postMessage({ type: "log", line });
    }
  };
  const customConsole = {
    log: (...args) => emitLog(args.map((a) => formatValue(a)).join(" ")),
    info: (...args) => emitLog(args.map((a) => formatValue(a)).join(" ")),
    warn: (...args) => emitLog("[warn] " + args.map((a) => formatValue(a)).join(" ")),
    error: (...args) => emitLog("[error] " + args.map((a) => formatValue(a)).join(" ")),
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
    self.postMessage({ type: "done", kind: "factoryError", error: err.message, logs: capturedLogs });
    return;
  }

  const results = [];

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
      passed = deepEqual(actualOutput, tc.expected);
    }

    results.push({
      caseIndex: i + 1,
      passed,
      error: caseError,
      inputDisplay: tc.inputDisplay || formatValue(tc.input),
      userOutput: cloneIfPossible(actualOutput),
      userOutputDisplay: formatValue(actualOutput),
      expected: tc.expected,
      expectedDisplay: formatValue(tc.expected),
      runtimeMs: caseRuntime,
    });

    if (!passed && stopOnFirstFailure) break;
  }

  self.postMessage({
    type: "done",
    kind: "run",
    results,
    runtimeMs: Math.max(1, Math.round(performance.now() - startTime)),
    logs: capturedLogs,
  });
}

self.onmessage = (event) => {
  try {
    runJob(event.data || {});
  } catch (err) {
    // Never leave the main thread waiting: any unexpected failure still
    // comes back as a factory-style error result.
    self.postMessage({
      type: "done",
      kind: "factoryError",
      error: (err && err.message) || String(err),
      logs: [],
    });
  }
};
