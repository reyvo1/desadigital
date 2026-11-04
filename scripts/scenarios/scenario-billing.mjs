// scripts/scenarios/scenario-billing.mjs
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
async function j(r){try{return await r.json();}catch{return {};}}
export async function run() {
  let r=await fetch(`${BASE}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'desa2026'})});
  const tok=(await j(r)).token;
  if(!tok) throw new Error('no admin token');
  r=await fetch(`${BASE}/api/saas/billing`,{headers:{Authorization:`Bearer ${tok}`}});
  const d=await j(r);
  if(!r.ok || !Array.isArray(d.plans) || d.plans.length===0) throw new Error('billing overview failed');
  r=await fetch(`${BASE}/api/saas/invoices/inv-2026-004/pay`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok}`},body:JSON.stringify({sp2dNumber:'SP2D-S2',paymentChannel:'UAT',verifiedBy:'UAT'})});
  if(!r.ok) throw new Error('invoice pay failed');
  console.log('SCENARIO BILLING: PASS');
}