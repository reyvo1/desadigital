// scripts/scenarios/scenario-notif.mjs
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
async function j(r){try{return await r.json();}catch{return {};}}
export async function run() {
  let r=await fetch(`${BASE}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'desa2026'})});
  const tok=(await j(r)).token;
  if(!tok) throw new Error('no admin token');
  r=await fetch(`${BASE}/api/notifications/outbox`,{headers:{Authorization:`Bearer ${tok}`}});
  const d=await j(r);
  if(!r.ok || !Array.isArray(d.items)) throw new Error('outbox failed');
  console.log('SCENARIO NOTIF: PASS');
}