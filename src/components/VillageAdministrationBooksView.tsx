import React, { useMemo, useState } from 'react';
import {
  AidStatus,
  Citizen,
  DispositionChainStep,
  DispositionStage,
  LetterCategoryName,
  LetterCustomFieldDef,
  LetterRequest,
  LetterTypeCode,
  LetterTypeInfo,
  NutritionalStatus,
  PopulationMutationItem,
  PosyanduGrowthRecord,
  PosyanduScheduleItem,
  VillageAssetItem,
  VillageHamlet,
  VillageMailLog,
  VillageOfficial,
  VillageSiteConfig,
} from '../types/village';
import {
  computePosyanduStuntingMetrics,
  formatWhatsAppNotification,
  generateOfficialLetterNumber,
  generateTrackingCode,
  maskSensitiveNumber,
  validateNikFormat,
} from '../utils/villageLogic';
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Edit,
  FilePlus2,
  FileText,
  Landmark,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface VillageAdministrationBooksViewProps {
  siteConfig: VillageSiteConfig;
  onUpdateSiteConfig?: (cfg: VillageSiteConfig) => void;
  citizens: Citizen[];
  onUpdateCitizens: (items: Citizen[]) => void;
  requests: LetterRequest[];
  onUpdateRequests: (items: LetterRequest[]) => void;
  letterTypes: LetterTypeInfo[];
  onUpdateLetterTypes: (items: LetterTypeInfo[]) => void;
  incomingOutboxLetters: VillageMailLog[];
  onUpdateIncomingOutboxLetters: (items: VillageMailLog[]) => void;
  villageAssets: VillageAssetItem[];
  onUpdateVillageAssets: (items: VillageAssetItem[]) => void;
  populationMutations: PopulationMutationItem[];
  onUpdatePopulationMutations: (items: PopulationMutationItem[]) => void;
  hamlets: VillageHamlet[];
  officials: VillageOfficial[];
  currentUserFullName: string;
  currentUserRole: string;
  onViewLetter: (req: LetterRequest) => void;
  onRecordWhatsAppNotification: (req: LetterRequest, msg: string) => void;
  onShowToast: (title: string, msg: string) => void;
}

