"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function App() {
  // --- AUTH & NAVIGATION STATES ---
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('Anggota');
  const [view, setView] = useState('dashboard');
  const [adminTab, setAdminTab] = useState('lapor');

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // --- DATABASE STATES ---
  const [db, setDb] = useState<{
    anggota: any[];
    kas: any[];
    kegiatan: any[];
    laporan: any[];
    arsip: any[];
  }>({ anggota: [], kas: [], kegiatan: [], laporan: [], arsip: [] });
  const [isLoadingData, setIsLoadingData] = useState(false);

  // --- MODAL & FORM STATES ---
  const [modalNotice, setModalNotice] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: '', message: '' });
  
  const [showKasModal, setShowKasModal] = useState(false);
  const [kasForm, setKasForm] = useState({ jenis: 'Pemasukan', ket: '', nominal: 5000 });

  const [showAnggotaModal, setShowAnggotaModal] = useState(false);
  const [anggotaForm, setAnggotaForm] = useState({ nama: '', nik: '', hp: '', role: 'Anggota' });

  const [showKegiatanModal, setShowKegiatanModal] = useState(false);
  const [kegiatanForm, setKegiatanForm] = useState({ nama: '', tgl: '', waktu: '', lokasi: '' });

  const [showArsipModal, setShowArsipModal] = useState(false);
  const [arsipForm, setArsipForm] = useState({ jenis: 'Masuk', noSurat: '', tgl: '', asalTujuan: '', perihal: '', link: '' });

  const [lapForm, setLapForm] = useState({ tgl: '', nama: '', lokasi: '', qori: '', pendamping: '', r4: '0', r2: '0', dana: '', catatan: '' });
  const [stForm, setStForm] = useState({ noSurat: '', tugas: '', tgl: '', lokasi: '' });
  const [stAnggotaTerpilih, setStAnggotaTerpilih] = useState<string[]>([]);
  
  // Ploting States
  const [setupVisible, setSetupVisible] = useState<Record<number, boolean>>({});
  const [plotingSetup, setPlotingSetup] = useState<Record<number, { posCount: number, selected: string[] }>>({});
  const [activePloting, setActivePloting] = useState<Record<number, { name: string, anggota: string[] }[]>>({});
  
  const suratTugasRef = useRef<HTMLDivElement>(null);

  // --- EFFECTS ---
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

  useEffect(() => {
    if (isLoggedIn) {
      const loadData = async () => {
        setIsLoadingData(true);
        try {
          const [resAnggota, resKas, resKeg, resLap, resArsip] = await Promise.all([
            fetch('/api/gsheets?sheet=Anggota').then(r => r.json()),
            fetch('/api/gsheets?sheet=Kas').then(r => r.json()),
            fetch('/api/gsheets?sheet=Kegiatan').then(r => r.json()),
            fetch('/api/gsheets?sheet=Laporan').then(r => r.json()),
            fetch('/api/gsheets?sheet=Arsip').then(r => r.json())
          ]);
          setDb({
            anggota: resAnggota.data || [],
            kas: resKas.data || [],
            kegiatan: resKeg.data || [],
            laporan: resLap.data || [],
            arsip: resArsip.data || []
          });
        } catch (error) {
          console.error("Gagal load data", error);
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [isLoggedIn]);

  // --- UTILS ---
  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka);
  const showModalNotice = (title: string, message: string) => setModalNotice({ show: true, title, message });

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let assignedRole = '';
    const u = usernameInput.toLowerCase();
    const p = passwordInput;
    if (u === 'admin' && p === 'admin') assignedRole = 'Admin';
    else if (u === 'korlap' && p === 'korlap') assignedRole = 'Korlap';
    else if (u === 'bendahara' && p === 'bendahara') assignedRole = 'Bendahara';
    
    if (assignedRole) {
      setIsLoggedIn(true);
      setRole(assignedRole);
      setView('dashboard');
      localStorage.setItem('bansusAuth', JSON.stringify({ isLoggedIn: true, role: assignedRole }));
    } else {
      alert("Username atau Password salah!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setView('dashboard');
    setUsernameInput('');
    setPasswordInput('');
    localStorage.removeItem('bansusAuth');
  };

  const saveToGSheets = async (sheet: string, rowData: any[]) => {
    try {
      await fetch('/api/gsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, data: rowData })
      });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleSimpanKas = async (e: React.FormEvent) => {
    e.preventDefault();
    const newData = { id: Date.now(), tgl: new Date().toISOString().split('T')[0], jenis: kasForm.jenis, ket: kasForm.ket, nominal: Number(kasForm.nominal) };
    setDb(prev => ({ ...prev, kas: [...prev.kas, newData] }));
    setShowKasModal(false); 
    setKasForm({ jenis: 'Pemasukan', ket: '', nominal: 5000 });
    const success = await saveToGSheets('Kas', [newData.id, newData.tgl, newData.jenis, newData.nominal, newData.ket]);
    if(success) showModalNotice('Berhasil', 'Transaksi Kas ditambahkan ke Google Sheets.');
  };

  const handleSimpanAnggota = async (e: React.FormEvent) => {
    e.preventDefault();
    const newData = { id: Date.now(), nama: anggotaForm.nama, nik: anggotaForm.nik || '-', hp: anggotaForm.hp || '-', role: anggotaForm.role, status: 'Aktif' };
    setDb(prev => ({ ...prev, anggota: [...prev.anggota, newData] }));
    setShowAnggotaModal(false); 
    setAnggotaForm({ nama: '', nik: '', hp: '', role: 'Anggota' });
    const success = await saveToGSheets('Anggota', [newData.id, newData.nama, newData.nik, newData.hp, newData.role, newData.status]);
    if(success) showModalNotice('Berhasil', 'Anggota ditambahkan ke Google Sheets.');
  };

  const handleSimpanKegiatan = async (e: React.FormEvent) => {
    e.preventDefault();
    const newData = { id: Date.now(), nama: kegiatanForm.nama, tgl: kegiatanForm.tgl || '-', waktu: kegiatanForm.waktu || '-', lokasi: kegiatanForm.lokasi || '-', status: 'Mendatang' };
    setDb(prev => ({ ...prev, kegiatan: [...prev.kegiatan, newData] }));
    setShowKegiatanModal(false); 
    setKegiatanForm({ nama: '', tgl: '', waktu: '', lokasi: '' });
    const success = await saveToGSheets('Kegiatan', [newData.id, newData.nama, newData.tgl, newData.waktu, newData.lokasi, newData.status]);
    if(success) showModalNotice('Berhasil', 'Kegiatan ditambahkan ke Google Sheets.');
  };

  const handleSimpanLaporan = async (e: React.FormEvent) => {
    e.preventDefault();
    const newData = { id: Date.now(), tgl: lapForm.tgl || new Date().toISOString().split('T')[0], nama: lapForm.nama, lokasi: lapForm.lokasi, qori: lapForm.qori, pendamping: lapForm.pendamping, r4: Number(lapForm.r4), r2: Number(lapForm.r2), dana: lapForm.dana, catatan: lapForm.catatan };
    setDb(prev => ({ ...prev, laporan: [...prev.laporan, newData] }));
    setLapForm({ tgl: '', nama: '', lokasi: '', qori: '', pendamping: '', r4: '0', r2: '0', dana: '', catatan: '' });
    const success = await saveToGSheets('Laporan', [newData.id, newData.tgl, newData.nama, newData.lokasi, newData.qori, newData.pendamping, newData.r4, newData.r2, newData.dana, newData.catatan]);
    if(success) showModalNotice('Disimpan', 'Laporan masuk ke Google Sheets.');
  };

  const handleSimpanArsip = async (e: React.FormEvent) => {
    e.preventDefault();
    const newData = { id: Date.now(), jenis: arsipForm.jenis, noSurat: arsipForm.noSurat, tgl: arsipForm.tgl, asalTujuan: arsipForm.asalTujuan, perihal: arsipForm.perihal, link: arsipForm.link };
    setDb(prev => ({ ...prev, arsip: [...prev.arsip, newData] }));
    setShowArsipModal(false); 
    setArsipForm({ jenis: 'Masuk', noSurat: '', tgl: '', asalTujuan: '', perihal: '', link: '' });
    const success = await saveToGSheets('Arsip', [newData.id, newData.jenis, newData.noSurat, newData.tgl, newData.asalTujuan, newData.perihal, newData.link]);
    if(success) showModalNotice('Berhasil', 'Arsip dicatat di Google Sheets.');
  };

  // --- PLOTING LOGIC ---
  const toggleSetupPloting = (kId: number) => {
    const isVisible = !setupVisible[kId];
    setSetupVisible(p => ({...p, [kId]: isVisible}));
    if(isVisible && !plotingSetup[kId]) {
      // Default: 2 pos, semua anggota aktif terpilih
      const aktif = db.anggota.filter(a => a.status === 'Aktif').map(a => a.nama);
      setPlotingSetup(p => ({...p, [kId]: { posCount: 2, selected: aktif }}));
    }
  };

  const executeAutoPloting = (kId: number) => {
    const setup = plotingSetup[kId];
    if(!setup || setup.selected.length === 0) {
      showModalNotice('Peringatan', 'Harap centang minimal 1 anggota untuk diploting.');
      return;
    }
    
    // Algoritma acak urutan array
    const shuffled = [...setup.selected].sort(() => 0.5 - Math.random());
    const posData = Array.from({length: setup.posCount}, (_, i) => ({ name: `Pos ${i+1}`, anggota: [] as string[] }));
    
    // Distribusi merata ke pos
    shuffled.forEach((nama, i) => {
        posData[i % setup.posCount].anggota.push(nama);
    });

    setActivePloting(p => ({...p, [kId]: posData}));
  };

  const handleCheckboxPloting = (kId: number, nama: string, checked: boolean) => {
    setPlotingSetup(p => {
      const current = p[kId];
      const newSelected = checked ? [...current.selected, nama] : current.selected.filter(n => n !== nama);
      return {...p, [kId]: {...current, selected: newSelected}};
    });
  };

  // --- EXPORTS ---
  const downloadExcelKas = () => {
    if(db.kas.length === 0) return showModalNotice('Gagal', 'Belum ada data kas untuk diunduh.');
    const ws = XLSX.utils.json_to_sheet(db.kas.map(k => ({ Tanggal: k.tgl, Jenis: k.jenis, Keterangan: k.ket, Nominal: k.nominal })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas");
    XLSX.writeFile(wb, "Laporan_Kas_BANSUS_1455.xlsx");
  };

  const downloadExcelLaporan = () => {
    if(db.laporan.length === 0) return showModalNotice('Gagal', 'Belum ada data laporan untuk diunduh.');
    const ws = XLSX.utils.json_to_sheet(db.laporan);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Laporan");
    XLSX.writeFile(wb, "Rekap_Laporan_Kegiatan.xlsx");
  };

  const generatePDFSuratTugas = async () => {
    if(!stForm.noSurat || stAnggotaTerpilih.length === 0) {
      showModalNotice('Peringatan', 'Nomor surat dan minimal 1 anggota harus diisi/dipilih.');
      return;
    }
    const element = suratTugasRef.current;
    if (element) {
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        element.style.display = 'block'; 
        const opt: any = {
          margin: 0.5, filename: `Surat_Tugas_${stForm.noSurat.replace(/\//g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
        element.style.display = 'none';
        showModalNotice('Berhasil', 'Surat Tugas PDF berhasil diunduh.');
      } catch (err) {
        showModalNotice('Gagal', 'Terjadi kesalahan saat memproses PDF.');
      }
    }
  };

  // --- RENDERERS ---
  if (!isMounted) return null;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl shadow-lg">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-800">BANSUS 1455</h1>
            <p className="text-sm text-gray-500 mt-1">Sistem Informasi Manajemen</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
              <input type="text" required value={usernameInput} onChange={e=>setUsernameInput(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" placeholder="Masukkan username..."/>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <input type="password" required value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" placeholder="••••••••"/>
            </div>
            <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-md">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  const renderKegiatan = () => (
    <div className="fade-in">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Kegiatan</h2>
            <button onClick={() => setShowKegiatanModal(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm"><i className="fa-solid fa-plus mr-1"></i> Baru</button>
        </div>
        <div className="space-y-4">
          {db.kegiatan.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Belum ada jadwal kegiatan.</p>}
          {db.kegiatan.map((k, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-gray-800 text-md">{k.nama}</h3>
                        <p className="text-xs text-gray-500 mt-1"><i className="fa-regular fa-calendar mr-1"></i> {k.tgl} | <i className="fa-regular fa-clock mr-1"></i> {k.waktu}</p>
                        <p className="text-xs text-gray-500 mt-1"><i className="fa-solid fa-location-dot mr-1"></i> {k.lokasi}</p>
                    </div>
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase">{k.status}</span>
                </div>
                
                <div className="border-t border-gray-100 pt-3 mt-2">
                    <button onClick={() => toggleSetupPloting(k.id)} className={`w-full ${activePloting[k.id] ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-600 border border-red-200'} py-2 rounded-lg text-sm font-semibold hover:bg-opacity-80`}>
                        <i className="fa-solid fa-shuffle mr-1"></i> {activePloting[k.id] ? 'Lihat Hasil Ploting' : (setupVisible[k.id] ? 'Tutup Setup Ploting' : 'Setup Auto-Ploting')}
                    </button>
                    
                    {/* FORM SETUP PLOTING */}
                    {setupVisible[k.id] && !activePloting[k.id] && plotingSetup[k.id] && (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
                           <label className="block text-xs font-bold text-gray-700 mb-1">Bagi menjadi berapa Pos?</label>
                           <input type="number" min="1" value={plotingSetup[k.id].posCount} onChange={(e) => setPlotingSetup(p => ({...p, [k.id]: {...p[k.id], posCount: Number(e.target.value)}}))} className="w-full mb-3 p-2 border border-gray-300 rounded text-sm outline-none focus:border-green-500"/>
                           
                           <label className="block text-xs font-bold text-gray-700 mb-1">Centang Anggota yang Hadir:</label>
                           <div className="max-h-32 overflow-y-auto bg-white border border-gray-200 rounded p-2 mb-3 space-y-1">
                              {db.anggota.filter(a => a.status === 'Aktif').map(a => (
                                <label key={a.id} className="flex items-center space-x-2 text-sm cursor-pointer p-1">
                                    <input type="checkbox" className="text-green-600 rounded" 
                                           checked={plotingSetup[k.id].selected.includes(a.nama)}
                                           onChange={(e) => handleCheckboxPloting(k.id, a.nama, e.target.checked)}/>
                                    <span className="text-gray-700">{a.nama}</span>
                                </label>
                              ))}
                           </div>
                           
                           <button onClick={() => executeAutoPloting(k.id)} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold shadow-md hover:bg-green-700">
                               Proses Acak Pos Sekarang
                           </button>
                        </div>
                    )}

                    {/* HASIL PLOTING */}
                    {setupVisible[k.id] && activePloting[k.id] && (
                        <div className="mt-3 bg-white p-3 rounded-lg border border-green-200 text-sm shadow-sm space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-green-700 text-xs uppercase tracking-wider"><i className="fa-solid fa-check-circle mr-1"></i> Hasil Ploting Otomatis</h4>
                                <button onClick={() => setActivePloting(p => { const newP = {...p}; delete newP[k.id]; return newP; })} className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-200">Reset Acak</button>
                            </div>
                            
                            {activePloting[k.id].map((pos, idx) => (
                                <div key={idx} className="bg-green-50 border border-green-100 rounded p-2">
                                    <p className="font-bold text-gray-800 text-xs border-b border-green-200 pb-1 mb-1">{pos.name}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {pos.anggota.map((nama, nIdx) => (
                                            <span key={nIdx} className="bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] font-semibold">{nama}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <p className="text-[10px] text-gray-500 italic mt-2 text-center">Data ploting ini sementara hanya tersimpan di layar. Gunakan Menu Administrasi untuk membuat Surat Tugas resmi.</p>
                        </div>
                    )}
                </div>
            </div>
          ))}
        </div>
    </div>
  );

  return (
    <div className="max-w-[480px] mx-auto bg-gray-50 min-h-screen relative shadow-lg pb-24">
      <header className="bg-red-600 text-white p-4 sticky top-0 z-40 flex justify-between items-center shadow-md">
        <h1 className="text-lg font-bold tracking-wider uppercase"><i className="fa-solid fa-shield-halved mr-2"></i> BANSUS 1455</h1>
        <div className="flex gap-2 items-center">
            {isLoadingData && <i className="fa-solid fa-circle-notch fa-spin text-white text-sm mr-1"></i>}
            <span className="text-xs bg-white text-red-600 px-2 py-1 rounded-full font-bold shadow-sm">{role}</span>
            <button onClick={handleLogout} className="h-7 w-7 rounded-full bg-red-700 hover:bg-red-800 flex items-center justify-center text-xs" title="Logout"><i className="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </header>

      <main className="p-4">
        {view === 'dashboard' && (
           <div className="fade-in">
             <h2 className="text-xl font-bold text-gray-800 mb-4">Ringkasan Kas</h2>
             <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
                 <div className="absolute -right-4 -top-4 opacity-10 text-6xl"><i className="fa-solid fa-coins"></i></div>
                 <p className="text-sm opacity-80 mb-1">Total Saldo Saat Ini</p>
                 <h3 className="text-3xl font-bold mb-4 tracking-tight">{formatRupiah(db.kas.filter(k=>k.jenis==='Pemasukan').reduce((a,b)=>a+Number(b.nominal),0) - db.kas.filter(k=>k.jenis==='Pengeluaran').reduce((a,b)=>a+Number(b.nominal),0))}</h3>
             </div>
           </div>
        )}
        {view === 'kas' && (
           <div className="fade-in">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold text-gray-800">Buku Kas</h2>
                 <div className="flex space-x-2">
                     <button onClick={downloadExcelKas} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm"><i className="fa-solid fa-download"></i></button>
                     <button onClick={() => setShowKasModal(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm"><i className="fa-solid fa-plus"></i></button>
                 </div>
             </div>
             <div className="space-y-3">
               {[...db.kas].reverse().map((k, i) => (
                   <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                       <div className="flex items-center">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${k.jenis === 'Pemasukan' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                               <i className={`fa-solid ${k.jenis === 'Pemasukan' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                           </div>
                           <div>
                               <p className="font-bold text-gray-800 text-sm">{k.ket}</p>
                               <p className="text-xs text-gray-500">{k.tgl}</p>
                           </div>
                       </div>
                       <p className={`font-bold text-sm ${k.jenis === 'Pemasukan' ? 'text-green-600' : 'text-red-600'}`}>
                         {k.jenis === 'Pemasukan' ? '+' : '-'}{formatRupiah(Number(k.nominal))}
                       </p>
                   </div>
               ))}
             </div>
           </div>
        )}
        {view === 'kegiatan' && renderKegiatan()}
        {view === 'anggota' && (
           <div className="fade-in">
               <div className="flex justify-between items-center mb-4">
                   <h2 className="text-xl font-bold text-gray-800">Data Anggota</h2>
                   <button onClick={() => setShowAnggotaModal(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm"><i className="fa-solid fa-user-plus"></i></button>
               </div>
               <div className="space-y-3">
                 {db.anggota.map((a, i) => (
                   <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                       <div className="flex items-center">
                           <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-3">{a.nama.charAt(0)}</div>
                           <div>
                               <p className="font-bold text-gray-800 text-sm">{a.nama}</p>
                               <p className="text-xs text-gray-500">{a.nik} • {a.role}</p>
                           </div>
                       </div>
                       <span className={`${a.status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-[10px] font-bold px-2 py-1 rounded-full uppercase`}>{a.status}</span>
                   </div>
                 ))}
               </div>
           </div>
        )}
        {view === 'administrasi' && (
           <div className="fade-in">
             <h2 className="text-xl font-bold text-red-600 mb-4">Administrasi Terpadu</h2>
             <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 mb-4">
               {['lapor', 'st', 'arsip'].map(tab => (
                 <button key={tab} onClick={() => setAdminTab(tab)} className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors ${adminTab === tab ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                   {tab === 'lapor' ? 'Lapor Giat' : tab === 'st' ? 'Surat Tugas' : 'Arsip'}
                 </button>
               ))}
             </div>
             {adminTab === 'lapor' && (
                <form onSubmit={handleSimpanLaporan} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3 mb-6">
                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Nama Kegiatan</label><input type="text" required value={lapForm.nama} onChange={e=>setLapForm({...lapForm, nama: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Lokasi</label><input type="text" required value={lapForm.lokasi} onChange={e=>setLapForm({...lapForm, lokasi: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold shadow-md">Simpan Laporan</button>
                    <button type="button" onClick={downloadExcelLaporan} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold shadow-md">Unduh Rekap (.xlsx)</button>
                </form>
             )}
             {adminTab === 'st' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3 mb-6">
                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Nomor Surat</label><input type="text" value={stForm.noSurat} onChange={e=>setStForm({...stForm, noSurat: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Tugas / Acara</label><input type="text" value={stForm.tugas} onChange={e=>setStForm({...stForm, tugas: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div className="flex gap-3">
                      <div className="w-1/2"><label className="block text-xs font-bold text-gray-700 mb-1">Tanggal</label><input type="date" value={stForm.tgl} onChange={e=>setStForm({...stForm, tgl: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                      <div className="w-1/2"><label className="block text-xs font-bold text-gray-700 mb-1">Lokasi</label><input type="text" value={stForm.lokasi} onChange={e=>setStForm({...stForm, lokasi: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    </div>
                    <label className="block text-xs font-bold text-gray-700 mt-3 mb-1">Pilih Anggota Bertugas:</label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50 grid grid-cols-2 gap-2">
                      {db.anggota.map(a => (
                        <label key={a.id} className="flex items-center space-x-2 text-xs bg-white p-1 rounded border shadow-sm">
                          <input type="checkbox" checked={stAnggotaTerpilih.includes(a.nama)} onChange={(e) => {
                            if(e.target.checked) setStAnggotaTerpilih([...stAnggotaTerpilih, a.nama]);
                            else setStAnggotaTerpilih(stAnggotaTerpilih.filter(n => n !== a.nama));
                          }}/>
                          <span className="truncate">{a.nama}</span>
                        </label>
                      ))}
                    </div>
                    <button onClick={generatePDFSuratTugas} className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-bold shadow-md mt-4">Buat & Unduh Surat (.pdf)</button>
                </div>
             )}
             {adminTab === 'arsip' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                   <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-gray-800">Daftar Arsip</h3>
                      <button onClick={() => setShowArsipModal(true)} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">Tambah</button>
                   </div>
                   <div className="space-y-2">
                     {db.arsip.map((a, i) => (
                        <div key={i} className="border border-gray-200 p-2 rounded-lg flex justify-between items-center bg-gray-50">
                           <div>
                              <p className="text-xs font-bold text-gray-800">{a.noSurat} <span className="text-[9px] bg-gray-200 px-1 rounded">{a.jenis}</span></p>
                              <p className="text-[10px] text-gray-500">{a.perihal}</p>
                           </div>
                           {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-bold"><i className="fa-solid fa-link"></i></a>}
                        </div>
                     ))}
                   </div>
                </div>
             )}
           </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-200 z-50 flex justify-around items-center h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center w-full py-2 transition-colors ${view === 'dashboard' ? 'text-green-600' : 'text-gray-400'}`}><i className="fa-solid fa-house text-lg mb-1"></i><span className="text-[10px] font-semibold">Beranda</span></button>
          {['Admin', 'Bendahara'].includes(role) && (<button onClick={() => setView('kas')} className={`flex flex-col items-center w-full py-2 transition-colors ${view === 'kas' ? 'text-green-600' : 'text-gray-400'}`}><i className="fa-solid fa-wallet text-lg mb-1"></i><span className="text-[10px] font-semibold">Kas</span></button>)}
          {['Admin', 'Korlap'].includes(role) && (<button onClick={() => setView('kegiatan')} className={`flex flex-col items-center w-full py-2 transition-colors ${view === 'kegiatan' ? 'text-green-600' : 'text-gray-400'}`}><i className="fa-solid fa-clipboard-list text-lg mb-1"></i><span className="text-[10px] font-semibold">Kegiatan</span></button>)}
          <button onClick={() => setView('anggota')} className={`flex flex-col items-center w-full py-2 transition-colors ${view === 'anggota' ? 'text-green-600' : 'text-gray-400'}`}><i className="fa-solid fa-users text-lg mb-1"></i><span className="text-[10px] font-semibold">Anggota</span></button>
          {['Admin', 'Korlap'].includes(role) && (<button onClick={() => setView('administrasi')} className={`flex flex-col items-center w-full py-2 transition-colors ${view === 'administrasi' ? 'text-red-600' : 'text-gray-400'}`}><i className="fa-solid fa-folder-open text-lg mb-1"></i><span className="text-[10px] font-semibold">Admin</span></button>)}
      </nav>

      <div style={{ display: 'none' }}>
        <div ref={suratTugasRef} className="bg-white p-8 w-[800px] text-black font-serif">
           <div className="text-center border-b-4 border-black pb-4 mb-6">
              <h1 className="text-2xl font-bold">BARISAN KHUSUS (BANSUS) 1455</h1>
              <p className="text-sm">Sekretariat: Jl. Contoh No. 123, Kota - No. HP: 08123456789</p>
           </div>
           <h2 className="text-xl font-bold text-center underline mb-1">SURAT TUGAS</h2>
           <p className="text-center text-sm mb-8">Nomor: {stForm.noSurat || '.../BANSUS/...'}</p>
           <p className="mb-4 text-justify">Pengurus Barisan Khusus (BANSUS) 1455 dengan ini memberikan tugas kepada nama-nama terlampir di bawah ini:</p>
           <table className="w-full mb-4 border-collapse">
              <tbody>{stAnggotaTerpilih.map((nama, idx) => (<tr key={idx}><td className="w-8 py-1">{idx+1}.</td><td className="font-bold">{nama}</td></tr>))}</tbody>
           </table>
           <p className="mb-4 text-justify">Untuk melaksanakan tugas pengamanan pada:</p>
           <table className="w-full mb-6 border-collapse">
              <tbody>
                <tr><td className="w-32 py-1">Kegiatan</td><td>: <strong>{stForm.tugas}</strong></td></tr>
                <tr><td className="py-1">Tanggal</td><td>: {stForm.tgl}</td></tr>
                <tr><td className="py-1">Lokasi</td><td>: {stForm.lokasi}</td></tr>
              </tbody>
           </table>
           <p className="mb-12 text-justify">Demikian surat tugas ini dibuat untuk dilaksanakan.</p>
           <div className="flex justify-end text-center">
              <div>
                <p>Dikeluarkan pada tanggal: {new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-bold mb-16">Komandan Korlap</p>
                <p className="font-bold underline">...........................</p>
              </div>
           </div>
        </div>
      </div>

      {modalNotice.show && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{modalNotice.title}</h3>
                <p className="text-sm text-gray-600 mb-6">{modalNotice.message}</p>
                <div className="flex justify-end"><button onClick={() => setModalNotice({show: false, title: '', message: ''})} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">Tutup</button></div>
            </div>
        </div>
      )}

      {showKasModal && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tambah Mutasi Kas</h3>
                <form onSubmit={handleSimpanKas} className="space-y-4">
                    <div>
                        <select value={kasForm.jenis} onChange={e=>setKasForm({...kasForm, jenis: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm">
                            <option value="Pemasukan">Pemasukan (+)</option><option value="Pengeluaran">Pengeluaran (-)</option>
                        </select>
                    </div>
                    <div><input type="text" required value={kasForm.ket} onChange={e=>setKasForm({...kasForm, ket: e.target.value})} placeholder="Keterangan..." className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div><input type="number" required min="0" value={kasForm.nominal} onChange={e=>setKasForm({...kasForm, nominal: Number(e.target.value)})} placeholder="Nominal (Rp)" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={() => setShowKasModal(false)} className="px-4 py-2 text-gray-500 font-semibold text-sm">Batal</button>
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAnggotaModal && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tambah Anggota</h3>
                <form onSubmit={handleSimpanAnggota} className="space-y-3">
                    <div><input type="text" required value={anggotaForm.nama} onChange={e=>setAnggotaForm({...anggotaForm, nama: e.target.value})} placeholder="Nama Lengkap" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div><input type="text" value={anggotaForm.nik} onChange={e=>setAnggotaForm({...anggotaForm, nik: e.target.value})} placeholder="NIK/NRA" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div><input type="text" value={anggotaForm.hp} onChange={e=>setAnggotaForm({...anggotaForm, hp: e.target.value})} placeholder="No HP/WA" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div>
                        <select value={anggotaForm.role} onChange={e=>setAnggotaForm({...anggotaForm, role: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm">
                            <option value="Anggota">Anggota</option><option value="Korlap">Korlap</option><option value="Bendahara">Bendahara</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={() => setShowAnggotaModal(false)} className="px-4 py-2 text-gray-500 font-semibold text-sm">Batal</button>
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showKegiatanModal && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Jadwal Kegiatan Baru</h3>
                <form onSubmit={handleSimpanKegiatan} className="space-y-3">
                    <div><input type="text" required value={kegiatanForm.nama} onChange={e=>setKegiatanForm({...kegiatanForm, nama: e.target.value})} placeholder="Nama Acara" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div className="flex gap-2">
                      <div className="flex-1"><input type="date" required value={kegiatanForm.tgl} onChange={e=>setKegiatanForm({...kegiatanForm, tgl: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                      <div className="w-24"><input type="time" value={kegiatanForm.waktu} onChange={e=>setKegiatanForm({...kegiatanForm, waktu: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    </div>
                    <div><input type="text" value={kegiatanForm.lokasi} onChange={e=>setKegiatanForm({...kegiatanForm, lokasi: e.target.value})} placeholder="Lokasi" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={() => setShowKegiatanModal(false)} className="px-4 py-2 text-gray-500 font-semibold text-sm">Batal</button>
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showArsipModal && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Catat Arsip Berkas</h3>
                <form onSubmit={handleSimpanArsip} className="space-y-3">
                    <select value={arsipForm.jenis} onChange={e=>setArsipForm({...arsipForm, jenis: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm">
                        <option value="Masuk">Surat Masuk</option><option value="Keluar">Surat Keluar</option><option value="Lainnya">Lainnya</option>
                    </select>
                    <div className="flex gap-2">
                      <div className="flex-1"><input type="text" required value={arsipForm.noSurat} onChange={e=>setArsipForm({...arsipForm, noSurat: e.target.value})} placeholder="No Surat" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                      <div className="flex-1"><input type="date" required value={arsipForm.tgl} onChange={e=>setArsipForm({...arsipForm, tgl: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    </div>
                    <div><input type="text" value={arsipForm.asalTujuan} onChange={e=>setArsipForm({...arsipForm, asalTujuan: e.target.value})} placeholder="Asal / Tujuan" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div><input type="text" value={arsipForm.perihal} onChange={e=>setArsipForm({...arsipForm, perihal: e.target.value})} placeholder="Perihal" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div><input type="url" value={arsipForm.link} onChange={e=>setArsipForm({...arsipForm, link: e.target.value})} placeholder="Link Google Drive (Opsional)" className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={() => setShowArsipModal(false)} className="px-4 py-2 text-gray-500 font-semibold text-sm">Batal</button>
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}