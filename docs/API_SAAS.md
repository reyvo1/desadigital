# API SaaS — SID Desa

Endpoint tambahan untuk multi-tenant SaaS.

## Tenant Provisioning
### POST /api/tenants (super_admin)
Body: `{ "id": string, "slug": string, "name": string }`
Response: `{ status: "ok", tenant: { id, slug, name } }`

### GET /api/tenants (super_admin)
Response: `{ tenants: Tenant[] }`

## Subscription / Billing
### GET /api/subscription
Response:
```
{
  "subscription": { tenant_id, plan, status, max_users, max_storage_mb, max_requests_per_month, ... },
  "usage": { month, request_count, limit, percentage }
}
```

### PUT /api/subscription (super_admin)
Body (semua opsional): `{ plan?, status?, max_users?, max_storage_mb?, max_requests_per_month? }`
Response: `{ status: "ok", subscription, usage }`

Plan valid: `free`, `basic`, `pro`, `enterprise`.

## Notifikasi Per Tenant
### GET /api/notifications (super_admin)
Response: `{ settings: { tenant_id, email_enabled, email_recipient, whatsapp_enabled, whatsapp_recipient, notify_letter_status, notify_aspirations, ... } }`

### PUT /api/notifications (super_admin)
Body (semua opsional): `{ email_enabled?, email_recipient?, whatsapp_enabled?, whatsapp_recipient?, notify_letter_status?, notify_aspirations? }`
Response: `{ status: "ok", settings }`

## Tenant Resolution
- Subdomain: `<tenant>.app.com` / `<tenant>.localhost`.
- Query param: `?tenant=<id>`.
- Default tenant: `default`.

## Limit Enforcement
- Setiap request ke `/api` (kecuali `/api/health`) menambah counter `usage_counters` per tenant per bulan.
- Jika `request_count > max_requests_per_month`, endpoint mengembalikan HTTP 429.
- Endpoint `/api/auth/*` dikecualikan dari penegakan limit (tetap dicatat).