export const VillageAdministrationBooksView: React.FC<VillageAdministrationBooksViewProps> = ({
  siteConfig,
  onUpdateSiteConfig,
  citizens,
  onUpdateCitizens,
  requests,
  onUpdateRequests,
  letterTypes,
  onUpdateLetterTypes,
  incomingOutboxLetters,
  onUpdateIncomingOutboxLetters,
  villageAssets,
  onUpdateVillageAssets,
  populationMutations,
  onUpdatePopulationMutations,
  hamlets,
  officials,
  currentUserFullName,
  currentUserRole,
  onViewLetter,
  onRecordWhatsAppNotification,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<
    | 'loket_template'
    | 'agenda_surat'
    | 'mutasi_penduduk'
    | 'aset_tkd'
    | 'bansos_dtks'
    | 'posyandu_stunting'
  >('loket_template');

  // ============================================================================
  // 1. PENERBITAN SURAT INSTAN DI LOKET & EDITOR TEMPLATE SURAT DINAMIS
  // ============================================================================
  const [walkinNik, setWalkinNik] = useState<string>(citizens[0]?.nik || '');
  const [walkinLetterCode, setWalkinLetterCode] = useState<LetterTypeCode>(
    letterTypes[0]?.code || 'SKU'
  );
  const [walkinPurpose, setWalkinPurpose] = useState<string>(
    'Persyaratan Administrasi Resmi Warga Desa'
  );
  const [walkinSignerRole, setWalkinSignerRole] = useState<
    'Kepala Desa' | 'Sekretaris Desa (a.n. Kepala Desa)'
  >('Kepala Desa');
  const [walkinCustomFields, setWalkinCustomFields] = useState<Record<string, string>>({});
  const [walkinCustomBodyOverride, setWalkinCustomBodyOverride] = useState<string>('');
  const [walkinError, setWalkinError] = useState<string | null>(null);

  // Template Builder / LetterType CRUD State
  const [editingLetterType, setEditingLetterType] = useState<LetterTypeInfo | null>(null);
  const [isLetterTypeModalOpen, setIsLetterTypeModalOpen] = useState(false);
  const [ltCode, setLtCode] = useState('');
  const [ltName, setLtName] = useState('');
  const [ltCategory, setLtCategory] = useState<LetterCategoryName>('Layanan Umum & Sosial');
  const [ltClassCode, setLtClassCode] = useState('470');
  const [ltShortDesc, setLtShortDesc] = useState('');
  const [ltHours, setLtHours] = useState(2);
  const [ltReqText, setLtReqText] = useState('KTP Elektronik, Kartu Keluarga (KK), Pengantar RT/RW');
  const [ltBodyTemplate, setLtBodyTemplate] = useState(
    'Berdasarkan data Buku Induk Penduduk Pemerintah {{nama_desa}}, diterangkan bahwa warga tersebut di atas benar berdomisili di {{dusun}} RT {{rt}}/RW {{rw}} dengan rincian keterangan: {{keterangan_khusus}}. Surat ini diterbitkan untuk keperluan: {{keperluan}}.'
  );
  const [ltCustomFields, setLtCustomFields] = useState<LetterCustomFieldDef[]>([]);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');

  const matchedWalkinCitizen = useMemo(() => {
    const clean = walkinNik.replace(/\s+/g, '').trim();
    return citizens.find((c) => c.nik === clean) || null;
  }, [walkinNik, citizens]);

  const selectedWalkinType = useMemo(() => {
    return letterTypes.find((lt) => lt.code === walkinLetterCode) || letterTypes[0];
  }, [letterTypes, walkinLetterCode]);

  const sekdesOfficial = useMemo(() => {
    return officials.find(
      (o) =>
        o.role.toLowerCase().includes('sekretaris') ||
        (o.position && o.position.toLowerCase().includes('sekretaris'))
    );
  }, [officials]);

  const handleIssueInstantWalkinLetter = (e: React.FormEvent) => {
    e.preventDefault();
    setWalkinError(null);
    const val = validateNikFormat(walkinNik);
    if (!val.isValid) {
      setWalkinError(val.errorMessage || 'Format NIK tidak valid.');
      return;
    }
    if (!matchedWalkinCitizen) {
      setWalkinError('Pilih warga terdaftar dari daftar Buku Induk Penduduk.');
      return;
    }
    if (!walkinPurpose.trim()) {
      setWalkinError('Keperluan surat wajib diisi.');
      return;
    }

    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    const seq = requests.length + 1;
    const trackingCode = generateTrackingCode(walkinLetterCode, seq, now.getFullYear());
    const regNum = generateOfficialLetterNumber(
      walkinLetterCode,
      seq,
      now.getMonth(),
      now.getFullYear(),
      siteConfig.villageCode,
      selectedWalkinType?.classificationCode
    );

    const customSummaryParts: string[] = [];
    for (const def of selectedWalkinType?.customFields || []) {
      const v = (walkinCustomFields[def.key] || '').trim();
      if (v) customSummaryParts.push(`${def.label}: ${v}`);
    }

    const isSekdes = walkinSignerRole === 'Sekretaris Desa (a.n. Kepala Desa)';
    const signerName = isSekdes && sekdesOfficial ? sekdesOfficial.name : siteConfig.headOfVillageName;
    const signerNip = isSekdes && sekdesOfficial ? sekdesOfficial.nip : siteConfig.headOfVillageNip;

    const newReq: LetterRequest = {
      id: `req-loket-${Date.now()}`,
      trackingCode,
      registrationNumber: regNum,
      nik: matchedWalkinCitizen.nik,
      citizenName: matchedWalkinCitizen.name,
      kk: matchedWalkinCitizen.kk,
      dusun: matchedWalkinCitizen.dusun,
      rt: matchedWalkinCitizen.rt,
      rw: matchedWalkinCitizen.rw,
      whatsapp: matchedWalkinCitizen.phone,
      letterType: walkinLetterCode,
      letterTitle: selectedWalkinType?.name || `Surat Keterangan (${walkinLetterCode})`,
      purpose: walkinPurpose.trim(),
      extraNotes: customSummaryParts.join(' | ') || 'Diterbitkan langsung di Loket Pelayanan Desa',
      customFieldValues:
        Object.keys(walkinCustomFields).length > 0 ? walkinCustomFields : undefined,
      customBodyText: walkinCustomBodyOverride.trim() || undefined,
      signerRole: walkinSignerRole,
      signerName,
      signerNip,
      attachmentName: 'Berkas_Loket_Terverifikasi.pdf',
      status: 'Selesai',
      createdAt: nowStr,
      updatedAt: nowStr,
      completedAt: nowStr,
      processingHours: 0.2,
      adminNotes: `Diterbitkan langsung di Loket Desa oleh ${currentUserFullName} (${currentUserRole}).`,
      verifiedBy: `${currentUserFullName} (${currentUserRole})`,
      signedBy: signerName,
      qrVerificationCode: `TTE-${siteConfig.villageCode}-${trackingCode}`,
      whatsappNotifiedCount: 1,
      checklist: {
        nikMatchDukcapil: true,
        kkMatchDukcapil: true,
        ktpAttachmentClear: true,
        pengantarRtRwValid: true,
        noTaxArrearsPbb: true,
      },
    };

    const waMsg = formatWhatsAppNotification(
      {
        trackingCode: newReq.trackingCode,
        citizenName: newReq.citizenName,
        letterTitle: newReq.letterTitle,
        status: 'Selesai',
        registrationNumber: regNum,
        adminNotes: newReq.adminNotes,
      },
      siteConfig.villageName
    );
    newReq.lastWhatsappMessage = waMsg;

    onUpdateRequests([newReq, ...requests]);
    onRecordWhatsAppNotification(newReq, waMsg);

    // Automatically log into Buku Mutasi Penduduk if KELAHIRAN, KEMATIAN, or PINDAH
    if (
      walkinLetterCode === 'KELAHIRAN' ||
      walkinLetterCode === 'KEMATIAN' ||
      walkinLetterCode === 'PINDAH'
    ) {
      const mutationEntry: PopulationMutationItem = {
        id: `mut-${Date.now()}`,
        nik: matchedWalkinCitizen.nik,
        citizenName:
          walkinCustomFields.nama_bayi ||
          walkinCustomFields.nama_almarhum ||
          matchedWalkinCitizen.name,
        mutationType:
          walkinLetterCode === 'KELAHIRAN'
            ? 'KELAHIRAN'
            : walkinLetterCode === 'KEMATIAN'
            ? 'KEMATIAN'
            : 'PINDAH_KELUAR',
        date: now.toISOString().slice(0, 10),
        dusun: matchedWalkinCitizen.dusun,
        rtRw: `RT ${matchedWalkinCitizen.rt} / RW ${matchedWalkinCitizen.rw}`,
        relatedLetterCode: trackingCode,
        notes: `${newReq.letterTitle} (${regNum}) — ${customSummaryParts.join('; ') || walkinPurpose}`,
      };
      onUpdatePopulationMutations([mutationEntry, ...populationMutations]);
    }

    onShowToast(
      'Surat Resmi Berhasil Diterbitkan!',
      `Nomor Surat: ${regNum} telah terbit dan siap dicetak.`
    );
    onViewLetter(newReq);
  };

  const openAddLetterTypeModal = () => {
    setEditingLetterType(null);
    setLtCode('');
    setLtName('');
    setLtCategory('Layanan Umum & Sosial');
    setLtClassCode('470');
    setLtShortDesc('');
    setLtHours(2);
    setLtReqText('KTP Elektronik, Kartu Keluarga (KK), Pengantar RT/RW');
    setLtBodyTemplate(
      'Berdasarkan Buku Induk Penduduk Pemerintah {{nama_desa}}, diterangkan bahwa warga tersebut di atas benar berdomisili di {{dusun}} RT {{rt}}/RW {{rw}} dengan rincian khusus ({{keterangan_khusus}}). Surat ini diterbitkan untuk keperluan: {{keperluan}}.'
    );
    setLtCustomFields([
      {
        key: 'rincian_keterangan',
        label: 'Rincian Keterangan Khusus',
        placeholder: 'Isi rincian data surat...',
        required: true,
      },
    ]);
    setIsLetterTypeModalOpen(true);
  };

  const openEditLetterTypeModal = (lt: LetterTypeInfo) => {
    setEditingLetterType(lt);
    setLtCode(lt.code);
    setLtName(lt.name);
    setLtCategory(lt.category || 'Layanan Umum & Sosial');
    setLtClassCode(lt.classificationCode || '470');
    setLtShortDesc(lt.shortDesc);
    setLtHours(lt.estimatedHours);
    setLtReqText(lt.requirements.join(', '));
    setLtBodyTemplate(
      lt.bodyTemplate ||
        'Berdasarkan data kependudukan {{nama_desa}}, warga tersebut di atas mengajukan {{keterangan_khusus}} untuk keperluan: {{keperluan}}.'
    );
    setLtCustomFields(lt.customFields || []);
    setIsLetterTypeModalOpen(true);
  };

  const handleSaveLetterType = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = ltCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!cleanCode || !ltName.trim()) return;

    const newItem: LetterTypeInfo = {
      code: cleanCode,
      name: ltName.trim(),
      category: ltCategory,
      classificationCode: ltClassCode.trim() || '470',
      shortDesc: ltShortDesc.trim() || `Layanan ${ltName.trim()} Pemerintah ${siteConfig.villageName}`,
      estimatedHours: Number(ltHours) || 2,
      requirements: ltReqText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      customFields: ltCustomFields,
      bodyTemplate: ltBodyTemplate.trim(),
    };

    if (editingLetterType) {
      onUpdateLetterTypes(
        letterTypes.map((item) => (item.code === editingLetterType.code ? newItem : item))
      );
      onShowToast(
        'Template Jenis Surat Diperbarui',
        `Format & variabel "${newItem.name}" telah disimpan ke database.`
      );
    } else {
      onUpdateLetterTypes([...letterTypes, newItem]);
      onShowToast(
        'Jenis Surat Baru Ditambahkan',
        `Layanan "${newItem.name} (${newItem.code})" kini tersedia di Katalog & Anjungan Desa.`
      );
    }
    setIsLetterTypeModalOpen(false);
  };

  // ============================================================================
  // 2. BUKU AGENDA SURAT MASUK & KELUAR + DISPOSISI BERJENJANG (E-ARSIP) STATE
  // ============================================================================
  const [mailFilter, setMailFilter] = useState<'SEMUA' | 'SURAT_MASUK' | 'SURAT_KELUAR'>('SEMUA');
  const [mailBookType, setMailBookType] = useState<'SURAT_MASUK' | 'SURAT_KELUAR'>('SURAT_MASUK');
  const [mailLetterNumber, setMailLetterNumber] = useState('');
  const [mailSenderOrRecipient, setMailSenderOrRecipient] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailClassCode, setMailClassCode] = useState('005');
  const [mailDispositionTo, setMailDispositionTo] = useState('Sekretaris Desa');
  const [mailDispositionInstruction, setMailDispositionInstruction] = useState('');
  const [mailAttachmentName, setMailAttachmentName] = useState('Scan_Surat_Resmi.pdf');
  const [mailFollowUpNotes, setMailFollowUpNotes] = useState('');
  const [mailSummary, setMailSummary] = useState('');

  const DISPOSITION_STAGE_ORDER: DispositionStage[] = [
    'Operator',
    'Sekdes',
    'Kepala Desa',
    'Kaur/Kasi',
    'Selesai Arsip',
  ];

  const handleAddMailLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailLetterNumber.trim() || !mailSubject.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = `${today} ${String(new Date().getHours()).padStart(2, '0')}:${String(
      new Date().getMinutes()
    ).padStart(2, '0')}`;
    const seq = incomingOutboxLetters.length + 1;
    const prefix = mailBookType === 'SURAT_MASUK' ? 'AGD-SM' : 'AGD-SK';
    const initialChain: DispositionChainStep[] =
      mailBookType === 'SURAT_MASUK'
        ? [
            {
              stage: 'Operator',
              actorName: currentUserFullName || 'Operator Loket',
              note: 'Registrasi e-Arsip surat masuk & verifikasi berkas scan.',
              timestamp: nowTime,
              status: 'Selesai',
            },
            {
              stage: 'Sekdes',
              actorName: sekdesOfficial?.name || 'Sekretaris Desa',
              note: `Diteruskan ke Kepala Desa / ${mailDispositionTo.trim()}`,
              timestamp: nowTime,
              status: 'Proses',
            },
          ]
        : [
            {
              stage: 'Kepala Desa',
              actorName: siteConfig.headOfVillageName,
              note: 'Pengesahan TTE & penomoran surat keluar desa.',
              timestamp: nowTime,
              status: 'Selesai',
            },
          ];

    const newMail: VillageMailLog = {
      id: `mail-${Date.now()}`,
      bookType: mailBookType,
      agendaNumber: `${prefix}/${String(seq).padStart(3, '0')}/III/${new Date().getFullYear()}`,
      letterNumber: mailLetterNumber.trim(),
      letterDate: today,
      receivedOrSentDate: today,
      senderOrRecipient: mailSenderOrRecipient.trim() || 'Instansi Terkait',
      subject: mailSubject.trim(),
      classificationCode: mailClassCode.trim() || '005',
      dispositionTo: mailDispositionTo.trim(),
      dispositionInstruction:
        mailDispositionInstruction.trim() || 'Untuk ditindaklanjuti sesuai ketentuan.',
      dispositionStatus: mailBookType === 'SURAT_MASUK' ? 'Didisposisikan' : 'Selesai Arsip',
      currentStage: mailBookType === 'SURAT_MASUK' ? 'Sekdes' : 'Selesai Arsip',
      dispositionChain: initialChain,
      attachmentName: mailAttachmentName.trim() || 'Scan_Berkas_Resmi.pdf',
      followUpNotes:
        mailFollowUpNotes.trim() || 'Tercatat di E-Arsip Digital Pemerintah Desa.',
      summary: mailSummary.trim() || mailSubject.trim(),
    };
    onUpdateIncomingOutboxLetters([newMail, ...incomingOutboxLetters]);
    setMailLetterNumber('');
    setMailSenderOrRecipient('');
    setMailSubject('');
    setMailDispositionInstruction('');
    setMailFollowUpNotes('');
    setMailSummary('');
    onShowToast(
      'E-Arsip & Disposisi Surat Tercatat',
      `${newMail.agendaNumber} (${newMail.subject}) berhasil disimpan ke server.`
    );
  };

  const handleAdvanceDispositionStage = (mail: VillageMailLog) => {
    const currentStage: DispositionStage = mail.currentStage || 'Operator';
    const currentIdx = DISPOSITION_STAGE_ORDER.indexOf(currentStage);
    const nextStage: DispositionStage =
      DISPOSITION_STAGE_ORDER[Math.min(DISPOSITION_STAGE_ORDER.length - 1, currentIdx + 1)];
    const now = new Date();
    const nowStr = `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    const actorMap: Record<DispositionStage, string> = {
      Operator: currentUserFullName || 'Operator SID',
      Sekdes: sekdesOfficial?.name || 'Sekretaris Desa',
      'Kepala Desa': siteConfig.headOfVillageName,
      'Kaur/Kasi': mail.dispositionTo || 'Kasi Pelayanan / Kaur Umum',
      'Selesai Arsip': currentUserFullName || 'Arsiparis Desa',
    };

    const existingChain = (mail.dispositionChain || []).map((step) => ({
      ...step,
      status: 'Selesai' as const,
    }));
    const nextStep: DispositionChainStep = {
      stage: nextStage,
      actorName: actorMap[nextStage],
      note:
        nextStage === 'Selesai Arsip'
          ? 'Tindak lanjut selesai dan dokumen diarsipkan secara digital.'
          : `Disposisi diteruskan ke tahap ${nextStage}: ${mail.dispositionInstruction || 'Tindak lanjuti'}`,
      timestamp: nowStr,
      status: nextStage === 'Selesai Arsip' ? 'Selesai' : 'Proses',
    };

    const updatedMail: VillageMailLog = {
      ...mail,
      currentStage: nextStage,
      dispositionStatus:
        nextStage === 'Selesai Arsip'
          ? 'Selesai Arsip'
          : nextStage === 'Kaur/Kasi'
          ? 'Ditindaklanjuti'
          : 'Didisposisikan',
      dispositionChain: [...existingChain, nextStep],
    };

    onUpdateIncomingOutboxLetters(
      incomingOutboxLetters.map((item) => (item.id === mail.id ? updatedMail : item))
    );
    onShowToast(
      `Disposisi Diteruskan ke ${nextStage}`,
      `Surat ${mail.agendaNumber} kini berada pada tahap: ${nextStage}.`
    );
  };

  // ============================================================================
  // 3. BUKU MUTASI PENDUDUK STATE
  // ============================================================================
  const [mutType, setMutType] = useState<PopulationMutationItem['mutationType']>('KELAHIRAN');
  const [mutNik, setMutNik] = useState('');
  const [mutName, setMutName] = useState('');
  const [mutDusun, setMutDusun] = useState(hamlets[0]?.name || 'Dusun 1 Sukasari');
  const [mutRtRw, setMutRtRw] = useState('RT 001 / RW 001');
  const [mutNotes, setMutNotes] = useState('');

  const handleAddMutation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutName.trim()) return;
    const newMut: PopulationMutationItem = {
      id: `mut-${Date.now()}`,
      nik: mutNik.trim() || '3201140000000001',
      citizenName: mutName.trim(),
      mutationType: mutType,
      date: new Date().toISOString().slice(0, 10),
      dusun: mutDusun,
      rtRw: mutRtRw,
      notes: mutNotes.trim() || `Pencatatan mutasi ${mutType} di Buku Mutasi Penduduk Desa.`,
    };
    onUpdatePopulationMutations([newMut, ...populationMutations]);
    setMutNik('');
    setMutName('');
    setMutNotes('');
    onShowToast('Mutasi Penduduk Tercatat', `Data mutasi ${newMut.citizenName} berhasil disimpan.`);
  };

  // ============================================================================
  // 4. BUKU INVENTARIS & TANAH KAS DESA (TKD) STATE
  // ============================================================================
  const [astCode, setAstCode] = useState('');
  const [astName, setAstName] = useState('');
  const [astCategory, setAstCategory] = useState<VillageAssetItem['category']>(
    'Tanah Kas Desa (TKD)'
  );
  const [astYear, setAstYear] = useState(2025);
  const [astSource, setAstSource] = useState<VillageAssetItem['sourceFund']>('Dana Desa (APBN)');
  const [astValue, setAstValue] = useState(150000000);
  const [astLocation, setAstLocation] = useState('Dusun 1 Sukasari');
  const [astQty, setAstQty] = useState('1 Unit / Bidang');
  const [astManager, setAstManager] = useState('Kaur Tata Usaha & Umum');

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!astName.trim()) return;
    const newAst: VillageAssetItem = {
      id: `ast-${Date.now()}`,
      assetCode:
        astCode.trim() ||
        `AST-${siteConfig.villageCode.replace(/\D/g, '').slice(0, 6)}-${String(
          villageAssets.length + 1
        ).padStart(3, '0')}`,
      name: astName.trim(),
      category: astCategory,
      acquisitionYear: Number(astYear) || 2025,
      sourceFund: astSource,
      valueRupiah: Number(astValue) || 0,
      condition: 'Baik',
      location: astLocation.trim(),
      quantityLabel: astQty.trim(),
      managerName: astManager.trim(),
    };
    onUpdateVillageAssets([newAst, ...villageAssets]);
    setAstCode('');
    setAstName('');
    onShowToast('Aset Desa Ditambahkan', `${newAst.name} tercatat di Buku Inventaris Desa.`);
  };

  // ============================================================================
  // 5. MANAJEMEN PENERIMA BANSOS (DTKS / BLT-DD / PKH / BEASISWA / RUTILAHU) STATE
  // ============================================================================
  const [bansosAdminSearch, setBansosAdminSearch] = useState('');

  const handleChangeCitizenAidStatus = (citizenId: string, newAid: AidStatus) => {
    const updated = citizens.map((c) =>
      c.id === citizenId
        ? {
            ...c,
            aidStatus: newAid,
            aidStage: newAid === 'Non-Penerima' ? '-' : c.aidStage || 'Tahap I - 2026',
            aidAmount: newAid === 'Non-Penerima' ? 0 : c.aidAmount || 300000,
            lastUpdated: new Date().toISOString().slice(0, 10),
          }
        : c
    );
    onUpdateCitizens(updated);
    const target = citizens.find((c) => c.id === citizenId);
    onShowToast(
      'Status Bansos Diperbarui',
      `${target?.name || 'Warga'} ditetapkan sebagai: ${newAid}.`
    );
  };

  // ============================================================================
  // 6. MANAJEMEN POSYANDU, BALITA & PENCEGAHAN STUNTING DESA STATE
  // ============================================================================
  const posyanduSchedules = siteConfig.posyanduSchedules || [];
  const posyanduRecords = siteConfig.posyanduRecords || [];
  const stuntingMetrics = useMemo(
    () =>
      computePosyanduStuntingMetrics(
        posyanduRecords,
        siteConfig.stuntingTargetPercent ?? 5
      ),
    [posyanduRecords, siteConfig.stuntingTargetPercent]
  );

  const [posChildName, setPosChildName] = useState('');
  const [posNik, setPosNik] = useState('');
  const [posMotherName, setPosMotherName] = useState('');
  const [posDusun, setPosDusun] = useState(hamlets[0]?.name || 'Dusun 1 Sukasari');
  const [posCategory, setPosCategory] = useState<'Balita' | 'Ibu Hamil'>('Balita');
  const [posAgeMonths, setPosAgeMonths] = useState(18);
  const [posWeightKg, setPosWeightKg] = useState(10.4);
  const [posHeightCm, setPosHeightCm] = useState(81.5);
  const [posNutrition, setPosNutrition] = useState<NutritionalStatus>('Gizi Baik (Normal)');
  const [posVitaAndImm, setPosVitaAndImm] = useState(true);
  const [posPmt, setPosPmt] = useState(true);
  const [posNotes, setPosNotes] = useState('Tumbuh kembang sesuai grafik KMS Posyandu.');

  const [schedPosName, setSchedPosName] = useState('Posyandu Melati IV');
  const [schedDusun, setSchedDusun] = useState(hamlets[0]?.name || 'Dusun 1 Sukasari');
  const [schedDayLabel, setSchedDayLabel] = useState('Kamis Minggu Ke-2 Setiap Bulan');
  const [schedNextDate, setSchedNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [schedLocation, setSchedLocation] = useState('Balai Posyandu Dusun');
  const [schedMidwife, setSchedMidwife] = useState(
    siteConfig.emergencyContacts?.midwifeName || 'Bidan Desa'
  );

  const handleAddPosyanduRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posChildName.trim() || !onUpdateSiteConfig) return;
    const newRec: PosyanduGrowthRecord = {
      id: `posrec-${Date.now()}`,
      nik: posNik.trim() || `320114${String(Date.now()).slice(-10)}`,
      childOrMotherName: posChildName.trim(),
      parentOrSpouseName: posMotherName.trim() || 'Warga Desa',
      dusun: posDusun,
      category: posCategory,
      ageMonths: Number(posAgeMonths) || 12,
      weightKg: Number(posWeightKg) || 9.5,
      heightCm: Number(posHeightCm) || 75,
      nutritionalStatus: posNutrition,
      vitaminAAndImmunizationComplete: posVitaAndImm,
      pmtReceived: posPmt,
      recordedAt: new Date().toISOString().slice(0, 10),
      notes: posNotes.trim(),
    };
    onUpdateSiteConfig({
      ...siteConfig,
      posyanduRecords: [newRec, ...posyanduRecords],
    });
    setPosChildName('');
    setPosNik('');
    setPosMotherName('');
    onShowToast(
      'Data Tumbuh Kembang Posyandu Tersimpan',
      `Data ${newRec.childOrMotherName} (${newRec.nutritionalStatus}) berhasil disimpan ke database server.`
    );
  };

  const handleAddPosyanduSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedPosName.trim() || !onUpdateSiteConfig) return;
    const newSched: PosyanduScheduleItem = {
      id: `pos-${Date.now()}`,
      posyanduName: schedPosName.trim(),
      dusun: schedDusun,
      scheduleDayLabel: schedDayLabel.trim(),
      nextDate: schedNextDate,
      timeRange: '08:00 - 11:30 WIB',
      location: schedLocation.trim(),
      cadreLeader: 'Kader Posyandu Desa',
      midwifeName: schedMidwife.trim(),
      targetServices: 'Penimbangan Balita, Imunisasi, Vitamin A, Pemeriksaan Ibu Hamil & PMT Stunting',
    };
    onUpdateSiteConfig({
      ...siteConfig,
      posyanduSchedules: [...posyanduSchedules, newSched],
    });
    setSchedPosName('');
    onShowToast(
      'Jadwal Posyandu Ditambahkan',
      `${newSched.posyanduName} (${newSched.dusun}) berhasil disimpan ke database.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-wrap gap-2">
        <button
          onClick={() => setSubTab('loket_template')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition ${
            subTab === 'loket_template'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>1. Cetak Surat Instan Loket & Template ({letterTypes.length})</span>
        </button>

        <button
          onClick={() => setSubTab('agenda_surat')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition ${
            subTab === 'agenda_surat'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. E-Arsip & Disposisi Surat Digital ({incomingOutboxLetters.length})</span>
        </button>

        <button
          onClick={() => setSubTab('mutasi_penduduk')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition ${
            subTab === 'mutasi_penduduk'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Buku Mutasi Penduduk ({populationMutations.length})</span>
        </button>

        <button
          onClick={() => setSubTab('aset_tkd')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition ${
            subTab === 'aset_tkd'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>4. Buku Inventaris & TKD ({villageAssets.length})</span>
        </button>

        <button
          onClick={() => setSubTab('bansos_dtks')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition ${
            subTab === 'bansos_dtks'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>5. Modul Bansos & DTKS</span>
        </button>

        <button
          onClick={() => setSubTab('posyandu_stunting')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition ${
            subTab === 'posyandu_stunting'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>6. Posyandu, Balita & Stunting ({posyanduRecords.length})</span>
        </button>
      </div>

      {/* =====================================================================
          SUB-TAB 1: PENERBITAN INSTAN DI LOKET & EDITOR TEMPLATE SURAT DINAMIS
      ===================================================================== */}
      {subTab === 'loket_template' && (
        <div className="space-y-8">
          {/* Card 1: Terbitkan Surat Instan di Loket Desa */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-emerald-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
                  Pelayanan Loket Cepat (Walk-in Tanpa Antre Online)
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  Terbitkan & Cetak Segala Jenis Surat Langsung oleh Perangkat Desa
                </h3>
                <p className="text-xs text-gray-500">
                  Pilih warga dari Buku Induk Penduduk (Auto-Fill NIK), pilih jenis surat, isi kolom dinamis, pilih penandatangan (Kades / a.n. Sekdes), dan langsung cetak surat ber-QR TTE.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddLetterTypeModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>+ Buat Jenis / Template Surat Baru</span>
              </button>
            </div>

            {walkinError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 text-xs text-red-700 font-semibold">
                {walkinError}
              </div>
            )}

            <form onSubmit={handleIssueInstantWalkinLetter} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Citizen Auto-Fill */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Pilih Warga dari Buku Induk Penduduk (Auto-Fill NIK) *
                  </label>
                  <select
                    value={walkinNik}
                    onChange={(e) => setWalkinNik(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-900 dark:text-white"
                  >
                    {citizens.map((c) => (
                      <option key={c.id} value={c.nik}>
                        {c.name} — NIK: {c.nik} ({c.dusun})
                      </option>
                    ))}
                  </select>
                </div>

                {matchedWalkinCitizen && (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 text-xs space-y-1.5">
                    <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5 pb-1 border-b border-emerald-200/60">
                      <UserCheck className="w-4 h-4" />
                      <span>Data Kependudukan Warga Terpilih:</span>
                    </div>
                    <p>
                      <span className="text-gray-500">Nama / NIK:</span>{' '}
                      <strong>{matchedWalkinCitizen.name}</strong> ({matchedWalkinCitizen.nik})
                    </p>
                    <p>
                      <span className="text-gray-500">TTL / Usia:</span>{' '}
                      {matchedWalkinCitizen.birthPlace}, {matchedWalkinCitizen.birthDate} (
                      {matchedWalkinCitizen.age} Thn)
                    </p>
                    <p>
                      <span className="text-gray-500">Pekerjaan / Kawin:</span>{' '}
                      {matchedWalkinCitizen.occupation} • {matchedWalkinCitizen.maritalStatus}
                    </p>
                    <p>
                      <span className="text-gray-500">Alamat:</span> {matchedWalkinCitizen.address}, RT{' '}
                      {matchedWalkinCitizen.rt}/RW {matchedWalkinCitizen.rw} ({matchedWalkinCitizen.dusun})
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Pejabat Penandatangan Surat *
                  </label>
                  <select
                    value={walkinSignerRole}
                    onChange={(e) =>
                      setWalkinSignerRole(
                        e.target.value as 'Kepala Desa' | 'Sekretaris Desa (a.n. Kepala Desa)'
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-900 dark:text-white"
                  >
                    <option value="Kepala Desa">
                      Kepala Desa Langsung ({siteConfig.headOfVillageName})
                    </option>
                    <option value="Sekretaris Desa (a.n. Kepala Desa)">
                      a.n. Kepala Desa — Sekretaris Desa ({sekdesOfficial?.name || 'Sekretaris Desa'})
                    </option>
                  </select>
                </div>
              </div>

              {/* Right: Letter Type & Dynamic Custom Fields */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Pilih Jenis Surat Keterangan ({letterTypes.length} Jenis) *
                  </label>
                  <select
                    value={walkinLetterCode}
                    onChange={(e) => {
                      setWalkinLetterCode(e.target.value);
                      setWalkinCustomFields({});
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    {letterTypes.map((lt) => (
                      <option key={lt.code} value={lt.code}>
                        [{lt.code}] {lt.name} (Kode Arsip: {lt.classificationCode || '470'})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedWalkinType?.customFields && selectedWalkinType.customFields.length > 0 && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 space-y-3">
                    <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 block">
                      Kolom Isian Khusus {selectedWalkinType.name}:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedWalkinType.customFields.map((cf) => (
                        <div key={cf.key}>
                          <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                            {cf.label} {cf.required ? '*' : ''}
                          </label>
                          <input
                            type="text"
                            required={Boolean(cf.required)}
                            value={walkinCustomFields[cf.key] || ''}
                            onChange={(e) =>
                              setWalkinCustomFields((prev) => ({
                                ...prev,
                                [cf.key]: e.target.value,
                              }))
                            }
                            placeholder={cf.placeholder}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Keperluan Penggunaan Surat *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkinPurpose}
                    onChange={(e) => setWalkinPurpose(e.target.value)}
                    placeholder="Contoh: Persyaratan Pengajuan KUR / Administrasi KUA / Pendaftaran Sertifikat Tanah..."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Redaksi Khusus Override (Opsional — Kosongkan untuk memakai Template Otomatis)
                  </label>
                  <textarea
                    rows={2}
                    value={walkinCustomBodyOverride}
                    onChange={(e) => setWalkinCustomBodyOverride(e.target.value)}
                    placeholder={
                      selectedWalkinType?.bodyTemplate ||
                      'Gunakan variabel {{nama}}, {{nik}}, {{alamat}}, {{keterangan_khusus}}, {{keperluan}}...'
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md flex items-center space-x-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Terbitkan & Cetak Surat Resmi Sekarang (TTE)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Card 2: Daftar & Editor Template Segala Jenis Surat (Mail-Merge) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Manajemen Katalog & Editor Template Surat Desa ({letterTypes.length} Jenis Surat)
                </h3>
                <p className="text-xs text-gray-500">
                  Ubah kode arsip, tambah/edit kolom isian khusus, atau sesuaikan template kalimat surat dengan variabel{' '}
                  <code className="text-emerald-700 font-mono">
                    {'{{nama}} {{nik}} {{alamat}} {{keterangan_khusus}} {{keperluan}}'}
                  </code>
                  .
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {letterTypes.map((lt) => (
                <div
                  key={lt.code}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs">
                        {lt.code}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">
                        Kode Arsip: {lt.classificationCode || '470'}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{lt.name}</h4>
                    <p className="text-[11px] text-gray-500">{lt.category || 'Layanan Umum'}</p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2">
                      {lt.bodyTemplate || lt.shortDesc}
                    </p>
                    {lt.customFields && lt.customFields.length > 0 && (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        Kolom Dinamis: {lt.customFields.map((f) => f.label).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200/70 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => openEditLetterTypeModal(lt)}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:border-emerald-500 flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Template & Kolom</span>
                    </button>
                    {letterTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateLetterTypes(letterTypes.filter((x) => x.code !== lt.code));
                          onShowToast('Jenis Surat Dihapus', `Layanan ${lt.name} telah dihapus.`);
                        }}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                        aria-label={`Hapus ${lt.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Tambah / Edit Template Jenis Surat */}
          {isLetterTypeModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                  <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                    {editingLetterType
                      ? `Edit Template Surat: ${editingLetterType.name}`
                      : 'Buat Jenis & Template Surat Desa Baru'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsLetterTypeModalOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveLetterType} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Kode Unik Surat *</label>
                      <input
                        type="text"
                        required
                        value={ltCode}
                        onChange={(e) => setLtCode(e.target.value)}
                        placeholder="Contoh: SK_TANAH"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Kode Klasifikasi Arsip *</label>
                      <input
                        type="text"
                        required
                        value={ltClassCode}
                        onChange={(e) => setLtClassCode(e.target.value)}
                        placeholder="Contoh: 593 / 470 / 400"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Estimasi Selesai (Jam)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={ltHours}
                        onChange={(e) => setLtHours(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Nama Resmi Surat *</label>
                      <input
                        type="text"
                        required
                        value={ltName}
                        onChange={(e) => setLtName(e.target.value)}
                        placeholder="Contoh: Surat Keterangan Jual Beli Tanah"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Kategori Layanan</label>
                      <select
                        value={ltCategory}
                        onChange={(e) => setLtCategory(e.target.value as LetterCategoryName)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="Layanan Umum & Sosial">Layanan Umum & Sosial</option>
                        <option value="Administrasi Kependudukan (Dukcapil)">
                          Administrasi Kependudukan (Dukcapil)
                        </option>
                        <option value="Pernikahan / KUA (N1-N4)">Pernikahan / KUA (N1-N4)</option>
                        <option value="Ekonomi, Pertanahan & Waris">
                          Ekonomi, Pertanahan & Waris
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Deskripsi Singkat Layanan</label>
                    <input
                      type="text"
                      value={ltShortDesc}
                      onChange={(e) => setLtShortDesc(e.target.value)}
                      placeholder="Penjelasan fungsi surat bagi warga..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">
                      Syarat Dokumen (Pisahkan dengan koma)
                    </label>
                    <input
                      type="text"
                      value={ltReqText}
                      onChange={(e) => setLtReqText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">
                      Template Naskah Isi Surat (Mendukung Variabel{' '}
                      <code>{'{{nama}} {{nik}} {{alamat}} {{keterangan_khusus}} {{keperluan}}'}</code>)
                    </label>
                    <textarea
                      rows={3}
                      value={ltBodyTemplate}
                      onChange={(e) => setLtBodyTemplate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                    />
                  </div>

                  {/* Custom Fields Builder */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-2">
                    <span className="font-bold block">
                      Kolom Isian Khusus Dinamis ({ltCustomFields.length} Kolom):
                    </span>
                    <div className="space-y-1.5">
                      {ltCustomFields.map((cf, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700"
                        >
                          <span>
                            <strong>{cf.label}</strong> (<code>{cf.key}</code>) — {cf.placeholder}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setLtCustomFields(ltCustomFields.filter((_, i) => i !== idx))
                            }
                            className="text-red-600 hover:underline cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={(e) => {
                          setNewFieldLabel(e.target.value);
                          setNewFieldKey(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '_')
                              .replace(/^_|_$/g, '')
                          );
                        }}
                        placeholder="Label Kolom (Misal: Luas Tanah)"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        value={newFieldPlaceholder}
                        onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                        placeholder="Contoh Placeholder"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newFieldLabel.trim()) return;
                          setLtCustomFields([
                            ...ltCustomFields,
                            {
                              key: newFieldKey || `kolom_${ltCustomFields.length + 1}`,
                              label: newFieldLabel.trim(),
                              placeholder: newFieldPlaceholder.trim() || newFieldLabel.trim(),
                              required: true,
                            },
                          ]);
                          setNewFieldLabel('');
                          setNewFieldKey('');
                          setNewFieldPlaceholder('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                      >
                        + Tambah Kolom Isian
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsLetterTypeModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                    >
                      Simpan Template Surat
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: E-ARSIP DOKUMEN & DISPOSISI SURAT MASUK / KELUAR DIGITAL
      ===================================================================== */}
      {subTab === 'agenda_surat' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                Alur Disposisi Berjenjang: Operator → Sekdes → Kepala Desa → Kaur/Kasi → Selesai Arsip
              </span>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                Catat E-Arsip Surat Masuk / Surat Keluar & Lembar Disposisi Digital
              </h3>
            </div>
            <form onSubmit={handleAddMailLog} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <select
                value={mailBookType}
                onChange={(e) => setMailBookType(e.target.value as 'SURAT_MASUK' | 'SURAT_KELUAR')}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                <option value="SURAT_MASUK">Buku Surat Masuk (Disposisi Berjenjang)</option>
                <option value="SURAT_KELUAR">Buku Surat Keluar / Ekspedisi</option>
              </select>
              <input
                type="text"
                required
                value={mailLetterNumber}
                onChange={(e) => setMailLetterNumber(e.target.value)}
                placeholder="Nomor Surat (Contoh: 005/120/Kec/2026) *"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={mailSenderOrRecipient}
                onChange={(e) => setMailSenderOrRecipient(e.target.value)}
                placeholder="Pengirim / Tujuan Instansi *"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                placeholder="Perihal / Pokok Surat *"
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={mailDispositionTo}
                onChange={(e) => setMailDispositionTo(e.target.value)}
                placeholder="Disposisi Kepada (Misal: Sekdes / Kasi Pelayanan)"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={mailDispositionInstruction}
                onChange={(e) => setMailDispositionInstruction(e.target.value)}
                placeholder="Instruksi Disposisi Kepala Desa..."
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={mailAttachmentName}
                onChange={(e) => setMailAttachmentName(e.target.value)}
                placeholder="Nama Berkas Scan (Misal: Scan_Undangan_Kecamatan.pdf)"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                + Simpan ke E-Arsip & Agenda Surat
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Register E-Arsip & Tracking Disposisi Surat ({incomingOutboxLetters.length})
              </h4>
              <div className="flex gap-2">
                {(['SEMUA', 'SURAT_MASUK', 'SURAT_KELUAR'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMailFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      mailFilter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-slate-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {incomingOutboxLetters
                .filter((m) => mailFilter === 'SEMUA' || m.bookType === mailFilter)
                .map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              m.bookType === 'SURAT_MASUK'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {m.bookType} • {m.agendaNumber}
                          </span>
                          <span className="font-mono text-gray-500">No: {m.letterNumber}</span>
                          <span className="text-gray-400">({m.letterDate})</span>
                          {m.attachmentName && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[10px]">
                              Lampiran Scan: {m.attachmentName}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{m.subject}</p>
                        <p className="text-gray-600 dark:text-gray-300">
                          Pengirim/Tujuan: <strong>{m.senderOrRecipient}</strong> • Disposisi:{' '}
                          <strong>{m.dispositionTo || '-'}</strong> — "{m.dispositionInstruction || '-'}"
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {m.currentStage !== 'Selesai Arsip' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceDispositionStage(m)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Teruskan Disposisi →
                          </button>
                        )}
                        <select
                          value={m.dispositionStatus || 'Didisposisikan'}
                          onChange={(e) => {
                            const next = incomingOutboxLetters.map((item) =>
                              item.id === m.id
                                ? {
                                    ...item,
                                    dispositionStatus: e.target
                                      .value as VillageMailLog['dispositionStatus'],
                                  }
                                : item
                            );
                            onUpdateIncomingOutboxLetters(next);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        >
                          <option value="Menunggu Disposisi">Menunggu Disposisi</option>
                          <option value="Didisposisikan">Didisposisikan</option>
                          <option value="Ditindaklanjuti">Ditindaklanjuti</option>
                          <option value="Selesai Arsip">Selesai Arsip</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateIncomingOutboxLetters(
                              incomingOutboxLetters.filter((x) => x.id !== m.id)
                            )
                          }
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Visual Alur Disposisi Berjenjang */}
                    {m.dispositionChain && m.dispositionChain.length > 0 && (
                      <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                        <p className="text-[10px] font-extrabold uppercase text-gray-500 mb-1.5">
                          Tracking Alur Disposisi Digital (Posisi Saat Ini: {m.currentStage || m.dispositionStatus}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          {m.dispositionChain.map((step, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border text-[11px] ${
                                step.status === 'Selesai'
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-emerald-800 dark:text-emerald-300">
                                  {idx + 1}. {step.stage}
                                </span>
                                <span className="text-[10px] text-gray-500">{step.status}</span>
                              </div>
                              <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                                {step.actorName}
                              </p>
                              <p className="text-[10px] text-gray-500 line-clamp-2">{step.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: BUKU MUTASI PENDUDUK DESA (LAHIR, MATI, PINDAH, DATANG)
      ===================================================================== */}
      {subTab === 'mutasi_penduduk' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
              Tambah Catatan Buku Mutasi Penduduk (Lahir / Mati / Pindah / Datang)
            </h3>
            <form onSubmit={handleAddMutation} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <select
                value={mutType}
                onChange={(e) =>
                  setMutType(e.target.value as PopulationMutationItem['mutationType'])
                }
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                <option value="KELAHIRAN">KELAHIRAN (+ Warga Baru)</option>
                <option value="DATANG_MASUK">DATANG MASUK (+ Pendatang)</option>
                <option value="PINDAH_KELUAR">PINDAH KELUAR (- SKPWNI)</option>
                <option value="KEMATIAN">KEMATIAN (- Meninggal Dunia)</option>
              </select>
              <input
                type="text"
                required
                value={mutName}
                onChange={(e) => setMutName(e.target.value)}
                placeholder="Nama Lengkap Warga / Bayi *"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={mutNik}
                onChange={(e) => setMutNik(e.target.value)}
                placeholder="NIK 16 Digit"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <select
                value={mutDusun}
                onChange={(e) => setMutDusun(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {hamlets.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={mutNotes}
                onChange={(e) => setMutNotes(e.target.value)}
                placeholder="Keterangan Mutasi (Sebab / Alamat Tujuan / RS Kelahiran)..."
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
              >
                + Catat Mutasi Penduduk
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
              Daftar Riwayat Buku Mutasi Penduduk ({populationMutations.length} Peristiwa)
            </h4>
            {populationMutations.map((mut) => (
              <div
                key={mut.id}
                className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                    {mut.mutationType} • {mut.date}
                  </span>
                  <p className="font-bold text-gray-900 dark:text-white mt-1">
                    {mut.citizenName} (NIK: {mut.nik}) — {mut.dusun} ({mut.rtRw})
                  </p>
                  <p className="text-gray-500">{mut.notes}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePopulationMutations(
                      populationMutations.filter((x) => x.id !== mut.id)
                    )
                  }
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: BUKU INVENTARIS KEKAYAAN & TANAH KAS DESA (TKD)
      ===================================================================== */}
      {subTab === 'aset_tkd' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
              Tambah Inventaris Aset & Tanah Kas Desa (TKD) Baru
            </h3>
            <form onSubmit={handleAddAsset} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                required
                value={astName}
                onChange={(e) => setAstName(e.target.value)}
                placeholder="Nama Aset / Bidang Tanah Kas Desa *"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={astCategory}
                onChange={(e) => setAstCategory(e.target.value as VillageAssetItem['category'])}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                <option value="Tanah Kas Desa (TKD)">Tanah Kas Desa (TKD)</option>
                <option value="Bangunan & Gedung">Bangunan & Gedung</option>
                <option value="Kendaraan Dinas / Siaga">Kendaraan Dinas / Siaga</option>
                <option value="Peralatan & Mesin Digital">Peralatan & Mesin Digital</option>
                <option value="Infrastruktur Desa">Infrastruktur Desa</option>
              </select>
              <input
                type="number"
                value={astValue}
                onChange={(e) => setAstValue(Number(e.target.value))}
                placeholder="Nilai Aset (Rp)"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={astQty}
                onChange={(e) => setAstQty(e.target.value)}
                placeholder="Luas / Jumlah Unit (Misal: 1,5 Ha / 2 Unit)"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={astLocation}
                onChange={(e) => setAstLocation(e.target.value)}
                placeholder="Lokasi Aset Desa"
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
              >
                + Simpan ke Buku Inventaris Desa
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
              Buku Inventaris Kekayaan & Aset {siteConfig.villageName} ({villageAssets.length} Aset)
            </h4>
            {villageAssets.map((ast) => (
              <div
                key={ast.id}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono text-[10px] text-emerald-700 font-bold">
                    {ast.assetCode} • {ast.category}
                  </span>
                  <p className="font-bold text-gray-900 dark:text-white">{ast.name}</p>
                  <p className="text-gray-500">
                    {ast.quantityLabel} • Lokasi: {ast.location} • Nilai: Rp{' '}
                    {ast.valueRupiah.toLocaleString('id-ID')} ({ast.sourceFund})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateVillageAssets(villageAssets.filter((x) => x.id !== ast.id))
                  }
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 5: KELOLA KPM BANTUAN SOSIAL & DTKS (BLT-DD, PKH, BPNT, BEASISWA, RUTILAHU)
      ===================================================================== */}
      {subTab === 'bansos_dtks' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                Manajemen Penetapan Keluarga Penerima Manfaat (KPM) Bansos & DTKS Desa
              </h3>
              <p className="text-xs text-gray-500">
                Ubah status kepesertaan bantuan sosial warga (BLT Dana Desa, PKH, BPNT, BPJS PBI, Beasiswa Desa, Rutilahu) secara dinamis dan langsung terpublikasi di halaman Cek Bansos Mandiri.
              </p>
            </div>
            <input
              type="text"
              value={bansosAdminSearch}
              onChange={(e) => setBansosAdminSearch(e.target.value)}
              placeholder="Cari nama atau NIK warga..."
              className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs sm:w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 uppercase text-[11px]">
                  <th className="py-3 px-3">Nama & NIK / KK</th>
                  <th className="py-3 px-3">Dusun & Pekerjaan</th>
                  <th className="py-3 px-3">Status Bansos Saat Ini</th>
                  <th className="py-3 px-3">Ubah Penetapan Program Bansos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {citizens
                  .filter(
                    (c) =>
                      !bansosAdminSearch ||
                      c.name.toLowerCase().includes(bansosAdminSearch.toLowerCase()) ||
                      c.nik.includes(bansosAdminSearch)
                  )
                  .map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                        <p className="font-mono text-[11px] text-gray-500">
                          NIK: {c.nik} • KK: {c.kk}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        {c.dusun} • {c.occupation}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            c.aidStatus === 'Non-Penerima'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.aidStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={c.aidStatus}
                          onChange={(e) =>
                            handleChangeCitizenAidStatus(c.id, e.target.value as AidStatus)
                          }
                          className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                        >
                          <option value="Non-Penerima">Non-Penerima</option>
                          <option value="BLT Dana Desa">BLT Dana Desa</option>
                          <option value="PKH">PKH (Program Keluarga Harapan)</option>
                          <option value="BPNT">BPNT (Bantuan Pangan Non Tunai)</option>
                          <option value="BPJS PBI">BPJS PBI (Jaminan Kesehatan Desa)</option>
                          <option value="Beasiswa Desa">Beasiswa Desa Berprestasi</option>
                          <option value="Rutilahu">Bantuan Rutilahu (Rumah Layak Huni)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 6: MANAJEMEN POSYANDU, TUMBUH KEMBANG BALITA & PENCEGAHAN STUNTING
      ===================================================================== */}
      {subTab === 'posyandu_stunting' && (
        <div className="space-y-6 text-xs">
          {/* KPI Ringkasan Stunting & Posyandu */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-emerald-600">
                Total Balita Dipantau KMS
              </span>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 font-mono">
                {stuntingMetrics.totalBalita} Balita
              </p>
              <p className="text-[11px] text-gray-500">
                Gizi Baik: {stuntingMetrics.normalCount} • Ibu Hamil: {stuntingMetrics.totalIbuHamil}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-amber-600">
                Prevalensi Stunting Desa
              </span>
              <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">
                {stuntingMetrics.stuntingRatePercent}%
              </p>
              <p className="text-[11px] text-gray-500">
                Target Nasional/Desa: &le; {stuntingMetrics.targetPercent}% ({stuntingMetrics.stuntingRiskCount} Kasus)
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-blue-600">
                Cakupan PMT Bergizi
              </span>
              <p className="text-2xl font-extrabold text-blue-600 mt-1 font-mono">
                {stuntingMetrics.pmtCoveragePercent}%
              </p>
              <p className="text-[11px] text-gray-500">Program Makanan Tambahan Desa</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-teal-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-teal-600">
                Imunisasi Dasar & Vitamin A
              </span>
              <p className="text-2xl font-extrabold text-teal-600 mt-1 font-mono">
                {stuntingMetrics.immunizationCoveragePercent}%
              </p>
              <p className="text-[11px] text-gray-500">Lengkap sesuai jadwal Posyandu</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Catat Tumbuh Kembang Balita / Ibu Hamil */}
            <form
              onSubmit={handleAddPosyanduRecord}
              className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                Catat Pengukuran KMS Balita / Pemeriksaan Ibu Hamil Baru
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">Kategori Peserta</label>
                  <select
                    value={posCategory}
                    onChange={(e) => setPosCategory(e.target.value as 'Balita' | 'Ibu Hamil')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Balita">Balita (0-59 Bulan)</option>
                    <option value="Ibu Hamil">Ibu Hamil (KEK/ANC)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Wilayah Dusun</label>
                  <select
                    value={posDusun}
                    onChange={(e) => setPosDusun(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {hamlets.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <input
                type="text"
                required
                value={posChildName}
                onChange={(e) => setPosChildName(e.target.value)}
                placeholder="Nama Lengkap Balita / Ibu Hamil *"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={posMotherName}
                  onChange={(e) => setPosMotherName(e.target.value)}
                  placeholder="Nama Orang Tua / Suami"
                  className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={posNik}
                  onChange={(e) => setPosNik(e.target.value)}
                  placeholder="NIK (16 Digit)"
                  className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">Usia (Bln)</label>
                  <input
                    type="number"
                    value={posAgeMonths}
                    onChange={(e) => setPosAgeMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Berat (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={posWeightKg}
                    onChange={(e) => setPosWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tinggi (Cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={posHeightCm}
                    onChange={(e) => setPosHeightCm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Indikator Status Gizi & Stunting</label>
                <select
                  value={posNutrition}
                  onChange={(e) => setPosNutrition(e.target.value as NutritionalStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="Gizi Baik (Normal)">Gizi Baik (Normal)</option>
                  <option value="Risiko Stunting (Pendek)">Risiko Stunting (Pendek)</option>
                  <option value="Gizi Kurang (Bawah Garis Merah)">
                    Gizi Kurang (Bawah Garis Merah)
                  </option>
                  <option value="Gizi Lebih">Gizi Lebih</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                + Simpan Data Pemantauan Posyandu ke Database
              </button>
            </form>

            {/* Daftar Pemantauan Tumbuh Kembang & Jadwal Posyandu */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Daftar Pemantauan Tumbuh Kembang Balita & Ibu Hamil ({posyanduRecords.length} Peserta)
                </h4>
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {posyanduRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {rec.category} • {rec.dusun}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              rec.nutritionalStatus === 'Gizi Baik (Normal)'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.nutritionalStatus}
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white mt-1">
                          {rec.childOrMotherName} (Ortu/Suami: {rec.parentOrSpouseName})
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Usia/Kandungan: {rec.ageMonths} Bln • BB: {rec.weightKg} Kg • TB:{' '}
                          {rec.heightCm} Cm • {rec.notes}
                        </p>
                      </div>
                      {onUpdateSiteConfig && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSiteConfig({
                              ...siteConfig,
                              posyanduRecords: posyanduRecords.filter((x) => x.id !== rec.id),
                            })
                          }
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Jadwal Posyandu per Dusun */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Jadwal Posyandu Rutin per Dusun ({posyanduSchedules.length} Posyandu)
                </h4>
                <form onSubmit={handleAddPosyanduSchedule} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={schedPosName}
                    onChange={(e) => setSchedPosName(e.target.value)}
                    placeholder="Nama Posyandu *"
                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={schedDayLabel}
                    onChange={(e) => setSchedDayLabel(e.target.value)}
                    placeholder="Jadwal Rutin"
                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    + Tambah Jadwal Posyandu
                  </button>
                </form>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {posyanduSchedules.map((ps) => (
                    <div
                      key={ps.id}
                      className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 space-y-1"
                    >
                      <p className="font-bold text-gray-900 dark:text-white">{ps.posyanduName}</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        {ps.dusun} • {ps.scheduleDayLabel}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Lokasi: {ps.location} • Bidan: {ps.midwifeName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
