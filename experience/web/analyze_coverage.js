/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const lcovPath = path.join(process.cwd(), "coverage", "lcov.info");

if (!fs.existsSync(lcovPath)) {
  console.error("lcov.info not found at", lcovPath);
  process.exit(1);
}

const content = fs.readFileSync(lcovPath, "utf8");
const records = content.split("end_of_record");

const results = [];

records.forEach((record) => {
  const lines = record.split("\n");
  const sfLine = lines.find((line) => line.startsWith("SF:"));
  if (!sfLine) return;
  const filePath = sfLine.substring(3);

  // Count instrumented lines and hits
  let instrumented = 0;
  let hits = 0;

  lines.forEach((line) => {
    if (line.startsWith("DA:")) {
      const parts = line.substring(3).split(",");
      const count = parseInt(parts[1], 10);
      instrumented++;
      if (count > 0) hits++;
    }
  });

  if (instrumented > 0) {
    const coverage = (hits / instrumented) * 100;
    if (coverage < 100) {
      results.push({
        file: filePath,
        coverage: coverage.toFixed(2),
        missing: instrumented - hits,
        total: instrumented,
      });
    }
  }
});

results.sort((a, b) => a.coverage - b.coverage);

console.log("Files with < 100% Line Coverage:");
results.forEach((res) => {
  console.log(`${res.coverage}% (${res.missing}/${res.total} lines missing) - ${res.file}`);
});
