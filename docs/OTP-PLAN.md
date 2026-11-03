# Rencana OTP Portal Warga (singkat)

1. Endpoint `/api/citizen/otp/request` menerima NIK, mengirim OTP 6 digit ke WhatsApp/Telegram terdaftar (rate limit per NIK & IP).
2. Endpoint `/api/citizen/otp/verify` memverifikasi OTP (TTL 5 menit, single-use), menerbitkan sesi warga singkat.
3. Hapus skema PIN lama; `passwordHash` warga tidak lagi digunakan.
4. Re-enable Portal Warga setelah OTP teruji; hapus `false &&` di Navbar/ServicesView.
