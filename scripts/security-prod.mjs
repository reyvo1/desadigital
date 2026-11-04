// scripts/security-prod.mjs
const BASE_URL = process.env.SECURITY_URL || 'http://127.0.0.1:3000';
async function main() {
  const nik = process.env.TEST_CITIZEN_NIK || '3201100000000000';
  const res = await fetch(`${BASE_URL}/api/citizen/otp/request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nik }),
  });
  const data = await res.json().catch(() => ({}));
  if (data && Object.prototype.hasOwnProperty.call(data, 'otp')) {
    console.error('[FAIL] OTP field leaked in production response');
    process.exitCode = 1;
  } else {
    console.log('[OK] OTP not leaked in production response');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });