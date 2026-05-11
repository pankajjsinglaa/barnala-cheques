import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, List, FileText, LogOut, Search, Trash2, Edit, Plus, X,
  ArrowUpDown, Users, FileUp, UploadCloud, FileSpreadsheet, CheckCircle,
  Link, RefreshCw, Shield, UserPlus, Download, Database, Trash, Settings, AlertTriangle
} from "lucide-react";
import * as XLSX from "xlsx";

// --- FIREBASE CONFIG ---
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC6SfcKGJ2kre_HZKMMWwHrRpcAlXvr-2w",
  authDomain: "barnala-cheques.firebaseapp.com",
  projectId: "barnala-cheques",
  storageBucket: "barnala-cheques.firebasestorage.app",
  messagingSenderId: "1086659204517",
  appId: "1:1086659204517:web:2bb2918c8f7533cc52c44c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- GLOBAL UTILS (PRODUCTION SAFE) ---
const toIndianDate = (dateStr) => {
  if (!dateStr) return "";
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) return dateStr;
  if (dateStr.includes("-")) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y.slice(-2)}`;
  }
  return dateStr;
};

const parseToSortable = (dStr) => {
  if (!dStr) return 0;
  if (String(dStr).includes("/")) {
    const [d, m, y] = String(dStr).split("/");
    return new Date(`20${y}-${m}-${d}`).getTime();
  }
  return new Date(dStr).getTime() || 0;
};

const formatExcelDate = (val) => {
  if (!val) return "";
  if (typeof val === "number") {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
  }
  return String(val).trim();
};

const formatCurrency = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(v || 0);

const applySort = (data, config) => {
  if (!config.key) return data;
  return [...data].sort((a, b) => {
    let vA = a[config.key], vB = b[config.key];
    if (config.type === "date") { vA = parseToSortable(vA); vB = parseToSortable(vB); }
    if (typeof vA === "string") vA = vA.toLowerCase();
    if (typeof vB === "string") vB = vB.toLowerCase();
    if (vA < vB) return config.dir === "asc" ? -1 : 1;
    if (vA > vB) return config.dir === "asc" ? 1 : -1;
    return 0;
  });
};

// ==========================================
// MAIN APP ARCHITECTURE
// ==========================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("Dashboard");
  const [isDbReady, setIsDbReady] = useState(false);
  const [config, setConfig] = useState({ companyName: "Barnala Trading Co", variance: 5 });

  const [usersList, setUsersList] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [bankData, setBankData] = useState([]);
  const [tallyData, setTallyData] = useState([]);
  const [manualMappings, setManualMappings] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const boot = async () => {
      const init = async (key, setter) => {
        const ref = doc(db, "btc_data", key);
        onSnapshot(ref, (d) => { if (d.exists() && isMounted) setter(d.data().list || []); });
      };
      await init("users", setUsersList);
      await init("cheques", setCheques);
      await init("customers", setCustomers);
      await init("auditTrail", setAuditTrail);
      await init("bank", setBankData);
      await init("tally", setTallyData);
      await init("mappings", setManualMappings);
      const confRef = doc(db, "btc_data", "config");
      const confSnap = await getDoc(confRef);
      if (confSnap.exists()) setConfig(confSnap.data());
      setIsDbReady(true);
    };
    boot();
    return () => { isMounted = false; };
  }, []);

  const save = (key, list) => setDoc(doc(db, "btc_data", key), { list });
  const saveConfig = (newConf) => { setConfig(newConf); setDoc(doc(db, "btc_data", "config"), newConf); };

  const logAction = (action, record, details) => {
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    save("auditTrail", [{ id: Date.now(), time: timeStr, user: currentUser?.username || "System", action, record, details }, ...auditTrail].slice(0, 1000));
  };

  if (!isDbReady) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse uppercase tracking-[0.5em]">BTC Cloud Syncing...</div>;

  if (!currentUser) return (
    <div className="h-screen flex items-center justify-center bg-slate-200">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-sm border-t-[14px] border-slate-900 text-center">
        <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"><Shield size={32} className="text-blue-400"/></div>
        <h1 className="text-2xl font-black mb-1 text-slate-900 uppercase italic tracking-tighter">{config.companyName}</h1>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] mb-10 font-black italic">Security Authentication</p>
        <form onSubmit={e => {
          e.preventDefault();
          const u = usersList.find(x => x.username === e.target.u.value.toLowerCase().trim() && x.password === e.target.p.value);
          if (u) { if (u.active) { setCurrentUser(u); } else alert("Disabled"); } else alert("Denied");
        }}>
          <input name="u" placeholder="Admin ID" className="w-full bg-slate-50 border-0 p-5 rounded-3xl mb-4 text-center text-xs font-black tracking-widest ring-1 ring-slate-100 outline-none focus:ring-2 focus:ring-slate-900" />
          <input name="p" type="password" placeholder="Passkey" className="w-full bg-slate-50 border-0 p-5 rounded-3xl mb-10 text-center text-xs font-black tracking-widest ring-1 ring-slate-100 outline-none focus:ring-2 focus:ring-slate-900" />
          <button className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black tracking-widest hover:bg-black transition-all">AUTHENTICATE</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <div className="w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-12 border-b border-slate-800 text-center font-black text-blue-400 tracking-tighter text-3xl uppercase italic flex flex-col">{config.companyName.split(' ')[0]}<span className="text-[8px] tracking-[0.6em] text-slate-500 mt-2 font-black">ERP CONTROL</span></div>
        <nav className="flex-1 py-8 overflow-y-auto">
          {[
            { id: "Dashboard", icon: <LayoutDashboard size={22}/> },
            { id: "Cheque Register", icon: <List size={22}/> },
            { id: "Upload Statements", icon: <UploadCloud size={22}/> },
            { id: "Reconciliation", icon: <CheckCircle size={22}/> },
            { id: "Master Customers", icon: <Users size={22}/> },
            { id: "User Management", icon: <Shield size={22}/> },
            { id: "Audit Trail", icon: <FileText size={22}/> },
            { id: "Settings", icon: <Settings size={22}/> },
          ].map(m => (
            <button key={m.id} onClick={() => setCurrentScreen(m.id)} className={`w-full text-left px-12 py-5 flex items-center text-[10px] font-black tracking-[0.3em] uppercase transition-all relative ${currentScreen === m.id ? "bg-indigo-600 text-white shadow-2xl scale-105 z-10" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}>
                {currentScreen === m.id && <div className="absolute left-0 top-0 bottom-0 w-2 bg-white"/>}
                {m.icon} <span className="ml-6">{m.id}</span>
            </button>
          ))}
        </nav>
        <div className="p-8 bg-black/40 flex justify-between items-center text-xs border-t border-slate-800">
          <div className="tracking-tighter"><p className="font-black text-white italic text-lg uppercase">{currentUser.name}</p><p className="text-[9px] text-indigo-400 uppercase font-black tracking-[0.3em] mt-1">{currentUser.role} Control</p></div>
          <button onClick={() => setCurrentUser(null)} className="p-4 bg-slate-800 hover:bg-red-600 rounded-3xl transition-all shadow-xl group"><LogOut size={20} className="group-hover:scale-125 transition-transform"/></button>
        </div>
      </div>

      {/* VIEWPORT AREA */}
      <main className="flex-1 overflow-auto bg-[#f8fafc] relative w-full">
         {currentScreen === "Dashboard" && <DashboardModule active={cheques} bankCount={bankData.length} tallyCount={tallyData.length} />}
         {currentScreen === "Cheque Register" && <ChequeRegisterModule cheques={cheques} save={save} customers={customers} mappings={manualMappings} logAction={logAction} role={currentUser.role} />}
         {currentScreen === "Upload Statements" && <UploadModule bankData={bankData} tallyData={tallyData} save={save} logAction={logAction} />}
         {currentScreen === "Reconciliation" && <ReconciliationModule cheques={cheques} bankData={bankData} tallyData={tallyData} manualMappings={manualMappings} save={save} logAction={logAction} config={config} />}
         {currentScreen === "Master Customers" && <MasterCustomersModule customers={customers} save={save} logAction={logAction} />}
         {currentScreen === "User Management" && <UserManagementModule usersList={usersList} save={save} logAction={logAction} />}
         {currentScreen === "Audit Trail" && <AuditTrailModule auditTrail={auditTrail} />}
         {currentScreen === "Settings" && <SettingsModule config={config} saveConfig={saveConfig} logAction={logAction} />}
      </main>
    </div>
  );
}

