// src/utils/citizenApi.ts
export async function payBill(billId: string, token: string) {
  const res = await fetch('/api/citizen/pay-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ billId }),
  });
  let data: any = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

export async function addFamilyMember(payload: any, token: string) {
  const res = await fetch('/api/citizen/family-member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  let data: any = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

export async function getBills(token: string) {
  const res = await fetch('/api/citizen/bills', {
    headers: { Authorization: `Bearer ${token}` },
  });
  let data: any = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}