// src/utils/saasApi.ts
export async function getBilling(token: string) {
  const res = await fetch('/api/saas/billing', {
    headers: { Authorization: `Bearer ${token}` },
  });
  let data: any = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}