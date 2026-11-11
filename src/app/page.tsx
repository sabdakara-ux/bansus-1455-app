'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// --- INTERFACES ---
interface Anggota { id: number; nama: string; nik: string; hp: string; role: string; status: string; }
interface Kas { id: number; tgl: string; jenis: string; nominal: number; ket: string; }
interface Kegiatan { id: number; nama: string; tgl: string; waktu: string; lokasi: string; status: string; }
interface LaporanData { id: number; tgl: string; nama: string; lokasi: string; qori: string; pendamping: string; r4: number; r2: number; dana: string; catatan: string; }
interface ArsipData { id: number; jenis: 'Masuk' | 'Keluar'; noSurat: string; tgl: string; asalTujuan: string; perihal: string; link: string; }

// --- DATABASE KOSONG (PRODUCTION READY) ---
const INITIAL_DB = {
  anggota: [] as Anggota[],
  kas: [] as Kas[],
  kegiatan: [] as Kegiatan[],
  laporan: [] as LaporanData[],
  arsip: [] as ArsipData[]
};

export default function HomePage() {
  // --- STATE MOUNTING (Mencegah Error Hydration Next.js) ---
  const [isMounted, setIsMounted] = useState(false);

  // --- AUTH & NAV STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [role, setRole] = useState<'Admin' | 'Bendahara' | 'Korlap' | 'Anggota'>('Admin');
  const [view, setView] = useState<'dashboard' | 'kas' | 'kegiatan' | 'anggota' | 'administrasi'>('dashboard');
  const [adminTab, setAdminTab] = useState<'lapor' | 'surattugas' | 'arsip'>('lapor');
  
  // --- DATA & MODAL STATE ---
  const [db, setDb] = useState(INITIAL_DB);
  const [modal, setModal] = useState({ show: false, title: '', message: '' });
  
  const [showKasModal, setShowKasModal] = useState(false);
  const [showAnggotaModal, setShowAnggotaModal] = useState(false);
  const [showKegiatanModal, setShowKegiatanModal] = useState(false);
  const [showArsipModal, setShowArsipModal] = useState(false);

  // --- FORM STATES ---
  const [kasForm, setKasForm] = useState({ jenis: 'Pemasukan', ket: '', nominal: 5000 });
  const [anggotaForm, setAnggotaForm] = useState({ nama: '', nik: '', hp: '', role: 'Anggota' });
  const [kegiatanForm, setKegiatanForm] = useState({ nama: '', tgl: '', waktu: '', lokasi: '' });
  const [lapForm, setLapForm] = useState({ tgl: '', nama: '', lokasi: '', qori: '', pendamping: '', r4: '0', r2: '0', dana: '', catatan: '' });
  const [filterStartTgl, setFilterStartTgl] = useState(new Date().toISOString().split('T')[0]);
  const [filterEndTgl, setFilterEndTgl] = useState(new Date().toISOString().split('T')[0]);
  const [arsipForm, setArsipForm] = useState({ jenis: 'Masuk' as 'Masuk'|'Keluar', noSurat: '', tgl: '', asalTujuan: '', perihal: '', link: '' });
  const [stForm, setStForm] = useState({ noSurat: '', tugas: '', tgl: '', lokasi: '' });
  const [stAnggotaTerpilih, setStAnggotaTerpilih] = useState<string[]>([]);

  // --- PLOTING STATES ---
  const [setupVisible, setSetupVisible] = useState<Record<number, boolean>>({});
  const [jumlahPos, setJumlahPos] = useState<Record<number, number>>({});
  const [modePloting, setModePloting] = useState<Record<number, 'auto' | 'manual'>>({});
  const [checkedAnggota, setCheckedAnggota] = useState<Record<number, string[]>>({});
  const [manualPos, setManualPos] = useState<Record<number, Record<string, number>>>({});
  const [activePloting, setActivePloting] = useState<Record<number, any>>({});
  const [kebutuhanPos, setKebutuhanPos] = useState<Record<number, Record<number, number>>>({});

  // --- CEK LOCAL STORAGE SAAT PERTAMA KALI LOAD ---
  useEffect(() => {
    setIsMounted(true);
    const savedAuth = localStorage.getItem('bansusAuth');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed.isLoggedIn) {
          setIsLoggedIn(true);
          setRole(parsed.role);
        }
      } catch (e) {
        console.error("Gagal membaca sesi login", e);
      }
    }
  }, []);

  // --- UTILS ---
  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka);
  const showModalNotice = (title: string, message: string) => setModal({ show: true, title, message });

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput.trim().toLowerCase();
    let newRole: any = null;

    if (u === 'admin' && p === 'admin') newRole = 'Admin';
    else if (u === 'korlap' && p === 'korlap') newRole = 'Korlap';
    else if (u === 'bendahara' && p === 'bendahara') newRole = 'Bendahara';
    
    if (newRole) {
        setRole(newRole);
        setIsLoggedIn(true);
        setView('dashboard');
        // Simpan sesi login ke Local Storage agar tidak hilang saat refresh
        localStorage.setItem('bansusAuth', JSON.stringify({ isLoggedIn: true, role: newRole }));
    } else {
        setLoginError('Username atau password salah!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setView('dashboard');
    setUsernameInput('');
    setPasswordInput('');
    // Hapus sesi dari Local Storage
    localStorage.removeItem('bansusAuth');
  };

  const handleSimpanKas = (e: React.FormEvent) => {
    e.preventDefault();
    setDb(prev => ({ ...prev, kas: [...prev.kas, { id: Date.now(), tgl: new Date().toISOString().split('T')[0], jenis: kasForm.jenis, ket: kasForm.ket, nominal: Number(kasForm.nominal) }] }));
    setShowKasModal(false); setKasForm({ jenis: 'Pemasukan', ket: '', nominal: 5000 });
    showModalNotice('Berhasil', 'Transaksi Kas ditambahkan ke Buku Kas.');
  };

  const handleSimpanAnggota = (e: React.FormEvent) => {
    e.preventDefault();
    setDb(prev => ({ ...prev, anggota: [...prev.anggota, { id: Date.now(), nama: anggotaForm.nama, nik: anggotaForm.nik || '-', hp: anggotaForm.hp || '-', role: anggotaForm.role, status: 'Aktif' }] }));
    setShowAnggotaModal(false); setAnggotaForm({ nama: '', nik: '', hp: '', role: 'Anggota' });
    showModalNotice('Berhasil', 'Anggota baru ditambahkan.');
  };

  const handleSimpanKegiatan = (e: React.FormEvent) => {
    e.preventDefault();
    setDb(prev => ({ ...prev, kegiatan: [...prev.kegiatan, { id: Date.now(), nama: kegiatanForm.nama, tgl: kegiatanForm.tgl || '-', waktu: kegiatanForm.waktu || '-', lokasi: kegiatanForm.lokasi || '-', status: 'Mendatang' }] }));
    setShowKegiatanModal(false); setKegiatanForm({ nama: '', tgl: '', waktu: '', lokasi: '' });
    showModalNotice('Berhasil', 'Jadwal kegiatan ditambahkan.');
  };

  const handleSimpanLaporan = (e: React.FormEvent) => {
    e.preventDefault();
    setDb(prev => ({ ...prev, laporan: [...prev.laporan, { id: Date.now(), tgl: lapForm.tgl || new Date().toISOString().split('T')[0], nama: lapForm.nama, lokasi: lapForm.lokasi, qori: lapForm.qori, pendamping: lapForm.pendamping, r4: Number(lapForm.r4), r2: Number(lapForm.r2), dana: lapForm.dana, catatan: lapForm.catatan }] }));
    setLapForm({ tgl: '', nama: '', lokasi: '', qori: '', pendamping: '', r4: '0', r2: '0', dana: '', catatan: '' });
    showModalNotice('Disimpan', 'Laporan kegiatan telah dimasukkan ke database sistem.');
  };

  const handleSimpanArsip = (e: React.FormEvent) => {
    e.preventDefault();
    setDb(prev => ({ ...prev, arsip: [...prev.arsip, { id: Date.now(), jenis: arsipForm.jenis, noSurat: arsipForm.noSurat, tgl: arsipForm.tgl, asalTujuan: arsipForm.asalTujuan, perihal: arsipForm.perihal, link: arsipForm.link }] }));
    setShowArsipModal(false); setArsipForm({ jenis: 'Masuk', noSurat: '', tgl: '', asalTujuan: '', perihal: '', link: '' });
    showModalNotice('Berhasil', 'Arsip surat berhasil dicatat.');
  };

  // --- EXPORT HANDLERS ---
  const downloadExcel = () => {
    if(db.kas.length === 0) return showModalNotice('Gagal', 'Belum ada data kas untuk diunduh.');
    const dataUntukExcel = db.kas.map(k => ({
      'Tanggal': k.tgl,
      'Jenis Transaksi': k.jenis,
      'Keterangan / Nama Iuran': k.ket,
      'Nominal (Rp)': k.nominal
    }));
    const ws = XLSX.utils.json_to_sheet(dataUntukExcel);
    ws['!cols'] = [{wch: 15}, {wch: 18}, {wch: 35}, {wch: 15}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas");
    XLSX.writeFile(wb, "Laporan_Kas_BANSUS_1455.xlsx");
    showModalNotice('Berhasil', 'Laporan Kas (Excel) berhasil diunduh.');
  };

  const handleUnduhRekapDocx = () => {
    const laporanTersaring = db.laporan.filter(l => l.tgl >= filterStartTgl && l.tgl <= filterEndTgl);
    if(laporanTersaring.length === 0) return showModalNotice('Gagal', 'Tidak ada data laporan pada periode tersebut.');

    let isiLaporan = laporanTersaring.map((lap, index) => `
      <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
        <p><strong>${index + 1}. Nama Kegiatan:</strong> ${lap.nama}</p>
        <p><strong>Tanggal:</strong> ${lap.tgl} &nbsp;|&nbsp; <strong>Lokasi:</strong> ${lap.lokasi}</p>
        <p><strong>Qori/Pendamping:</strong> ${lap.qori || '-'} / ${lap.pendamping || '-'}</p>
        <p><strong>Armada:</strong> Mobil (${lap.r4}), Motor (${lap.r2})</p>
        <p><strong>Sumber Dana:</strong> ${lap.dana || '-'}</p>
        <p><strong>Catatan/Evaluasi:</strong> ${lap.catatan || '-'}</p>
      </div>
    `).join('');

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Rekap Laporan</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h2 style="text-align: center;">REKAPITULASI LAPORAN KEGIATAN</h2>
        <h3 style="text-align: center;">BANSUS 1455</h3>
        <p style="text-align: center;">Periode: ${filterStartTgl} s/d ${filterEndTgl}</p>
        <hr/><br/>
        ${isiLaporan}
      </body>
      </html>
    `;
    const converted = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(converted);
    const a = document.createElement('a');
    a.href = url; a.download = `Rekap_Kegiatan_${filterStartTgl}.docx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showModalNotice('Berhasil', 'Rekapitulasi Laporan (.docx) berhasil diunduh.');
  };

  const handleUnduhSuratTugas = async () => {
    if(stAnggotaTerpilih.length === 0) return showModalNotice('Gagal', 'Pilih minimal 1 anggota untuk ditugaskan.');
    if(!stForm.tugas) return showModalNotice('Gagal', 'Tujuan penugasan wajib diisi.');

    const anggotaHtml = stAnggotaTerpilih.map((nama, idx) => `<tr><td style="width: 30px; padding: 4px;">${idx+1}.</td><td style="padding: 4px;"><strong>${nama}</strong></td></tr>`).join('');
    
    // HTML Template untuk PDF Render
    const docContent = `
      <div style="font-family: 'Times New Roman', serif; line-height: 1.5; padding: 40px; font-size: 14px; color: black; background: white; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">BADAN KHUSUS (BANSUS) 1455</h2>
          <p style="margin: 0; font-size: 12px;">Sistem Manajemen Operasional & Kebencanaan</p>
        </div>
        <div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 5px; font-size: 16px;">SURAT TUGAS</div>
        <div style="text-align: center; margin-bottom: 30px; font-size: 12px;">Nomor: ${stForm.noSurat || '___/ST/BANSUS/2026'}</div>
        
        <div style="text-align: justify; margin-bottom: 20px;">
          <p>Berdasarkan kebutuhan operasional, dengan ini Ketua BANSUS 1455 menugaskan nama-nama di bawah ini:</p>
          <table style="margin-left: 20px; margin-top: 10px; margin-bottom: 15px;">${anggotaHtml}</table>
          <p>Untuk melaksanakan penugasan: <strong>${stForm.tugas}</strong>.</p>
          <p>Penugasan ini akan dilaksanakan pada:<br/>Tanggal: ${stForm.tgl || '_____________'}<br/>Tempat: ${stForm.lokasi || '_____________'}</p>
          <p>Demikian surat tugas ini dibuat agar dapat dilaksanakan dengan penuh tanggung jawab.</p>
        </div>
        
        <table style="width: 100%; margin-top: 50px; text-align: right;">
          <tr>
            <td></td>
            <td style="width: 250px;">
              <div style="display: inline-block; text-align: center;">
                Ditetapkan di: Sampang<br/>
                Pada Tanggal: ${new Date().toLocaleDateString('id-ID')}<br/><br/><br/><br/>
                <strong>( ______________________ )</strong><br/>
                Ketua BANSUS 1455
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.createElement('div');
      element.innerHTML = docContent;
      
      const fileName = `Surat_Tugas_${stForm.tugas.substring(0, 15).replace(/\s+/g, '_')}.pdf`;
      
      const opt: any = {
        margin:       0.5,
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save();
      showModalNotice('Berhasil', `Surat Tugas (.pdf) berhasil dibuat dan sedang diunduh.`);
    } catch (error) {
      console.error(error);
      showModalNotice('Gagal', 'Gagal membuat PDF. Pastikan Anda telah menjalankan perintah "npm install html2pdf.js" di terminal.');
    }
  };

  // --- PLOTING LOGIC ---
  const toggleSetup = (kegId: number) => {
    setSetupVisible(prev => ({ ...prev, [kegId]: !prev[kegId] }));
    if (!jumlahPos[kegId]) setJumlahPos(prev => ({ ...prev, [kegId]: 2 }));
    if (!modePloting[kegId]) setModePloting(prev => ({ ...prev, [kegId]: 'auto' }));
    if (!checkedAnggota[kegId]) {
      const aktif = db.anggota.filter(a => a.status === 'Aktif').map(a => a.nama);
      setCheckedAnggota(prev => ({ ...prev, [kegId]: aktif }));
    }
  };

  const handleRunPloting = (kegId: number) => {
    const jPos = jumlahPos[kegId] || 2;
    const mode = modePloting[kegId] || 'auto';
    const hadir = checkedAnggota[kegId] || [];
    if(hadir.length === 0) return showModalNotice('Gagal', 'Pilih minimal 1 anggota.');

    const posData = Array.from({ length: jPos }, (_, i) => ({ name: `Pos ${i + 1}`, anggota: [] as string[] }));
    const kebPos = kebutuhanPos[kegId] || {};
    let unassigned = [...hadir];

    if (mode === 'auto') {
      const shuffled = [...hadir].sort(() => 0.5 - Math.random());
      
      let isSpecificNeed = Object.keys(kebPos).length > 0;
      
      if (isSpecificNeed) {
          for (let i = 0; i < jPos; i++) {
              const butuh = kebPos[i] || 0;
              for (let b = 0; b < butuh; b++) {
                  if (shuffled.length > 0) {
                      const ang = shuffled.pop()!;
                      posData[i].anggota.push(ang);
                      unassigned = unassigned.filter(a => a !== ang);
                  }
              }
          }
      } else {
          shuffled.forEach((nama, idx) => {
             posData[idx % jPos].anggota.push(nama);
             unassigned = unassigned.filter(a => a !== nama);
          });
      }
    } else {
      const mPos = manualPos[kegId] || {};
      hadir.forEach(nama => {
        const assigned = mPos[nama] ?? 0;
        if(assigned >= 0 && assigned < jPos) {
            posData[assigned].anggota.push(nama);
            unassigned = unassigned.filter(a => a !== nama);
        }
      });
    }

    setActivePloting(prev => ({ ...prev, [kegId]: { pos: posData, unassigned } }));
    setSetupVisible(prev => ({ ...prev, [kegId]: false }));
    showModalNotice('Berhasil', 'Ploting berhasil dilakukan.');
  };

  // Cegah error Hydration (render kosong sampai check localStorage selesai)
  if (!isMounted) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
           </div>;
  }

  // --- RENDER LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="max-w-[480px] mx-auto bg-white min-h-screen relative shadow-lg flex flex-col justify-center p-6">
        <div className="text-center mb-8">
          <div className="h-20 w-20 bg-red-600 text-white rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg mb-3">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-wider">BANSUS 1455</h1>
          <p className="text-xs text-gray-500 mt-1">KOMWIL SAMPANG</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {loginError && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center font-semibold">{loginError}</div>}
          <input type="text" placeholder="Username (cth: admin)" value={usernameInput} onChange={e=>setUsernameInput(e.target.value)} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-red-600 bg-gray-50"/>
          <input type="password" placeholder="Password (cth: admin)" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-red-600 bg-gray-50"/>
          <button type="submit" className="w-full bg-red-600 text-white py-3.5 rounded-xl text-sm font-bold shadow-md hover:bg-red-700">MASUK APLIKASI</button>
        </form>
      </div>
    );
  }

  // --- MAIN LAYOUT & VIEWS ---
  const totalPemasukan = db.kas.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + k.nominal, 0);
  const totalPengeluaran = db.kas.filter(k => k.jenis === 'Pengeluaran').reduce((s, k) => s + k.nominal, 0);
  const saldo = totalPemasukan - totalPengeluaran;
  const totalAnggotaAktif = db.anggota.filter(a => a.status === 'Aktif').length;

  return (
    <div className="max-w-[480px] mx-auto bg-gray-50 min-h-screen relative shadow-lg pb-24">
      {/* HEADER */}
      <header className="bg-red-600 text-white p-4 sticky top-0 z-40 flex justify-between items-center shadow-md">
        <h1 className="text-lg font-bold tracking-wider uppercase"><i className="fa-solid fa-shield-halved mr-2"></i> BANSUS 1455</h1>
        <div className="flex gap-2 items-center">
            <span className="text-xs bg-white text-red-600 px-2 py-1 rounded-full font-bold shadow-sm">{role}</span>
            <button onClick={handleLogout} className="h-7 w-7 rounded-full bg-red-700 hover:bg-red-800 flex items-center justify-center text-xs" title="Logout">
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
        </div>
      </header>

      {/* CONTENT AREA */}
      <main className="p-4 space-y-6">
        
        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && (
          <div className="fade-in">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Ringkasan Kas</h2>
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10 text-6xl"><i className="fa-solid fa-coins"></i></div>
                <p className="text-xs opacity-80 mb-1">Total Saldo Saat Ini</p>
                <h3 className="text-3xl font-bold mb-4 tracking-tight">{formatRupiah(saldo)}</h3>
                <div className="flex justify-between border-t border-green-500/50 pt-3 text-[10px]">
                    <div><p className="opacity-80">Masuk Bulan Ini</p><p className="font-bold text-sm">+{formatRupiah(totalPemasukan)}</p></div>
                    <div className="text-right"><p className="opacity-80">Keluar Bulan Ini</p><p className="font-bold text-sm text-red-200">-{formatRupiah(totalPengeluaran)}</p></div>
                </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Statistik SDM</h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Total Anggota Aktif</p>
                    <p className="text-2xl font-bold text-gray-800">{totalAnggotaAktif} <span className="text-sm font-normal text-gray-500">Personel</span></p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xl"><i className="fa-solid fa-users"></i></div>
            </div>
          </div>
        )}

        {/* VIEW: KAS */}
        {view === 'kas' && (
          <div className="fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">Buku Kas</h2>
                <div className="flex gap-2">
                    <button onClick={downloadExcel} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow hover:bg-blue-700"><i className="fa-solid fa-download"></i></button>
                    <button onClick={() => setShowKasModal(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow hover:bg-green-700"><i className="fa-solid fa-plus"></i></button>
                </div>
            </div>
            {db.kas.length === 0 && <p className="text-center text-xs text-gray-500 mt-10">Belum ada transaksi kas.</p>}
            <div className="space-y-3">
              {db.kas.slice().reverse().map(k => (
                <div key={k.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center mr-3 text-sm ${k.jenis === 'Pemasukan' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <i className={`fa-solid ${k.jenis === 'Pemasukan' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                        </div>
                        <div><p className="font-bold text-gray-800 text-xs">{k.ket}</p><p className="text-[10px] text-gray-500">{k.tgl}</p></div>
                    </div>
                    <p className={`font-bold text-xs ${k.jenis === 'Pemasukan' ? 'text-green-600' : 'text-red-600'}`}>
                        {k.jenis === 'Pemasukan' ? '+' : '-'}{formatRupiah(k.nominal)}
                    </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: KEGIATAN */}
        {view === 'kegiatan' && (
          <div className="fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">Jadwal Kegiatan</h2>
                <button onClick={() => setShowKegiatanModal(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow hover:bg-green-700"><i className="fa-solid fa-plus mr-1"></i> Baru</button>
            </div>
            {db.kegiatan.length === 0 && <p className="text-center text-xs text-gray-500 mt-10">Belum ada jadwal kegiatan.</p>}
            <div className="space-y-4">
              {db.kegiatan.map(k => (
                <div key={k.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                      <div>
                          <h3 className="font-bold text-gray-800 text-sm leading-tight">{k.nama}</h3>
                          <p className="text-[10px] text-gray-500 mt-1"><i className="fa-regular fa-calendar mr-1"></i> {k.tgl} | <i className="fa-regular fa-clock mr-1"></i> {k.waktu}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5"><i className="fa-solid fa-location-dot mr-1"></i> {k.lokasi}</p>
                      </div>
                      <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-1 rounded uppercase">{k.status}</span>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-3 mt-2">
                      <button onClick={() => toggleSetup(k.id)} className="w-full bg-red-50 text-red-600 border border-red-200 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100">
                          <i className="fa-solid fa-list-check mr-1"></i> {setupVisible[k.id] ? 'Tutup Setup' : 'Setup Ploting Pos'}
                      </button>

                      {/* FORM SETUP PLOTING */}
                      {setupVisible[k.id] && (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-gray-700">Jumlah Pos:</label>
                            <input type="number" min="1" value={jumlahPos[k.id] || 2} onChange={e => setJumlahPos(prev => ({...prev, [k.id]: Number(e.target.value)}))} className="w-16 p-1 border rounded text-xs text-center" />
                          </div>
                          
                          {/* INPUT KEBUTUHAN PER POS */}
                          <div className="mb-3 space-y-1 bg-white p-2 rounded border">
                            <p className="text-[10px] font-bold text-gray-500 mb-1">Set Kebutuhan Anggota (Opsional)</p>
                            {Array.from({length: jumlahPos[k.id] || 2}).map((_, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-700">Pos {i+1} Butuh:</span>
                                    <input type="number" min="0" placeholder="Auto" value={kebutuhanPos[k.id]?.[i] || ''} 
                                      onChange={e => setKebutuhanPos(prev => ({...prev, [k.id]: {...prev[k.id], [i]: Number(e.target.value)}}))} 
                                      className="w-12 p-0.5 border rounded text-[10px] text-center" />
                                </div>
                            ))}
                          </div>

                          <div className="mb-3">
                            <label className="text-[10px] font-bold text-gray-700 block mb-1">Mode Ploting:</label>
                            <div className="flex gap-4">
                              <label className="text-xs flex items-center gap-1 cursor-pointer"><input type="radio" checked={modePloting[k.id] !== 'manual'} onChange={() => setModePloting(prev => ({...prev, [k.id]: 'auto'}))}/> Auto</label>
                              <label className="text-xs flex items-center gap-1 cursor-pointer"><input type="radio" checked={modePloting[k.id] === 'manual'} onChange={() => setModePloting(prev => ({...prev, [k.id]: 'manual'}))}/> Manual</label>
                            </div>
                          </div>

                          <label className="text-[10px] font-bold text-gray-700 block mb-1">Pilih Anggota Hadir:</label>
                          <div className="max-h-32 overflow-y-auto bg-white border rounded p-1 mb-3">
                            {db.anggota.length === 0 && <p className="text-[10px] text-center text-gray-400 p-2">Belum ada anggota.</p>}
                            {db.anggota.filter(a => a.status === 'Aktif').map(a => (
                                <div key={a.id} className="flex items-center justify-between p-1 hover:bg-gray-50">
                                    <label className="flex items-center gap-2 text-xs cursor-pointer flex-1">
                                        <input type="checkbox" className="rounded text-red-600" checked={checkedAnggota[k.id]?.includes(a.nama) || false}
                                          onChange={(e) => {
                                            if(e.target.checked) setCheckedAnggota(prev => ({...prev, [k.id]: [...(prev[k.id]||[]), a.nama]}));
                                            else setCheckedAnggota(prev => ({...prev, [k.id]: (prev[k.id]||[]).filter(n => n !== a.nama)}));
                                          }}/>
                                        <span>{a.nama}</span>
                                    </label>
                                    {modePloting[k.id] === 'manual' && (
                                        <select value={manualPos[k.id]?.[a.nama] ?? 0} onChange={e => setManualPos(prev => ({...prev, [k.id]: {...prev[k.id], [a.nama]: Number(e.target.value)}}))} className="text-[10px] border rounded p-0.5 bg-gray-50">
                                            {Array.from({length: jumlahPos[k.id] || 2}).map((_, i) => <option key={i} value={i}>Pos {i+1}</option>)}
                                        </select>
                                    )}
                                </div>
                            ))}
                          </div>
                          <button onClick={() => handleRunPloting(k.id)} className="w-full bg-red-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-red-700"><i className="fa-solid fa-shuffle mr-1"></i> Proses Ploting</button>
                        </div>
                      )}

                      {/* HASIL PLOTING */}
                      {activePloting[k.id] && (
                        <div className="mt-3 bg-green-50 p-3 rounded-lg border border-green-200">
                          <h4 className="font-bold text-green-800 text-xs mb-2 border-b border-green-200 pb-1">Hasil Ploting Pos</h4>
                          
                          {activePloting[k.id].unassigned?.length > 0 && (
                            <div className="mb-2 p-1.5 bg-yellow-100 border border-yellow-300 rounded">
                              <p className="text-[9px] font-bold text-yellow-800 mb-1">Belum Masuk Pos:</p>
                              <div className="flex flex-wrap gap-1">
                                {activePloting[k.id].unassigned.map((u: string) => (
                                  <span key={u} className="bg-white px-1.5 py-0.5 rounded text-[9px] font-bold border border-yellow-400">{u}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2 mt-2">
                            {activePloting[k.id].pos.map((p: any, idx: number) => (
                              <div key={idx} className="bg-white border rounded-lg p-2">
                                <p className="font-bold text-xs text-gray-800 mb-1">{p.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {p.anggota.map((a: string) => <span key={a} className="bg-gray-100 border px-1.5 py-0.5 rounded text-[9px] font-semibold text-gray-700">{a}</span>)}
                                  {p.anggota.length === 0 && <span className="text-[9px] text-gray-400 italic">Kosong</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: ANGGOTA */}
        {view === 'anggota' && (
          <div className="fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">Data Anggota</h2>
                <button onClick={() => setShowAnggotaModal(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow hover:bg-green-700"><i className="fa-solid fa-user-plus"></i></button>
            </div>
            {db.anggota.length === 0 && <p className="text-center text-xs text-gray-500 mt-10">Belum ada data anggota.</p>}
            <div className="space-y-3">
              {db.anggota.map(a => (
                <div key={a.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold mr-3 text-xs">{a.nama.charAt(0)}</div>
                        <div><p className="font-bold text-gray-800 text-xs">{a.nama}</p><p className="text-[10px] text-gray-500">{a.nik} • {a.role}</p></div>
                    </div>
                    <span className={`${a.status === 'Aktif' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} text-[9px] font-bold px-2 py-1 rounded-full uppercase`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* VIEW: ADMINISTRASI (LAPOR, SURAT TUGAS, ARSIP) */}
        {view === 'administrasi' && (
          <div className="fade-in space-y-4">
            <div className="flex bg-gray-200 p-1 rounded-xl">
              <button onClick={() => setAdminTab('lapor')} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg ${adminTab === 'lapor' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'}`}>Lapor Kegiatan</button>
              <button onClick={() => setAdminTab('surattugas')} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg ${adminTab === 'surattugas' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'}`}>Surat Tugas</button>
              <button onClick={() => setAdminTab('arsip')} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg ${adminTab === 'arsip' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'}`}>Arsip Surat</button>
            </div>

            {/* TAB: LAPOR */}
            {adminTab === 'lapor' && (
              <div className="fade-in">
                <form onSubmit={handleSimpanLaporan} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3 mb-6">
                    <h3 className="font-bold text-red-600 text-sm border-b pb-2 mb-2">Input Laporan Baru</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nama Kegiatan</label>
                        <input type="text" required value={lapForm.nama} onChange={e=>setLapForm({...lapForm, nama: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"/>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal</label>
                            <input type="date" required value={lapForm.tgl} onChange={e=>setLapForm({...lapForm, tgl: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"/>
                        </div>
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Lokasi</label>
                            <input type="text" required value={lapForm.lokasi} onChange={e=>setLapForm({...lapForm, lokasi: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"/>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1/2"><label className="block text-[10px] font-bold text-gray-700 mb-1">Nama Qori' (Opsional)</label><input type="text" value={lapForm.qori} onChange={e=>setLapForm({...lapForm, qori: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"/></div>
                        <div className="w-1/2"><label className="block text-[10px] font-bold text-gray-700 mb-1">Pendamping (Opsional)</label><input type="text" value={lapForm.pendamping} onChange={e=>setLapForm({...lapForm, pendamping: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"/></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1/2"><label className="block text-[10px] font-bold text-gray-700 mb-1">Jml Armada Mobil</label><input type="number" value={lapForm.r4} onChange={e=>setLapForm({...lapForm, r4: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"/></div>
                        <div className="w-1/2"><label className="block text-[10px] font-bold text-gray-700 mb-1">Jml Armada Motor</label><input type="number" value={lapForm.r2} onChange={e=>setLapForm({...lapForm, r2: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"/></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Sumber Dana</label>
                        <input type="text" value={lapForm.dana} onChange={e=>setLapForm({...lapForm, dana: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Catatan / Evaluasi</label>
                        <textarea rows={2} value={lapForm.catatan} onChange={e=>setLapForm({...lapForm, catatan: e.target.value})} className="w-full p-2 border rounded text-xs bg-gray-50"></textarea>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg text-xs font-bold shadow hover:bg-green-700 mt-2">Simpan Laporan ke Database</button>
                </form>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h3 className="font-bold text-blue-800 text-sm mb-2">Unduh Rekap Laporan (.docx)</h3>
                    <p className="text-[10px] text-blue-600 mb-3">Pilih periode untuk mengunduh rekapitulasi laporan kegiatan.</p>
                    <div className="flex gap-2 mb-3">
                        <div className="w-1/2"><label className="block text-[10px] font-bold text-blue-800 mb-1">Mulai Tgl</label><input type="date" value={filterStartTgl} onChange={e=>setFilterStartTgl(e.target.value)} className="w-full p-2 border border-blue-300 rounded text-xs bg-white"/></div>
                        <div className="w-1/2"><label className="block text-[10px] font-bold text-blue-800 mb-1">Sampai Tgl</label><input type="date" value={filterEndTgl} onChange={e=>setFilterEndTgl(e.target.value)} className="w-full p-2 border border-blue-300 rounded text-xs bg-white"/></div>
                    </div>
                    <button onClick={handleUnduhRekapDocx} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold shadow hover:bg-blue-700 flex items-center justify-center gap-2">
                        <i className="fa-solid fa-file-word"></i> Buat & Unduh (.docx)
                    </button>
                </div>
              </div>
            )}

            {/* TAB: SURAT TUGAS */}
            {adminTab === 'surattugas' && (
              <div className="fade-in bg-white p-4 rounded-xl border shadow-sm">
                <h2 className="text-sm font-bold text-red-600 mb-1">Generator Surat Tugas</h2>
                <p className="text-[10px] text-gray-500 mb-4">Buat dokumen Surat Tugas (.pdf) secara otomatis.</p>
                
                <div className="space-y-3">
                  <div><label className="block text-[10px] font-bold mb-1">No Surat (Opsional)</label><input type="text" value={stForm.noSurat} onChange={e=>setStForm({...stForm, noSurat: e.target.value})} placeholder="Cth: 001/ST/BANSUS/2026" className="w-full p-2 border rounded bg-gray-50 text-xs"/></div>
                  <div><label className="block text-[10px] font-bold mb-1">Tujuan / Nama Penugasan</label><input type="text" value={stForm.tugas} onChange={e=>setStForm({...stForm, tugas: e.target.value})} placeholder="Cth: Pengamanan Pengajian Akbar" className="w-full p-2 border rounded bg-gray-50 text-xs"/></div>
                  <div className="flex gap-2">
                    <div className="w-1/2"><label className="block text-[10px] font-bold mb-1">Tanggal</label><input type="text" value={stForm.tgl} onChange={e=>setStForm({...stForm, tgl: e.target.value})} placeholder="Cth: 12 Nov 2026" className="w-full p-2 border rounded bg-gray-50 text-xs"/></div>
                    <div className="w-1/2"><label className="block text-[10px] font-bold mb-1">Lokasi</label><input type="text" value={stForm.lokasi} onChange={e=>setStForm({...stForm, lokasi: e.target.value})} placeholder="Cth: Alun-alun" className="w-full p-2 border rounded bg-gray-50 text-xs"/></div>
                  </div>
                  
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold mb-2 border-t pt-3">Centang Anggota Bertugas:</label>
                    <div className="max-h-40 overflow-y-auto bg-gray-50 border p-2 rounded-lg space-y-1">
                      {db.anggota.length === 0 && <p className="text-[10px] text-center text-gray-400 py-2">Belum ada anggota aktif.</p>}
                      {db.anggota.filter(a => a.status === 'Aktif').map(a => (
                        <label key={a.id} className="flex items-center space-x-2 bg-white p-2 rounded border text-xs cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" className="text-red-600 rounded" 
                            checked={stAnggotaTerpilih.includes(a.nama)}
                            onChange={(e) => {
                              if(e.target.checked) setStAnggotaTerpilih([...stAnggotaTerpilih, a.nama]);
                              else setStAnggotaTerpilih(stAnggotaTerpilih.filter(n => n !== a.nama));
                            }} 
                          />
                          <span>{a.nama} <span className="text-[9px] text-gray-400">({a.role})</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleUnduhSuratTugas} className="w-full mt-2 bg-red-600 text-white py-2.5 rounded-lg text-xs font-bold shadow hover:bg-red-700 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-file-pdf"></i> Buat & Unduh Surat Tugas (.pdf)
                  </button>
                </div>
              </div>
            )}

            {/* TAB: ARSIP SURAT */}
            {adminTab === 'arsip' && (
              <div className="fade-in">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">Manajemen Arsip</h2>
                    <p className="text-[9px] text-gray-500">Catat metadata & link G-Drive surat.</p>
                  </div>
                  <button onClick={() => setShowArsipModal(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow hover:bg-green-700">
                    <i className="fa-solid fa-plus mr-1"></i> Arsip
                  </button>
                </div>
                <div className="space-y-3">
                  {db.arsip.length === 0 && <p className="text-center text-xs text-gray-400 p-4 border rounded-xl bg-white">Belum ada arsip surat.</p>}
                  {db.arsip.slice().reverse().map(a => (
                    <div key={a.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${a.jenis === 'Masuk' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                          Surat {a.jenis}
                        </span>
                        <span className="text-[9px] text-gray-500">{a.tgl}</span>
                      </div>
                      <p className="font-bold text-xs text-gray-800 leading-tight mb-1">{a.perihal}</p>
                      <div className="text-[10px] text-gray-600 space-y-0.5 mb-2">
                        <p><span className="font-semibold">No:</span> {a.noSurat}</p>
                        <p><span className="font-semibold">{a.jenis === 'Masuk' ? 'Dari:' : 'Tujuan:'}</span> {a.asalTujuan}</p>
                      </div>
                      {a.link ? (
                        <a href={a.link} target="_blank" rel="noreferrer" className="block text-center w-full bg-gray-50 border border-gray-200 text-gray-700 py-1.5 rounded text-[10px] font-bold hover:bg-gray-100">
                          <i className="fa-solid fa-link text-blue-500 mr-1"></i> Buka Tautan Berkas
                        </a>
                      ) : (
                         <span className="block text-center w-full bg-gray-50 border border-dashed border-gray-200 text-gray-400 py-1.5 rounded text-[10px] italic">Tidak ada tautan file</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 max-w-[480px] w-full bg-white border-t flex justify-around items-center h-16 z-50 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] pb-1">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center w-full ${view === 'dashboard' ? 'text-green-600' : 'text-gray-400'}`}>
          <i className="fa-solid fa-house text-lg mb-1"></i><span className="text-[10px] font-semibold">Beranda</span>
        </button>
        {['Admin', 'Bendahara'].includes(role) && (
          <button onClick={() => setView('kas')} className={`flex flex-col items-center w-full ${view === 'kas' ? 'text-green-600' : 'text-gray-400'}`}>
            <i className="fa-solid fa-wallet text-lg mb-1"></i><span className="text-[10px] font-semibold">Kas</span>
          </button>
        )}
        {['Admin', 'Korlap'].includes(role) && (
          <button onClick={() => setView('kegiatan')} className={`flex flex-col items-center w-full ${view === 'kegiatan' ? 'text-green-600' : 'text-gray-400'}`}>
            <i className="fa-solid fa-clipboard-list text-lg mb-1"></i><span className="text-[10px] font-semibold">Kegiatan</span>
          </button>
        )}
        <button onClick={() => setView('anggota')} className={`flex flex-col items-center w-full ${view === 'anggota' ? 'text-green-600' : 'text-gray-400'}`}>
          <i className="fa-solid fa-users text-lg mb-1"></i><span className="text-[10px] font-semibold">Anggota</span>
        </button>
        {['Admin', 'Korlap'].includes(role) && (
          <button onClick={() => setView('administrasi')} className={`flex flex-col items-center w-full ${view === 'administrasi' ? 'text-red-600' : 'text-gray-400'}`}>
            <i className="fa-solid fa-folder-open text-lg mb-1"></i><span className="text-[10px] font-semibold">Admin</span>
          </button>
        )}
      </nav>

      {/* --- ALL MODALS --- */}
      
      {/* Modal Tambah Kas */}
      {showKasModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">Tambah Mutasi Kas</h3>
            <form onSubmit={handleSimpanKas} className="space-y-3">
              <div><label className="block text-xs font-bold mb-1">Jenis Transaksi</label><select value={kasForm.jenis} onChange={e=>setKasForm({...kasForm, jenis: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50"><option>Pemasukan</option><option>Pengeluaran</option></select></div>
              <div><label className="block text-xs font-bold mb-1">Keterangan</label><input type="text" required value={kasForm.ket} onChange={e=>setKasForm({...kasForm, ket: e.target.value})} placeholder="Cth: Iuran / Konsumsi" className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
              <div><label className="block text-xs font-bold mb-1">Nominal (Rp)</label><input type="number" required min="1000" value={kasForm.nominal} onChange={e=>setKasForm({...kasForm, nominal: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
              <div className="flex gap-2 pt-2 border-t mt-2">
                <button type="button" onClick={() => setShowKasModal(false)} className="w-1/2 bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold">Batal</button>
                <button type="submit" className="w-1/2 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Anggota */}
      {showAnggotaModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">Tambah Anggota</h3>
            <form onSubmit={handleSimpanAnggota} className="space-y-3">
              <div><label className="block text-xs font-bold mb-1">Nama Lengkap</label><input type="text" required value={anggotaForm.nama} onChange={e=>setAnggotaForm({...anggotaForm, nama: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
              <div><label className="block text-xs font-bold mb-1">NIK / NRA (Opsional)</label><input type="text" value={anggotaForm.nik} onChange={e=>setAnggotaForm({...anggotaForm, nik: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
              <div><label className="block text-xs font-bold mb-1">No HP/WA (Opsional)</label><input type="text" value={anggotaForm.hp} onChange={e=>setAnggotaForm({...anggotaForm, hp: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
              <div><label className="block text-xs font-bold mb-1">Jabatan/Role</label><select value={anggotaForm.role} onChange={e=>setAnggotaForm({...anggotaForm, role: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50"><option>Anggota</option><option>Korlap</option><option>Bendahara</option><option>Admin</option></select></div>
              <div className="flex gap-2 pt-2 border-t mt-2">
                <button type="button" onClick={() => setShowAnggotaModal(false)} className="w-1/2 bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold">Batal</button>
                <button type="submit" className="w-1/2 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Kegiatan */}
      {showKegiatanModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">Jadwal Baru</h3>
            <form onSubmit={handleSimpanKegiatan} className="space-y-3">
              <div><label className="block text-xs font-bold mb-1">Nama Kegiatan</label><input type="text" required value={kegiatanForm.nama} onChange={e=>setKegiatanForm({...kegiatanForm, nama: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
              <div className="flex gap-2">
                  <div className="w-1/2"><label className="block text-xs font-bold mb-1">Tanggal</label><input type="date" required value={kegiatanForm.tgl} onChange={e=>setKegiatanForm({...kegiatanForm, tgl: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
                  <div className="w-1/2"><label className="block text-xs font-bold mb-1">Waktu</label><input type="time" required value={kegiatanForm.waktu} onChange={e=>setKegiatanForm({...kegiatanForm, waktu: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
              </div>
              <div><label className="block text-xs font-bold mb-1">Lokasi</label><input type="text" required value={kegiatanForm.lokasi} onChange={e=>setKegiatanForm({...kegiatanForm, lokasi: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-gray-50" /></div>
              <div className="flex gap-2 pt-2 border-t mt-2">
                <button type="button" onClick={() => setShowKegiatanModal(false)} className="w-1/2 bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold">Batal</button>
                <button type="submit" className="w-1/2 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Arsip */}
      {showArsipModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">Catat Arsip Surat</h3>
            <form onSubmit={handleSimpanArsip} className="space-y-3">
              <div><label className="block text-[10px] font-bold text-gray-700 mb-1">Jenis Surat</label><select value={arsipForm.jenis} onChange={e=>setArsipForm({...arsipForm, jenis: e.target.value as 'Masuk'|'Keluar'})} className="w-full p-2 border rounded-lg text-xs bg-gray-50"><option value="Masuk">Surat Masuk</option><option value="Keluar">Surat Keluar</option></select></div>
              <div><label className="block text-[10px] font-bold text-gray-700 mb-1">Nomor Surat</label><input type="text" required value={arsipForm.noSurat} onChange={e=>setArsipForm({...arsipForm, noSurat: e.target.value})} placeholder="Nomor pada surat" className="w-full p-2 border rounded-lg text-xs bg-gray-50" /></div>
              <div><label className="block text-[10px] font-bold text-gray-700 mb-1">Tanggal Surat</label><input type="date" required value={arsipForm.tgl} onChange={e=>setArsipForm({...arsipForm, tgl: e.target.value})} className="w-full p-2 border rounded-lg text-xs bg-gray-50" /></div>
              <div><label className="block text-[10px] font-bold text-gray-700 mb-1">{arsipForm.jenis === 'Masuk' ? 'Pengirim (Asal)' : 'Penerima (Tujuan)'}</label><input type="text" required value={arsipForm.asalTujuan} onChange={e=>setArsipForm({...arsipForm, asalTujuan: e.target.value})} placeholder="Instansi / Perorangan" className="w-full p-2 border rounded-lg text-xs bg-gray-50" /></div>
              <div><label className="block text-[10px] font-bold text-gray-700 mb-1">Perihal</label><input type="text" required value={arsipForm.perihal} onChange={e=>setArsipForm({...arsipForm, perihal: e.target.value})} placeholder="Ringkasan isi surat" className="w-full p-2 border rounded-lg text-xs bg-gray-50" /></div>
              <div><label className="block text-[10px] font-bold text-gray-700 mb-1">Tautan File (Link G-Drive)</label><input type="url" value={arsipForm.link} onChange={e=>setArsipForm({...arsipForm, link: e.target.value})} placeholder="https://drive.google.com/..." className="w-full p-2 border rounded-lg text-xs bg-gray-50" /></div>
              <div className="flex gap-2 pt-2 border-t mt-2">
                <button type="button" onClick={() => setShowArsipModal(false)} className="w-1/2 bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold">Batal</button>
                <button type="submit" className="w-1/2 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700">Simpan Arsip</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Global Notice */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl text-center">
            <div className="w-12 h-12 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mb-3"><i className="fa-solid fa-check"></i></div>
            <h3 className="font-bold text-lg mb-1">{modal.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{modal.message}</p>
            <button onClick={() => setModal({ ...modal, show: false })} className="w-full bg-gray-100 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-200">Tutup</button>
          </div>
        </div>
      )}
      
      {/* Global CSS injected in component for fade-in effect without adding extra css files */}
      <style dangerouslySetInnerHTML={{__html: `
        .fade-in { animation: fadeIn 0.2s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

