import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, List, FileText, LogOut, Search, Trash2, Edit, Plus, X,
  ArrowUpDown, Users, FileUp, UploadCloud, FileSpreadsheet, CheckCircle,
  Link, RefreshCw, Shield, UserPlus, Download, Database, Trash, Settings
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

// --- HELPERS ---
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
      const init = async (key, setter, defaultVal = []) => {
        const ref = doc(db, "btc_data", key);
        onSnapshot(ref, (d) => { if (d.exists() && isMounted) setter(d.data().list || defaultVal); });
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
      else await setDoc(confRef, { companyName: "Barnala Trading Co", variance: 5 });

      setIsDbReady(true);
    };
    boot();
    return () => { isMounted = false; };
  }, []);

  const save = (key, list) => setDoc(doc(db, "btc_data", key), { list });
  const saveConfig = (newConf) => { setConfig(newConf); setDoc(doc(db, "btc_data", "config"), newConf); };

  const log = (action, record, details) => {
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    save("auditTrail", [{ id: Date.now(), time: timeStr, user: currentUser?.username || "System", action, record, details }, ...auditTrail].slice(0, 1000));
  };

  if (!isDbReady) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse uppercase tracking-[0.5em]">BTC Cloud Syncing...</div>;

  // --- LOGIN ---
  if (!currentUser) return (
    <div className="h-screen flex items-center justify-center bg-slate-200">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-sm border-t-[14px] border-slate-900 text-center">
        <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"><Shield size={32} className="text-blue-400"/></div>
        <h1 className="text-2xl font-black mb-1 text-slate-900 uppercase italic tracking-tighter">{config.companyName}</h1>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] mb-10 font-black italic">Security Authentication</p>
        <form onSubmit={e => {
          e.preventDefault();
          const u = usersList.find(x => x.username === e.target.u.value.toLowerCase().trim() && x.password === e.target.p.value);
          if (u) { if (u.active) { setCurrentUser(u); log("Login", "Auth", "Success"); } else alert("Disabled"); } else alert("Access Denied");
        }}>
          <input name="u" placeholder="Admin ID" className="w-full bg-slate-50 border-0 p-4 rounded-2xl mb-4 text-center text-xs font-black tracking-widest ring-1 ring-slate-100 outline-none focus:ring-2 focus:ring-slate-900" />
          <input name="p" type="password" placeholder="Passkey" className="w-full bg-slate-50 border-0 p-4 rounded-2xl mb-10 text-center text-xs font-black tracking-widest ring-1 ring-slate-100 outline-none focus:ring-2 focus:ring-slate-900" />
          <button className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black tracking-widest hover:bg-black transition-all">SIGN IN</button>
        </form>
      </div>
    </div>
  );

  // ==========================================
  // MODULE: DASHBOARD
  // ==========================================
  const Dashboard = () => {
    const active = cheques.filter(c => !c.deleted);
    const cleared = active.filter(c => c.status === "Cleared").reduce((a, b) => a + Number(b.amount), 0);
    const pending = active.filter(c => c.status === "Pending").reduce((a, b) => a + Number(b.amount), 0);
    return (
      <div className="p-10">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-8 italic">Business Overview</h2>
        <div className="grid grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border-l-[12px] border-green-500"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Cleared</h3><p className="text-3xl font-black text-slate-900">{formatCurrency(cleared)}</p></div>
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border-l-[12px] border-yellow-500"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Pending</h3><p className="text-3xl font-black text-slate-900">{formatCurrency(pending)}</p></div>
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border-l-[12px] border-blue-500"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Bank Records</h3><p className="text-3xl font-black text-slate-900">{bankData.length}</p></div>
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border-l-[12px] border-purple-500"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Tally Vouchers</h3><p className="text-3xl font-black text-slate-900">{tallyData.length}</p></div>
        </div>
      </div>
    );
  };

  // ==========================================
  // MODULE: RECONCILIATION (FULL WIDTH)
  // ==========================================
  const Reconciliation = () => {
    const [q, setQ] = useState("");
    const [sort, setSort] = useState({ key: "date", dir: "desc", type: "date" });
    const isDateClose = (d1, d2) => {
      const t1 = parseToSortable(toIndianDate(d1)), t2 = parseToSortable(toIndianDate(d2));
      return t1 && t2 ? Math.abs(t1 - t2) <= (config.variance * 24 * 60 * 60 * 1000) : false;
    };
    const rows = useMemo(() => {
      let mSys = new Set(), mBank = new Set(), mTally = new Set(), res = [];
      manualMappings.forEach(m => {
        const s = cheques.find(c => c.id === m.sysId), b = bankData.find(bk => bk.id === m.bankId), t = tallyData.find(tl => tl.id === m.tallyId);
        if (s) mSys.add(s.id); if (b) mBank.add(b.id); if (t) mTally.add(t.id);
        res.push({ id: m.id, date: s?.chqDate || b?.txnDate || t?.date, sys: s, bank: b, tally: t, status: "Manual Link", color: "bg-indigo-50", manual: true });
      });
      cheques.filter(c => !c.deleted && !mSys.has(c.id)).forEach(s => {
        const b = bankData.find(bk => !mBank.has(bk.id) && bk.amount === s.amount && (String(bk.chqNo).includes(s.chqNo) || isDateClose(s.chqDate, bk.txnDate)));
        const t = tallyData.find(tl => !mTally.has(tl.id) && tl.amount === s.amount && isDateClose(s.chqDate, tl.date));
        if (b) mBank.add(b.id); if (t) mTally.add(t.id);
        let st = "System Only", co = "bg-white";
        if (b && t) { st = "Matched"; co = "bg-green-50"; }
        else if (b) { st = "Sys+Bank"; co = "bg-blue-50"; }
        else if (t) { st = "Sys+Tally"; co = "bg-yellow-50"; }
        res.push({ id: `s_${s.id}`, date: s.chqDate, sys: s, bank: b, tally: t, status: st, color: co });
      });
      bankData.filter(b => !mBank.has(b.id)).forEach(b => res.push({ id: `b_${b.id}`, date: b.txnDate, sys: null, bank: b, tally: null, status: "Bank Only", color: "bg-orange-50" }));
      tallyData.filter(t => !mTally.has(t.id)).forEach(t => res.push({ id: `t_${t.id}`, date: t.date, sys: null, bank: null, tally: t, status: "Tally Only", color: "bg-purple-50" }));
      if (q) {
        const term = q.toLowerCase();
        res = res.filter(r => (r.sys?.customer?.toLowerCase().includes(term)) || (r.bank?.desc?.toLowerCase().includes(term)) || (r.tally?.particulars?.toLowerCase().includes(term)) || String(r.sys?.amount).includes(term));
      }
      return applySort(res, sort);
    }, [cheques, bankData, tallyData, manualMappings, q, sort]);

    return (
      <div className="p-6 h-full flex flex-col w-full bg-slate-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">Reconciliation Workspace</h2>
          <div className="flex space-x-3">
            <button onClick={() => window.location.reload()} className="bg-white border shadow-sm px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-slate-50"><RefreshCw size={16} className="mr-2"/> Sync Engine</button>
            <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input placeholder="Search records..." className="pl-10 border shadow-sm p-2 rounded-xl text-sm w-80 outline-none" onChange={e => setQ(e.target.value)}/></div>
            <button onClick={() => alert("Select a row link icon below to map manually")} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-black shadow-lg"><Link size={16} className="inline mr-2"/> Manual Link</button>
          </div>
        </div>
        <div className="bg-white border-0 shadow-xl rounded-2xl flex-1 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white sticky top-0 z-10 border-b border-slate-700">
                <tr>
                  <th className="p-4 border-r border-slate-800 bg-slate-950 w-32 cursor-pointer" onClick={() => setSort({key: "status", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>STATUS <ArrowUpDown size={10} className="inline ml-1"/></th>
                  <th colSpan="3" className="p-3 text-center border-r border-slate-800 bg-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">Internal System</th>
                  <th colSpan="2" className="p-3 text-center border-r border-slate-800 bg-blue-900 text-[10px] font-black uppercase text-blue-200 tracking-widest">Bank Statement</th>
                  <th colSpan="2" className="p-3 text-center bg-purple-900 text-[10px] font-black uppercase text-purple-200 tracking-widest">Tally ERP</th>
                  <th className="p-3 bg-slate-950 text-center">ACTION</th>
                </tr>
                <tr className="bg-slate-800 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-700">
                  <th className="p-3 border-r border-slate-700 cursor-pointer bg-slate-900" onClick={() => setSort({key: "date", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>BEST DATE <ArrowUpDown size={10} className="inline ml-1"/></th>
                  <th className="p-3 border-r border-slate-700">Customer</th><th className="p-3 border-r border-slate-700 text-right">Sys Amt</th><th className="p-3 border-r border-slate-700">Chq No</th>
                  <th className="p-3 border-r border-slate-700 bg-blue-950">Description</th><th className="p-3 border-r border-slate-700 text-right bg-blue-950">Bank Amt</th>
                  <th className="p-3 border-r border-slate-700 bg-purple-950">Party</th><th className="p-3 text-right bg-purple-950">Tally Amt</th>
                  <th className="p-3 bg-slate-900"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className={`${r.color} border-b border-slate-50 hover:brightness-95 transition-all`}>
                    <td className="p-4 border-r border-slate-100 font-black uppercase text-[10px] tracking-tighter">{r.status}</td>
                    <td className="p-3 border-r border-slate-100 font-medium">{toIndianDate(r.date)}</td>
                    <td className="p-3 border-r border-slate-100 font-black text-slate-700">{r.sys?.customer || "-"}</td>
                    <td className="p-3 border-r border-slate-100 font-black text-right">{r.sys ? formatCurrency(r.sys.amount) : "-"}</td>
                    <td className="p-3 border-r border-slate-100 font-mono text-[10px]">{r.sys?.chqNo || "-"}</td>
                    <td className="p-3 border-r border-slate-100 text-slate-500 truncate max-w-[200px]">{r.bank ? r.bank.desc : <span className="text-red-400 font-bold italic">MISSING BANK</span>}</td>
                    <td className="p-3 border-r border-slate-100 font-black text-right text-blue-700">{r.bank ? formatCurrency(r.bank.amount) : "-"}</td>
                    <td className="p-3 border-r border-slate-100 text-slate-500 font-bold">{r.tally ? r.tally.particulars : <span className="text-red-400 font-bold italic">MISSING TALLY</span>}</td>
                    <td className="p-3 border-r border-slate-100 font-black text-right text-purple-700">{r.tally ? formatCurrency(r.tally.amount) : "-"}</td>
                    <td className="p-3 text-center">
                      {r.manual ? <button onClick={() => save("mappings", manualMappings.filter(m => m.id !== r.id))} className="text-red-500 hover:scale-125 transition-transform"><Trash2 size={16}/></button> : <button className="text-indigo-600 hover:scale-125 transition-transform"><Link size={16}/></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // MODULE: REGISTER (BATCH ENTRY + ENTRY DATE)
  // ==========================================
  const ChequeRegister = () => {
    const [q, setQ] = useState(""), [m, setM] = useState("All"), [y, setY] = useState("All");
    const [sort, setSort] = useState({ key: "enteredAt", dir: "desc", type: "date" });
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkRows, setBulkRows] = useState([{ id: 1, eDate: new Date().toISOString().split("T")[0], cDate: "", cust: "", no: "", amt: "", status: "Pending", rem: "" }]);
    const [sel, setSel] = useState(new Set()), [edit, setEdit] = useState(null);

    const yrs = [...new Set(cheques.map(c => c.enteredAt?.split("-")[0]))].filter(Boolean).sort();
    let filtered = cheques.filter(c => !c.deleted);
    if (m !== "All") filtered = filtered.filter(c => c.enteredAt?.split("-")[1] === m);
    if (y !== "All") filtered = filtered.filter(c => c.enteredAt?.startsWith(y));
    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter(c => c.customer.toLowerCase().includes(term) || String(c.chqNo).includes(term));
    }
    const rows = applySort(filtered, sort);

    const saveBulk = () => {
      const valid = bulkRows.filter(r => r.cust && r.no && r.amt);
      const items = valid.map(v => ({ id: Date.now() + Math.random(), enteredAt: v.eDate, chqDate: v.cDate || v.eDate, customer: v.cust.trim(), chqNo: v.no, amount: Number(v.amt), status: v.status, remarks: v.rem || "", deleted: false }));
      save("cheques", [...items, ...cheques]); setIsBulkOpen(false);
    };

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">Cheque Register</h2>
            {sel.size > 0 && currentUser.role === "Admin" && (
              <button onClick={() => { if(confirm(`Delete ${sel.size} items?`)){ save("cheques", cheques.map(c => sel.has(c.id)?{...c, deleted:true}:c)); setSel(new Set()); }}} className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-lg"><Trash2 size={14} className="mr-2 inline"/> Delete {sel.size}</button>
            )}
          </div>
          <div className="flex space-x-2">
            <select className="border shadow-sm p-2 rounded-xl text-xs font-bold bg-white" value={m} onChange={e => setM(e.target.value)}><option value="All">Months</option>{["01","02","03","04","05","06","07","08","09","10","11","12"].map(mo => <option key={mo}>{mo}</option>)}</select>
            <select className="border shadow-sm p-2 rounded-xl text-xs font-bold bg-white" value={y} onChange={e => setY(e.target.value)}><option value="All">Years</option>{yrs.map(yr => <option key={yr}>{yr}</option>)}</select>
            <input placeholder="Search..." className="border shadow-sm p-2 rounded-xl text-sm w-40" onChange={e => setQ(e.target.value)}/>
            <button onClick={() => setIsBulkOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg flex items-center hover:bg-blue-700 tracking-widest"><Plus size={18} className="mr-2"/> BULK ENTRY</button>
          </div>
        </div>
        <div className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="p-4 w-10 text-center"><input type="checkbox" onChange={e => e.target.checked ? setSel(new Set(rows.map(r => r.id))) : setSel(new Set())}/></th>
                <th className="p-4 cursor-pointer" onClick={() => setSort({key: "enteredAt", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>Entry Date <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th className="p-4 cursor-pointer" onClick={() => setSort({key: "chqDate", dir: sort.dir === "asc" ? "desc" : "asc", type: "date"})}>Chq Date <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th className="p-4 cursor-pointer" onClick={() => setSort({key: "customer", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>Customer <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th className="p-4 cursor-pointer" onClick={() => setSort({key: "chqNo", dir: sort.dir === "asc" ? "desc" : "asc", type: "string"})}>Chq No <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th className="p-4 text-right cursor-pointer" onClick={() => setSort({key: "amount", dir: sort.dir === "asc" ? "desc" : "asc", type: "number"})}>Amount <ArrowUpDown size={10} className="inline ml-1"/></th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${sel.has(c.id) ? "bg-blue-50" : ""}`}>
                  <td className="p-4 text-center"><input type="checkbox" checked={sel.has(c.id)} onChange={() => { const s = new Set(sel); if(s.has(c.id)) s.delete(c.id); else s.add(c.id); setSel(s); }}/></td>
                  <td className="p-4 text-slate-400 font-bold">{toIndianDate(c.enteredAt)}</td>
                  <td className="p-4 font-black text-slate-700">{toIndianDate(c.chqDate)}</td>
                  <td className="p-4 font-black text-slate-800">{c.customer}</td>
                  <td className="p-4 font-mono text-xs font-bold text-blue-600">{c.chqNo}</td>
                  <td className="p-4 text-right font-black text-slate-900">{formatCurrency(c.amount)}</td>
                  <td className="p-4 text-center">
                    {manualMappings.some(m => m.sysId === c.id) ? <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest shadow-sm">MAPPED</span> :
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${c.status === "Cleared" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</span>}
                  </td>
                  <td className="p-4 text-center"><button onClick={() => setEdit(c)} className="text-blue-500 hover:scale-125 transition-transform"><Edit size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isBulkOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col border-[8px] border-white shadow-indigo-900/20">
              <h3 className="font-black text-2xl mb-6 tracking-tighter italic">Rapid Batch Entry</h3>
              <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl p-4">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-800 text-slate-400 uppercase text-[9px] font-black z-20">
                    <tr><th className="p-4">Entry Date</th><th className="p-4">Chq Date</th><th className="p-4 w-1/4">Party*</th><th className="p-4">Chq No*</th><th className="p-4 text-right">Amount*</th><th className="p-4">Status</th><th className="p-4">Remarks</th><th className="p-4 w-10"></th></tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((r, idx) => (
                      <tr key={r.id} className="border-b bg-white hover:bg-blue-50">
                        <td className="p-1"><input type="date" value={r.eDate} className="w-full p-2 border-0 bg-transparent text-sm font-bold" onChange={e => { const n = [...bulkRows]; n[idx].eDate = e.target.value; setBulkRows(n); }}/></td>
                        <td className="p-1"><input type="date" value={r.cDate} className="w-full p-2 border-0 bg-transparent text-sm font-bold" onChange={e => { const n = [...bulkRows]; n[idx].cDate = e.target.value; setBulkRows(n); }}/></td>
                        <td className="p-1"><input list="clist" value={r.cust} placeholder="Customer" className="w-full p-2 border-0 bg-transparent text-sm font-black" onChange={e => { const n = [...bulkRows]; n[idx].cust = e.target.value; setBulkRows(n); }}/></td>
                        <td className="p-1"><input value={r.no} placeholder="Chq No" className="w-full p-2 border-0 bg-transparent text-sm font-mono font-black text-blue-600" onChange={e => { const n = [...bulkRows]; n[idx].no = e.target.value; setBulkRows(n); }}/></td>
                        <td className="p-1"><input type="number" value={r.amt} placeholder="Amount" className="w-full p-2 border-0 bg-transparent text-sm font-black text-right" onChange={e => { const n = [...bulkRows]; n[idx].amt = e.target.value; setBulkRows(n); }}/></td>
                        <td className="p-1"><select value={r.status} className="w-full p-2 border-0 bg-transparent text-sm font-bold" onChange={e => { const n = [...bulkRows]; n[idx].status = e.target.value; setBulkRows(n); }}><option>Pending</option><option>Cleared</option></select></td>
                        <td className="p-1"><input value={r.rem} placeholder="Notes" className="w-full p-2 border-0 bg-transparent text-sm" onChange={e => { const n = [...bulkRows]; n[idx].rem = e.target.value; setBulkRows(n); }}/></td>
                        <td className="p-1 text-center"><button onClick={() => setBulkRows(bulkRows.filter(x => x.id !== r.id))} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => setBulkRows([...bulkRows, { id: Date.now(), eDate: new Date().toISOString().split("T")[0], cDate: "", cust: "", no: "", amt: "", status: "Pending", rem: "" }])} className="mt-6 text-indigo-600 font-black text-xs px-4 py-2 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-white transition-all">+ Add Row</button>
              </div>
              <div className="flex justify-end space-x-3 pt-6"><button onClick={() => setIsBulkOpen(false)} className="px-8 py-3 rounded-2xl text-slate-400 font-black">Cancel</button><button onClick={saveBulk} className="bg-indigo-600 text-white px-12 py-3 rounded-2xl font-black shadow-xl shadow-indigo-200">SAVE BATCH</button></div>
            </div>
          </div>
        )}
        {edit && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <form onSubmit={e => {
              e.preventDefault();
              const val = { id: edit.id, enteredAt: e.target.e.value, chqDate: e.target.c.value, customer: e.target.p.value.trim(), chqNo: e.target.n.value, amount: Number(e.target.a.value), status: e.target.s.value, remarks: e.target.rem.value, deleted: false };
              save("cheques", cheques.map(i => i.id === edit.id ? val : i)); setEdit(null);
            }} className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border-t-8 border-indigo-600 space-y-4">
              <h3 className="font-black text-xl mb-4 text-slate-800">Edit Record</h3>
              <div className="grid grid-cols-2 gap-4">
                <input name="e" type="date" defaultValue={edit.enteredAt} className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold ring-1 ring-slate-100 outline-none shadow-inner"/>
                <input name="c" type="date" defaultValue={edit.chqDate} className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold ring-1 ring-slate-100 outline-none shadow-inner"/>
              </div>
              <input name="p" defaultValue={edit.customer} required className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold ring-1 ring-slate-100 outline-none shadow-inner"/>
              <input name="n" defaultValue={edit.chqNo} required className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold font-mono ring-1 ring-slate-100 outline-none shadow-inner"/>
              <input name="a" type="number" defaultValue={edit.amount} required className="w-full bg-slate-50 p-3 rounded-xl text-xl font-black ring-1 ring-slate-100 outline-none shadow-inner"/>
              <select name="s" defaultValue={edit.status} className="w-full bg-slate-50 p-3 rounded-xl text-sm font-black ring-1 ring-slate-100 outline-none shadow-inner"><option>Pending</option><option>Cleared</option><option>Bounced</option></select>
              <textarea name="rem" placeholder="Add remarks..." defaultValue={edit.remarks} className="w-full bg-slate-50 p-3 rounded-xl text-sm h-20 ring-1 ring-slate-100 outline-none shadow-inner italic"/>
              <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={() => setEdit(null)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400">Cancel</button><button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-lg">Update Record</button></div>
            </form>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // MODULE: SETTINGS (APP CONFIG)
  // ==========================================
  const SettingsModule = () => {
    const [cName, setCName] = useState(config.companyName);
    const [cVar, setCVar] = useState(config.variance);
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <h2 className="text-3xl font-black mb-8 italic tracking-tighter">System Configuration</h2>
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-t-[12px] border-slate-900 space-y-8">
           <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Company Display Name</label><input value={cName} onChange={e=>setCName(e.target.value)} className="w-full bg-slate-50 p-5 rounded-2xl text-lg font-black ring-1 ring-slate-100 outline-none shadow-inner uppercase"/></div>
           <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Match Date Variance (Days)</label><input type="number" value={cVar} onChange={e=>setCVar(Number(e.target.value))} className="w-full bg-slate-50 p-5 rounded-2xl text-lg font-black ring-1 ring-slate-100 outline-none shadow-inner"/></div>
           <button onClick={()=>{ saveConfig({companyName: cName, variance: cVar}); alert("Settings Committed to Cloud"); log("Security", "Config", "Updated App Settings"); }} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black tracking-widest hover:bg-black transition-all shadow-xl">COMMIT CONFIGURATION</button>
        </div>
      </div>
    );
  };

  // --- UPLOAD ---
  const UploadModule = () => {
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
        alert(`Process Complete!\nAdded: ${add}\nSkipped: ${dp}`);
      }; r.readAsBinaryString(f);
    };
    return (
      <div className="p-20 grid grid-cols-2 gap-16 max-w-7xl mx-auto">
        <div className="bg-white p-16 rounded-[3.5rem] shadow-2xl border-t-[20px] border-orange-500 relative text-center">
          <button onClick={() => save("bank", [])} className="absolute top-6 right-6 text-red-500 hover:scale-150 transition-all"><Trash size={24}/></button>
          <UploadCloud size={100} className="text-orange-500 mb-8 mx-auto"/><h3 className="text-3xl font-black italic tracking-tighter">Bank ICICI</h3>
          <input type="file" onChange={e => up(e, "B")} className="text-xs border-4 border-dashed border-slate-100 p-10 rounded-[2.5rem] w-full bg-slate-50 cursor-pointer font-black mt-4"/>
        </div>
        <div className="bg-white p-16 rounded-[3.5rem] shadow-2xl border-t-[20px] border-purple-500 relative text-center">
          <button onClick={() => save("tally", [])} className="absolute top-6 right-6 text-red-500 hover:scale-150 transition-all"><Trash size={24}/></button>
          <FileSpreadsheet size={100} className="text-purple-500 mb-8 mx-auto"/><h3 className="text-3xl font-black italic tracking-tighter">Tally Vouchers</h3>
          <input type="file" onChange={e => up(e, "T")} className="text-xs border-4 border-dashed border-slate-100 p-10 rounded-[2.5rem] w-full bg-slate-50 cursor-pointer font-black mt-4"/>
        </div>
      </div>
    );
  };

  const MasterCustomers = () => (
    <div className="p-10 max-w-xl mx-auto">
      <div className="flex justify-between mb-8"><h2 className="text-3xl font-black italic tracking-tighter">Customer Master</h2><label className="bg-indigo-600 text-white px-6 py-3 rounded-2xl cursor-pointer text-xs font-black shadow-xl hover:bg-indigo-700 tracking-widest"><FileUp size={16} className="inline mr-2"/> IMPORT EXCEL<input type="file" className="hidden" onChange={e=>{
        const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload=(ev)=>{
          const wb = XLSX.read(ev.target.result, {type:'binary'}); const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          const nl = [...customers]; raw.forEach(row=>{ const name = row.Name || row.Customer; if(name && !nl.some(c=>c.name.toLowerCase()===String(name).toLowerCase().trim())) nl.push({id:Date.now()+Math.random(), name:String(name).trim()})});
          save("customers", nl); alert("Master Updated");
        }; r.readAsBinaryString(f);
      }}/></label></div>
      <div className="bg-white border-0 shadow-2xl rounded-[2.5rem] overflow-auto max-h-[70vh]">
        {customers.map(c => <div key={c.id} className="p-6 border-b border-slate-50 flex justify-between hover:bg-slate-50 transition-all font-black text-slate-700 italic"><span>{c.name}</span><button onClick={() => save("customers", customers.filter(i => i.id !== c.id))} className="text-red-300 hover:text-red-500"><Trash2 size={20}/></button></div>)}
      </div>
    </div>
  );

  const UserManagement = () => {
    const [m, setM] = useState(null);
    return (
      <div className="p-8">
        <div className="flex justify-between mb-8"><h2 className="text-3xl font-black tracking-tighter italic">Access Management</h2><button onClick={() => setM({})} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black shadow-xl tracking-widest uppercase">NEW USER</button></div>
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-[9px] font-black uppercase text-slate-400 tracking-widest"><tr><th className="p-6">User</th><th className="p-6">Role</th><th className="p-6 text-center">Protocol Edit</th></tr></thead>
            <tbody>{usersList.map(u => <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50"><td className="p-6 font-black text-slate-800 text-lg uppercase tracking-tight">{u.name} <span className="text-slate-200 italic ml-2">(@{u.username})</span></td><td className="p-6 font-black text-blue-600 uppercase text-xs tracking-widest">{u.role}</td><td className="p-6 text-center"><button onClick={() => setM(u)} className="text-slate-200 hover:text-blue-600 transition-all hover:scale-150"><Edit size={22}/></button></td></tr>)}</tbody>
          </table>
        </div>
        {m && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <form onSubmit={e => {
              e.preventDefault(); const u = { id: m.id || Date.now(), username: e.target.u.value.toLowerCase().trim(), name: e.target.n.value.trim(), role: e.target.r.value, password: e.target.p.value, active: e.target.a.checked };
              save("users", m.id ? usersList.map(i => i.id === m.id ? u : i) : [...usersList, u]); setM(null);
            }} className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-sm space-y-4 border-t-[12px] border-slate-900">
              <h3 className="font-black text-2xl text-slate-800 tracking-tighter italic mb-4">Security Protocol</h3>
              <input name="u" placeholder="Admin ID" defaultValue={m.username} required className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none tracking-widest ring-1 ring-slate-100 shadow-inner"/>
              <input name="n" placeholder="Name" defaultValue={m.name} required className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none tracking-widest ring-1 ring-slate-100 shadow-inner"/>
              <input name="p" placeholder="Password" defaultValue={m.password} required className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none tracking-widest ring-1 ring-slate-100 shadow-inner"/>
              <select name="r" defaultValue={m.role || "Team"} className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black ring-1 ring-slate-100 uppercase tracking-widest"><option>Team</option><option>Admin</option></select>
              <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest ml-1"><input name="a" type="checkbox" defaultChecked={m.active ?? true} className="mr-4 w-6 h-6 border-2 rounded-lg"/> Authorized</label>
              <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => setM(null)} className="px-6 py-2.5 rounded-2xl font-black text-slate-300">Abort</button><button className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black text-xs shadow-lg uppercase tracking-widest">COMMIT</button></div>
            </form>
          </div>
        )}
      </div>
    );
  };

  const AuditTrailModule = () => (
    <div className="p-8 w-full h-full flex flex-col">
      <h2 className="text-3xl font-black text-slate-800 mb-8 italic tracking-tighter uppercase">Security Logs</h2>
      <div className="bg-white border-0 shadow-2xl rounded-[3rem] overflow-hidden flex-1 border-8 border-white">
        <div className="overflow-auto h-full">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-900 text-slate-400 sticky top-0 uppercase tracking-widest text-[8px] font-black z-10"><tr><th className="p-5">Timestamp (DD/MM/YY)</th><th className="p-5">Operator</th><th className="p-5">Action Type</th><th className="p-5">Details</th></tr></thead>
            <tbody>{auditTrail.map(l => (<tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all italic"><td className="p-5 text-slate-400 font-mono font-bold tracking-tighter text-[10px]">{l.time}</td><td className="p-5 font-black text-slate-800 uppercase tracking-tighter text-[10px]">{l.user}</td><td className="p-5 text-indigo-600 font-black italic tracking-widest uppercase text-[10px]">{l.action}</td><td className="p-5 font-bold text-slate-500 tracking-tight">{l.record}: {l.details}</td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden font-sans">
      <div className="w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-12 border-b border-slate-800 text-center font-black text-blue-400 tracking-tighter text-3xl uppercase italic flex flex-col drop-shadow-lg">{config.companyName.split(' ')[0]}<span className="text-[9px] tracking-[0.6em] text-slate-500 mt-2 font-black">Control Systems</span></div>
        <nav className="flex-1 py-10 overflow-y-auto">
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
            <button key={m.id} onClick={() => setCurrentScreen(m.id)} className={`w-full text-left px-12 py-6 flex items-center text-[10px] font-black tracking-[0.3em] uppercase transition-all relative ${currentScreen === m.id ? "bg-indigo-600 text-white shadow-2xl scale-105 z-10" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}>
                {currentScreen === m.id && <div className="absolute left-0 top-0 bottom-0 w-2 bg-white"/>}
                {m.icon} <span className="ml-6">{m.id}</span>
            </button>
          ))}
        </nav>
        <div className="p-8 bg-black/40 flex justify-between items-center text-xs border-t border-slate-800 shadow-2xl">
          <div className="tracking-tighter"><p className="font-black text-white italic text-lg">{currentUser.name}</p><p className="text-[9px] text-indigo-400 uppercase font-black tracking-[0.3em] mt-1">{currentUser.role} Level</p></div>
          <button onClick={() => setCurrentUser(null)} className="p-4 bg-slate-800 hover:bg-red-600 rounded-3xl transition-all shadow-xl group"><LogOut size={20} className="group-hover:scale-125 transition-transform"/></button>
        </div>
      </div>
      <main className="flex-1 overflow-auto bg-[#f8fafc] relative">
         {currentScreen === "Dashboard" && <Dashboard />}
         {currentScreen === "Cheque Register" && <ChequeRegister />}
         {currentScreen === "Upload Statements" && <UploadModule />}
         {currentScreen === "Reconciliation" && <Reconciliation />}
         {currentScreen === "Master Customers" && <MasterCustomers />}
         {currentScreen === "User Management" && <UserManagement />}
         {currentScreen === "Audit Trail" && <AuditTrailModule />}
         {currentScreen === "Settings" && <SettingsModule />}
      </main>
    </div>
  );
}