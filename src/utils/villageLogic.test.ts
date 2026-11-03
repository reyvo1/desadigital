import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNikFormat,
  maskSensitiveNumber,
  generateTrackingCode,
  generateOfficialLetterNumber,
  generateQrMatrix,
  evaluateVerificationChecklist,
  formatWhatsAppNotification,
  computeDemographicSummary,
  computeDocumentAnalytics,
  buildCsvContent,
  buildMonthCalendarGrid,
  detectAgendaConflicts,
  generateWhatsAppEventInvite,
  renderDynamicLetterBody,
  evaluateTelegramBotCommand,
  computeOmnichannelAnalytics,
  groupCitizensByKk,
  parseCitizensCsv,
  parseApbdesCsv,
  buildMonthlyReportCsv,
  computePosyanduStuntingMetrics,
  lookupCitizenOneStopPortal,
} from './villageLogic';
import { ApbdesItem, ChatMessage, Citizen, LetterRequest, VillageAgenda } from '../types/village';

describe('villageLogic pure business rules', () => {
  it('validates 16-digit Indonesian NIK accurately', () => {
    const valid = validateNikFormat('3201141205850001');
    assert.equal(valid.isValid, true);
    assert.equal(valid.cleanNik, '3201141205850001');

    const shortNik = validateNikFormat('32011412');
    assert.equal(shortNik.isValid, false);
    assert.match(shortNik.errorMessage || '', /16 digit/);

    const nonNumeric = validateNikFormat('320114120585ABCD');
    assert.equal(nonNumeric.isValid, false);
  });

  it('masks sensitive NIK numbers unless full display is requested', () => {
    assert.equal(maskSensitiveNumber('3201141205850001', false), '320114******0001');
    assert.equal(maskSensitiveNumber('3201141205850001', true), '3201141205850001');
  });

  it('generates tracking and official registration numbers with custom village code and classification override', () => {
    assert.equal(generateTrackingCode('SKU', 7, 2026), 'SRT-2026-SKU-007');
    assert.equal(generateOfficialLetterNumber('DOMISILI', 18, 2, 2026, 'DS-MJM'), '470 / 018 / DS-MJM / III / 2026');
    assert.equal(generateOfficialLetterNumber('TANAH_SPORADIK', 5, 0, 2026, 'DS-SKM'), '593 / 005 / DS-SKM / I / 2026');
    assert.equal(generateOfficialLetterNumber('CUSTOM_SURAT', 12, 3, 2026, 'DS-SKM', '412.2'), '412.2 / 012 / DS-SKM / IV / 2026');
  });

  it('renders mail-merge dynamic letter body with customFieldValues and template placeholders', () => {
    const req: LetterRequest = {
      id: 'req-1',
      trackingCode: 'SRT-2026-SKU-009',
      nik: '3201141001800001',
      citizenName: 'Hendra Wijaya',
      kk: '3201140501100001',
      dusun: 'Dusun 1 Sukasari',
      rt: '002',
      rw: '001',
      whatsapp: '081233334444',
      letterType: 'SKU',
      letterTitle: 'Surat Keterangan Usaha (SKU)',
      purpose: 'Pengajuan Modal KUR Bank BRI',
      attachmentName: 'ktp.pdf',
      status: 'Selesai',
      createdAt: '2026-03-15 09:00',
      updatedAt: '2026-03-15 09:10',
      processingHours: 0.2,
      whatsappNotifiedCount: 1,
      customFieldValues: {
        nama_usaha: 'Kopi Lereng Gunung',
        bidang_usaha: 'Pengolahan Kopi Robusta',
      },
      checklist: {
        nikMatchDukcapil: true,
        kkMatchDukcapil: true,
        ktpAttachmentClear: true,
        pengantarRtRwValid: true,
        noTaxArrearsPbb: true,
      },
    };

    const rendered = renderDynamicLetterBody(
      req,
      undefined,
      {
        villageName: 'Desa Sukamaju',
        villageCode: '32.01.14.2005',
        subDistrict: 'Kecamatan Megamendung',
        district: 'Kabupaten Bogor',
        province: 'Jawa Barat',
        headOfVillageName: 'H. Rahmat Hidayat, S.AP',
        headOfVillageTitle: 'Kepala Desa',
      } as any,
      {
        code: 'SKU',
        name: 'Surat Keterangan Usaha (SKU)',
        shortDesc: 'SKU UMKM',
        estimatedHours: 2,
        requirements: ['KTP'],
        bodyTemplate: 'Bahwa warga {{nama}} benar memiliki usaha di {{nama_desa}} dengan rincian: {{keterangan_khusus}} untuk keperluan {{keperluan}}.',
      }
    );

    assert.match(rendered.statementParagraph, /Hendra Wijaya/);
    assert.match(rendered.statementParagraph, /Desa Sukamaju/);
    assert.match(rendered.statementParagraph, /Kopi Lereng Gunung/);
    assert.match(rendered.statementParagraph, /Pengajuan Modal KUR Bank BRI/);
    assert.equal(rendered.structuredCustomFields.length, 2);
  });

  it('generates a valid 21x21 deterministic QR code matrix with finder patterns', () => {
    const matrix1 = generateQrMatrix('QR-TTE-DESA-001');
    const matrix2 = generateQrMatrix('QR-TTE-DESA-001');
    const matrix3 = generateQrMatrix('QR-TTE-DESA-002');
    assert.equal(matrix1.length, 21);
    assert.equal(matrix1[0].length, 21);
    // Top-left finder corner and center must be dark (true)
    assert.equal(matrix1[0][0], true);
    assert.equal(matrix1[3][3], true);
    // Deterministic for identical input, different for distinct input
    assert.deepEqual(matrix1, matrix2);
    assert.notDeepEqual(matrix1, matrix3);
  });

  it('evaluates verification checklist score and readiness for signature', () => {
    const ready = evaluateVerificationChecklist({
      nikMatchDukcapil: true,
      kkMatchDukcapil: true,
      ktpAttachmentClear: true,
      pengantarRtRwValid: true,
      noTaxArrearsPbb: false,
    });
    assert.equal(ready.scorePercent, 80);
    assert.equal(ready.isReadyForSignature, true);

    const incomplete = evaluateVerificationChecklist({
      nikMatchDukcapil: true,
      kkMatchDukcapil: false,
      ktpAttachmentClear: true,
      pengantarRtRwValid: true,
      noTaxArrearsPbb: true,
    });
    assert.equal(incomplete.isReadyForSignature, false);
  });

  it('formats WhatsApp notification messages for completed letters with dynamic villageName', () => {
    const message = formatWhatsAppNotification(
      {
        trackingCode: 'SRT-2026-SKU-001',
        citizenName: 'Ahmad Subarjo',
        letterTitle: 'Surat Keterangan Usaha (SKU)',
        status: 'Selesai',
        registrationNumber: '510 / 001 / DS / III / 2026',
        adminNotes: 'Siap diunduh.',
      },
      'Desa Makmur Jaya'
    );
    assert.match(message, /Ahmad Subarjo/);
    assert.match(message, /SRT-2026-SKU-001/);
    assert.match(message, /SELESAI/);
    assert.match(message, /DESA MAKMUR JAYA/);
  });

  it('computes demographic summary accurately from citizen list', () => {
    const sampleCitizens: Citizen[] = [
      {
        id: '1',
        nik: '3201141001800001',
        kk: '3201140501100001',
        name: 'Budi Santoso',
        gender: 'Laki-laki',
        birthPlace: 'Bogor',
        birthDate: '1980-01-10',
        age: 46,
        maritalStatus: 'Kawin',
        religion: 'Islam',
        education: 'Sarjana (S1)',
        occupation: 'Petani / Pekebun',
        dusun: 'Dusun 1 Sukasari',
        rt: '001',
        rw: '001',
        address: 'Jl. Melati No. 1',
        phone: '081211112222',
        aidStatus: 'Non-Penerima',
        verifiedDukcapil: true,
        bloodType: 'O',
        lastUpdated: '2026-03-01',
      },
      {
        id: '2',
        nik: '3201145506850002',
        kk: '3201140501100001',
        name: 'Siti Aminah',
        gender: 'Perempuan',
        birthPlace: 'Bogor',
        birthDate: '1985-06-15',
        age: 40,
        maritalStatus: 'Kawin',
        religion: 'Islam',
        education: 'SMA/Sederajat',
        occupation: 'Pedagang / UMKM',
        dusun: 'Dusun 1 Sukasari',
        rt: '001',
        rw: '001',
        address: 'Jl. Melati No. 1',
        phone: '081211112223',
        aidStatus: 'BLT Dana Desa',
        verifiedDukcapil: true,
        bloodType: 'A',
        lastUpdated: '2026-03-01',
      },
    ];

    const summary = computeDemographicSummary(sampleCitizens);
    assert.equal(summary.totalPopulation, 2);
    assert.equal(summary.totalFamilies, 1);
    assert.equal(summary.maleCount, 1);
    assert.equal(summary.femaleCount, 1);
    assert.equal(summary.verifiedPercentage, 100);
    assert.equal(summary.aidRecipientsCount, 1);
  });

  it('computes document processing metrics and builds valid CSV output', () => {
    const requests: LetterRequest[] = [
      {
        id: 'r1',
        trackingCode: 'SRT-2026-SKU-001',
        nik: '3201141001800001',
        citizenName: 'Budi Santoso',
        kk: '3201140501100001',
        dusun: 'Dusun 1 Sukasari',
        rt: '001',
        rw: '001',
        whatsapp: '081211112222',
        letterType: 'SKU',
        letterTitle: 'Surat Keterangan Usaha',
        purpose: 'Pengajuan KUR Mikro',
        attachmentName: 'ktp_budi.pdf',
        status: 'Selesai',
        createdAt: '2026-03-10 08:00',
        updatedAt: '2026-03-10 10:00',
        processingHours: 2.0,
        whatsappNotifiedCount: 2,
        checklist: {
          nikMatchDukcapil: true,
          kkMatchDukcapil: true,
          ktpAttachmentClear: true,
          pengantarRtRwValid: true,
          noTaxArrearsPbb: true,
        },
      },
    ];

    const metrics = computeDocumentAnalytics(requests);
    assert.equal(metrics.totalRequests, 1);
    assert.equal(metrics.completedCount, 1);
    assert.equal(metrics.completionRatePercent, 100);
    assert.equal(metrics.averageProcessingHours, 2);

    const csv = buildCsvContent(['NIK', 'Nama'], [['3201141001800001', 'Budi, S.Pd']]);
    assert.match(csv, /"Budi, S\.Pd"/);
  });

  it('builds a 42-cell month calendar grid and detects overlapping agenda conflicts', () => {
    const sampleAgendas: VillageAgenda[] = [
      {
        id: 'ag1',
        title: 'Musrenbangdes RKPDes',
        category: 'Musyawarah Desa',
        date: '2026-03-18',
        startTime: '09:00',
        endTime: '12:00',
        location: 'Aula Balai Desa',
        dusun: 'Seluruh Desa',
        coordinator: 'H. Rahmat Hidayat',
        coordinatorPhone: '081210001111',
        participantsTarget: 'Perangkat & BPD',
        expectedCount: 50,
        description: 'Pembahasan RKPDes.',
        status: 'Terjadwal',
        isRoutine: false,
        whatsappBroadcastSent: true,
      },
    ];

    const grid = buildMonthCalendarGrid(2026, 2, sampleAgendas, '2026-03-18');
    assert.equal(grid.length, 42);
    const targetCell = grid.find((c) => c.dateStr === '2026-03-18');
    assert.ok(targetCell);
    assert.equal(targetCell.isToday, true);
    assert.equal(targetCell.agendas.length, 1);

    const conflicts = detectAgendaConflicts(
      {
        date: '2026-03-18',
        startTime: '10:30',
        endTime: '13:00',
        location: 'Aula Balai Desa',
      },
      sampleAgendas
    );
    assert.equal(conflicts.length, 1);

    const noConflictDifferentRoom = detectAgendaConflicts(
      {
        date: '2026-03-18',
        startTime: '10:30',
        endTime: '13:00',
        location: 'Posyandu Melati',
      },
      sampleAgendas
    );
    assert.equal(noConflictDifferentRoom.length, 0);

    const invite = generateWhatsAppEventInvite(sampleAgendas[0], 'Desa Makmur Jaya');
    assert.match(invite, /Musrenbangdes RKPDes/);
    assert.match(invite, /Aula Balai Desa/);
    assert.match(invite, /DESA MAKMUR JAYA/);
  });

  it('evaluates Telegram Bot commands (/start, /status, /layanan) and ignores normal messages', () => {
    const sampleReqs: LetterRequest[] = [
      {
        id: 'req-tg-1',
        trackingCode: 'SRT-2026-SKU-001',
        registrationNumber: '510 / 001 / 32.01.14.2005 / III / 2026',
        nik: '3201145808860002',
        citizenName: 'Siti Nurhaliza',
        kk: '3201140401100011',
        dusun: 'Dusun 1 Sukasari',
        rt: '001',
        rw: '001',
        whatsapp: '081287654322',
        letterType: 'SKU',
        letterTitle: 'Surat Keterangan Usaha (SKU)',
        purpose: 'Modal KUR',
        attachmentName: 'ktp.pdf',
        status: 'Selesai',
        createdAt: '2026-03-15 08:30',
        updatedAt: '2026-03-15 10:15',
        processingHours: 1.7,
        whatsappNotifiedCount: 1,
        checklist: {
          nikMatchDukcapil: true,
          kkMatchDukcapil: true,
          ktpAttachmentClear: true,
          pengantarRtRwValid: true,
          noTaxArrearsPbb: true,
        },
      },
    ];

    const cfg = {
      villageName: 'Desa Sukamaju',
      subDistrict: 'Kecamatan Megamendung',
      district: 'Kabupaten Bogor',
      officialWhatsApp: '6281210002026',
      serviceHoursWeekdays: 'Senin - Jumat: 08.00 - 16.00 WIB',
    };

    const startReply = evaluateTelegramBotCommand('/start', sampleReqs, cfg);
    assert.ok(startReply);
    assert.match(startReply, /Selamat datang di Layanan Bot Resmi Pemerintah Desa Sukamaju/);
    assert.match(startReply, /\/status/);

    const statusReply = evaluateTelegramBotCommand('/status SRT-2026-SKU-001', sampleReqs, cfg);
    assert.ok(statusReply);
    assert.match(statusReply, /Siti Nurhaliza/);
    assert.match(statusReply, /Selesai/);
    assert.match(statusReply, /510 \/ 001/);

    const notFoundReply = evaluateTelegramBotCommand('/status SRT-9999-UNKNOWN', sampleReqs, cfg);
    assert.ok(notFoundReply);
    assert.match(notFoundReply, /tidak ditemukan/);

    const normalMsg = evaluateTelegramBotCommand('Halo Admin Desa, apakah kantor buka?', sampleReqs, cfg);
    assert.equal(normalMsg, null);
  });

  it('computes omnichannel analytics for Telegram AI, WhatsApp, Web, letters, and APBDes charts', () => {
    const sampleChats: ChatMessage[] = [
      {
        id: 'c1',
        sessionId: 'tg-619283745',
        senderName: 'Siti Aminah',
        senderPhone: '@siti_berkahtani',
        senderRole: 'citizen',
        channel: 'telegram',
        message: 'Apa syarat pembuatan SKTM?',
        timestamp: '2026-03-16 09:00',
        isRead: true,
        telegramChatId: '619283745',
      },
      {
        id: 'c2',
        sessionId: 'tg-619283745',
        senderName: 'Asisten AI Desa Sukamaju',
        senderPhone: '@pemdes_sukamaju_bot',
        senderRole: 'ai',
        channel: 'telegram',
        message: 'Syarat SKTM adalah KTP, KK, dan Pengantar RT/RW.',
        timestamp: '2026-03-16 09:00',
        isRead: true,
        telegramChatId: '619283745',
      },
      {
        id: 'c3',
        sessionId: 'wa-62812',
        senderName: 'Admin Pemdes',
        senderPhone: '62812',
        senderRole: 'admin',
        channel: 'whatsapp',
        message: 'Notifikasi surat selesai.',
        timestamp: '2026-03-16 09:05',
        isRead: true,
      },
    ];

    const sampleReqs: LetterRequest[] = [
      {
        id: 'r1',
        trackingCode: 'SRT-2026-SKTM-001',
        nik: '3201141001800001',
        citizenName: 'Budi Santoso',
        kk: '3201140501100001',
        dusun: 'Dusun 1 Sukasari',
        rt: '001',
        rw: '001',
        whatsapp: '081211112222',
        letterType: 'SKTM',
        letterTitle: 'Surat Keterangan Tidak Mampu (SKTM)',
        purpose: 'Beasiswa Sekolah',
        attachmentName: 'ktp.pdf',
        status: 'Selesai',
        createdAt: '2026-03-16 08:00',
        updatedAt: '2026-03-16 09:00',
        whatsappNotifiedCount: 1,
        checklist: {
          nikMatchDukcapil: true,
          kkMatchDukcapil: true,
          ktpAttachmentClear: true,
          pengantarRtRwValid: true,
          noTaxArrearsPbb: true,
        },
      },
    ];

    const sampleApbdes: ApbdesItem[] = [
      {
        id: 'a1',
        category: 'Pendapatan',
        subCategory: 'Dana Desa (APBN)',
        anggaran: 1000000000,
        realisasi: 900000000,
        year: 2026,
        description: 'Dana Desa',
      },
      {
        id: 'a2',
        category: 'Belanja',
        subCategory: 'Bidang Pembangunan Desa',
        anggaran: 800000000,
        realisasi: 600000000,
        year: 2026,
        description: 'Belanja Fisik',
      },
    ];

    const analytics = computeOmnichannelAnalytics(sampleChats, sampleReqs, sampleApbdes, []);
    assert.equal(analytics.totalMessages, 3);
    assert.equal(analytics.telegramStats.totalTelegram, 2);
    assert.equal(analytics.telegramStats.citizenInquiries, 1);
    assert.equal(analytics.telegramStats.aiReplies, 1);
    assert.equal(analytics.telegramStats.aiAutomationRatePercent, 100);
    assert.equal(analytics.apbdesSummary.absorptionPercent, 75);
    assert.equal(analytics.letterByType[0].code, 'SKTM');
  });

  it('groups citizens by Nomor KK into structured family trees and parses bulk CSV imports', () => {
    const csvInput = [
      'NIK,KK,Nama,JenisKelamin,TanggalLahir,HubunganKeluarga,Dusun,RT,RW,Alamat,Pekerjaan,Bansos',
      '3201141205820001,3201140401100011,Ahmad Subarjo,Laki-laki,1982-05-12,Kepala Keluarga,Dusun 1 Sukasari,001,001,Jl. Melati 14,Petani,BPNT',
      '3201145808860002,3201140401100011,Siti Nurhaliza,Perempuan,1986-08-18,Istri,Dusun 1 Sukasari,001,001,Jl. Melati 14,UMKM,Non-Penerima',
      '3201140804040009,3201140401100011,Rizky Pratama,Laki-laki,2004-04-08,Anak,Dusun 1 Sukasari,001,001,Jl. Melati 14,Mahasiswa,Beasiswa Desa',
      'INVALID_NIK,3201140401100011,Gagal Validasi,L,1990-01-01,Anak,Dusun 1 Sukasari,001,001,Jl. Melati,Pelajar,Non-Penerima',
    ].join('\n');

    const parsed = parseCitizensCsv(csvInput);
    assert.equal(parsed.validCitizens.length, 3);
    assert.equal(parsed.errors.length, 1);

    const groups = groupCitizensByKk(parsed.validCitizens);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].headOfFamily.name, 'Ahmad Subarjo');
    assert.equal(groups[0].members.length, 3);
    assert.deepEqual(groups[0].aidPrograms.sort(), ['BPNT', 'Beasiswa Desa'].sort());

    const apbCsv = [
      'Kategori,SubKategori,Anggaran,Realisasi,Tahun,Keterangan',
      'Pendapatan,Dana Desa (APBN),1200000000,1150000000,2026,Realisasi DD',
      'Belanja,Pencegahan Stunting & PMT Posyandu,95000000,90000000,2026,PMT Balita',
    ].join('\n');
    const parsedApb = parseApbdesCsv(apbCsv);
    assert.equal(parsedApb.validItems.length, 2);
    assert.equal(parsedApb.errors.length, 0);

    const reportCsv = buildMonthlyReportCsv(parsed.validCitizens, [], [], parsedApb.validItems, {
      villageName: 'Desa Sukamaju',
      subDistrict: 'Kecamatan Megamendung',
      district: 'Kabupaten Bogor',
    });
    assert.match(reportCsv, /Total Kartu Keluarga \(KK\)/);
    assert.match(reportCsv, /Desa Sukamaju/);
  });

  it('computes Posyandu stunting metrics and Cek NIK Satu Pintu lookup accurately', () => {
    const metrics = computePosyanduStuntingMetrics(
      [
        {
          id: 'g1',
          nikOrKms: '3201142002260001',
          childOrMotherName: 'Muhammad Alfatih',
          parentName: 'Ahmad Subarjo',
          kk: '3201140401100011',
          dusun: 'Dusun 1 Sukasari',
          category: 'Balita',
          ageMonths: 14,
          weightKg: 10.2,
          heightCm: 78.5,
          nutritionalStatus: 'Gizi Baik (Normal)',
          immunizationStatus: 'Lengkap',
          vitaminA: true,
          pmtReceived: true,
          checkupDate: '2026-03-11',
        },
        {
          id: 'g2',
          nikOrKms: '3201141908230015',
          childOrMotherName: 'Aisyah',
          parentName: 'Dedi Kusnandar',
          kk: '3201141908120088',
          dusun: 'Dusun 3 Harapan Mulya',
          category: 'Balita',
          ageMonths: 28,
          weightKg: 10.1,
          heightCm: 82.0,
          nutritionalStatus: 'Risiko Stunting (Pendek)',
          immunizationStatus: 'Lengkap',
          vitaminA: true,
          pmtReceived: true,
          checkupDate: '2026-03-14',
        },
      ],
      [
        {
          id: 'p1',
          posyanduName: 'Posyandu Melati I',
          dusun: 'Dusun 1 Sukasari',
          scheduleDay: 'Rabu Ke-1',
          nextDate: '2026-04-01',
          location: 'Balai Posyandu',
          midwifeName: 'Bidan Yohana',
          cadreCount: 6,
          registeredBalita: 40,
          registeredBumil: 8,
          pmtMenu: 'Telur & Bubur Kacang Hijau',
        },
      ],
      4.5
    );

    assert.equal(metrics.monitoredBalitaCount, 2);
    assert.equal(metrics.stuntingCaseCount, 1);
    assert.equal(metrics.pmtCoveragePercent, 100);

    const parsed = parseCitizensCsv(
      '3201141205820001,3201140401100011,Ahmad Subarjo,Laki-laki,1982-05-12,Kepala Keluarga,Dusun 1 Sukasari,001,001,Jl. Melati 14,Petani,BPNT'
    );
    const lookup = lookupCitizenOneStopPortal('3201141205820001', '1982-05-12', {
      citizens: parsed.validCitizens,
      requests: [],
      agendas: [],
      siteConfig: {
        tpsLocations: [
          {
            tpsNumber: 'TPS 001',
            dusun: 'Dusun 1 Sukasari',
            rtRwScope: 'RT 001 / RW 001',
            locationName: 'Balai Desa Sukamaju',
            voterCount: 386,
            scheduleInfo: '07.00 - 13.00 WIB',
          },
        ],
        posyanduSchedules: [],
        posyanduRecords: [],
      } as any,
    });

    assert.equal(lookup.found, true);
    assert.equal(lookup.citizen?.name, 'Ahmad Subarjo');
    assert.equal(lookup.tpsInfo?.tpsNumber, 'TPS 001');
  });
});


