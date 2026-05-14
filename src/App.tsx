import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, List, FileText, LogOut, Search, Trash2, Edit, Plus, X,
  ArrowUpDown, Users, FileUp, UploadCloud, FileSpreadsheet, CheckCircle,
  Link, RefreshCw, Shield, UserPlus, Download, Database, Trash, Settings, 
  AlertTriangle, ArrowRightLeft, Check, MousePointerClick, Calendar, TrendingUp, AlertCircle
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

// --- 2. GLOBAL UTILITIES ---
const cleanStr = (s) => String(s || "").replace(/,/g, "").replace(/\s+/g, " ").toLowerCase().trim();

const toIndianDate = (d) => {
  if (!d) return "";
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(d)) return d;
  const date = new Date(d);
  if (isNaN(date)) return d;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
};

const formatCurrency = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(v || 0);

const applySort = (data, config) => {
  if (!config || !config.key || !data) return data || [];
  return [...data].sort((a, b) => {
    let vA = a[config.key], vB = b[config.key];
    if (typeof vA === "string") vA = cleanStr(vA);
    if (typeof vB === "string") vB = cleanStr(vB);
    if (vA < vB) return config.dir === "asc" ? -1 : 1;
    if (vA > vB) return config.dir === "asc" ? 1 : -1;
    return 0;
  });
};