// ==========================================
// ALL SUB-MODULE COMPONENTS (PRODUCTION GRADE)
// ==========================================

function ReconciliationModule({ cheques, bankData, tallyData, manualMappings, save, logAction, config }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "date", dir: "desc", type: "date" });
  const [syncing, setSyncing] = useState(false);
  const [mapModal, setMapModal] = useState(null);

  const rows = useMemo(() => {
    let mSys = new Set(), mBank = new Set(), mTally = new Set(), res = [];
    const isDateClose = (d1, d2) => {
      const t1 = parseToSortable(toIndianDate(d1)), t2 = parseToSortable(toIndianDate(d2));
      return t1 && t2 ? Math.abs(t1 - t2) <= (config.variance * 24 * 60 * 60 * 1000) : false;
    };
    manualMappings.forEach(m => {
      const s = cheques.find(c => c.id === m.sysId), b = bankData.find(bk => bk.id === m.bankId), t = tallyData.find(tl => tl.id === m.tallyId);
      if (s) mSys.add(s.id); if (b) mBank.add(b.id); if (t) mTally.add(t.id);
      res.push({ id: m.id, date: s?.chqDate || b?.txnDate || t?.date, sys: s, bank: b, tally: t, status: "Manual Match", color: "bg-indigo-50", manual: true });
    });
    cheques.filter(c => !c.deleted && !mSys.has(c.id)).forEach(s => {
      const b = bankData.find(bk => !mBank.has(bk.id) && bk.amount === s.amount && (String(bk.chqNo).includes(s.chqNo) || isDateClose(s.chqDate, bk.txnDate)));
      const t = tallyData.find(tl => !mTally.has(tl.id) && tl.amount === s.amount && isDateClose(s.chqDate, tl.date));
      if (b) mBank.add(b.id); if (t) mTally.add(t.id);
      let st = "System Only", co = "bg-white";
      if (b && t) { st = "3-Way Match"; co = "bg-green-50"; }
      else if (b) { st = "Sys + Bank"; co = "bg-blue-50"; }
      else if (t) { st = "Sys + Tally"; co = "bg-yellow-50"; }
      res.push({ id: `s_${s.id}`, date: s.chqDate, sys: s, bank: b, tally: t, status: st, color: co });
    });
    bankData.filter(b => !mBank.has(b.id)).forEach(b => res.push({ id: `b_${b.id}`, date: b.txnDate, sys: null, bank: b, tally: null, status: "Bank Unmapped", color: "bg-orange-50" }));
    tallyData.filter(t => !mTally.has(t.id)).forEach(t => res.push({ id: `t_${t.id}`, date: t.date, sys: null, bank: null, tally: t, status: "Tally Unmapped", color: "bg-purple-50" }));
    if (q) { const term = q.toLowerCase(); res = res.filter(r => (r.sys?.customer?.toLowerCase().includes(term)) || (r.bank?.desc?.toLowerCase().includes(term)) || (r.tally?.particulars?.toLowerCase().includes(term)) || String(r.sys?.amount).includes(term)); }
    return applySort(res, sort);
  }, [cheques, bankData, tallyData, manualMappings, q, sort, config]);

  return (
    <div className="p-6 w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Rec Engine</h2>
        <div className="flex space-x-3">
          <button onClick={() => { setSyncing(true); setTimeout(() => setSyncing(false), 800); }} className="bg-white border-2 px-6 py-2.5 rounded-xl text-sm font-black shadow flex items-center hover:bg-slate-50 transition-all"><RefreshCw size={18} className={`mr-2 ${syncing ? 'animate-spin' : ''}`}/> Sync Engine</button>
          <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input placeholder="Quick search..." className="pl-10 border shadow p-2.5 rounded-xl text-sm w-96 outline-none" onChange={e => setQ(e.target.value)}/></div>
          <button onClick={() => setMapModal({})} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-xl flex items-center hover:bg-indigo-700 tracking-widest"><Plus size={18} className="mr-2"/> MANUAL MAP</button>
        </div>
      </div>
      <div className="bg-white rounded-[2rem] shadow-2xl flex-1 overflow-hidden flex flex-col border-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="bg-slate-900 text-white sticky top-0 uppercase tracking-widest z-10">
              <tr>
                <th className="p-4 border-r border-slate-800 bg-slate-950 w-32 cursor-pointer" onClick={() => setSort({key: "status", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>STATUS <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th colSpan="4" className="p-2 text-center border-r border-slate-800 bg-slate-800 text-[9px] font-black uppercase text-slate-400">ZONE 1: INTERNAL SYSTEM</th>
                <th colSpan="3" className="p-2 text-center border-r border-slate-800 bg-blue-900 text-[9px] font-black uppercase text-blue-200">ZONE 2: BANK RECORD</th>
                <th colSpan="3" className="p-2 text-center bg-purple-900 text-[9px] font-black uppercase text-purple-200">ZONE 3: TALLY VOUCHER</th>
                <th className="p-4 bg-slate-950 text-center">MAP</th>
              </tr>
              <tr className="bg-slate-800 text-[9px] border-b border-slate-700 font-black text-slate-500">
                <th className="p-4 border-r border-slate-700 cursor-pointer" onClick={() => setSort({key: "date", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>DATE <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th className="p-4 border-r border-slate-700">Date</th><th className="p-4 border-r border-slate-700">Customer</th><th className="p-4 border-r border-slate-700 text-right">Amount</th>
                <th className="p-4 border-r border-slate-700 bg-blue-950">Bank Date</th><th className="p-4 border-r border-slate-700 bg-blue-950">Bank Desc</th><th className="p-4 border-r border-slate-700 text-right bg-blue-950">Amount</th>
                <th className="p-4 border-r border-slate-700 bg-purple-950">Date</th><th className="p-4 border-r border-slate-700 bg-purple-950">Party Name</th><th className="p-4 text-right bg-purple-950">Amount</th>
                <th className="p-4 bg-slate-900"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={`${r.color} border-b border-slate-50 hover:brightness-95 transition-all`}>
                  <td className="p-4 border-r border-slate-100 font-black uppercase text-[9px]">{r.status}</td>
                  <td className="p-3 border-r border-slate-100 font-bold">{toIndianDate(r.date)}</td>
                  <td className="p-3 border-r border-slate-100 font-bold">{r.sys ? toIndianDate(r.sys.chqDate) : "-"}</td>
                  <td className="p-3 border-r border-slate-100 font-black text-slate-800">{r.sys?.customer || "-"}</td>
                  <td className="p-3 border-r border-slate-100 font-black text-right text-sm">{r.sys ? formatCurrency(r.sys.amount) : "-"}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-blue-900/40">{r.bank ? toIndianDate(r.bank.txnDate) : "-"}</td>
                  <td className="p-3 border-r border-slate-100 text-slate-500 font-bold truncate max-w-[200px]">{r.bank ? r.bank.desc : <span className="text-red-400 font-black italic">MISSING BANK</span>}</td>
                  <td className="p-3 border-r border-slate-100 font-black text-right text-blue-700 text-sm">{r.bank ? formatCurrency(r.bank.amount) : "-"}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-purple-900/40">{r.tally ? toIndianDate(r.tally.date) : "-"}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-slate-500">{r.tally ? r.tally.particulars : <span className="text-red-400 font-black italic">MISSING TALLY</span>}</td>
                  <td className="p-3 border-r border-slate-100 font-black text-right text-purple-700 text-sm">{r.tally ? formatCurrency(r.tally.amount) : "-"}</td>
                  <td className="p-3 text-center">
                    {r.manual ? <button onClick={() => save("mappings", manualMappings.filter(m => m.id !== r.id))} className="text-red-500 hover:scale-125 transition-all"><Trash2 size={16}/></button> : <button onClick={() => setMapModal(r)} className="text-indigo-600 hover:scale-125 transition-all"><Link size={16}/></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {mapModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg border-t-8 border-indigo-600">
            <h3 className="font-black text-xl mb-6">Manual Record Link</h3>
            <form onSubmit={e => {
              e.preventDefault();
              const m = { id: Date.now(), sysId: Number(e.target.s.value) || null, bankId: e.target.b.value || null, tallyId: e.target.t.value || null };
              save("mappings", [...manualMappings, m]); setMapModal(null);
            }} className="space-y-4">
              <select name="s" className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold ring-1 ring-slate-200" defaultValue={mapModal.sys?.id}><option value="">-- No Selection --</option>{cheques.filter(c => !c.deleted).map(c => <option key={c.id} value={c.id}>{toIndianDate(c.chqDate)} | {c.customer} | {c.amount}</option>)}</select>
              <select name="b" className="w-full bg-blue-50 p-3 rounded-xl text-sm font-bold ring-1 ring-blue-100" defaultValue={mapModal.bank?.id}><option value="">-- No Selection --</option>{bankData.map(bk => <option key={bk.id} value={bk.id}>{toIndianDate(bk.txnDate)} | {bk.desc.slice(0,30)} | {bk.amount}</option>)}</select>
              <select name="t" className="w-full bg-purple-50 p-3 rounded-xl text-sm font-bold ring-1 ring-purple-100" defaultValue={mapModal.tally?.id}><option value="">-- No Selection --</option>{tallyData.map(tl => <option key={tl.id} value={tl.id}>{toIndianDate(tl.date)} | {tl.particulars} | {tl.amount}</option>)}</select>
              <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setMapModal(null)} className="px-6 py-2.5 rounded-xl font-bold text-slate-400">Cancel</button><button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg">Link Now</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardModule({ active, bankCount, tallyCount }) {
  const cleared = active.filter(c => c.status === "Cleared").reduce((a, b) => a + Number(b.amount), 0);
  const pending = active.filter(c => c.status === "Pending").reduce((a, b) => a + Number(b.amount), 0);
  return (
    <div className="p-10 w-full font-sans">
      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-10 italic underline decoration-blue-500 decoration-8 underline-offset-[-4px]">Intelligence Overview</h2>
      <div className="grid grid-cols-4 gap-8">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-l-[16px] border-green-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Total Cleared</h3><p className="text-4xl font-black text-slate-900">{formatCurrency(cleared)}</p></div>
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-l-[16px] border-yellow-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Total Pending</h3><p className="text-4xl font-black text-slate-900">{formatCurrency(pending)}</p></div>
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-l-[16px] border-blue-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Bank Syncs</h3><p className="text-4xl font-black text-slate-900">{bankCount}</p></div>
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-l-[16px] border-purple-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Tally Syncs</h3><p className="text-4xl font-black text-slate-900">{tallyCount}</p></div>
      </div>
    </div>
  );
}

function ChequeRegisterModule({ cheques, save, customers, mappings, logAction, role }) {
  const [q, setQ] = useState(""), [m, setM] = useState("All"), [y, setY] = useState("All");
  const [sort, setSort] = useState({ key: "enteredAt", dir: "desc", type: "date" });
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([{ id: 1, eDate: new Date().toISOString().split("T")[0], cDate: "", cust: "", no: "", amt: "", status: "Pending", rem: "" }]);
  const [sel, setSel] = useState(new Set()), [edit, setEdit] = useState(null), [editReason, setEditReason] = useState("");

  const yrs = [...new Set(cheques.map(c => c.enteredAt?.split("-")[0]))].filter(Boolean).sort();
  let filtered = cheques.filter(c => !c.deleted);
  if (m !== "All") filtered = filtered.filter(c => c.enteredAt?.split("-")[1] === m);
  if (y !== "All") filtered = filtered.filter(c => c.enteredAt?.startsWith(y));
  if (q) { const term = q.toLowerCase(); filtered = filtered.filter(c => c.customer.toLowerCase().includes(term) || String(c.chqNo).includes(term) || (c.remarks && c.remarks.toLowerCase().includes(term))); }
  const final = applySort(filtered, sort);

  const saveBulk = () => {
    const valid = bulkRows.filter(r => r.cust && r.no && r.amt);
    if (!valid.length) return alert("Missing required fields");
    const items = valid.map(v => ({ id: Date.now() + Math.random(), enteredAt: v.eDate, chqDate: v.cDate || v.eDate, customer: v.cust.trim(), chqNo: v.no, amount: Number(v.amt), status: v.status, remarks: v.rem || "", deleted: false }));
    save("cheques", [...items, ...cheques]); 
    logAction("Batch Entry", "Register", `Added ${items.length} records`);
    setIsBulkOpen(false);
  };

  return (
    <div className="p-8 w-full font-sans">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter italic">Ledger</h2>
           {sel.size > 0 && role === "Admin" && <button onClick={() => { if(confirm(`Delete ${sel.size} items?`)){ save("cheques", cheques.map(c => sel.has(c.id)?{...c, deleted:true}:c)); setSel(new Set()); logAction("Wipe", "Register", `Bulk deleted ${sel.size}`); }}} className="bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg uppercase tracking-widest">Delete {sel.size}</button>}
        </div>
        <div className="flex space-x-2">
           <select className="border shadow-sm p-2 rounded-xl text-xs font-bold bg-white" value={m} onChange={e => setM(e.target.value)}><option value="All">All Months</option>{["01","02","03","04","05","06","07","08","09","10","11","12"].map(mo => <option key={mo}>{mo}</option>)}</select>
           <select className="border shadow-sm p-2 rounded-xl text-xs font-bold bg-white" value={y} onChange={e => setY(e.target.value)}><option value="All">All Years</option>{yrs.map(yr => <option key={yr}>{yr}</option>)}</select>
           <input placeholder="Search..." className="border shadow p-2 rounded-xl text-sm w-40 outline-none focus:ring-2 focus:ring-indigo-600" onChange={e => setQ(e.target.value)}/>
           <button onClick={() => setIsBulkOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-xl shadow-blue-200 flex items-center hover:bg-blue-700 tracking-widest uppercase"><Plus size={16} className="mr-2"/> BATCH ENTRY</button>
        </div>
      </div>
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border-0">
        <table className="w-full text-[11px] text-left">
          <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="p-5 w-10 text-center"><input type="checkbox" className="rounded-lg" onChange={e => e.target.checked ? setSel(new Set(final.map(r => r.id))) : setSel(new Set())}/></th>
              <th className="p-5 cursor-pointer" onClick={() => setSort({key: "enteredAt", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>Entry Date <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-5 cursor-pointer" onClick={() => setSort({key: "chqDate", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>Chq Date <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-5 cursor-pointer" onClick={() => setSort({key: "customer", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>Customer <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-5 cursor-pointer" onClick={() => setSort({key: "chqNo", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>Chq No <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-5 text-right cursor-pointer" onClick={() => setSort({key: "amount", dir: sort.dir === "asc" ? "desc" : "asc", type: "number"})}>Amount <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5 text-center w-10">Edit</th>
            </tr>
          </thead>
          <tbody>
            {final.map(c => (
              <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${sel.has(c.id) ? 'bg-blue-50' : ''}`}>
                <td className="p-5 text-center"><input type="checkbox" checked={sel.has(c.id)} onChange={() => { const s = new Set(sel); if(s.has(c.id)) s.delete(c.id); else s.add(c.id); setSel(s); }}/></td>
                <td className="p-5 text-slate-400 font-bold">{toIndianDate(c.enteredAt)}</td>
                <td className="p-5 font-black text-slate-600">{toIndianDate(c.chqDate)}</td>
                <td className="p-5 font-black text-slate-800 text-[13px] uppercase tracking-tight">{c.customer}</td>
                <td className="p-5 font-mono text-indigo-600 font-black tracking-tighter">{c.chqNo}</td>
                <td className="p-5 text-right font-black text-slate-900 text-[13px]">{formatCurrency(c.amount)}</td>
                <td className="p-5 text-center">
                  {mappings.some(m => m.sysId === c.id) ? <span className="bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg">MAPPED</span> :
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${c.status === "Cleared" ? "bg-green-100 text-green-700 shadow-sm shadow-green-100" : "bg-yellow-100 text-yellow-700 shadow-sm shadow-yellow-100"}`}>{c.status}</span>}
                </td>
                <td className="p-5 text-center"><button onClick={() => {setEdit(c); setEditReason("");}} className="text-slate-300 hover:text-indigo-600 transition-all hover:scale-125"><Edit size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isBulkOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-[90%] h-[80vh] flex flex-col border-[12px] border-white shadow-indigo-900/20">
            <h3 className="font-black text-3xl mb-6 tracking-tighter uppercase italic">Grid Entry Mode</h3>
            <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl p-4">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase text-[9px] font-black z-20">
                  <tr><th className="p-4">Entry Date</th><th className="p-4">Chq Date</th><th className="p-4 w-1/4">Party*</th><th className="p-4">Chq No*</th><th className="p-4 text-right">Amount*</th><th className="p-4">Status</th><th className="p-4">Remarks</th><th className="p-4 w-10"></th></tr>
                </thead>
                <tbody>
                  {bulkRows.map((r, idx) => (
                    <tr key={r.id} className="border-b bg-white hover:bg-blue-50 transition-all">
                      <td className="p-1"><input type="date" value={r.eDate} className="w-full p-2 border-0 bg-transparent text-sm font-bold" onChange={e => { const n = [...bulkRows]; n[idx].eDate = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input type="date" value={r.cDate} className="w-full p-2 border-0 bg-transparent text-sm font-bold" onChange={e => { const n = [...bulkRows]; n[idx].cDate = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input list="cust-list" value={r.cust} placeholder="Start typing..." className="w-full p-2 border-0 bg-transparent text-sm font-black uppercase" onChange={e => { const n = [...bulkRows]; n[idx].cust = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input value={r.no} placeholder="000000" className="w-full p-2 border-0 bg-transparent text-sm font-mono font-black text-indigo-600" onChange={e => { const n = [...bulkRows]; n[idx].no = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input type="number" value={r.amt} placeholder="0.00" className="w-full p-2 border-0 bg-transparent text-sm font-black text-right" onChange={e => { const n = [...bulkRows]; n[idx].amt = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><select value={r.status} className="w-full p-2 border-0 bg-transparent text-sm font-bold" onChange={e => { const n = [...bulkRows]; n[idx].status = e.target.value; setBulkRows(n); }}><option>Pending</option><option>Cleared</option></select></td>
                      <td className="p-1"><input value={r.rem} placeholder="..." className="w-full p-2 border-0 bg-transparent text-sm italic font-medium" onChange={e => { const n = [...bulkRows]; n[idx].rem = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1 text-center"><button onClick={() => setBulkRows(bulkRows.filter(x => x.id !== r.id))} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
              <button onClick={() => setBulkRows([...bulkRows, { id: Date.now(), eDate: new Date().toISOString().split("T")[0], cDate: "", cust: "", no: "", amt: "", status: "Pending", rem: "" }])} className="mt-6 text-indigo-600 font-black text-xs px-6 py-3 border-2 border-dashed border-indigo-100 rounded-2xl hover:bg-white transition-all">+ ADD LINE ITEM</button>
            </div>
            <div className="flex justify-end space-x-3 pt-6"><button onClick={() => setIsBulkOpen(false)} className="px-8 py-3 rounded-2xl text-slate-400 font-black">Cancel</button><button onClick={saveBulk} className="bg-indigo-600 text-white px-12 py-3 rounded-2xl font-black shadow-xl shadow-indigo-200 tracking-widest">SAVE BATCH</button></div>
          </div>
        </div>
      )}
      {edit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans">
          <form onSubmit={e => {
            e.preventDefault(); if(!editReason.trim()) return alert("Edit reason is mandatory!");
            const val = { id: edit.id, enteredAt: e.target.e.value, chqDate: e.target.c.value, customer: e.target.p.value.trim(), chqNo: e.target.n.value, amount: Number(e.target.a.value), status: e.target.s.value, remarks: e.target.rem.value, deleted: false };
            save("cheques", cheques.map(i => i.id === edit.id ? val : i));
            logAction("Security Override", "Ledger", `Modified: ${val.customer} | Reason: ${editReason}`);
            setEdit(null);
          }} className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-sm border-t-8 border-indigo-600 space-y-4">
            <h3 className="font-black text-xl mb-4 text-slate-800 uppercase tracking-tighter">Modify Record</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="e" type="date" defaultValue={edit.enteredAt} className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold ring-1 ring-slate-100 outline-none shadow-inner"/>
              <input name="c" type="date" defaultValue={edit.chqDate} className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold ring-1 ring-slate-100 outline-none shadow-inner"/>
            </div>
            <input name="p" defaultValue={edit.customer} required className="w-full bg-slate-50 p-3 rounded-xl text-sm font-black uppercase ring-1 ring-slate-100 outline-none shadow-inner"/>
            <input name="n" defaultValue={edit.chqNo} required className="w-full bg-slate-50 p-3 rounded-xl text-sm font-black font-mono ring-1 ring-slate-100 outline-none text-indigo-600"/>
            <input name="a" type="number" defaultValue={edit.amount} required className="w-full bg-slate-50 p-3 rounded-xl text-xl font-black ring-1 ring-slate-100 outline-none shadow-inner"/>
            <select name="s" defaultValue={edit.status} className="w-full bg-slate-50 p-3 rounded-xl text-sm font-black ring-1 ring-slate-100 outline-none shadow-inner"><option>Pending</option><option>Cleared</option><option>Bounced</option></select>
            <textarea name="rem" placeholder="Remarks..." defaultValue={edit.remarks} className="w-full bg-slate-50 p-3 rounded-xl text-sm h-16 ring-1 ring-slate-100 outline-none italic font-medium text-slate-500 shadow-inner"/>
            <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-200 mt-2">
              <label className="text-[9px] font-black text-yellow-700 uppercase flex items-center mb-1"><AlertTriangle size={10} className="mr-1"/> MANDATORY REASON FOR EDIT</label>
              <input value={editReason} onChange={e=>setEditReason(e.target.value)} required placeholder="Reason..." className="w-full bg-white p-2 rounded-lg text-xs font-black border-0 outline-none ring-1 ring-yellow-400"/>
            </div>
            <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={() => setEdit(null)} className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400">Abort</button><button disabled={!editReason.trim()} className={`bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg ${!editReason.trim() ? 'opacity-30' : ''}`}>COMMIT</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function UploadModule({ bankData, tallyData, save, logAction }) {
  const up = (e, t) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let add = 0, dp = 0;
      if (t === "B") {
        const nl = [...bankData]; raw.forEach(row => {
          const id = row["Transaction ID"] || row["Ref No"] || Math.random().toString();
          if (nl.some(b => String(b.id) === String(id))) dp++;
          else { nl.push({ id, txnDate: formatExcelDate(row["Value Date"] || row["Date"]), desc: String(row["Description"] || ""), chqNo: String(row["ChequeNo"] || ""), amount: Number(row["Amount"] || 0) }); add++; }
        }); save("bank", nl);
      } else {
        const nl = [...tallyData]; raw.forEach(row => {
          const vn = row["Vch No."]; if (nl.some(tl => String(tl.vchNo) === String(vn))) dp++;
          else { nl.push({ id: vn, date: formatExcelDate(row["Date"]), particulars: String(row["Particulars"] || ""), vchNo: vn, amount: Number(row["Debit"] || row["Credit"] || row["Amount"] || 0) }); add++; }
        }); save("tally", nl);
      }
      alert(`Done! New: ${add}, Skipped: ${dp}`); logAction("Protocol Sync", t==="B"?"Bank":"Tally", `Wrote ${add} records`);
    }; r.readAsBinaryString(f);
  };
  return (
    <div className="p-20 grid grid-cols-2 gap-16 max-w-7xl mx-auto font-sans">
      <div className="bg-white p-16 rounded-[3.5rem] shadow-2xl border-t-[20px] border-orange-500 relative text-center">
        <button onClick={() => save("bank", [])} className="absolute top-6 right-6 text-red-500 hover:scale-150 transition-all"><Trash size={24}/></button>
        <UploadCloud size={100} className="text-orange-500 mb-8 mx-auto"/><h3 className="text-3xl font-black italic tracking-tighter uppercase">ICICI Bank Records</h3>
        <input type="file" onChange={e => up(e, "B")} className="text-xs border-4 border-dashed border-slate-100 p-10 rounded-[2.5rem] w-full bg-slate-50 cursor-pointer font-black mt-4"/>
      </div>
      <div className="bg-white p-16 rounded-[3.5rem] shadow-2xl border-t-[20px] border-purple-500 relative text-center">
        <button onClick={() => save("tally", [])} className="absolute top-6 right-6 text-red-500 hover:scale-150 transition-all"><Trash size={24}/></button>
        <FileSpreadsheet size={100} className="text-purple-500 mb-8 mx-auto"/><h3 className="text-3xl font-black italic tracking-tighter uppercase">Tally Vouchers</h3>
        <input type="file" onChange={e => up(e, "T")} className="text-xs border-4 border-dashed border-slate-100 p-10 rounded-[2.5rem] w-full bg-slate-50 cursor-pointer font-black mt-4"/>
      </div>
    </div>
  );
}

function SettingsModule({ config, saveConfig, logAction }) {
  const [cName, setCName] = useState(config.companyName);
  const [cVar, setCVar] = useState(config.variance);
  return (
    <div className="p-10 max-w-2xl mx-auto font-sans">
      <h2 className="text-3xl font-black mb-8 italic tracking-tighter uppercase">System Config</h2>
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-t-[12px] border-slate-900 space-y-8">
         <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Company Display Identity</label><input value={cName} onChange={e=>setCName(e.target.value)} className="w-full bg-slate-50 p-5 rounded-2xl text-lg font-black ring-1 ring-slate-100 outline-none shadow-inner uppercase"/></div>
         <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Match Date Variance (Days)</label><input type="number" value={cVar} onChange={e=>setCVar(Number(e.target.value))} className="w-full bg-slate-50 p-5 rounded-2xl text-lg font-black ring-1 ring-slate-100 outline-none shadow-inner"/></div>
         <button onClick={()=>{ saveConfig({companyName: cName, variance: cVar}); alert("Protocols Committed!"); logAction("Config update", "Security", `Set variance to ${cVar} days`); }} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black tracking-[0.3em] hover:bg-black transition-all shadow-xl italic uppercase">Commit Protocols</button>
      </div>
    </div>
  );
}

function MasterCustomersModule({ customers, save, logAction }) {
  const up = (e) => {
    const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload=(ev)=>{
      const wb = XLSX.read(ev.target.result, {type:'binary'}); const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const nl = [...customers]; raw.forEach(row=>{ const name = row.Name || row.Customer; if(name && !nl.some(c=>c.name.toLowerCase()===String(name).toLowerCase().trim())) nl.push({id:Date.now()+Math.random(), name:String(name).trim()})});
      save("customers", nl); alert("Master Synchronized"); logAction("Data Sync", "Master", "Client Batch Upload");
    }; r.readAsBinaryString(f);
  };
  return (
    <div className="p-10 max-w-xl mx-auto font-sans">
      <div className="flex justify-between mb-8"><h2 className="text-3xl font-black italic tracking-tighter uppercase">Client Master</h2><label className="bg-indigo-600 text-white px-6 py-3 rounded-2xl cursor-pointer text-xs font-black shadow-xl hover:bg-indigo-700 tracking-widest uppercase"><FileUp size={16} className="inline mr-2"/> Import Master<input type="file" className="hidden" onChange={up}/></label></div>
      <div className="bg-white border-0 shadow-2xl rounded-[2.5rem] overflow-auto max-h-[70vh]">
        {customers.map(c => <div key={c.id} className="p-6 border-b border-slate-50 flex justify-between hover:bg-slate-50 transition-all font-black text-slate-700 italic tracking-tighter text-lg uppercase"><span>{c.name}</span><button onClick={() => {save("customers", customers.filter(i => i.id !== c.id)); logAction("Protocol Deletion", "Master", `Wiped ${c.name}`);}} className="text-red-300 hover:text-red-500 transition-all hover:scale-125"><Trash2 size={20}/></button></div>)}
      </div>
    </div>
  );
}

function UserManagementModule({ usersList, save, logAction }) {
  const [m, setM] = useState(null);
  return (
    <div className="p-8 font-sans">
      <div className="flex justify-between mb-8"><h2 className="text-3xl font-black tracking-tighter italic uppercase">Access Protocols</h2><button onClick={() => setM({})} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black shadow-xl tracking-widest uppercase">NEW PROTOCOL</button></div>
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-0">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 border-b text-[9px] font-black uppercase text-slate-400 tracking-widest"><tr><th className="p-6">Operator Name</th><th className="p-6">Access Level</th><th className="p-6 text-center">Protocol Edit</th></tr></thead>
          <tbody>{usersList.map(u => <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors"><td className="p-6 font-black text-slate-800 text-lg uppercase tracking-tight">{u.name} <span className="text-slate-200 italic ml-2 text-xs">(@{u.username})</span></td><td className="p-6 font-black text-blue-600 uppercase text-xs tracking-widest italic">{u.role}</td><td className="p-6 text-center"><button onClick={() => setM(u)} className="text-slate-200 hover:text-blue-600 transition-all hover:scale-150"><Edit size={22}/></button></td></tr>)}</tbody>
        </table>
      </div>
      {m && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={e => {
            e.preventDefault(); const u = { id: m.id || Date.now(), username: e.target.u.value.toLowerCase().trim(), name: e.target.n.value.trim(), role: e.target.r.value, password: e.target.p.value, active: e.target.a.checked };
            save("users", m.id ? usersList.map(i => i.id === m.id ? u : i) : [...usersList, u]); setM(null); logAction("Security Change", "User", `Admin modified protocols for ${u.username}`);
          }} className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-sm space-y-4 border-t-[12px] border-slate-900">
            <h3 className="font-black text-2xl text-slate-800 tracking-tighter italic mb-4">Operator Clearance</h3>
            <input name="u" placeholder="Admin ID" defaultValue={m.username} required className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none tracking-widest ring-1 ring-slate-100 shadow-inner"/>
            <input name="n" placeholder="Operator Name" defaultValue={m.name} required className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none tracking-widest ring-1 ring-slate-100 shadow-inner"/>
            <input name="p" placeholder="Security Passcode" defaultValue={m.password} required className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none tracking-widest ring-1 ring-slate-100 shadow-inner"/>
            <select name="r" defaultValue={m.role || "Team"} className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black ring-1 ring-slate-100 uppercase tracking-widest"><option>Team</option><option>Admin</option></select>
            <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest ml-1"><input name="a" type="checkbox" defaultChecked={m.active ?? true} className="mr-4 w-6 h-6 border-2 rounded-lg shadow-sm"/> Active Access</label>
            <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setM(null)} className="px-6 py-2.5 rounded-2xl font-black text-slate-300 uppercase tracking-widest text-[9px]">Abort</button><button className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black text-xs shadow-lg uppercase tracking-widest">COMMIT</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function AuditTrailModule({ auditTrail }) {
  const rows = useMemo(() => applySort(auditTrail, { key: "id", dir: "desc", type: "number" }), [auditTrail]);
  return (
    <div className="p-8 w-full h-full flex flex-col font-sans">
      <h2 className="text-3xl font-black text-slate-800 mb-8 italic tracking-tighter uppercase">Security Protocol Logs</h2>
      <div className="bg-white border-0 shadow-2xl rounded-[3rem] overflow-hidden flex-1 border-8 border-white">
        <div className="overflow-auto h-full">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-900 text-slate-500 sticky top-0 uppercase tracking-widest text-[8px] font-black z-10"><tr><th className="p-5">Timestamp (DD/MM/YY)</th><th className="p-5">Operator ID</th><th className="p-5">Event Protocol</th><th className="p-5">Audit Details / Reasoning</th></tr></thead>
            <tbody>{rows.map(l => (<tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all italic font-medium tracking-tight"><td className="p-5 text-slate-400 font-mono font-bold tracking-tighter text-[10px]">{l.time}</td><td className="p-5 font-black text-slate-800 uppercase tracking-tighter text-[10px]">{l.user}</td><td className="p-5 text-indigo-600 font-black italic tracking-widest uppercase text-[10px]">{l.action}</td><td className="p-5 font-bold text-slate-500 tracking-tight">{l.record}: {l.details}</td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}