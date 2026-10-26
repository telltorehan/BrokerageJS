#!/usr/bin/env node
// prints every filled field's label, kind, and value from one or more
// exploration reports, flattened (including fields revealed by an
// earlier answer) - for manually auditing whether the engine's guessed
// data actually looks right for each field, not just the ones we
// happened to think to grep for
const fs = require('fs');
const path = require('path');

function flatten(fields, out) {
  for (const field of fields) {
    if (field.kind !== 'unknown') {
      out.push({ label: field.label, kind: field.kind, value: field.value });
    }
    if (field.revealed && field.revealed.length) {
      flatten(field.revealed, out);
    }
  }
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/audit-report.js <report.json> [more.json ...]');
  process.exit(1);
}

for (const file of files) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`\n=== ${report.form} (${path.basename(file)}) ===`);
  const rows = [];
  for (const step of report.steps) {
    flatten(step.fields, rows);
  }
  for (const row of rows) {
    console.log(`${row.kind.padEnd(8)} ${row.label.padEnd(60)} -> ${row.value}`);
  }
}