// ==========================================
// MAIN APP ARCHITECTURE
// ==========================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("btc_auth_v11");
    return saved ? JSON.parse(saved) : null;
  });
  const [currentScreen, setCurrentScreen] = useState(() => localStorage.getItem("btc_nav_v11") || "Dashboard");
  const [isDbReady, setIsDbReady] = useState(false);
  const [config, setConfig] = useState({ companyName: "Barnala Trading Co" });

  const [usersList, setUsersList] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bankData, setBankData] = useState([]);
  const [tallyData, setTallyData] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);

  useEffect(() => {
    if (currentUser) localStorage.setItem("btc_auth_v11", JSON.stringify(currentUser));
    else localStorage.removeItem("btc_auth_v11");
  }, [currentUser]);

  useEffect(() => { localStorage.setItem("btc_nav_v11", currentScreen); }, [currentScreen]);

  useEffect(() => {
    let isMounted = true;
    const boot = async () => {
      const init = (key, setter) => onSnapshot(doc(db, "btc_data", key), (d) => { if (d.exists() && isMounted) setter(d.data().list || []); });
      init("users", setUsersList);
      init("cheques", setCheques);
      init("customers", setCustomers);
      init("bank", setBankData);
      init("tally", setTallyData);
      init("auditTrail", setAuditTrail);
      const conf = await getDoc(doc(db, "btc_data", "config"));
      if (conf.exists()) setConfig(conf.data());
      setIsDbReady(true);
    };
    boot();
    return () => { isMounted = false; };
  }, []);

  const save = (key, list) => setDoc(doc(db, "btc_data", key), { list });
  
  const logAudit = (action, record, details) => {
    const timeStr = new Date().toLocaleString("en-IN");
    save("auditTrail", [{ id: Date.now(), time: timeStr, user: currentUser?.username || "System", action, record, details }, ...auditTrail].slice(0, 1000));
  };

  // CLEANUP: Purge zero entries automatically
  useEffect(() => {
    if (isDbReady) {
      const bClean = bankData.filter(x => Math.abs(x.amount || 0) > 0);
      const cClean = cheques.filter(x => Math.abs(x.amount || 0) > 0);
      if (bClean.length !== bankData.length) save("bank", bClean);
      if (cClean.length !== cheques.length) save("cheques", cClean);
    }
  }, [isDbReady, bankData.length, cheques.length]);

  if (!isDbReady) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse uppercase tracking-[0.3em]">Secure Barnala Cloud...</div>;

  if (!currentUser) return (
    <div className="h-screen flex items-center justify-center bg-slate-200">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-sm border-t-[14px] border-slate-900 text-center font-sans">
        <div className="bg-slate-900 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl"><Shield className="text-blue-400" size={30}/></div>
        <h1 className="text-2xl font-black mb-10 text-slate-900 uppercase italic tracking-tighter">{config.companyName}</h1>
        <form onSubmit={e => {
          e.preventDefault();
          const u = usersList.find(x => cleanStr(x.username) === cleanStr(e.target.u.value) && x.password === e.target.p.value);
          if (u?.active) setCurrentUser(u); else alert("Access Denied");
        }}>
          <input name="u" placeholder="OPERATOR ID" className="w-full bg-slate-50 border-0 p-5 rounded-3xl mb-4 text-center text-xs font-black tracking-widest ring-1 ring-slate-100 outline-none focus:ring-2 focus:ring-slate-900 uppercase" />
          <input name="p" type="password" placeholder="SECURE KEY" className="w-full bg-slate-50 border-0 p-5 rounded-3xl mb-10 text-center text-xs font-black tracking-widest ring-1 ring-slate-100 outline-none focus:ring-2 focus:ring-slate-900" />
          <button className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black tracking-widest hover:bg-black transition-all">AUTHENTICATE</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden font-sans antialiased">
      <div className="w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-10 border-b border-slate-800 text-center font-black text-blue-400 text-xl italic">{config.companyName.split(' ')[0]}<span className="block text-[8px] tracking-[0.5em] text-slate-500 mt-2 font-black uppercase">Erp Solution</span></div>
        <nav className="flex-1 py-6 overflow-y-auto">
          {[
            { id: "Dashboard", icon: <LayoutDashboard size={20}/> },
            { id: "Cheque Register", icon: <List size={20}/> },
            { id: "Financial Radar", icon: <TrendingUp size={20}/> },
            { id: "Upload Center", icon: <UploadCloud size={20}/> },
            { id: "Audit Log", icon: <FileText size={20}/> },
            { id: "Settings", icon: <Settings size={20}/> },
          ].map(m => (
            <button key={m.id} onClick={() => setCurrentScreen(m.id)} className={`w-full text-left px-10 py-5 flex items-center text-[10px] font-black tracking-[0.2em] uppercase transition-all ${currentScreen === m.id ? "bg-indigo-600 border-l-[8px] border-white text-white shadow-2xl" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}>{m.icon} <span className="ml-5">{m.id}</span></button>
          ))}
        </nav>
        <div className="p-6 bg-black/40 flex justify-between items-center text-xs border-t border-slate-800">
          <div className="font-black text-white italic uppercase tracking-tighter">{currentUser.name}</div>
          <button onClick={() => setCurrentUser(null)} className="p-3 bg-slate-800 hover:bg-red-600 rounded-xl transition-all shadow-lg"><LogOut size={16}/></button>
        </div>
      </div>

      <main className="flex-1 overflow-auto bg-[#f8fafc] w-full">
         {currentScreen === "Dashboard" && <DashboardModule cheques={cheques} bank={bankData} />}
         {currentScreen === "Cheque Register" && <ChequeRegisterModule cheques={cheques} save={save} customers={customers} logAudit={logAudit} currentUser={currentUser} />}
         {currentScreen === "Financial Radar" && <FinancialRadarModule cheques={cheques} bank={bankData} />}
         {currentScreen === "Upload Center" && <UploadModule bankData={bankData} tallyData={tallyData} save={save} logAudit={logAudit} />}
         {currentScreen === "Audit Log" && <AuditTrailModule auditTrail={auditTrail} />}
         {currentScreen === "Settings" && <SettingsModule config={config} saveConfig={(c) => setConfig(c) || saveConfig(c)} logAudit={logAudit} />}
      </main>
    </div>
  );
}

// ==========================================
// NEW MODULE: FINANCIAL RADAR (PRACTICAL)
// ==========================================
function FinancialRadarModule({ cheques, bank }) {
  const [q, setQ] = useState("");

  const analytics = useMemo(() => {
    const term = cleanStr(q);
    const pending = (cheques || []).filter(x => !x.deleted && x.status === "Pending" && (cleanStr(x.customer).includes(term) || cleanStr(x.chqNo).includes(term)));
    const bounced = (cheques || []).filter(x => !x.deleted && x.status === "Bounced");
    const stale = pending.filter(x => {
        const diff = Date.now() - new Date(x.enteredAt).getTime();
        return diff > (30 * 24 * 60 * 60 * 1000);
    });
    
    return { pending, bounced, stale, totalPending: pending.reduce((s,x) => s + x.amount, 0) };
  }, [cheques, q]);

  return (
    <div className="p-8 h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black tracking-tighter uppercase italic underline decoration-indigo-300 decoration-8">Financial Radar</h2>
        <div className="relative">
          <Search className="absolute left-5 top-4 text-indigo-400" size={18}/>
          <input placeholder="Filter Radar by Party..." className="pl-14 pr-10 py-4 bg-white border shadow-xl rounded-2xl w-[25rem] font-black uppercase outline-none ring-2 ring-indigo-50 focus:ring-indigo-200" onChange={e => setQ(e.target.value)}/>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 mb-8">
         <div className="bg-white p-8 rounded-[3rem] shadow-xl border-l-[16px] border-blue-500 flex flex-col">
            <h3 className="text-slate-400 text-xs font-black uppercase mb-2">Total Expected Cash</h3>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(analytics.totalPending)}</p>
            <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{analytics.pending.length} Unclear Cheques</span>
         </div>
         <div className="bg-white p-8 rounded-[3rem] shadow-xl border-l-[16px] border-orange-500 flex flex-col">
            <h3 className="text-slate-400 text-xs font-black uppercase mb-2">Stale Cheques (30+ Days)</h3>
            <p className="text-4xl font-black text-orange-600 tracking-tighter">{analytics.stale.length}</p>
            <span className="text-[10px] font-bold text-orange-300 mt-2 uppercase">Immediate attention required</span>
         </div>
         <div className="bg-white p-8 rounded-[3rem] shadow-xl border-l-[16px] border-red-500 flex flex-col">
            <h3 className="text-slate-400 text-xs font-black uppercase mb-2">Bounce Risk Records</h3>
            <p className="text-4xl font-black text-red-600 tracking-tighter">{analytics.bounced.length}</p>
            <span className="text-[10px] font-bold text-red-300 mt-2 uppercase">High risk customers identified</span>
         </div>
      </div>

      <div className="flex-1 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
         <div className="p-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest text-center">Upcoming Cash Inflow Queue</div>
         <div className="overflow-auto flex-1">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black border-b sticky top-0">
                  <tr><th className="p-6">Due Date</th><th className="p-6">Party Name</th><th className="p-6">Bank Name</th><th className="p-6">Chq No</th><th className="p-6 text-right">Amount</th><th className="p-6 text-center">Status</th></tr>
               </thead>
               <tbody>
                  {analytics.pending.map(x => (
                    <tr key={x.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all italic font-medium">
                       <td className="p-6 font-black text-slate-400 text-xs">{toIndianDate(x.chqDate)}</td>
                       <td className="p-6 font-black text-slate-800 uppercase">{x.customer}</td>
                       <td className="p-6 font-bold text-slate-400 uppercase text-xs">{x.bank || "-"}</td>
                       <td className="p-6 font-mono font-black text-indigo-600">{x.chqNo}</td>
                       <td className="p-6 text-right font-black text-slate-900 text-lg">{formatCurrency(x.amount)}</td>
                       <td className="p-6 text-center">
                          {analytics.stale.includes(x) ? <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black">STALE</span> : <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">Awaited</span>}
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
// CHEQUE REGISTER (RESTORED MANAGEMENT)
// ==========================================
function ChequeRegisterModule({ cheques, save, customers, logAudit, currentUser }) {
  const [q, setQ] = useState(""), [m, setM] = useState("All"), [y, setY] = useState("All");
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([{ id: 1, type: "Receipt", eDate: new Date().toISOString().split("T")[0], cDate: "", cust: "", bank: "", no: "", amt: "" }]);
  const [sel, setSel] = useState(new Set()), [edit, setEdit] = useState(null), [reason, setReason] = useState("");

  const yrs = [...new Set((cheques || []).map(c => c.enteredAt?.split("-")[0]))].filter(Boolean).sort();
  let filtered = (cheques || []).filter(c => !c.deleted);
  if (m !== "All") filtered = filtered.filter(c => c.enteredAt?.split("-")[1] === m);
  if (y !== "All") filtered = filtered.filter(c => c.enteredAt?.startsWith(y));
  if (q) {
    const term = cleanStr(q);
    filtered = filtered.filter(c => cleanStr(c.customer).includes(term) || cleanStr(c.chqNo).includes(term));
  }
  const rows = applySort(filtered, { key: "enteredAt", dir: "desc" });

  const saveBatch = () => {
    const items = bulkRows.filter(r => r.cust && r.amt).map(v => ({ id: Date.now() + Math.random(), type: v.type, enteredAt: v.eDate, chqDate: v.cDate || v.eDate, customer: v.cust.trim(), bank: v.bank || "", chqNo: v.no || "N/A", amount: Math.abs(Number(v.amt)), status: "Pending", deleted: false }));
    save("cheques", [...items, ...cheques]); setIsBulkOpen(false); logAudit("Register", "Rapid Batch", `${items.length} entries`);
  };

  return (
    <div className="p-8 w-full font-sans animate-in slide-in-from-bottom duration-500">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-6">
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic underline decoration-indigo-200 decoration-8">Ledger Index</h2>
           {sel.size > 0 && currentUser.role === "Admin" && <button onClick={() => confirm(`Delete ${sel.size} records?`) && save("cheques", cheques.map(x => sel.has(x.id)?{...x, deleted:true}:x)) || setSel(new Set())} className="bg-red-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase shadow-xl tracking-widest">Delete Selected</button>}
        </div>
        <div className="flex space-x-3">
           <select className="border shadow p-3 rounded-xl text-xs font-black outline-none" value={m} onChange={e => setM(e.target.value)}><option value="All">All Months</option>{["01","02","03","04","05","06","07","08","09","10","11","12"].map(mo => <option key={mo}>{mo}</option>)}</select>
           <select className="border shadow p-3 rounded-xl text-xs font-black outline-none" value={y} onChange={e => setY(e.target.value)}><option value="All">All Years</option>{yrs.map(yr => <option key={yr}>{yr}</option>)}</select>
           <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-300" size={16}/><input placeholder="Search (Commas ignored)..." className="pl-10 border shadow p-3 rounded-2xl text-sm w-48 outline-none focus:ring-2 focus:ring-indigo-600" onChange={e => setQ(e.target.value)}/></div>
           <button onClick={() => setIsBulkOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black shadow-xl uppercase italic"><Plus size={18} className="mr-2"/> Batch Entry</button>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="p-6 w-10 text-center"><input type="checkbox" onChange={e => e.target.checked ? setSel(new Set(rows.map(x => x.id))) : setSel(new Set())}/></th>
              <th className="p-6">Type</th><th className="p-6">Entry Date</th><th className="p-6">Chq Date</th><th className="p-6">Customer</th><th className="p-6">Bank Name</th><th className="p-6 font-mono">Chq No</th><th className="p-6 text-right">Amount</th><th className="p-6 text-center">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className={`border-b border-slate-50 italic font-medium ${sel.has(c.id)?'bg-indigo-50':''}`}>
                <td className="p-6 text-center"><input type="checkbox" checked={sel.has(c.id)} onChange={() => {const s=new Set(sel); if(s.has(c.id))s.delete(c.id); else s.add(c.id); setSel(s);}} /></td>
                <td className="p-6"><span className={`text-[8px] font-black px-2 py-1 rounded ${c.type==='Receipt'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{c.type?.toUpperCase() || 'RECEIPT'}</span></td>
                <td className="p-6 text-slate-300 font-bold">{toIndianDate(c.enteredAt)}</td>
                <td className="p-6 font-black text-slate-500">{toIndianDate(c.chqDate)}</td>
                <td className="p-6 font-black text-slate-800 uppercase">{c.customer}</td>
                <td className="p-6 font-black text-slate-400 text-xs uppercase italic">{c.bank || "-"}</td>
                <td className="p-6 font-mono text-indigo-600 font-black">{c.chqNo}</td>
                <td className="p-6 text-right font-black text-slate-900 text-lg">{formatCurrency(c.amount)}</td>
                <td className="p-6 text-center"><button onClick={() => {setEdit(c); setReason("");}} className="text-slate-200 hover:text-indigo-600 transition-all hover:scale-125"><Edit size={22}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isBulkOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-[95%] h-[85vh] flex flex-col border-[12px] border-white">
            <h3 className="font-black text-4xl mb-8 tracking-tighter uppercase italic text-slate-800 underline decoration-indigo-200">Rapid Batch Entry</h3>
            <div className="flex-1 overflow-auto bg-slate-50 rounded-[2.5rem] p-6 shadow-inner">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900 text-white uppercase text-[9px] font-black">
                  <tr><th className="p-4">Type</th><th className="p-4">Entry Date</th><th className="p-4">Chq Date</th><th className="p-4 w-1/5">Party Name*</th><th className="p-4 w-1/5">Bank Name</th><th className="p-4">Chq No*</th><th className="p-4 text-right">Amount*</th><th className="p-4 w-10"></th></tr>
                </thead>
                <tbody>
                  {bulkRows.map((r, idx) => (
                    <tr key={r.id} className="border-b bg-white italic font-bold">
                      <td className="p-1"><select className="w-full p-4 border-0 font-black uppercase text-[10px]" value={r.type} onChange={e => { const n = [...bulkRows]; n[idx].type = e.target.value; setBulkRows(n); }}><option>Receipt</option><option>Payment</option></select></td>
                      <td className="p-1"><input type="date" value={r.eDate} className="w-full p-4 border-0 bg-transparent text-sm font-bold outline-none" onChange={e => { const n = [...bulkRows]; n[idx].eDate = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input type="date" value={r.cDate} className="w-full p-4 border-0 bg-transparent text-sm font-bold outline-none" onChange={e => { const n = [...bulkRows]; n[idx].cDate = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input list="clist" value={r.cust} className="w-full p-4 border-0 bg-transparent text-sm font-black uppercase outline-none" onChange={e => { const n = [...bulkRows]; n[idx].cust = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input value={r.bank} placeholder="Bank..." className="w-full p-4 border-0 bg-transparent text-sm font-black uppercase text-slate-500 outline-none" onChange={e => { const n = [...bulkRows]; n[idx].bank = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input value={r.no} placeholder="000000" className="w-full p-4 border-0 bg-transparent text-sm font-mono font-black text-indigo-600 outline-none" onChange={e => { const n = [...bulkRows]; n[idx].no = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-1"><input type="number" value={r.amt} placeholder="₹ 0" className="w-full p-4 border-0 bg-transparent text-lg font-black text-right outline-none" onChange={e => { const n = [...bulkRows]; n[idx].amt = e.target.value; setBulkRows(n); }}/></td>
                      <td className="p-2 text-center"><button onClick={() => setBulkRows(bulkRows.filter(x => x.id !== r.id))} className="text-red-200 hover:text-red-600"><Trash2 size={24}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="clist">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
              <button onClick={() => setBulkRows([...bulkRows, { id: Date.now(), type: "Receipt", eDate: new Date().toISOString().split("T")[0], cDate: "", cust: "", bank: "", no: "", amt: "" }])} className="mt-10 mx-auto block bg-white border-4 border-dashed border-indigo-100 text-indigo-600 font-black text-xs px-12 py-5 rounded-[2.5rem] shadow-xl">+ ADD ROW</button>
            </div>
            <div className="flex justify-end space-x-5 pt-8"><button onClick={() => setIsBulkOpen(false)} className="px-10 py-5 text-sm font-black text-slate-400 uppercase tracking-widest uppercase">Abort</button><button onClick={saveBatch} className="bg-slate-900 text-white px-20 py-5 rounded-[2rem] text-sm font-black shadow-2xl uppercase italic tracking-widest">Commit Protocols</button></div>
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={e => {
            e.preventDefault(); if(!reason.trim()) return alert("PROTOCOL: Reason is mandatory!");
            const val = { ...edit, type: e.target.t.value, chqDate: e.target.c.value, customer: e.target.p.value.trim(), bank: e.target.b.value, chqNo: e.target.n.value, amount: Number(e.target.a.value), status: e.target.s.value };
            save("cheques", cheques.map(i => i.id === edit.id ? val : i));
            logAudit("MANUAL OVERRIDE", "Cheque Edit", `Target: ${val.customer} | Reason: ${reason}`); setEdit(null);
          }} className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border-t-8 border-indigo-600 space-y-4 font-sans">
            <h3 className="font-black text-2xl text-slate-800 tracking-tighter text-center uppercase italic">Adjust Protocol</h3>
            <div className="grid grid-cols-2 gap-4">
              <select name="t" defaultValue={edit.type} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none"><option>Receipt</option><option>Payment</option></select>
              <input name="c" type="date" defaultValue={edit.chqDate} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none"/>
            </div>
            <input name="p" defaultValue={edit.customer} required className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black uppercase outline-none"/>
            <input name="b" placeholder="Bank" defaultValue={edit.bank} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black uppercase outline-none"/>
            <input name="n" defaultValue={edit.chqNo} required className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black font-mono outline-none text-indigo-600"/>
            <input name="a" type="number" defaultValue={edit.amount} required className="w-full bg-slate-50 p-4 rounded-2xl text-xl font-black outline-none text-right"/>
            <select name="s" defaultValue={edit.status} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black outline-none uppercase tracking-widest"><option>Pending</option><option>Cleared</option><option>Bounced</option></select>
            <div className="bg-yellow-50 p-5 rounded-3xl border-2 border-yellow-200 mt-2 shadow-inner">
              <label className="text-[9px] font-black text-yellow-700 uppercase flex items-center mb-1 tracking-widest"><AlertTriangle size={12} className="mr-2"/> Protocol Trace: Reason Required</label>
              <input value={reason} onChange={e=>setReason(e.target.value)} required placeholder="Required for Audit Trail..." className="w-full bg-white p-3 rounded-xl text-xs font-black border-0 outline-none ring-2 ring-yellow-400/50 shadow-inner"/>
            </div>
            <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={() => setEdit(null)} className="px-6 py-4 rounded-2xl text-xs font-bold text-slate-400 tracking-widest uppercase">Abort</button><button disabled={!reason.trim()} className={`bg-indigo-600 text-white px-10 py-4 rounded-2xl text-xs font-black shadow-xl tracking-widest italic uppercase ${!reason.trim() ? 'opacity-20' : ''}`}>COMMIT</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

// ==========================================
// UPLOAD CENTER & SYSTEM MODULES
// ==========================================
function UploadModule({ bankData, tallyData, save, logAudit }) {
  const up = (e, t) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      let add = 0;
      if (t === "B") {
        const hIdx = rows.findIndex(r => r.some(c => cleanStr(c).includes("transaction id")));
        if (hIdx === -1) return alert("Invalid Bank file.");
        const headers = rows[hIdx].map(h => String(h).trim());
        rows.slice(hIdx + 1).forEach(rArr => {
          const row = {}; headers.forEach((h, i) => row[h] = rArr[i]);
          const id = row["Transaction ID"] || row["Ref No"], amt = parseFloat(row["Transaction Amount(INR)"] || row["Amount"] || 0);
          if (!id || amt === 0 || isNaN(amt)) return;
          if (!bankData.some(b => String(b.id) === String(id))) { bankData.push({ id: String(id), txnDate: row["Value Date"], desc: String(row["Description"] || ""), chqNo: String(row["ChequeNo."] || ""), amount: Math.abs(amt), type: String(row["Cr/Dr"] || "").toUpperCase()==="DR"?"DR":"CR" }); add++; }
        }); save("bank", bankData);
      } else {
        const hIdx = rows.findIndex(r => r.some(c => cleanStr(c).includes("particulars")));
        if (hIdx === -1) return alert("Invalid Tally file.");
        const headers = rows[hIdx].map(h => String(h).trim());
        rows.slice(hIdx + 1).forEach(rArr => {
          const row = {}; headers.forEach((h, i) => row[h] = rArr[i]);
          const vn = row["Vch No."], amt = parseFloat(row["Debit"] || row["Credit"] || 0);
          if (!vn || amt === 0 || isNaN(amt)) return;
          if (!tallyData.some(tl => String(tl.vchNo) === String(vn))) { tallyData.push({ id: vn, date: row["Date"], particulars: String(row["Particulars"] || ""), vchNo: vn, amount: Math.abs(amt) }); add++; }
        }); save("tally", tallyData);
      }
      alert(`Success: ${add} records added.`);
    }; r.readAsBinaryString(f);
  };
  return (
    <div className="p-20 grid grid-cols-2 gap-16 font-sans">
      <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-t-[20px] border-orange-500 relative text-center shadow-orange-900/5">
        <button onClick={() => confirm("Wipe Bank?") && save("bank", [])} className="absolute top-6 right-6 text-red-500"><Trash size={28}/></button>
        <UploadCloud size={100} className="text-orange-500 mx-auto mb-8"/><h3 className="text-3xl font-black uppercase mb-4 text-slate-800 underline decoration-orange-100">Bank Statement</h3>
        <input type="file" onChange={e => up(e, "B")} className="w-full text-xs border-4 border-dashed rounded-3xl p-10 cursor-pointer bg-slate-50 uppercase"/>
      </div>
      <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-t-[20px] border-purple-500 relative text-center shadow-purple-900/5">
        <button onClick={() => confirm("Wipe Tally?") && save("tally", [])} className="absolute top-6 right-6 text-red-500"><Trash size={28}/></button>
        <FileSpreadsheet size={100} className="text-purple-500 mx-auto mb-8"/><h3 className="text-3xl font-black uppercase mb-4 text-slate-800 underline decoration-purple-100">Tally Ledger</h3>
        <input type="file" onChange={e => up(e, "T")} className="w-full text-xs border-4 border-dashed rounded-3xl p-10 cursor-pointer bg-slate-50 uppercase"/>
      </div>
    </div>
  );
}

function DashboardModule({ cheques, bank }) {
  const total = (cheques || []).reduce((s, x) => s + Number(x.amount || 0), 0);
  return (
    <div className="p-10 w-full font-sans">
      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-10 italic uppercase underline decoration-indigo-200 decoration-8">Control Center</h2>
      <div className="grid grid-cols-3 gap-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-l-[16px] border-green-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Internal Ledger</h3><p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(total)}</p></div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-l-[16px] border-orange-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Bank Records</h3><p className="text-4xl font-black text-slate-900 tracking-tighter">{bank.length} Lines</p></div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-l-[16px] border-blue-500"><h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">System Status</h3><p className="text-4xl font-black text-slate-900 uppercase">Synchronized</p></div>
      </div>
    </div>
  );
}

function AuditTrailModule({ auditTrail }) {
  return (
    <div className="p-10 w-full h-full font-sans">
      <h2 className="text-4xl font-black text-slate-800 mb-10 italic tracking-tighter uppercase underline decoration-indigo-200 decoration-8">Security History</h2>
      <div className="bg-white border-0 shadow-2xl rounded-[3rem] overflow-hidden flex-1 border-[16px] border-white shadow-indigo-900/10 h-[70vh] overflow-y-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-500 sticky top-0 uppercase tracking-widest text-[9px] font-black z-10 p-6"><tr><th className="p-6">Timestamp</th><th className="p-6">User</th><th className="p-6">Action</th><th className="p-6">Reasoning</th></tr></thead>
          <tbody>{(auditTrail || []).map(l => (<tr key={l.id} className="border-b border-slate-50 italic font-black text-[12px] text-slate-600"><td className="p-6 text-slate-400 font-mono text-xs">{l.time}</td><td className="p-6 text-slate-800 uppercase">{l.user}</td><td className="p-6 text-indigo-600 tracking-widest uppercase text-[10px]">{l.action}</td><td className="p-6 text-slate-500 leading-relaxed uppercase text-[10px]">{l.record}: <span className="text-slate-800 font-black">{l.details}</span></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsModule({ config, saveConfig, logAudit }) {
  const [n, setN] = useState(config.companyName);
  return (
    <div className="p-10 max-w-2xl mx-auto font-sans">
      <h2 className="text-3xl font-black mb-8 italic tracking-tighter uppercase underline decoration-indigo-200 decoration-8">Configuration</h2>
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-t-[16px] border-slate-900">
         <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 ml-4 italic">Global Display ID</label>
         <input value={n} onChange={e=>setN(e.target.value)} className="w-full bg-slate-50 p-6 rounded-3xl text-xl font-black ring-1 ring-slate-100 outline-none uppercase tracking-tighter mb-8 shadow-inner"/>
         <button onClick={()=>{ saveConfig({companyName: n}); alert("Saved!"); logAudit("Override", "Config", `Updated ID`); }} className="w-full bg-slate-900 text-white p-8 rounded-[2.5rem] font-black tracking-widest hover:bg-black uppercase italic text-sm">Save Global Parameters</button>
      </div>
    </div>
  );
}