import { ExplorationReport, FilledField } from '../../src/components/FormExplorer';

// same rendering as scripts/report-viewer.html, but run at test time to
// produce a standalone page attached directly to the Playwright test
// result - so opening the Playwright report is enough to see the full
// field-by-field table, no separate tool needed
function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

// a tick or cross reads at a glance; color alone (the only signal
// before) doesn't scan as fast down a long table, and doesn't show up
// at all if the colors are copied into somewhere that strips styling
function statusMark(field: FilledField): string {
  if (field.value.startsWith('<failed:')) return '<span class="mark cross">✗</span>';
  if (field.value === '') return '<span class="mark dash">–</span>';
  return '<span class="mark tick">✓</span>';
}

function fieldRows(fields: FilledField[], depth: number): string {
  let rows = '';
  for (const field of fields) {
    if (field.kind === 'unknown') {
      rows += `<tr><td></td><td colspan="3" class="revealed">${'—'.repeat(depth)} ${esc(field.label)}</td></tr>`;
      continue;
    }
    const isFailed = field.value.startsWith('<failed:');
    const isEmpty = field.value === '';
    const valueClass = isFailed ? 'value failed' : isEmpty ? 'value empty' : 'value';
    const valueText = isFailed ? stripAnsi(field.value) : isEmpty ? '(empty)' : field.value;
    rows += `<tr>
      <td class="status">${statusMark(field)}</td>
      <td>${'—'.repeat(depth)} ${esc(field.label)}${field.optional ? ' <span class="meta">(optional)</span>' : ''}</td>
      <td class="kind">${esc(field.kind)}</td>
      <td class="${valueClass}">${esc(valueText)}</td>
    </tr>`;
    if (field.revealed.length) {
      rows += fieldRows(field.revealed, depth + 1);
    }
  }
  return rows;
}

export function renderReportHtml(report: ExplorationReport): string {
  const badgeClass = report.reachedSummary ? 'ok' : 'bad';
  const badgeText = report.reachedSummary ? 'Reached summary' : 'Did not reach summary';

  let stepsHtml = '';
  for (const step of report.steps) {
    const outcomeClass = step.outcome === 'failed' ? 'outcome-failed' : step.outcome === 'recovered' ? 'outcome-recovered' : '';
    const stepMark = step.outcome === 'failed' ? '<span class="mark cross">✗</span>' : '<span class="mark tick">✓</span>';
    stepsHtml += `<tr class="step-row"><td class="status">${stepMark}</td><td colspan="3">Step ${step.stepIndex}
      <span class="${outcomeClass}">${esc(step.outcome)}</span>
      ${step.error ? `<div class="value failed" style="margin-top:4px;font-weight:normal;">${esc(stripAnsi(step.error))}</div>` : ''}
    </td></tr>`;
    stepsHtml += fieldRows(step.fields, 0);
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(report.form)} exploration</title>
<style>
  body { margin: 0; background: #17160f; color: #f1efe9; font-family: -apple-system, Segoe UI, Roboto, sans-serif; padding: 20px; }
  h1 { font-size: 1.1rem; margin: 0 0 4px; }
  .meta { color: #a9a394; font-size: 0.82rem; }
  .badge { font-size: 0.75rem; font-weight: 600; padding: 3px 9px; border-radius: 100px; margin-right: 8px; }
  .badge.ok { background: #203023; color: #6fbf94; }
  .badge.bad { background: #3a2420; color: #e0795f; }
  table { width: 100%; border-collapse: collapse; font-size: 0.86rem; margin-top: 12px; }
  th, td { text-align: left; padding: 7px 14px; vertical-align: top; border-bottom: 1px solid #3a372c; }
  th { color: #a9a394; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
  .step-row td { padding-top: 14px; font-weight: 600; color: #6fbf94; border-top: 1px solid #3a372c; }
  .kind { font-size: 0.72rem; text-transform: uppercase; color: #a9a394; }
  .value.failed { color: #e0795f; background: #3a2420; padding: 2px 6px; border-radius: 4px; white-space: pre-wrap; }
  .value.empty { color: #a9a394; font-style: italic; }
  .revealed { color: #a9a394; font-size: 0.78rem; }
  .outcome-failed { color: #e0795f; font-weight: 600; }
  .outcome-recovered { color: #b58900; font-weight: 600; }
  .status { width: 28px; text-align: center; }
  .mark { font-weight: 700; }
  .mark.tick { color: #6fbf94; }
  .mark.cross { color: #e0795f; }
  .mark.dash { color: #a9a394; }
</style></head>
<body>
  <h1>${esc(report.form)}</h1>
  <span class="badge ${badgeClass}">${badgeText}</span>
  <span class="meta">${report.summary.totalSteps} steps &middot; ${report.summary.totalFields} fields</span>
  <table>
    <thead><tr><th></th><th>Field</th><th>Kind</th><th>Value</th></tr></thead>
    <tbody>${stepsHtml}</tbody>
  </table>
</body></html>`;
}

// a single structured overview across every form explored in one run -
// a form-by-form checklist (tick or cross, how far it got, what broke)
// instead of piecing that together from a scrollback of console logs
// and a separate flat attachment per form
export function renderSummaryHtml(runs: { title: string; report: ExplorationReport }[]): string {
  let rows = '';
  for (const { title, report } of runs) {
    const mark = report.reachedSummary ? '<span class="mark tick">✓</span>' : '<span class="mark cross">✗</span>';
    const failedFields = countFailedFields(report);
    const issue = !report.reachedSummary
      ? '<span class="value failed">Did not reach Summary</span>'
      : failedFields > 0
        ? `<span class="value failed">${failedFields} field(s) failed to fill</span>`
        : '<span class="meta">None</span>';
    rows += `<tr>
      <td class="status">${mark}</td>
      <td>${esc(title)}</td>
      <td class="kind">${report.summary.totalSteps} steps</td>
      <td class="kind">${report.summary.totalFields} fields</td>
      <td>${issue}</td>
    </tr>`;
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Exploration summary</title>
<style>
  body { margin: 0; background: #17160f; color: #f1efe9; font-family: -apple-system, Segoe UI, Roboto, sans-serif; padding: 20px; }
  h1 { font-size: 1.1rem; margin: 0 0 12px; }
  .meta { color: #a9a394; font-size: 0.82rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { text-align: left; padding: 10px 14px; vertical-align: top; border-bottom: 1px solid #3a372c; }
  th { color: #a9a394; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
  .kind { color: #a9a394; white-space: nowrap; }
  .value.failed { color: #e0795f; }
  .status { width: 28px; text-align: center; }
  .mark { font-weight: 700; font-size: 1.1rem; }
  .mark.tick { color: #6fbf94; }
  .mark.cross { color: #e0795f; }
</style></head>
<body>
  <h1>Exploration summary</h1>
  <table>
    <thead><tr><th></th><th>Form</th><th>Steps</th><th>Fields</th><th>Issue</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
}

function countFailedFields(report: ExplorationReport): number {
  let count = 0;
  const walk = (fields: FilledField[]): void => {
    for (const field of fields) {
      if (field.kind !== 'unknown' && field.value.startsWith('<failed:')) count += 1;
      if (field.revealed.length) walk(field.revealed);
    }
  };
  for (const step of report.steps) walk(step.fields);
  return count;
}
