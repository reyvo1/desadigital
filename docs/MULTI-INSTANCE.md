# Multi-Instance Model

- Default: jalankan satu instance (max-instances=1) karena state in-memory (cachedDbMemory) dan rate limit in-memory.
- Jika multi-instance diperlukan, gunakan pembacaan dari PostgreSQL dengan invalidasi versi (If-Match / version check) dan rate limit persisten di PG.
- Set `MAX_INSTANCES=1` di environment produksi.
