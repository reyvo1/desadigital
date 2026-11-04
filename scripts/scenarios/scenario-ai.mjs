// scripts/scenarios/scenario-ai.mjs
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
async function j(r){try{return await r.json();}catch{return {};}}
export async function run() {
  const r=await fetch(`${BASE}/api/ai/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'Halo'})});
  const d=await j(r);
  if(!(r.status===200||r.status===429)) throw new Error('ai chat failed');
  console.log('SCENARIO AI: PASS');
}