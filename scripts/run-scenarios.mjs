import { run as runKk } from './scenarios/scenario-kk.mjs';
import { run as runBilling } from './scenarios/scenario-billing.mjs';
import { run as runAi } from './scenarios/scenario-ai.mjs';
import { run as runNotif } from './scenarios/scenario-notif.mjs';

const scenarios = [
  { name: 'KK Digital', fn: runKk },
  { name: 'Billing SaaS', fn: runBilling },
  { name: 'AI Chat', fn: runAi },
  { name: 'Notifikasi Outbox', fn: runNotif },
];

let failures = 0;
for (const s of scenarios) {
  try { await s.fn(); }
  catch (e) { failures++; console.error(`SCENARIO ${s.name}: FAIL - ${e.message}`); }
}
console.log(`\nPhase 2 scenarios done. Failures: ${failures}`);
process.exit(failures > 0 ? 1 : 0);