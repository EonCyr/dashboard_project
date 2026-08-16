require('dotenv').config({ silent: true });

// Standalone 24-hour fuzz runner — not a Jest test
// Run with: node fuzz-longrun.js
// Or with a timeout: node fuzz-longrun.js 86400 (seconds)

const fc = require('fast-check');

// Inline the function under test directly so we don't need the DB/Express stack.
//
// !! KEEP IN SYNC WITH app.js !!
// This is a copy. If formatScoreField changes in app.js and this is not
// updated, the fuzzer will happily pass against code that no longer ships.
function formatScoreField(field) {
  if (!field) return 'N/A';
  if (typeof field === 'object') {
    return Object.entries(field)
      .map(([key, val]) => {
        let displayVal;
        try {
          displayVal = typeof val === 'object' && val !== null
            ? JSON.stringify(val)
            : String(val);
        } catch {
          displayVal = '[unprintable]';
        }
        return `${key.replace(/_/g, ' ')}: ${displayVal}`;
      })
      .join(', ');
  }
  return field;
}

const DURATION_MS = (parseInt(process.argv[2]) || 86400) * 1000; // default 24 hours
const START = Date.now();
const END = START + DURATION_MS;

const MAX_FINDINGS = 200;        // hard cap — see note in addFinding()
const PROGRESS_INTERVAL_MS = 5000;

let totalRuns = 0;
let totalFailures = 0;
let lastProgressAt = 0;
let finished = false;
const findings = [];

console.log(`Starting 24-hour fuzz run — target: ${new Date(END).toISOString()}`);
console.log('Press Ctrl+C to stop early. Findings will be logged.\n');

function addFinding(entry) {
  // Capped because fast-check shrinks on every discovery (dozens of re-runs,
  // each hitting the catch below) and then rediscovers the same bug in every
  // subsequent batch. Uncapped, one real bug grows this array all day.
  if (findings.length < MAX_FINDINGS) findings.push(entry);
}

function runBatch() {
  if (finished) return;

  if (Date.now() >= END) {
    printSummary('completed');
    return;
  }

  // Run 500 iterations per batch, then yield to the event loop
  // so the process stays responsive and can be interrupted cleanly
  try {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        try {
          formatScoreField(input);
          return true;
        } catch (e) {
          // fc.stringify, not JSON.stringify — the latter throws on circular
          // refs and BigInt, and that throw would escape from inside the catch.
          addFinding({ input: fc.stringify(input), error: e.message });
          return false; // signal fast-check this was a failure
        }
      }),
      {
        numRuns: 500,
        // Monotonic, so two batches finishing in the same millisecond can't
        // collide and silently re-test the identical input sequence.
        seed: START + totalRuns,
      }
    );
  } catch (e) {
    // fast-check throws when it finds a counterexample
    totalFailures++;
    addFinding({ batch: totalRuns, error: e.message });
    process.stdout.write('\n');
    console.error(`[FINDING at run ~${totalRuns}] ${e.message}\n`);
  }

  totalRuns += 500;

  reportProgress();

  // Schedule next batch — setImmediate yields to the event loop between batches
  setImmediate(runBatch);
}

function reportProgress() {
  const now = Date.now();
  if (now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
  lastProgressAt = now;

  const elapsed = Math.round((now - START) / 1000);
  const remaining = Math.max(0, Math.round((END - now) / 1000));
  const line =
    `[${elapsed}s elapsed | ${remaining}s remaining] ` +
    `Runs: ${totalRuns} | Findings: ${findings.length}`;

  // \r only on a real terminal. Redirected to a log file it would write
  // millions of fragments over 24 hours.
  if (process.stdout.isTTY) {
    process.stdout.write(`\r${line.padEnd(80)}`);
  } else {
    console.log(line);
  }
}

function printSummary(reason) {
  if (finished) return;   // guard against a second Ctrl+C re-entering
  finished = true;

  const elapsed = Math.round((Date.now() - START) / 1000);
  console.log(`\n\n=== Fuzz Run Complete ===`);
  console.log(`Reason:         ${reason}`);
  console.log(`Total runs:     ${totalRuns}`);
  console.log(`Elapsed:        ${elapsed}s`);
  console.log(`Findings:       ${findings.length}${findings.length >= MAX_FINDINGS ? ' (cap reached)' : ''}`);

  if (findings.length > 0) {
    console.log('\n--- Findings ---');
    findings.forEach((f, i) => {
      console.log(`[${i + 1}] Input: ${f.input || 'N/A'} | Error: ${f.error}`);
    });
    process.exit(1);
  }

  console.log('\nNo failures found across all generated inputs.');
  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nInterrupted by user.');
  printSummary('interrupted');
});

process.on('SIGTERM', () => printSummary('terminated'));

runBatch();
