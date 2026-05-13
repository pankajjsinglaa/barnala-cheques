import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, List, FileText, LogOut, Search, Trash2, Edit, Plus, X,
  ArrowUpDown, Users, FileUp, UploadCloud, FileSpreadsheet, CheckCircle,
  Link, RefreshCw, Shield, UserPlus, Download, Database, Trash, Settings, AlertTriangle
} from "lucide-react";
import * as XLSX from "xlsx";

// --- 1. FIREBASE INITIALIZATION ---
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

// --- 2. GLOBAL UTILITIES (DD/MM/YY) ---
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
    const fY = y.length === 2 ? `20${y}` : y;
    return new Date(`${fY}-${m}-${d}`).getTime();
  }
  return new Date(dStr).getTime() || 0;
};

const formatExcelDate = (val) => {
  if (!val) return "";
  if (typeof val === "number") {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
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

  const logAudit = (action, record, details) => {
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    save("auditTrail", [{ id: Date.now(), time: timeStr, user: currentUser?.username || "System", action, record, details }, ...auditTrail].slice(0, 1000));
  };

  if (!isDbReady) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse tracking-widest uppercase">Syncing Barnala Cloud...</div>;

  if (!currentUser) return (
    <div className="h-screen flex items-center justify-center bg-slate-200 p-4">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-sm border-t-[14px] border-slate-900 text-center font-sans">
        <div className="bg-slate-900 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl"><Shield size={40} className="text-blue-400"/></div>
        <h1 className="text-2xl font-black mb-1 text-slate-900 uppercase italic tracking-tighter">{config.companyName}</h1>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] mb-10 font-black italic">Security Authentication</p>
        <form onSubmit={e => {
          e.preventDefault();
          const u = usersList.find(x => x.username === e.target.u.value.toLowerCase().trim() && x.password === e.target.p.value);
          if (u) { if (u.active) { setCurrentUser(u); } else alert("Access Restricted"); } else alert("Denied");
        }}>
          <input name="u" placeholder="OPERATOR ID" className="w-full bg-slate-50 border-0 p-5 rounded-3xl mb-4 text-center text-xs font-black tracking-widest ring-1 ring-slate-100 outline-none focus:ring-2 focus:ring-slate-900" />
          <input name="p" type="password" placeholder="SECURE KEY" className="w-full bg-slate-50 border-0 p-5 rounded-3xl mb-10 text-center text-xs font-black tracking-widest ring-1 ring-slate-100 outline-none focus:ring-2 focus:ring-slate-900" />
          <button className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black tracking-widest hover:bg-black transition-all">AUTHENTICATE</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden font-sans antialiased">
      {/* SIDEBAR */}
      <div className="w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl z-20 font-sans">
        <div className="p-12 border-b border-slate-800 text-center font-black text-blue-400 tracking-tighter text-2xl uppercase italic flex flex-col">{config.companyName.split(' ')[0]}<span className="text-[9px] tracking-[0.6em] text-slate-500 mt-2 font-black">ERP SYSTEM</span></div>
        <nav className="flex-1 py-6 overflow-y-auto">
          {[
            { id: "Dashboard", icon: <LayoutDashboard size={20}/> },
            { id: "Cheque Register", icon: <List size={20}/> },
            { id: "Upload Statements", icon: <UploadCloud size={20}/> },
            { id: "Reconciliation", icon: <CheckCircle size={20}/> },
            { id: "Master Customers", icon: <Users size={20}/> },
            { id: "User Management", icon: <Shield size={20}/> },
            { id: "Audit Trail", icon: <FileText size={20}/> },
            { id: "Settings", icon: <Settings size={20}/> },
          ].map(m => (
            <button key={m.id} onClick={() => setCurrentScreen(m.id)} className={`w-full text-left px-10 py-5 flex items-center text-[10px] font-black tracking-[0.2em] uppercase transition-all relative ${currentScreen === m.id ? "bg-indigo-600 border-l-[8px] border-white text-white shadow-2xl" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}>{m.icon} <span className="ml-5">{m.id}</span></button>
          ))}
        </nav>
        <div className="p-6 bg-black/40 flex justify-between items-center text-xs border-t border-slate-800">
          <div><p className="font-black text-white italic text-lg tracking-tighter uppercase">{currentUser.name}</p><p className="text-[9px] text-blue-500 uppercase font-black tracking-widest">{currentUser.role}</p></div>
          <button onClick={() => setCurrentUser(null)} className="p-3 bg-slate-800 hover:bg-red-600 rounded-2xl transition-all shadow-lg"><LogOut size={16}/></button>
        </div>
      </div>

      {/* VIEWPORT */}
      <main className="flex-1 overflow-auto bg-[#f8fafc] relative w-full">
         {currentScreen === "Dashboard" && <DashboardModule active={cheques} bankCount={bankData.length} tallyCount={tallyData.length} />}
         {currentScreen === "Cheque Register" && <ChequeRegisterModule cheques={cheques} save={save} customers={customers} mappings={manualMappings} logAudit={logAudit} currentUser={currentUser} />}
         {currentScreen === "Upload Statements" && <UploadModule bankData={bankData} tallyData={tallyData} save={save} logAudit={logAudit} />}
         {currentScreen === "Reconciliation" && <ReconciliationModule cheques={cheques} bankData={bankData} tallyData={tallyData} manualMappings={manualMappings} save={save} logAudit={logAudit} config={config} />}
         {currentScreen === "Master Customers" && <MasterCustomersModule customers={customers} save={save} logAudit={logAudit} />}
         {currentScreen === "User Management" && <UserManagementModule usersList={usersList} save={save} logAudit={logAudit} />}
         {currentScreen === "Audit Trail" && <AuditTrailModule auditTrail={auditTrail} />}
         {currentScreen === "Settings" && <SettingsModule config={config} saveConfig={saveConfig} logAudit={logAudit} />}
      </main>
    </div>
  );
}

// ==========================================
// SUB-MODULE: RECONCILIATION (FULL WIDTH)
// ==========================================
function ReconciliationModule({ cheques, bankData, tallyData, manualMappings, save, logAudit, config }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "date", dir: "desc", type: "date" });
  const rows = useMemo(() => {
    let mS = new Set(), mB = new Set(), mT = new Set(), res = [];
    const isClose = (d1, d2) => {
      const t1 = parseToSortable(toIndianDate(d1)), t2 = parseToSortable(toIndianDate(d2));
      return t1 && t2 ? Math.abs(t1 - t2) <= (config.variance * 24 * 60 * 60 * 1000) : false;
    };
    manualMappings.forEach(m => {
      const s = cheques.find(c => c.id === m.sysId), b = bankData.find(bk => bk.id === m.bankId), t = tallyData.find(tl => tl.id === m.tallyId);
      if (s) mS.add(s.id); if (b) mB.add(b.id); if (t) mT.add(t.id);
      res.push({ id: m.id, date: s?.chqDate || b?.txnDate || t?.date, sys: s, bank: b, tally: t, status: "Manual Link", color: "bg-indigo-50", manual: true });
    });
    cheques.filter(c => !c.deleted && !mS.has(c.id)).forEach(s => {
      const b = bankData.find(bk => !mB.has(bk.id) && bk.amount === s.amount && (String(bk.chqNo).includes(s.chqNo) || isClose(s.chqDate, bk.txnDate)));
      const t = tallyData.find(tl => !mT.has(tl.id) && tl.amount === s.amount && isClose(s.chqDate, tl.date));
      if (b) mB.add(b.id); if (t) mT.add(t.id);
      let st = "System Only", co = "bg-white";
      if (b && t) { st = "Matched"; co = "bg-green-50"; } else if (b) { st = "Sys+Bank"; co = "bg-blue-50"; } else if (t) { st = "Sys+Tally"; co = "bg-yellow-50"; }
      res.push({ id: `s_${s.id}`, date: s.chqDate, sys: s, bank: b, tally: t, status: st, color: co });
    });
    bankData.filter(b => !mB.has(b.id)).forEach(b => res.push({ id: `b_${b.id}`, date: b.txnDate, sys: null, bank: b, tally: null, status: "Bank Only", color: "bg-orange-50" }));
    tallyData.filter(t => !mT.has(t.id)).forEach(t => res.push({ id: `t_${t.id}`, date: t.date, sys: null, bank: null, tally: t, status: "Tally Only", color: "bg-purple-50" }));
    if (q) { const tm = q.toLowerCase(); res = res.filter(r => r.sys?.customer?.toLowerCase().includes(tm) || r.bank?.desc?.toLowerCase().includes(tm) || r.tally?.particulars?.toLowerCase().includes(tm) || String(r.sys?.amount).includes(tm)); }
    return applySort(res, sort);
  }, [cheques, bankData, tallyData, manualMappings, q, sort, config]);

  return (
    <div className="p-6 h-full flex flex-col w-full font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">Matching Engine</h2>
        <div className="flex space-x-3">
          <button onClick={() => window.location.reload()} className="bg-white border-2 px-6 py-2.5 rounded-xl text-sm font-black shadow flex items-center hover:bg-slate-50 transition-all shadow-indigo-100"><RefreshCw size={18} className="mr-2"/> Sync Engine</button>
          <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input placeholder="Quick search..." className="pl-10 border shadow p-3 rounded-2xl text-sm w-96 outline-none focus:ring-2 focus:ring-indigo-600 transition-all" onChange={e => setQ(e.target.value)}/></div>
        </div>
      </div>
      <div className="bg-white rounded-[2rem] shadow-2xl flex-1 overflow-hidden flex flex-col border-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="bg-slate-900 text-white sticky top-0 uppercase tracking-widest z-10 font-black">
              <tr>
                <th className="p-4 border-r border-slate-800 bg-slate-950 w-32 cursor-pointer" onClick={() => setSort({key: "status", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>STATUS <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th colSpan="3" className="p-2 text-center border-r border-slate-800 bg-slate-800 text-[10px] text-slate-400 tracking-widest font-black italic underline decoration-slate-600">Internal System (Zone 1)</th>
                <th colSpan="2" className="p-2 text-center border-r border-slate-800 bg-blue-900 text-blue-200 tracking-widest font-black italic underline decoration-blue-700">Bank ICICI (Zone 2)</th>
                <th colSpan="2" className="p-2 text-center bg-purple-900 text-purple-200 tracking-widest font-black italic underline decoration-purple-700">Tally Ledger (Zone 3)</th>
                <th className="p-4 bg-slate-950 text-center">ACTION</th>
              </tr>
              <tr className="bg-slate-800 text-[9px] border-b border-slate-700 text-slate-500 font-bold uppercase tracking-widest">
                <th className="p-4 border-r border-slate-700 cursor-pointer bg-slate-900 text-white" onClick={() => setSort({key: "date", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>BEST DATE <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th className="p-4 border-r border-slate-700">Customer</th><th className="p-4 border-r border-slate-700 text-right">Amount</th>
                <th className="p-4 border-r border-slate-700 bg-blue-950">Description</th><th className="p-4 border-r border-slate-700 text-right bg-blue-950">Bank Amt</th>
                <th className="p-4 border-r border-slate-700 bg-purple-950">Tally Party</th><th className="p-4 text-right bg-purple-950">Tally Amt</th>
                <th className="p-4 bg-slate-900"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={`${r.color} border-b border-slate-50 hover:brightness-95 transition-all`}>
                  <td className="p-4 border-r border-slate-100 font-black uppercase text-[10px] tracking-tight italic">{r.status}</td>
                  <td className="p-3 border-r border-slate-100 font-bold">{toIndianDate(r.date)}</td>
                  <td className="p-3 border-r border-slate-100 font-black text-slate-800 uppercase tracking-tight">{r.sys?.customer || "-"}</td>
                  <td className="p-3 border-r border-slate-100 font-black text-right text-sm">{r.sys ? formatCurrency(r.sys.amount) : "-"}</td>
                  <td className="p-3 border-r border-slate-100 text-slate-500 font-bold truncate max-w-[200px] italic">{r.bank ? r.bank.desc : <span className="text-red-400 font-bold italic text-[8px] uppercase">No Bank Log</span>}</td>
                  <td className="p-3 border-r border-slate-100 font-black text-right text-blue-700 text-sm font-mono">{r.bank ? formatCurrency(r.bank.amount) : "-"}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-slate-500 uppercase">{r.tally ? r.tally.particulars : <span className="text-red-400 font-bold italic text-[8px] uppercase">No Ledger Log</span>}</td>
                  <td className="p-3 border-r border-slate-100 font-black text-right text-purple-700 text-sm font-mono">{r.tally ? formatCurrency(r.tally.amount) : "-"}</td>
                  <td className="p-3 text-center">
                    {r.manual ? <button onClick={() => save("mappings", manualMappings.filter(m => m.id !== r.id))} className="text-red-500 hover:scale-125 transition-all"><Trash2 size={18}/></button> : <button onClick={() => alert("Manual Map Wizard coming in future build")} className="text-indigo-600 hover:scale-125 transition-all"><Link size={18}/></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SUB-MODULE: CHEQUE REGISTER
// ==========================================
function ChequeRegisterModule({ cheques, save, customers, mappings, logAudit, currentUser }) {
  const [q, setQ] = useState(""), [m, setM] = useState("All"), [y, setY] = useState("All");
  const [sort, setSort] = useState({ key: "enteredAt", dir: "desc", type: "date" });
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([{ id: 1, eDate: new Date().toISOString().split("T")[0], cDate: "", cust: "", bank: "", no: "", amt: "", status: "Pending", rem: "" }]);
  const [sel, setSel] = useState(new Set()), [edit, setEdit] = useState(null), [editReason, setEditReason] = useState("");

  const yrs = [...new Set(cheques.map(c => c.enteredAt?.split("-")[0]))].filter(Boolean).sort();
  let filtered = cheques.filter(c => !c.deleted);
  if (m !== "All") filtered = filtered.filter(c => c.enteredAt?.split("-")[1] === m);
  if (y !== "All") filtered = filtered.filter(c => c.enteredAt?.startsWith(y));
  if (q) filtered = filtered.filter(c => c.customer.toLowerCase().includes(q.toLowerCase()) || String(c.chqNo).includes(q));
  const rows = applySort(filtered, sort);

  const saveBatch = () => {
    const valid = bulkRows.filter(r => r.cust && r.no && r.amt);
    if (!valid.length) return alert("Required: Name, Chq No, and Amount");
    const items = valid.map(v => ({ id: Date.now() + Math.random(), enteredAt: v.eDate, chqDate: v.cDate || v.eDate, customer: v.cust.trim(), bank: v.bank || "", chqNo: v.no, amount: Number(v.amt), status: v.status, remarks: v.rem || "", deleted: false }));
    save("cheques", [...items, ...cheques]); setIsBulkOpen(false); logAudit("Data Protocol", "Register", `Batch commit: ${items.length} records`);
  };

  return (
    <div className="p-8 w-full font-sans animate-in slide-in-from-bottom duration-500">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-6">
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase underline decoration-indigo-200">Ledger Index</h2>
           {sel.size > 0 && currentUser.role === "Admin" && <button onClick={() => { if(confirm(`Delete ${sel.size} records?`)){ save("cheques", cheques.map(c => sel.has(c.id)?{...c, deleted:true}:c)); setSel(new Set()); logAudit("Admin Protocol", "Register", `Bulk Deletion: ${sel.size}`); }}} className="bg-red-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black shadow-xl tracking-widest uppercase">Delete Selected</button>}
        </div>
        <div className="flex space-x-3">
           <select className="border shadow p-3 rounded-xl text-xs font-black bg-white outline-none" value={m} onChange={e => setM(e.target.value)}><option value="All">All Months</option>{["01","02","03","04","05","06","07","08","09","10","11","12"].map(mo => <option key={mo}>{mo}</option>)}</select>
           <select className="border shadow p-3 rounded-xl text-xs font-black bg-white outline-none" value={y} onChange={e => setY(e.target.value)}><option value="All">All Years</option>{yrs.map(yr => <option key={yr}>{yr}</option>)}</select>
           <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-300" size={16}/><input placeholder="Quick search..." className="pl-10 border shadow p-3 rounded-2xl text-sm w-48 outline-none focus:ring-2 focus:ring-indigo-600" onChange={e => setQ(e.target.value)}/></div>
           <button onClick={() => setIsBulkOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black shadow-xl flex items-center hover:bg-blue-700 tracking-widest uppercase"><Plus size={18} className="mr-2"/> Batch Grid Entry</button>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-0">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="p-6 w-10 text-center"><input type="checkbox" className="rounded-lg border-2" onChange={e => e.target.checked ? setSel(new Set(rows.map(r => r.id))) : setSel(new Set())}/></th>
              <th className="p-6 cursor-pointer hover:text-blue-600" onClick={() => setSort({key: "enteredAt", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>Entry Date <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-6 cursor-pointer hover:text-blue-600" onClick={() => setSort({key: "chqDate", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>Chq Date <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-6 cursor-pointer hover:text-blue-600" onClick={() => setSort({key: "customer", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>Customer <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-6 cursor-pointer hover:text-blue-600" onClick={() => setSort({key: "bank", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>Bank Name <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-6 cursor-pointer hover:text-blue-600" onClick={() => setSort({key: "chqNo", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>Chq No <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-6 text-right cursor-pointer hover:text-blue-600" onClick={() => setSort({key: "amount", dir: sort.dir === "asc" ? "desc" : "asc", type: "number"})}>Amount <ArrowUpDown size={10} className="inline ml-1"/></th>
              <th className="p-6 text-center">Status</th>
              <th className="p-6 text-center w-10">Protocal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all italic font-medium ${sel.has(c.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="p-6 text-center"><input type="checkbox" checked={sel.has(c.id)} className="w-5 h-5 rounded-lg border-2 border-slate-100" onChange={() => { const s = new Set(sel); if(s.has(c.id)) s.delete(c.id); else s.add(c.id); setSel(s); }}/></td>
                <td className="p-6 text-slate-300 font-bold tracking-tighter">{toIndianDate(c.enteredAt)}</td>
                <td className="p-6 font-black text-slate-500 tracking-tighter">{toIndianDate(c.chqDate)}</td>
                <td className="p-6 font-black text-slate-800 text-base uppercase tracking-tighter">{c.customer}</td>
                <td className="p-6 font-black text-slate-400 text-xs uppercase italic">{c.bank || "-"}</td>
                <td className="p-6 font-mono text-indigo-600 font-black tracking-tighter">{c.chqNo}</td>
                <td className="p-6 text-right font-black text-slate-900 text-lg tracking-tighter font-mono">{formatCurrency(c.amount)}</td>
                <td className="p-6 text-center">
                  {mappings.some(m => m.sysId === c.id) ? <span className="bg-indigo-600 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-xl">MAPPED</span> :
                  <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${c.status === "Cleared" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</span>}
                </td>
                <td className="p-6 text-center"><button onClick={() => {setEdit(c); setEditReason("");}} className="text-slate-200 hover:text-indigo-600 transition-all hover:scale-150"><Edit size={24}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isBulkOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6 font-sans">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-[95%] h-[85vh] flex flex-col border-[12px] border-white shadow-indigo-900/20">
            <h3 className="font-black text-4xl mb-8 tracking-tighter uppercase italic text-slate-800 italic underline decoration-indigo-200 underline-offset-[-2px]">Rapid Batch Entry</h3>
            <div className="flex-1 overflow-auto bg-slate-50 rounded-[2.5rem] p-6 shadow-inner">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase text-[9px] font-black z-20">
                  <tr><th className="p-4">Entry Date</th><th className="p-4">Chq Date</th><th className="p-4 w-1/5">Party Name*</th><th className="p-4 w-1/5">Bank Identity</th><th className="p-4">Chq No*</th><th className="p-4 text-right">Amount*</th><th className="p-4 text-center">Status</th><th className="p-4">Remarks</th><th className="p-4 w-10"></th></tr>
                </thead>
                <tbody>
                  {bulkRows.map((r, idx) => (
                    <tr key={r.id} className="border-b bg-white hover:bg-blue-50 transition-all italic">
                      <td className="p-1"><input type="date" value={r.eDate} className="w-full p-4 border-0 bg-transparent text-sm font-bold outline-none shadow-none" onChange={e => { const n = [...bulkRows]; n[idx].eDate = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input type="date" value={r.cDate} className="w-full p-4 border-0 bg-transparent text-sm font-bold outline-none shadow-none" onChange={e => { const n = [...bulkRows]; n[idx].cDate = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input list="cust-list" value={r.cust} placeholder="Party..." className="w-full p-4 border-0 bg-transparent text-sm font-black uppercase text-slate-800 outline-none" onChange={e => { const n = [...bulkRows]; n[idx].cust = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input value={r.bank} placeholder="Bank..." className="w-full p-4 border-0 bg-transparent text-sm font-black uppercase text-slate-500 outline-none" onChange={e => { const n = [...bulkRows]; n[idx].bank = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input value={r.no} placeholder="000000" className="w-full p-4 border-0 bg-transparent text-sm font-mono font-black text-indigo-600 outline-none" onChange={e => { const n = [...bulkRows]; n[idx].no = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input type="number" value={r.amt} placeholder="₹ 0" className="w-full p-4 border-0 bg-transparent text-lg font-black text-right outline-none" onChange={e => { const n = [...bulkRows]; n[idx].amt = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><select value={r.status} className="w-full p-4 border-0 bg-transparent text-sm font-black uppercase tracking-widest outline-none" onChange={e => { const n = [...bulkRows]; n[idx].status = e.target.value; setBulkRows(n); }}><option>Pending</option><option>Cleared</option><option>Bounced</option></select></td>
                      <td className="p-1"><input value={r.rem} placeholder="..." className="w-full p-4 border-0 bg-transparent text-sm italic font-medium text-slate-300" onChange={e => { const n = [...bulkRows]; n[idx].rem = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-2 text-center"><button onClick={() => setBulkRows(bulkRows.filter(x => x.id !== r.id))} className="text-red-200 hover:text-red-600 transition-all"><Trash2 size={24}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
              <button onClick={() => setBulkRows([...bulkRows, { id: Date.now(), eDate: new Date().toISOString().split("T")[0], cDate: "", cust: "", bank: "", no: "", amt: "", status: "Pending", rem: "" }])} className="mt-10 mx-auto bg-white border-4 border-dashed border-indigo-100 text-indigo-600 font-black text-xs px-12 py-5 rounded-[2.5rem] hover:bg-white transition-all shadow-xl shadow-indigo-100">+ INSERT NEW LINE ITEM</button>
            </div>
            <div className="flex justify-end space-x-5 pt-8"><button onClick={() => setIsBulkOpen(false)} className="px-10 py-5 rounded-[2rem] text-sm font-black text-slate-400 uppercase tracking-widest uppercase">Abort Batch</button><button onClick={saveBatch} className="bg-slate-900 text-white px-20 py-5 rounded-[2rem] text-sm font-black shadow-2xl uppercase italic tracking-widest">Commit Protocols</button></div>
          </div>
        </div>
      )}
      {edit && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans">
          <form onSubmit={e => {
            e.preventDefault(); if(!editReason.trim()) return alert("PROTOCOL: Reason for edit is mandatory!");
            const val = { id: edit.id, enteredAt: e.target.e.value, chqDate: e.target.c.value, customer: e.target.p.value.trim(), bank: e.target.b.value, chqNo: e.target.n.value, amount: Number(e.target.a.value), status: e.target.s.value, remarks: e.target.rem.value, deleted: false };
            save("cheques", cheques.map(i => i.id === edit.id ? val : i));
            logAudit("Manual Override", "Ledger", `Target: ${val.customer} | Reasoning: ${editReason}`); setEdit(null);
          }} className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border-t-8 border-indigo-600 space-y-4">
            <h3 className="font-black text-2xl text-slate-800 tracking-tighter text-center uppercase italic">Adjust Protocols</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="e" type="date" defaultValue={edit.enteredAt} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold ring-1 ring-slate-100 outline-none shadow-inner"/>
              <input name="c" type="date" defaultValue={edit.chqDate} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold ring-1 ring-slate-100 outline-none shadow-inner"/>
            </div>
            <input name="p" defaultValue={edit.customer} required className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black uppercase ring-1 ring-slate-100 outline-none shadow-inner"/>
            <input name="b" placeholder="Bank" defaultValue={edit.bank} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black uppercase ring-1 ring-slate-100 outline-none shadow-inner"/>
            <input name="n" defaultValue={edit.chqNo} required className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black font-mono ring-1 ring-slate-100 outline-none text-indigo-600 shadow-inner"/>
            <input name="a" type="number" defaultValue={edit.amount} required className="w-full bg-slate-50 p-4 rounded-2xl text-xl font-black ring-1 ring-slate-100 outline-none shadow-inner text-right"/>
            <select name="s" defaultValue={edit.status} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black ring-1 ring-slate-100 outline-none shadow-inner uppercase tracking-widest"><option>Pending</option><option>Cleared</option><option>Bounced</option></select>
            <textarea name="rem" placeholder="Remarks..." defaultValue={edit.remarks} className="w-full bg-slate-50 p-4 rounded-2xl text-sm h-16 ring-1 ring-slate-100 outline-none italic font-medium text-slate-400 shadow-inner"/>
            <div className="bg-yellow-50 p-5 rounded-3xl border-2 border-yellow-200 mt-2 shadow-inner">
              <label className="text-[9px] font-black text-yellow-700 uppercase flex items-center mb-1 tracking-widest"><AlertTriangle size={12} className="mr-2"/> Protocol Trace: Reason Required</label>
              <input value={editReason} onChange={e=>setEditReason(e.target.value)} required placeholder="Required for Audit Trail..." className="w-full bg-white p-3 rounded-xl text-xs font-black border-0 outline-none ring-2 ring-yellow-400/50 shadow-inner"/>
            </div>
            <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={() => setEdit(null)} className="px-6 py-4 rounded-2xl text-xs font-bold text-slate-400 tracking-widest uppercase">Abort</button><button disabled={!editReason.trim()} className={`bg-indigo-600 text-white px-10 py-4 rounded-2xl text-xs font-black shadow-xl tracking-widest italic uppercase ${!editReason.trim() ? 'opacity-20' : ''}`}>COMMIT</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

// --- SYSTEM MODULES ---

function DashboardModule({ active, bankCount, tallyCount }) {
  const cleared = active.filter(c => c.status === "Cleared").reduce((s, c) => s + Number(c.amount || 0), 0);
  const pending = active.filter(c => c.status === "Pending").reduce((s, c) => s + Number(c.amount || 0), 0);
  return (
    <div className="p-10 w-full font-sans">
      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-10 italic uppercase underline decoration-indigo-200 decoration-8 underline-offset-[-2px]">Control Center</h2>
      <div className="grid grid-cols-4 gap-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-l-[16px] border-green-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Total Cleared</h3><p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(cleared)}</p></div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-l-[16px] border-yellow-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Total Pending</h3><p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(pending)}</p></div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-l-[16px] border-blue-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Bank Recs</h3><p className="text-4xl font-black text-slate-900 tracking-tighter">{bankCount}</p></div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-l-[16px] border-purple-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Tally Recs</h3><p className="text-4xl font-black text-slate-900 tracking-tighter">{tallyCount}</p></div>
      </div>
    </div>
  );
}

function UploadModule({ bankData, tallyData, save, logAudit }) {
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
      alert(`Complete: ${add} New Records Written.`); logAudit("Protocol Sync", t==="B"?"Bank":"Tally", `Synchronized ${add} records`);
    }; r.readAsBinaryString(f);
  };
  return (
    <div className="p-20 grid grid-cols-2 gap-16 max-w-7xl mx-auto font-sans">
      <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-t-[20px] border-orange-500 relative text-center shadow-orange-900/5">
        <button onClick={() => {if(confirm("Wipe Bank?")) save("bank", [])}} className="absolute top-6 right-6 text-red-500 hover:scale-150 transition-all"><Trash size={28}/></button>
        <UploadCloud size={100} className="text-orange-500 mb-8 mx-auto shadow-xl shadow-orange-100 rounded-full p-4"/><h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2 underline decoration-orange-100 underline-offset-8 text-slate-800">Bank ICICI</h3>
        <input type="file" onChange={e => up(e, "B")} className="text-xs border-4 border-dashed border-slate-100 p-10 rounded-[2.5rem] w-full bg-slate-50 cursor-pointer font-black mt-8 uppercase tracking-[0.3em] text-slate-300 shadow-inner"/>
      </div>
      <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-t-[20px] border-purple-500 relative text-center shadow-purple-900/5">
        <button onClick={() => {if(confirm("Wipe Tally?")) save("tally", [])}} className="absolute top-6 right-6 text-red-500 hover:scale-150 transition-all"><Trash size={28}/></button>
        <FileSpreadsheet size={100} className="text-purple-500 mb-8 mx-auto shadow-xl shadow-purple-100 rounded-full p-4"/><h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2 underline decoration-purple-100 underline-offset-8 text-slate-800">Tally Ledger</h3>
        <input type="file" onChange={e => up(e, "T")} className="text-xs border-4 border-dashed border-slate-100 p-10 rounded-[2.5rem] w-full bg-slate-50 cursor-pointer font-black mt-8 uppercase tracking-[0.3em] text-slate-300 shadow-inner"/>
      </div>
    </div>
  );
}

function SettingsModule({ config, saveConfig, logAudit }) {
  const [n, setN] = useState(config.companyName), [v, setV] = useState(config.variance);
  return (
    <div className="p-10 max-w-2xl mx-auto font-sans">
      <h2 className="text-3xl font-black mb-8 italic tracking-tighter uppercase underline decoration-indigo-200 decoration-8 underline-offset-[-2px]">Protocol Configuration</h2>
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-t-[16px] border-slate-900 space-y-10">
         <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-4 italic">Global Display ID</label><input value={n} onChange={e=>setN(e.target.value)} className="w-full bg-slate-50 p-6 rounded-3xl text-xl font-black ring-1 ring-slate-100 outline-none shadow-inner uppercase tracking-tighter"/></div>
         <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest ml-4 italic">Precision Window (Variance Days)</label><input type="number" value={v} onChange={e=>setV(Number(e.target.value))} className="w-full bg-slate-50 p-6 rounded-3xl text-xl font-black ring-1 ring-slate-100 outline-none shadow-inner"/></div>
         <button onClick={()=>{ saveConfig({companyName: n, variance: v}); alert("Protocols Committed!"); logAudit("Override", "Security", `Updated Window: ${v}`); }} className="w-full bg-slate-900 text-white p-8 rounded-[2.5rem] font-black tracking-[0.4em] hover:bg-black transition-all shadow-2xl uppercase italic text-sm">Save Global Parameters</button>
      </div>
    </div>
  );
}

function MasterCustomersModule({ customers, save, logAudit }) {
  const up = (e) => {
    const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload=(ev)=>{
      const wb = XLSX.read(ev.target.result, {type:'binary'}); const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const nl = [...customers]; raw.forEach(row=>{ const name = row.Name || row.Customer; if(name && !nl.some(c=>c.name.toLowerCase()===String(name).toLowerCase().trim())) nl.push({id:Date.now()+Math.random(), name:String(name).trim()})});
      save("customers", nl); alert("Sync Complete."); logAudit("Protocol Sync", "Master", "Client Import Batch");
    }; r.readAsBinaryString(f);
  };
  return (
    <div className="p-10 max-w-2xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-10"><h2 className="text-4xl font-black italic tracking-tighter uppercase italic underline decoration-indigo-200 decoration-8 underline-offset-[-2px]">Client Index</h2><label className="bg-indigo-600 text-white px-8 py-4 rounded-3xl cursor-pointer text-[10px] font-black shadow-xl hover:bg-indigo-700 tracking-widest uppercase italic shadow-indigo-100 shadow-indigo-900/10"><FileUp size={18} className="inline mr-3"/> Import Master<input type="file" className="hidden" onChange={up}/></label></div>
      <div className="bg-white border-0 shadow-2xl rounded-[3rem] overflow-auto max-h-[70vh] border-8 border-white shadow-indigo-900/10">
        {customers.map(c => <div key={c.id} className="p-8 border-b border-slate-50 flex justify-between hover:bg-slate-50 transition-all font-black text-slate-700 italic tracking-tighter text-xl uppercase italic"><span>{c.name}</span><button onClick={() => {if(confirm("Delete Customer?")) save("customers", customers.filter(i => i.id !== c.id));}} className="text-red-200 hover:text-red-500 transition-all hover:scale-125"><Trash2 size={24}/></button></div>)}
      </div>
    </div>
  );
}

function UserManagementModule({ usersList, save, logAudit }) {
  const [m, setM] = useState(null);
  return (
    <div className="p-10 font-sans">
      <div className="flex justify-between items-center mb-10"><h2 className="text-4xl font-black tracking-tighter italic uppercase text-slate-800 italic underline decoration-indigo-200 decoration-8 underline-offset-[-2px]">Clearance Protocols</h2><button onClick={() => setM({})} className="bg-blue-600 text-white px-10 py-4 rounded-3xl text-xs font-black shadow-xl tracking-[0.2em] uppercase shadow-blue-100">NEW OPERATOR</button></div>
      <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border-0">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-300 tracking-[0.4em]"><tr><th className="p-8">Identity</th><th className="p-8">Clearance</th><th className="p-8 text-center">Modify</th></tr></thead>
          <tbody>{usersList.map(u => <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors italic font-bold tracking-tighter"><td className="p-8 font-black text-slate-800 text-2xl uppercase tracking-tighter">{u.name} <span className="text-slate-200 ml-4 font-bold text-sm underline decoration-slate-100 underline-offset-4 shadow-none">(@{u.username})</span></td><td className="p-8 font-black text-blue-600 uppercase text-[11px] tracking-[0.4em] italic">{u.role}</td><td className="p-8 text-center"><button onClick={() => setM(u)} className="text-slate-200 hover:text-blue-600 transition-all hover:scale-150"><Edit size={28}/></button></td></tr>)}</tbody>
        </table>
      </div>
      {m && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 shadow-none">
          <form onSubmit={e => {
            e.preventDefault(); const u = { id: m.id || Date.now(), username: e.target.u.value.toLowerCase().trim(), name: e.target.n.value.trim(), role: e.target.r.value, password: e.target.p.value, active: e.target.a.checked };
            save("users", m.id ? usersList.map(i => i.id === m.id ? u : i) : [...usersList, u]); setM(null); logAudit("Identity Protocol", "Security", `Modified access: ${u.username}`);
          }} className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-sm space-y-5 border-t-[20px] border-slate-900 font-sans shadow-indigo-900/10">
            <h3 className="font-black text-3xl text-slate-800 tracking-tighter italic mb-4 uppercase tracking-[0.1em] shadow-none">Security Key</h3>
            <input name="u" placeholder="ID" defaultValue={m.username} required className="w-full bg-slate-50 p-5 rounded-3xl text-xs font-black outline-none tracking-widest ring-2 ring-slate-100 shadow-inner uppercase"/>
            <input name="n" placeholder="Operator Name" defaultValue={m.name} required className="w-full bg-slate-50 p-5 rounded-3xl text-xs font-black outline-none tracking-widest ring-2 ring-slate-100 shadow-inner uppercase"/>
            <input name="p" placeholder="Protocol Key" defaultValue={m.password} required className="w-full bg-slate-50 p-5 rounded-3xl text-xs font-black outline-none tracking-widest ring-2 ring-slate-100 shadow-inner"/>
            <select name="r" defaultValue={m.role || "Team"} className="w-full bg-slate-50 p-5 rounded-3xl text-xs font-black ring-2 ring-slate-100 uppercase tracking-widest shadow-inner"><option>Team</option><option>Admin</option></select>
            <label className="flex items-center text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2"><input name="a" type="checkbox" defaultChecked={m.active ?? true} className="mr-5 w-8 h-8 rounded-xl border-4 shadow-inner"/> Operational protocol</label>
            <div className="flex justify-end space-x-4 pt-6"><button type="button" onClick={() => setM(null)} className="px-8 py-4 rounded-3xl font-black text-slate-300 uppercase tracking-widest text-xs">Abort</button><button className="bg-slate-900 text-white px-12 py-4 rounded-3xl font-black text-xs shadow-2xl uppercase tracking-[0.3em] italic">Commit Access</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function AuditTrailModule({ auditTrail }) {
  const sortedAudit = useMemo(() => applySort(auditTrail, { key: "id", dir: "desc", type: "number" }), [auditTrail]);
  return (
    <div className="p-10 w-full h-full flex flex-col font-sans animate-in fade-in duration-700">
      <h2 className="text-4xl font-black text-slate-800 mb-10 italic tracking-tighter uppercase italic underline decoration-indigo-200 decoration-8 underline-offset-[-2px]">Security History</h2>
      <div className="bg-white border-0 shadow-2xl rounded-[4rem] overflow-hidden flex-1 border-[16px] border-white shadow-indigo-900/10">
        <div className="overflow-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-500 sticky top-0 uppercase tracking-widest text-[9px] font-black z-10 font-sans tracking-tighter shadow-xl"><tr><th className="p-6">Security Timestamp</th><th className="p-6 tracking-[0.2em]">Verified Identity</th><th className="p-6 text-indigo-400">Class Protocol</th><th className="p-6 tracking-[0.2em]">Audit reasoning / Shift</th></tr></thead>
            <tbody>{sortedAudit.map(l => (<tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all italic font-black text-[12px] text-slate-600 tracking-tighter"><td className="p-6 text-slate-400 font-mono tracking-tighter text-xs">{l.time}</td><td className="p-6 text-slate-800 uppercase tracking-tighter font-black underline decoration-slate-100 underline-offset-4">{l.user}</td><td className="p-6 text-indigo-600 tracking-widest uppercase text-[10px] italic">{l.action}</td><td className="p-6 text-slate-500 leading-relaxed uppercase text-[10px]">{l.record}: <span className="text-slate-800 font-black italic shadow-slate-100 bg-slate-50/50 px-2 py-0.5 rounded underline decoration-indigo-50 decoration-4 underline-offset-[-1px]">{l.details}</span></td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
