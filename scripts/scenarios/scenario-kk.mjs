// scripts/scenarios/scenario-kk.mjs
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
async function j(r){try{return await r.json();}catch{return {};}}
export async function run() {
  const nik='3201100000000000';
  let r=await fetch(`${BASE}/api/citizen/otp/request`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nik})});
  const d=await j(r); const otp=d.otp;
  r=await fetch(`${BASE}/api/citizen/otp/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nik,otp})});
  const tok=(await j(r)).token;
  if(!tok) throw new Error('no citizen token');
  r=await fetch(`${BASE}/api/citizen/family-member`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok}`},body:JSON.stringify({nik:'3201'+String(Date.now()).slice(-12),name:'Skenario KK'})});
  if(!r.ok) throw new Error('family-member failed');
  console.log('SCENARIO KK: PASS');
}