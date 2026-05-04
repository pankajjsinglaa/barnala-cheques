import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  List,
  FileText,
  LogOut,
  Search,
  Trash2,
  Edit,
  Lock,
  Plus,
  AlertTriangle,
  X,
  ArrowUpDown,
  Save,
  Trash,
  Users,
  FileUp,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  Link,
  RefreshCw,
  Shield,
  UserPlus,
  Key,
  Download,
  Database,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

// --- FIREBASE CLOUD DATABASE IMPORT ---
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

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

// Excel Date Converter
const formatExcelDate = (val) => {
  if (!val) return "";
  if (typeof val === "number") {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = String(date.getFullYear()).slice(-2); // YY format
    return `${d}/${m}/${y}`;
  }
  return String(val).trim();
};

// Internal Date Sorter
const getSortableDate = (dStr) => {
  if (!dStr) return 0;
  if (String(dStr).includes("-")) return new Date(dStr).getTime() || 0;
  if (String(dStr).includes("/")) {
    const [dd, mm, yyyy] = String(dStr).split("/");
    const fullYear = yyyy.length === 2 ? `20${yyyy}` : yyyy;
    return new Date(`${fullYear}-${mm}-${dd}`).getTime() || 0;
  }
  return 0;
};

// NEW: Indian Visual Date Formatter (DD/MM/YY)
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  if (String(dateStr).includes("-") && String(dateStr).split("-")[0].length === 4) {
    const [yyyy, mm, dd] = String(dateStr).split("-");
    return `${dd}/${mm}/${yyyy.slice(-2)}`;
  }
  return String(dateStr);
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("Dashboard");
  const [isDbReady, setIsDbReady] = useState(false);

  const [usersList, setUsersList] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [bankData, setBankData] = useState([]);
  const [tallyData, setTallyData] = useState([]);
  const [manualMappings, setManualMappings] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const initDB = async (docName, initialData, stateSetter) => {
      const ref = doc(db, "btc_data", docName);
      const snap = await getDoc(ref);
      if (!snap.exists()) await setDoc(ref, { list: initialData });
      onSnapshot(ref, (d) => {
        if (d.exists() && isMounted) stateSetter(d.data().list || []);
      });
    };

    const bootSystem = async () => {
      await initDB(
        "users",
        [
          {
            id: 1,
            username: "admin",
            name: "Pankaj Singla",
            role: "Admin",
            password: "admin",
            active: true,
          },
        ],
        setUsersList
      );
      await initDB("cheques", [], setCheques);
      await initDB("customers", [], setCustomers);
      await initDB("auditTrail", [], setAuditTrail);
      await initDB("bank", [], setBankData);
      await initDB("tally", [], setTallyData);
      await initDB("mappings", [], setManualMappings);
      setIsDbReady(true);
    };

    bootSystem();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateCheques = (newList) =>
    setDoc(doc(db, "btc_data", "cheques"), { list: newList });
  const updateUsersList = (newList) =>
    setDoc(doc(db, "btc_data", "users"), { list: newList });
  const updateCustomers = (newList) =>
    setDoc(doc(db, "btc_data", "customers"), { list: newList });
  const updateBankData = (newList) =>
    setDoc(doc(db, "btc_data", "bank"), { list: newList });
  const updateTallyData = (newList) =>
    setDoc(doc(db, "btc_data", "tally"), { list: newList });
  const updateMappings = (newList) =>
    setDoc(doc(db, "btc_data", "mappings"), { list: newList });

  const logAction = (action, record, details, user = currentUser?.username) => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleString(),
      user: String(user || "System"),
      action: String(action || ""),
      record: String(record || ""),
      details: String(details || ""),
    };
    setDoc(doc(db, "btc_data", "auditTrail"), {
      list: [newLog, ...auditTrail].slice(0, 1000),
    });
  };

  const checkAndAddCustomer = (customerName) => {
    if (!customerName) return;
    const exists = customers.some(
      (c) => String(c.name).toLowerCase() === String(customerName).toLowerCase().trim()
    );
    if (!exists && String(customerName).trim() !== "") {
      updateCustomers([
        ...customers,
        { id: Date.now(), name: String(customerName).trim() },
      ]);
      logAction("Auto-Add", "Master Customer", `Added ${String(customerName).trim()}`);
    }
  };

  const exportToExcel = (data, filename) => {
    if (!data || data.length === 0) return alert("No data to export!");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    logAction("Export", filename, `Exported ${data.length} rows to Excel`);
  };

  if (!isDbReady) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <Database size={48} className="text-blue-600 animate-pulse mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700">Connecting to Firebase Cloud...</h2>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="bg-white p-8 rounded shadow-lg w-[400px] text-center border-t-4 border-blue-600">
          <div className="flex justify-center mb-4">
            <Shield size={40} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-blue-900">Barnala Trading Company</h1>
          <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider">Cheque App</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const un = e.target.username.value.toLowerCase().trim();
              const pw = e.target.password.value;
              const user = usersList.find((u) => u.username === un && u.password === pw);
              if (user) {
                if (!user.active) return alert("Account deactivated. Contact Admin.");
                setCurrentUser(user);
                logAction("Login", "System", "Logged in securely", user.username);
              } else alert("Invalid Username or Password.");
            }}
          >
            <input name="username" type="text" placeholder="Username" required className="w-full border p-2 rounded mb-3 text-center" />
            <input name="password" type="password" placeholder="Password" required className="w-full border p-2 rounded mb-4 text-center" />
            <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">
              Secure Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "Admin";
  // Safe math formatter
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Number(amount) || 0);

  // ==========================================
  // MODULE: DASHBOARD
  // ==========================================
  const Dashboard = () => {
    const activeCheques = cheques.filter((c) => !c.deleted);
    const cleared = activeCheques.filter((c) => c.status === "Cleared");
    const pending = activeCheques.filter((c) => c.status === "Pending");
    const bounced = activeCheques.filter((c) => c.status === "Bounced");
    const urgentAlerts = activeCheques.filter((c) => c.status === "Bounced" || c.mismatchAlert);

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Business Dashboard</h2>
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded shadow border-l-4 border-green-500 hover:shadow-lg transition-shadow">
            <h3 className="text-gray-500 text-sm font-bold mb-1">Cleared Cheques</h3>
            <p className="text-2xl font-mono font-bold text-gray-800">
              {formatCurrency(cleared.reduce((sum, c) => sum + (Number(c.amount) || 0), 0))}
            </p>
            <p className="text-sm text-green-600 mt-1">{cleared.length} system cheques</p>
          </div>
          <div className="bg-white p-5 rounded shadow border-l-4 border-yellow-500 hover:shadow-lg transition-shadow">
            <h3 className="text-gray-500 text-sm font-bold mb-1">Pending Checks</h3>
            <p className="text-2xl font-mono font-bold text-gray-800">
              {formatCurrency(pending.reduce((sum, c) => sum + (Number(c.amount) || 0), 0))}
            </p>
            <p className="text-sm text-yellow-600 mt-1">{pending.length} system cheques</p>
          </div>
          <div className="bg-white p-5 rounded shadow border-l-4 border-red-500 hover:shadow-lg transition-shadow">
            <h3 className="text-gray-500 text-sm font-bold mb-1">Bounced / Conflicts</h3>
            <p className="text-2xl font-mono font-bold text-red-600">
              {formatCurrency(bounced.reduce((sum, c) => sum + (Number(c.amount) || 0), 0))}
            </p>
            <p className="text-sm text-red-600 mt-1">{urgentAlerts.length} Action Required</p>
          </div>
          <div className="bg-white p-5 rounded shadow border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <h3 className="text-gray-500 text-sm font-bold mb-1">Bank vs Tally Docs</h3>
            <p className="text-2xl font-mono font-bold text-gray-800">
              {bankData.length} / {tallyData.length}
            </p>
            <p className="text-sm text-blue-600 mt-1">Records loaded in memory</p>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-4 text-red-600 flex items-center">
          <AlertCircle className="mr-2" /> Urgent Mismatches & Bounces
        </h3>
        {urgentAlerts.length === 0 ? (
          <div className="bg-green-50 rounded shadow p-6 text-center border border-green-200">
            <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
            <p className="text-green-800 font-bold">All clear! No urgent mismatches currently.</p>
          </div>
        ) : (
          <div className="bg-white rounded shadow p-4 border border-red-200">
            {urgentAlerts.map((c) => (
              <div key={c.id} className="flex justify-between items-center p-4 bg-red-50 rounded mb-2 border border-red-100">
                <div>
                  <p className="font-bold text-red-800 text-lg">
                    {c.customer || "Unknown"}{" "}
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      Chq: <span className="font-mono">{c.chqNo || "N/A"}</span>
                    </span>
                  </p>
                  <p className="text-sm text-red-600 font-medium mt-1">
                    System Amount: {formatCurrency(c.amount)} | {c.mismatchAlert || "Cheque Bounced"}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentScreen("Cheque Register")}
                  className="px-6 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 shadow"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // MODULE: UPLOAD STATEMENTS
  // ==========================================
  const UploadStatements = () => {
    const processUpload = (e, type) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

          if (type === "ICICI") {
            const headerRowIdx = rawData.findIndex(
              (r) =>
                r.includes("Transaction ID") ||
                r.includes("Txn Posted Date") ||
                r.includes("Value Date")
            );
            if (headerRowIdx === -1)
              return alert("Error: Could not find ICICI column headers in this file.");

            const header = rawData[headerRowIdx];
            const cId = header.findIndex((h) => h.includes("Transaction ID"));
            const cDate = header.findIndex((h) => h.includes("Value Date") || h.includes("Txn Posted Date"));
            const cChq = header.findIndex((h) => h.includes("ChequeNo"));
            const cDesc = header.findIndex((h) => h.includes("Description"));
            const cCrDr = header.findIndex((h) => h.includes("Cr/Dr"));
            const cAmt = header.findIndex((h) => h.includes("Amount"));

            let newAdded = 0;
            let dupesSkipped = 0;
            const updatedBankData = [...bankData];

            for (let i = headerRowIdx + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || row.length === 0) continue;

              const crdr = String(row[cCrDr] || "").trim().toUpperCase();
              const amt = parseFloat(row[cAmt]) || 0;
              const txnId = String(row[cId] || "").trim();

              if (amt > 0 && crdr === "CR") {
                if (txnId && updatedBankData.some((b) => b.id === txnId)) {
                  dupesSkipped++;
                  continue;
                }

                updatedBankData.push({
                  id: txnId || Math.random().toString(),
                  txnDate: formatExcelDate(row[cDate]),
                  desc: String(row[cDesc] || "").trim(),
                  chqNo: String(row[cChq] || "").replace("-", "").trim(),
                  amount: amt,
                });
                newAdded++;
              }
            }
            updateBankData(updatedBankData);
            alert(`Parsed ICICI Statement successfully!\n\nNew records added: ${newAdded}\nDuplicates skipped: ${dupesSkipped}`);
            logAction("Upload", "Bank Statement", `Imported ICICI file: ${file.name}`);
          } else if (type === "TALLY") {
            const headerRowIdx = rawData.findIndex(
              (r) => r.includes("Particulars") && (r.includes("Vch No.") || r.includes("Vch Type"))
            );
            if (headerRowIdx === -1)
              return alert("Error: Could not find Tally column headers in this file.");

            const header = rawData[headerRowIdx];
            const cDate = header.indexOf("Date");
            const cPart = header.indexOf("Particulars");
            const cVType = header.indexOf("Vch Type");
            const cVNo = header.indexOf("Vch No.");
            const cDeb = header.indexOf("Debit");
            const cCred = header.indexOf("Credit");

            let newAdded = 0;
            let dupesSkipped = 0;
            const updatedTallyData = [...tallyData];
            let lastDate = "";

            for (let i = headerRowIdx + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || row.length === 0) continue;

              let dateVal = row[cDate];
              if (dateVal) lastDate = dateVal;
              else dateVal = lastDate;

              let part1 = String(row[cPart] || "").trim();
              let part2 = String(row[cPart + 1] || "").trim();
              let part3 = String(row[cPart + 2] || "").trim();

              let actualName = part1;
              if (part1.toLowerCase() === "cr" || part1.toLowerCase() === "dr" || part1 === "") {
                actualName = part2 || part3 || "Unknown Customer";
              }

              const vType = String(row[cVType] || "").trim();
              const vNo = String(row[cVNo] || "").trim();
              const deb = parseFloat(row[cDeb]) || 0;
              const cred = parseFloat(row[cCred]) || 0;
              const amt = deb > 0 ? deb : cred;

              if (amt > 0 && actualName !== "Opening Balance" && !actualName.toLowerCase().includes("suspense") && vType.toLowerCase().includes("receipt")) {
                if (vNo && updatedTallyData.some((t) => t.vchNo === vNo)) {
                  dupesSkipped++;
                  continue;
                }

                updatedTallyData.push({
                  id: vNo || Math.random().toString(),
                  date: formatExcelDate(dateVal),
                  particulars: actualName,
                  vchNo: vNo,
                  amount: amt,
                });
                newAdded++;
              }
            }
            updateTallyData(updatedTallyData);
            alert(`Parsed Tally Export successfully!\n\nNew vouchers added: ${newAdded}\nDuplicates skipped: ${dupesSkipped}`);
            logAction("Upload", "Tally Data", `Imported Tally file: ${file.name}`);
          }
        } catch (err) {
          alert("Error parsing Excel file. Ensure it's not protected or corrupted.");
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = null;
    };

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Upload Statements</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white shadow rounded p-6 border-t-4 border-orange-500 relative">
            {isAdmin && bankData.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("WARNING: This will wipe all Bank Statement records. Continue?")) {
                    updateBankData([]);
                    updateMappings(manualMappings.filter((m) => !m.bankId));
                    logAction("Wipe", "Bank Data", "Cleared all bank records");
                  }
                }}
                className="absolute top-4 right-4 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded"
              >
                Wipe Bank Data
              </button>
            )}
            <h3 className="font-bold text-lg mb-2 flex items-center">
              <UploadCloud className="mr-2 text-orange-500" /> ICICI Statement (.xls)
            </h3>
            <p className="text-xs text-gray-500 mb-4">Auto-detects headers. Skips duplicate Transaction IDs.</p>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center cursor-pointer hover:bg-orange-50 transition-colors">
              <UploadCloud size={32} className="text-gray-400 mb-2" />
              <p className="text-sm font-bold text-blue-600">Browse ICICI File</p>
              <input type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => processUpload(e, "ICICI")} />
            </label>
            {bankData.length > 0 && <p className="mt-4 text-green-600 font-bold text-sm">✓ {bankData.length} deposits currently in memory.</p>}
          </div>

          <div className="bg-white shadow rounded p-6 border-t-4 border-blue-500 relative">
            {isAdmin && tallyData.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("WARNING: This will wipe all Tally records. Continue?")) {
                    updateTallyData([]);
                    updateMappings(manualMappings.filter((m) => !m.tallyId));
                    logAction("Wipe", "Tally Data", "Cleared all tally records");
                  }
                }}
                className="absolute top-4 right-4 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded"
              >
                Wipe Tally Data
              </button>
            )}
            <h3 className="font-bold text-lg mb-2 flex items-center">
              <FileSpreadsheet className="mr-2 text-blue-500" /> Tally Export (.xlsx)
            </h3>
            <p className="text-xs text-gray-500 mb-4">Smart Parser extracts real Party Names. Skips duplicate Vouchers.</p>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center cursor-pointer hover:bg-blue-50 transition-colors">
              <FileSpreadsheet size={32} className="text-gray-400 mb-2" />
              <p className="text-sm font-bold text-blue-600">Browse Tally File</p>
              <input type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => processUpload(e, "TALLY")} />
            </label>
            {tallyData.length > 0 && <p className="mt-4 text-green-600 font-bold text-sm">✓ {tallyData.length} vouchers currently in memory.</p>}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // MODULE: EXCEL-LIKE RECONCILIATION ENGINE
  // ==========================================
  const Reconciliation = () => {
    const [reconFilter, setReconFilter] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [mapModal, setMapModal] = useState(null);

    let matchedBankIds = new Set();
    let matchedTallyIds = new Set();
    let matchedSysIds = new Set();
    let reconRows = [];

    manualMappings.forEach((m) => {
      if (m.type === "IGNORE") {
        if (m.bankId) matchedBankIds.add(m.bankId);
        if (m.tallyId) matchedTallyIds.add(m.tallyId);
        if (m.sysId) matchedSysIds.add(m.sysId);
        return;
      }
      const sysChq = cheques.find((c) => c.id === m.sysId) || null;
      const bMatch = bankData.find((b) => b.id === m.bankId) || null;
      const tMatch = tallyData.find((t) => t.id === m.tallyId) || null;

      if (bMatch) matchedBankIds.add(bMatch.id);
      if (tMatch) matchedTallyIds.add(tMatch.id);
      if (sysChq) matchedSysIds.add(sysChq.id);

      reconRows.push({
        id: `man_${m.id}`,
        sysChq,
        bMatch,
        tMatch,
        manual: true,
        mappingId: m.id,
        reconStatus: "Manual Match",
        color: "bg-indigo-50",
        statusBadge: "bg-indigo-100 text-indigo-800",
      });
    });

    cheques.filter((c) => !c.deleted && !matchedSysIds.has(c.id)).forEach((sysChq) => {
      const safeChqNo = String(sysChq.chqNo || "");
      const safeCustomer = String(sysChq.customer || "");
      const customerFirstWord = safeCustomer.split(" ")[0].toLowerCase();
      const sysAmt = Number(sysChq.amount) || 0;

      const bMatch = bankData.find(
        (b) =>
          !matchedBankIds.has(b.id) &&
          ((b.chqNo && safeChqNo && String(b.chqNo).includes(safeChqNo)) ||
            (b.desc && safeChqNo && String(b.desc).includes(safeChqNo)) ||
            (Number(b.amount) === sysAmt && String(b.desc).toLowerCase().includes(customerFirstWord)))
      );

      const tMatch = tallyData.find(
        (t) =>
          !matchedTallyIds.has(t.id) &&
          Number(t.amount) === sysAmt &&
          String(t.particulars).toLowerCase().includes(customerFirstWord)
      );

      if (bMatch) matchedBankIds.add(bMatch.id);
      if (tMatch) matchedTallyIds.add(tMatch.id);

      let status = "3-Way Match", color = "bg-green-50", statusBadge = "bg-green-100 text-green-800";
      if (!bMatch && !tMatch) { status = "System Only"; color = "bg-white"; statusBadge = "bg-gray-100 text-gray-800"; }
      else if (!bMatch) { status = "System + Tally"; color = "bg-yellow-50"; statusBadge = "bg-yellow-100 text-yellow-800"; }
      else if (!tMatch) { status = "System + Bank"; color = "bg-yellow-50"; statusBadge = "bg-yellow-100 text-yellow-800"; }

      reconRows.push({ id: `sys_${sysChq.id}`, sysChq, bMatch, tMatch, manual: false, reconStatus: status, color, statusBadge });
    });

    bankData.forEach((b) => {
      if (!matchedBankIds.has(b.id)) {
        const bAmt = Number(b.amount) || 0;
        const tMatch = tallyData.find((t) => !matchedTallyIds.has(t.id) && Number(t.amount) === bAmt);
        if (tMatch) {
          matchedBankIds.add(b.id);
          matchedTallyIds.add(tMatch.id);
          reconRows.push({
            id: `b2t_${b.id}`, sysChq: null, bMatch: b, tMatch: tMatch, manual: false, reconStatus: "Bank ↔ Tally", color: "bg-blue-50", statusBadge: "bg-blue-100 text-blue-800",
          });
        }
      }
    });

    bankData.forEach((b) => {
      if (!matchedBankIds.has(b.id)) {
        reconRows.push({
          id: `ub_${b.id}`, sysChq: null, bMatch: b, tMatch: null, manual: false, reconStatus: "Unmapped Bank", color: "bg-orange-50", statusBadge: "bg-orange-100 text-orange-800",
        });
      }
    });

    tallyData.forEach((t) => {
      if (!matchedTallyIds.has(t.id)) {
        reconRows.push({
          id: `ut_${t.id}`, sysChq: null, bMatch: null, tMatch: t, manual: false, reconStatus: "Unmapped Tally", color: "bg-purple-50", statusBadge: "bg-purple-100 text-purple-800",
        });
      }
    });

    let filteredRows = reconRows;
    if (reconFilter === "Mapped") filteredRows = reconRows.filter((r) => !r.reconStatus.includes("Unmapped") && r.reconStatus !== "System Only");
    else if (reconFilter === "Unmapped") filteredRows = reconRows.filter((r) => r.reconStatus.includes("Unmapped") || r.reconStatus === "System Only");
    else if (reconFilter !== "All") filteredRows = reconRows.filter((r) => r.reconStatus === reconFilter);

    if (searchTerm) {
      const q = String(searchTerm).toLowerCase();
      filteredRows = filteredRows.filter(
        (r) =>
          String(r.sysChq?.customer || "").toLowerCase().includes(q) ||
          String(r.bMatch?.desc || "").toLowerCase().includes(q) ||
          String(r.tMatch?.particulars || "").toLowerCase().includes(q) ||
          String(r.sysChq?.chqNo || "").toLowerCase().includes(q) ||
          String(r.bMatch?.chqNo || "").toLowerCase().includes(q) ||
          String(r.tMatch?.vchNo || "").toLowerCase().includes(q)
      );
    }

    const handleSort = (key) => {
      let direction = "asc";
      if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
      setSortConfig({ key, direction });
    };

    filteredRows.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === "date") {
        valA = getSortableDate(a.sysChq?.chqDate || a.bMatch?.txnDate || a.tMatch?.date);
        valB = getSortableDate(b.sysChq?.chqDate || b.bMatch?.txnDate || b.tMatch?.date);
      } else if (sortConfig.key === "amount") {
        valA = Number(a.sysChq?.amount || a.bMatch?.amount || a.tMatch?.amount) || 0;
        valB = Number(b.sysChq?.amount || b.bMatch?.amount || b.tMatch?.amount) || 0;
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    const handleSaveMapping = (e) => {
      e.preventDefault();
      const form = e.target;
      const reason = form.reason.value;
      if (!reason) return alert("Mandatory reason required.");

      let newMap = { id: Date.now(), reason, user: currentUser.username, date: new Date().toLocaleString() };

      if (mapModal.action === "CREATE") {
        newMap.sysId = form.sysId?.value || null;
        newMap.bankId = form.bankId?.value || null;
        newMap.tallyId = form.tallyId?.value || null;
        if (!newMap.sysId && !newMap.bankId && !newMap.tallyId) return alert("Select at least one item to map to.");
      } else if (mapModal.action === "BREAK") {
        newMap.type = "IGNORE";
        newMap.sysId = mapModal.row.sysChq?.id || null;
        newMap.bankId = mapModal.row.bMatch?.id || null;
        newMap.tallyId = mapModal.row.tMatch?.id || null;
        if (mapModal.row.manual) {
          const updatedMappings = manualMappings.filter((m) => m.id !== mapModal.row.mappingId);
          updateMappings([...updatedMappings, newMap]);
          logAction("Mapping", "Break Manual", `Broke manual match. Reason: ${reason}`);
          setMapModal(null);
          return;
        }
      }
      updateMappings([...manualMappings, newMap]);
      logAction("Mapping", mapModal.action, `Modified mapping. Reason: ${reason}`);
      setMapModal(null);
    };

    const handleExport = () => {
      if (filteredRows.length === 0) return alert("No data.");
      const exportData = filteredRows.map((r) => ({
        "Match Status": r.reconStatus,
        "Sys Date": r.sysChq ? formatDisplayDate(r.sysChq.chqDate) : "-",
        "Sys Customer": r.sysChq ? r.sysChq.customer : "-",
        "Sys Chq No": r.sysChq ? r.sysChq.chqNo : "-",
        "Sys Amount": r.sysChq ? r.sysChq.amount : 0,
        "Bank Date": r.bMatch ? r.bMatch.txnDate : "-",
        "Bank Description": r.bMatch ? r.bMatch.desc : "-",
        "Bank Ref/Chq": r.bMatch ? r.bMatch.chqNo : "-",
        "Bank Amount": r.bMatch ? r.bMatch.amount : 0,
        "Tally Date": r.tMatch ? r.tMatch.date : "-",
        "Tally Particulars": r.tMatch ? r.tMatch.particulars : "-",
        "Tally Voucher": r.tMatch ? r.tMatch.vchNo : "-",
        "Tally Amount": r.tMatch ? r.tMatch.amount : 0,
      }));
      exportToExcel(exportData, `BTC_Recon_${reconFilter.replace(/ /g, "_")}`);
    };

    return (
      <div className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Panorama Reconciliation</h2>
            <p className="text-sm text-gray-500">Excel-style view. Auto-linking System Cheques, Bank Statements, and Tally Exports.</p>
          </div>
          <div className="flex space-x-3">
            <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center shadow hover:bg-green-700"><Download size={16} className="mr-2" /> Export Excel</button>
            <button onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 600); }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center shadow hover:bg-blue-700"><RefreshCw size={16} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh Engine</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 shrink-0">
          <div onClick={() => setReconFilter("Mapped")} className={`border p-4 rounded text-center cursor-pointer transition-all shadow-sm ${reconFilter === "Mapped" ? "bg-green-100 border-green-400 ring-2 ring-green-500" : "bg-green-50 border-green-200 hover:bg-green-100"}`}>
            <p className="text-sm text-green-800 font-bold mb-1">Total Matched</p>
            <p className="text-2xl font-bold text-green-600">{reconRows.filter((r) => !r.reconStatus.includes("Unmapped") && r.reconStatus !== "System Only").length}</p>
          </div>
          <div onClick={() => setReconFilter("Unmapped Bank")} className={`border p-4 rounded text-center cursor-pointer transition-all shadow-sm ${reconFilter === "Unmapped Bank" ? "bg-orange-100 border-orange-400 ring-2 ring-orange-500" : "bg-orange-50 border-orange-200 hover:bg-orange-100"}`}>
            <p className="text-sm text-orange-800 font-bold mb-1">Unmapped Bank</p>
            <p className="text-2xl font-bold text-orange-600">{reconRows.filter((r) => r.reconStatus === "Unmapped Bank").length}</p>
          </div>
          <div onClick={() => setReconFilter("Unmapped Tally")} className={`border p-4 rounded text-center cursor-pointer transition-all shadow-sm ${reconFilter === "Unmapped Tally" ? "bg-purple-100 border-purple-400 ring-2 ring-purple-500" : "bg-purple-50 border-purple-200 hover:bg-purple-100"}`}>
            <p className="text-sm text-purple-800 font-bold mb-1">Unmapped Tally</p>
            <p className="text-2xl font-bold text-purple-600">{reconRows.filter((r) => r.reconStatus === "Unmapped Tally").length}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex space-x-3 w-1/2">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input type="text" placeholder="Search Names, Amounts, Refs..." className="border p-2 pl-9 rounded text-sm w-full shadow-sm focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <select className="border p-2 rounded text-sm bg-white font-bold shadow-sm" value={reconFilter} onChange={(e) => setReconFilter(e.target.value)}>
            <option value="All">All Statuses ({reconRows.length})</option>
            <option value="Mapped">-- Only MATCHED --</option>
            <option value="Unmapped">-- Only UNMAPPED --</option>
            <option disabled>──────────</option>
            <option value="3-Way Match">3-Way Match</option>
            <option value="Bank ↔ Tally">Bank ↔ Tally</option>
            <option value="Unmapped Bank">Unmapped Bank</option>
            <option value="Unmapped Tally">Unmapped Tally</option>
          </select>
        </div>

        <div className="bg-white shadow rounded border overflow-x-auto flex-1 flex flex-col min-h-0">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm min-w-[1600px]">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-40 border-r border-slate-700">Match Status</th>
                  <th className="p-3 border-r border-slate-700 bg-slate-700 cursor-pointer hover:bg-slate-600" onClick={() => handleSort("date")}>Sys Date <ArrowUpDown size={12} className="inline opacity-50" /></th>
                  <th className="p-3 border-r border-slate-700 bg-slate-700">Sys Customer</th>
                  <th className="p-3 border-r border-slate-700 bg-slate-700">Sys Chq</th>
                  <th className="p-3 border-r border-slate-900 bg-slate-700 text-right cursor-pointer hover:bg-slate-600" onClick={() => handleSort("amount")}>Sys Amt <ArrowUpDown size={12} className="inline opacity-50" /></th>
                  <th className="p-3 border-r border-slate-700 bg-slate-600 cursor-pointer hover:bg-slate-500" onClick={() => handleSort("date")}>Bank Date <ArrowUpDown size={12} className="inline opacity-50" /></th>
                  <th className="p-3 border-r border-slate-700 bg-slate-600">Bank Desc</th>
                  <th className="p-3 border-r border-slate-700 bg-slate-600">Bank Ref</th>
                  <th className="p-3 border-r border-slate-900 bg-slate-600 text-right cursor-pointer hover:bg-slate-500" onClick={() => handleSort("amount")}>Bank Amt <ArrowUpDown size={12} className="inline opacity-50" /></th>
                  <th className="p-3 border-r border-slate-700 bg-slate-500 cursor-pointer hover:bg-slate-400" onClick={() => handleSort("date")}>Tally Date <ArrowUpDown size={12} className="inline opacity-50" /></th>
                  <th className="p-3 border-r border-slate-700 bg-slate-500">Tally Particulars</th>
                  <th className="p-3 border-r border-slate-700 bg-slate-500">Tally Vch</th>
                  <th className="p-3 border-r border-slate-900 bg-slate-500 text-right cursor-pointer hover:bg-slate-400" onClick={() => handleSort("amount")}>Tally Amt <ArrowUpDown size={12} className="inline opacity-50" /></th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 150).map((r) => (
                  <tr key={r.id} className={`border-b ${r.color} hover:opacity-80`}>
                    <td className="p-3 border-r"><span className={`px-2 py-1 rounded text-xs font-bold ${r.statusBadge} block w-max`}>{r.reconStatus}</span></td>
                    {r.sysChq ? (
                      <>
                        <td className="p-3 border-r whitespace-nowrap align-top">{formatDisplayDate(r.sysChq.chqDate)}</td>
                        <td className="p-3 border-r font-bold align-top">{r.sysChq.customer}</td>
                        <td className="p-3 border-r font-mono text-xs align-top">{r.sysChq.chqNo}</td>
                        <td className="p-3 border-r font-mono font-bold text-right align-top">{formatCurrency(r.sysChq.amount)}</td>
                      </>
                    ) : (
                      <td colSpan="4" className="p-3 border-r text-center align-middle bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjZjNmNGY2IiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]" ><span className="bg-white px-2 py-1 text-gray-400 text-xs font-bold uppercase rounded opacity-60">No Sys Cheque</span></td>
                    )}
                    <td className="p-3 border-r align-top bg-white bg-opacity-40 whitespace-nowrap">{r.bMatch?.txnDate || "-"}</td>
                    <td className="p-3 border-r text-xs leading-tight align-top bg-white bg-opacity-40" title={r.bMatch?.desc}>{r.bMatch?.desc || "-"}</td>
                    <td className="p-3 border-r font-mono text-xs align-top bg-white bg-opacity-40">{r.bMatch?.chqNo || "-"}</td>
                    <td className={`p-3 border-r font-mono font-bold text-blue-800 text-right align-top bg-white bg-opacity-40 ${r.sysChq && r.bMatch && Number(r.sysChq.amount) !== Number(r.bMatch.amount) ? "text-red-600" : ""}`}>{r.bMatch ? formatCurrency(r.bMatch.amount) : "-"}</td>
                    <td className="p-3 border-r align-top bg-white bg-opacity-20 whitespace-nowrap">{r.tMatch?.date || "-"}</td>
                    <td className="p-3 border-r font-bold text-xs align-top bg-white bg-opacity-20" title={r.tMatch?.particulars}>{r.tMatch?.particulars || "-"}</td>
                    <td className="p-3 border-r font-mono text-xs align-top bg-white bg-opacity-20">{r.tMatch?.vchNo || "-"}</td>
                    <td className={`p-3 border-r font-mono font-bold text-purple-800 text-right align-top bg-white bg-opacity-20 ${r.sysChq && r.tMatch && Number(r.sysChq.amount) !== Number(r.tMatch.amount) ? "text-red-600" : ""}`}>{r.tMatch ? formatCurrency(r.tMatch.amount) : "-"}</td>
                    <td className="p-3 text-center align-middle">
                      {r.reconStatus.includes("Unmapped") || r.reconStatus === "System Only" ? (
                        <button onClick={() => setMapModal({ row: r, action: "CREATE" })} className="text-blue-600 font-bold text-xs hover:underline flex items-center mx-auto"><Link size={14} className="mr-1" /> Map</button>
                      ) : (
                        <button onClick={() => setMapModal({ row: r, action: "BREAK" })} className="text-orange-600 font-bold text-xs hover:underline flex items-center mx-auto"><Edit size={14} className="mr-1" /> Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRows.length > 150 && <tr><td colSpan="14" className="p-4 text-center text-gray-500 font-bold bg-gray-50">... {filteredRows.length - 150} more rows. Export to see all.</td></tr>}
                {filteredRows.length === 0 && <tr><td colSpan="14" className="p-4 text-center text-gray-500">No records match this filter/search.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {mapModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-xl w-[600px]">
              <h3 className="text-xl font-bold mb-4">{mapModal.action === "CREATE" ? "Manually Link Records" : "Edit / Break Match"}</h3>
              <div className="bg-gray-100 p-4 rounded mb-4 text-sm border">
                <p className="font-bold mb-2 border-b pb-1">Selected Record:</p>
                {mapModal.row.sysChq && <p><strong>Sys:</strong> {mapModal.row.sysChq.customer} | {formatCurrency(mapModal.row.sysChq.amount)}</p>}
                {mapModal.row.bMatch && <p><strong>Bank:</strong> {mapModal.row.bMatch.desc} | {formatCurrency(mapModal.row.bMatch.amount)}</p>}
                {mapModal.row.tMatch && <p><strong>Tally:</strong> {mapModal.row.tMatch.particulars} | {formatCurrency(mapModal.row.tMatch.amount)}</p>}
              </div>

              <form onSubmit={handleSaveMapping}>
                {mapModal.action === "CREATE" && (
                  <div className="space-y-4 mb-4">
                    {!mapModal.row.sysChq && (
                      <div>
                        <label className="font-bold text-sm block mb-1">Link to System Cheque</label>
                        <select name="sysId" className="w-full border p-2 rounded text-sm">
                          <option value="">-- None --</option>
                          {cheques.filter((c) => !c.deleted && !matchedSysIds.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.customer} | {formatCurrency(c.amount)}</option>)}
                        </select>
                      </div>
                    )}
                    {!mapModal.row.bMatch && (
                      <div>
                        <label className="font-bold text-sm block mb-1 text-blue-800">Link to Bank Statement</label>
                        <select name="bankId" className="w-full border p-2 rounded text-sm bg-blue-50">
                          <option value="">-- None --</option>
                          {bankData.filter((b) => !matchedBankIds.has(b.id)).map((b) => <option key={b.id} value={b.id}>{b.txnDate} | {b.desc} | {formatCurrency(b.amount)}</option>)}
                        </select>
                      </div>
                    )}
                    {!mapModal.row.tMatch && (
                      <div>
                        <label className="font-bold text-sm block mb-1 text-purple-800">Link to Tally Voucher</label>
                        <select name="tallyId" className="w-full border p-2 rounded text-sm bg-purple-50">
                          <option value="">-- None --</option>
                          {tallyData.filter((t) => !matchedTallyIds.has(t.id)).map((t) => <option key={t.id} value={t.id}>{t.date} | {t.particulars} | {formatCurrency(t.amount)}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
                {mapModal.action === "BREAK" && <p className="text-sm text-orange-600 mb-4 font-bold">This will break the current match and return the items to the Unmapped list.</p>}
                <label className="block font-bold text-sm text-red-600 mb-1">Reason (Mandatory for Audit Trail)</label>
                <input name="reason" type="text" required placeholder="Why are you changing this?" className="w-full border p-2 rounded border-red-300 mb-4" />
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setMapModal(null)} className="px-4 py-2 border rounded font-bold">Cancel</button>
                  <button type="submit" className={`px-4 py-2 text-white rounded font-bold ${mapModal.action === "CREATE" ? "bg-green-600" : "bg-red-600"}`}>{mapModal.action === "CREATE" ? "Save Mapping" : "Break Match"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // MODULE: CHEQUE REGISTER
  // ==========================================
  const ChequeRegister = () => {
    const [editData, setEditData] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
    const [bulkEntries, setBulkEntries] = useState([]);
    const [selectedCheques, setSelectedCheques] = useState(new Set());
    
    // NEW: Sorting Configuration
    const [sortConfig, setSortConfig] = useState({ key: "enteredAt", direction: "desc" });

    let filteredCheques = cheques.filter((c) => !c.deleted);
    if (statusFilter !== "All") filteredCheques = filteredCheques.filter((c) => c.status === statusFilter);
    if (searchTerm) {
      const q = String(searchTerm).toLowerCase();
      filteredCheques = filteredCheques.filter(
        (c) => String(c.customer || "").toLowerCase().includes(q) || String(c.chqNo || "").toLowerCase().includes(q) || String(c.bank || "").toLowerCase().includes(q)
      );
    }

    // Apply Sorting logic
    filteredCheques.sort((a, b) => {
      if (!sortConfig.key) return 0;
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === "chqDate" || sortConfig.key === "enteredAt") {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (sortConfig.key === "amount") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    const handleSort = (key) => {
      let direction = "asc";
      if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
      setSortConfig({ key, direction });
    };

    const toggleSelect = (id) => {
      const newSel = new Set(selectedCheques);
      if (newSel.has(id)) newSel.delete(id);
      else newSel.add(id);
      setSelectedCheques(newSel);
    };

    const toggleAll = () => {
      if (selectedCheques.size === filteredCheques.length) setSelectedCheques(new Set());
      else setSelectedCheques(new Set(filteredCheques.map((c) => c.id)));
    };

    const handleAdminBulkDelete = () => {
      if (selectedCheques.size === 0) return alert("Select cheques to delete first.");
      if (!window.confirm(`Are you sure you want to bulk delete ${selectedCheques.size} cheques?`)) return;
      const updatedCheques = cheques.map((c) => selectedCheques.has(c.id) ? { ...c, deleted: true } : c);
      updateCheques(updatedCheques);
      logAction("Bulk Delete", "Cheques", `Admin bulk deleted ${selectedCheques.size} cheques.`);
      setSelectedCheques(new Set());
    };

    const handleBulkSubmit = () => {
      const validEntries = bulkEntries.filter((e) => e.customer && e.chqNo && e.amount);
      if (validEntries.length === 0) return alert("Fill out at least one row.");
      let hasDuplicate = false;
      validEntries.forEach((entry) => {
        if (cheques.some((c) => String(c.chqNo) === String(entry.chqNo) && String(c.bank).toLowerCase() === String(entry.bank).toLowerCase() && !c.deleted)) {
          alert(`Warning: Cheque ${entry.chqNo} already exists!`);
          hasDuplicate = true;
        }
      });
      if (hasDuplicate) return;
      const newCheques = validEntries.map((e) => {
        checkAndAddCustomer(e.customer);
        return {
          id: Date.now() + Math.random(),
          chqDate: e.chqDate,
          enteredAt: e.entryDate,
          customer: e.customer.trim(),
          chqNo: e.chqNo,
          bank: e.bank.toUpperCase(),
          amount: parseFloat(e.amount) || 0,
          status: e.status,
          teamRemarks: e.remarks,
          adminRemarks: "",
          enteredBy: currentUser.username,
          deleted: false,
        };
      });
      updateCheques([...newCheques, ...cheques]);
      logAction("Add", "Cheque", `Bulk added ${newCheques.length} cheques.`);
      setIsBulkAddOpen(false);
    };

    return (
      <div className="p-6">
        <datalist id="customer-list">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold mr-4">Cheque Register</h2>
            {isAdmin && selectedCheques.size > 0 && (
              <button onClick={handleAdminBulkDelete} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700 flex items-center shadow">
                <Trash2 size={14} className="mr-1" /> Delete Selected ({selectedCheques.size})
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <input type="text" placeholder="Search..." className="border p-2 rounded text-sm w-48" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select className="border p-2 rounded text-sm bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Cleared">Cleared</option>
              <option value="Bounced">Bounced</option>
            </select>
            <button onClick={() => exportToExcel(filteredCheques, "BTC_Cheques")} className="bg-green-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center hover:bg-green-700"><Download size={16} className="mr-2" /> Export</button>
            <button
              className="bg-blue-600 text-white px-3 py-2 rounded flex items-center text-sm font-bold shadow hover:bg-blue-700"
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                setBulkEntries([{ id: 1, chqDate: today, entryDate: today, customer: "", chqNo: "", bank: "", amount: "", status: "Pending", remarks: "" }]);
                setIsBulkAddOpen(true);
              }}
            >
              <Plus size={16} className="mr-1" /> Add Cheque
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded overflow-hidden border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                {isAdmin && <th className="p-3 w-10 text-center"><input type="checkbox" onChange={toggleAll} checked={filteredCheques.length > 0 && selectedCheques.size === filteredCheques.length} /></th>}
                <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("chqDate")}>
                  Chq Date <ArrowUpDown size={12} className="inline ml-1 opacity-50" />
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("enteredAt")}>
                  Entry Date <ArrowUpDown size={12} className="inline ml-1 opacity-50" />
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("customer")}>
                  Customer <ArrowUpDown size={12} className="inline ml-1 opacity-50" />
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("chqNo")}>
                  Chq No <ArrowUpDown size={12} className="inline ml-1 opacity-50" />
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("bank")}>
                  Bank <ArrowUpDown size={12} className="inline ml-1 opacity-50" />
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort("amount")}>
                  Amount <ArrowUpDown size={12} className="inline ml-1 opacity-50" />
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("status")}>
                  Status <ArrowUpDown size={12} className="inline ml-1 opacity-50" />
                </th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheques.map((c) => (
                <tr key={c.id} className={`border-b hover:bg-blue-50 ${selectedCheques.has(c.id) ? "bg-blue-50" : ""}`}>
                  {isAdmin && <td className="p-3 text-center"><input type="checkbox" checked={selectedCheques.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>}
                  {/* Applied Display Formatter to Dates */}
                  <td className="p-3 font-medium">{formatDisplayDate(c.chqDate)}</td>
                  <td className="p-3 text-gray-500 text-xs">{formatDisplayDate(c.enteredAt)}</td>
                  <td className="p-3 font-bold">{c.customer}</td>
                  <td className="p-3 font-mono">{c.chqNo}</td>
                  <td className="p-3">{c.bank}</td>
                  <td className="p-3 text-right font-mono font-bold">{formatCurrency(c.amount)}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${c.status === "Cleared" ? "bg-green-100 text-green-800" : c.status === "Bounced" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{c.status}</span></td>
                  <td className="p-3 text-center"><button className="text-blue-600 hover:text-blue-800" onClick={() => setEditData(c)}><Edit size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isBulkAddOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-xl w-11/12 max-w-6xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center">Fast Entry</h3>
                <X className="cursor-pointer" onClick={() => setIsBulkAddOpen(false)} />
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm mb-4">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-2 w-36">Chq Date</th>
                      <th className="p-2 w-36">Entry Date</th>
                      <th className="p-2 w-48">Customer Name*</th>
                      <th className="p-2 w-28">Chq No*</th>
                      <th className="p-2 w-24">Bank</th>
                      <th className="p-2 w-32">Amount*</th>
                      <th className="p-2 w-28">Status</th>
                      <th className="p-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkEntries.map((entry, index) => (
                      <tr key={entry.id} className="border-b">
                        <td className="p-1"><input type="date" className="w-full border p-1 rounded" value={entry.chqDate} onChange={(e) => { const n = [...bulkEntries]; n[index].chqDate = e.target.value; setBulkEntries(n); }} /></td>
                        <td className="p-1"><input type="date" className="w-full border p-1 rounded" value={entry.entryDate} onChange={(e) => { const n = [...bulkEntries]; n[index].entryDate = e.target.value; setBulkEntries(n); }} /></td>
                        <td className="p-1"><input list="customer-list" placeholder="Customer" className="w-full border p-1 rounded" value={entry.customer} onChange={(e) => { const n = [...bulkEntries]; n[index].customer = e.target.value; setBulkEntries(n); }} /></td>
                        <td className="p-1"><input type="text" placeholder="Chq No" className="w-full border p-1 rounded font-mono" value={entry.chqNo} onChange={(e) => { const n = [...bulkEntries]; n[index].chqNo = e.target.value; setBulkEntries(n); }} /></td>
                        <td className="p-1"><input type="text" placeholder="Bank" className="w-full border p-1 rounded uppercase" value={entry.bank} onChange={(e) => { const n = [...bulkEntries]; n[index].bank = e.target.value; setBulkEntries(n); }} /></td>
                        <td className="p-1"><input type="number" placeholder="Amount" className="w-full border p-1 rounded font-mono" value={entry.amount} onChange={(e) => { const n = [...bulkEntries]; n[index].amount = e.target.value; setBulkEntries(n); }} /></td>
                        <td className="p-1">
                          <select className="w-full border p-1 rounded" value={entry.status} onChange={(e) => { const n = [...bulkEntries]; n[index].status = e.target.value; setBulkEntries(n); }}>
                            <option>Pending</option>
                            <option>Cleared</option>
                          </select>
                        </td>
                        <td className="p-1"><input type="text" placeholder="Notes" className="w-full border p-1 rounded" value={entry.remarks} onChange={(e) => { const n = [...bulkEntries]; n[index].remarks = e.target.value; setBulkEntries(n); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => setBulkEntries([...bulkEntries, { id: Date.now(), chqDate: new Date().toISOString().split("T")[0], entryDate: new Date().toISOString().split("T")[0], customer: "", chqNo: "", bank: "", amount: "", status: "Pending", remarks: "" }])} className="text-sm font-bold text-blue-600 flex items-center"><Plus size={16} /> Add Row</button>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button onClick={() => setIsBulkAddOpen(false)} className="px-6 py-2 border rounded font-bold">Cancel</button>
                <button onClick={handleBulkSubmit} className="px-6 py-2 bg-green-600 text-white rounded font-bold">Save All</button>
              </div>
            </div>
          </div>
        )}

        {/* FULL EDIT MODAL (Mandatory Reason) */}
        {editData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-[600px]">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold">Edit Cheque</h3>
                <X className="cursor-pointer hover:text-red-600" onClick={() => setEditData(null)} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target;
                  const reason = form.editReason.value.trim();

                  if (!reason) return alert("A mandatory reason is required to edit this record.");

                  const newChqDate = form.chqDate.value;
                  const newCustomer = form.customer.value.trim();
                  const newChqNo = form.chqNo.value.trim();
                  const newBank = form.bank.value.toUpperCase().trim();
                  const newAmount = parseFloat(form.amount.value) || 0;
                  const newStatus = form.status.value;

                  checkAndAddCustomer(newCustomer);

                  updateCheques(
                    cheques.map((c) =>
                      c.id === editData.id
                        ? { ...c, chqDate: newChqDate, customer: newCustomer, chqNo: newChqNo, bank: newBank, amount: newAmount, status: newStatus }
                        : c
                    )
                  );

                  logAction("Edit", "Cheque", `Edited Chq ${editData.chqNo} (${editData.customer}). Reason: ${reason}`);
                  setEditData(null);
                }}
                className="text-sm"
              >
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block font-bold mb-1">Chq Date</label>
                    <input name="chqDate" type="date" required defaultValue={editData.chqDate || ""} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Customer</label>
                    <input list="customer-list" name="customer" required defaultValue={editData.customer || ""} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Chq No</label>
                    <input name="chqNo" type="text" required defaultValue={editData.chqNo || ""} className="w-full border p-2 rounded font-mono" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Bank</label>
                    <input name="bank" type="text" required defaultValue={editData.bank || ""} className="w-full border p-2 rounded uppercase" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Amount (₹)</label>
                    <input name="amount" type="number" required defaultValue={editData.amount || ""} className="w-full border p-2 rounded font-mono" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Status</label>
                    <select name="status" defaultValue={editData.status || "Pending"} className="w-full border p-2 rounded">
                      <option>Pending</option>
                      <option>Cleared</option>
                      <option>Bounced</option>
                    </select>
                  </div>
                </div>

                <div className="bg-orange-50 p-3 rounded mb-4 border border-orange-100">
                  <label className="block font-bold text-orange-800 mb-1">Reason for Edit (Mandatory)</label>
                  <input name="editReason" type="text" required placeholder="Why are you editing this cheque?" className="w-full border p-2 rounded border-orange-300" />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <button type="button" onClick={() => setEditData(null)} className="px-4 py-2 border rounded font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow">Update Cheque</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // MODULES: MASTER CUSTOMERS & USERS
  // ==========================================
  const MasterCustomers = () => {
    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: "binary" });
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          let addedCount = 0;
          const newCustomers = [...customers];
          data.forEach((row) => {
            const name = row["Customer Name"] || row["Name"] || row["Customer"] || Object.values(row)[0];
            if (name && typeof name === "string") {
              const trimmedName = name.trim();
              if (trimmedName && !newCustomers.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
                newCustomers.push({ id: Date.now() + Math.random(), name: trimmedName });
                addedCount++;
              }
            }
          });
          updateCustomers(newCustomers);
          logAction("Import", "Customer Master", `Imported ${addedCount} new customers`);
          alert(`Imported ${addedCount} customers.`);
        } catch (err) {
          alert("Error parsing Excel file.");
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = null;
    };

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center"><Users className="mr-2" /> Master Customers</h2>
          <div className="flex space-x-3">
            <button onClick={() => exportToExcel(customers, "BTC_Customers")} className="bg-green-600 text-white px-4 py-2 rounded flex items-center text-sm font-bold shadow hover:bg-green-700"><Download size={16} className="mr-2" /> Export Excel</button>
            <label className="bg-blue-600 text-white px-4 py-2 rounded flex items-center text-sm font-bold cursor-pointer hover:bg-blue-700 shadow">
              <FileUp size={16} className="mr-2" /> Import Excel
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
        <div className="bg-white shadow border rounded overflow-hidden w-2/3">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3">Customer Name</th>
                {isAdmin && <th className="p-3 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-bold text-gray-700">{c.name}</td>
                  {isAdmin && (
                    <td className="p-3 text-center">
                      <button onClick={() => { if (window.confirm("Delete customer?")) { updateCustomers(customers.filter((cust) => cust.id !== c.id)); logAction("Delete", "Customer", `Deleted ${c.name}`); } }} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const UserManagement = () => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);

    const handleUserSubmit = (e) => {
      e.preventDefault();
      const form = e.target;
      const un = form.username.value.toLowerCase().trim();

      if (editUser) {
        if (editUser.id === 1 && !form.active.checked) return alert("Master Admin cannot be deactivated.");
        if (editUser.id === 1 && form.role.value !== "Admin") return alert("Master Admin role cannot be changed.");

        const updated = usersList.map((u) => u.id === editUser.id ? { ...u, name: form.name.value, role: form.role.value, password: form.password.value, active: form.active.checked } : u);
        updateUsersList(updated);
        logAction("Edit User", "Security", `Updated profile for ${un}`);
      } else {
        if (usersList.some((u) => u.username === un)) return alert("Username already exists!");
        const newUsers = [...usersList, { id: Date.now(), username: un, name: form.name.value, role: form.role.value, password: form.password.value, active: form.active.checked }];
        updateUsersList(newUsers);
        logAction("Add User", "Security", `Created new user ${un}`);
      }
      setIsUserModalOpen(false);
      setEditUser(null);
    };

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center"><Shield className="mr-2" /> User Management</h2>
          <button onClick={() => { setEditUser(null); setIsUserModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center text-sm font-bold shadow hover:bg-blue-700"><UserPlus size={16} className="mr-2" /> New User</button>
        </div>
        <div className="bg-white shadow rounded overflow-hidden border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3">Username</th>
                <th className="p-3">Full Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold">{u.username}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === "Admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>{u.role}</span></td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${u.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{u.active ? "Active" : "Inactive"}</span></td>
                  <td className="p-3 text-center"><button className="text-blue-600 hover:text-blue-800" onClick={() => { setEditUser(u); setIsUserModalOpen(true); }}><Edit size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isUserModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-[400px]">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center"><Key className="mr-2" /> {editUser ? "Edit User" : "New User"}</h3>
                <X className="cursor-pointer hover:text-red-600" onClick={() => { setIsUserModalOpen(false); setEditUser(null); }} />
              </div>
              <form onSubmit={handleUserSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block font-bold mb-1">Username (Login ID)</label>
                  <input name="username" type="text" required disabled={!!editUser} defaultValue={editUser?.username} className="w-full border p-2 rounded bg-gray-50" />
                </div>
                <div><label className="block font-bold mb-1">Full Name</label><input name="name" type="text" required defaultValue={editUser?.name} className="w-full border p-2 rounded" /></div>
                <div><label className="block font-bold mb-1">Password</label><input name="password" type="text" required defaultValue={editUser?.password} className="w-full border p-2 rounded" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1">Role</label>
                    <select name="role" defaultValue={editUser?.role || "Team"} className="w-full border p-2 rounded"><option>Team</option><option>Admin</option></select>
                  </div>
                  <div className="flex items-center mt-6">
                    <input name="active" type="checkbox" defaultChecked={editUser ? editUser.active : true} className="mr-2 w-4 h-4" /> <label className="font-bold">Active</label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <button type="button" onClick={() => { setIsUserModalOpen(false); setEditUser(null); }} className="px-4 py-2 border rounded font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Save User</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- RENDER SHELL ---
  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <div className="w-64 bg-slate-900 text-white flex flex-col z-10 shrink-0 shadow-xl">
        <div className="p-6 bg-slate-950 text-center border-b border-slate-800">
          <h1 className="font-bold text-lg text-blue-400 leading-tight">Barnala Trading Company</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Cheque App</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          <button onClick={() => setCurrentScreen("Dashboard")} className={`w-full text-left px-6 py-3 text-sm font-medium ${currentScreen === "Dashboard" ? "bg-blue-600 border-l-4 border-blue-400" : "hover:bg-slate-800"}`}><LayoutDashboard size={18} className="inline mr-3" /> Dashboard</button>
          <button onClick={() => setCurrentScreen("Cheque Register")} className={`w-full text-left px-6 py-3 text-sm font-medium ${currentScreen === "Cheque Register" ? "bg-blue-600 border-l-4 border-blue-400" : "hover:bg-slate-800"}`}><List size={18} className="inline mr-3" /> Cheque Register</button>
          <div className="px-6 mt-4 mb-2 text-xs font-bold text-slate-500 uppercase">Reconciliation Engine</div>
          <button onClick={() => setCurrentScreen("Upload Statements")} className={`w-full text-left px-6 py-3 text-sm font-medium ${currentScreen === "Upload Statements" ? "bg-blue-600 border-l-4 border-blue-400" : "hover:bg-slate-800"}`}><UploadCloud size={18} className="inline mr-3" /> Upload Bank/Tally</button>
          <button onClick={() => setCurrentScreen("Reconciliation")} className={`w-full text-left px-6 py-3 text-sm font-medium ${currentScreen === "Reconciliation" ? "bg-blue-600 border-l-4 border-blue-400" : "hover:bg-slate-800"}`}><CheckCircle size={18} className="inline mr-3" /> Auto-Match Status</button>
          <div className="px-6 mt-4 mb-2 text-xs font-bold text-slate-500 uppercase">System</div>
          <button onClick={() => setCurrentScreen("Master Customers")} className={`w-full text-left px-6 py-3 text-sm font-medium ${currentScreen === "Master Customers" ? "bg-blue-600 border-l-4 border-blue-400" : "hover:bg-slate-800"}`}><Users size={18} className="inline mr-3" /> Master Customers</button>
          {isAdmin && <button onClick={() => setCurrentScreen("User Management")} className={`w-full text-left px-6 py-3 text-sm font-medium ${currentScreen === "User Management" ? "bg-blue-600 border-l-4 border-blue-400" : "hover:bg-slate-800"}`}><Shield size={18} className="inline mr-3" /> User Management</button>}
          <button onClick={() => setCurrentScreen("Audit Trail")} className={`w-full text-left px-6 py-3 text-sm font-medium ${currentScreen === "Audit Trail" ? "bg-blue-600 border-l-4 border-blue-400" : "hover:bg-slate-800"}`}><FileText size={18} className="inline mr-3" /> Audit Trail</button>
        </nav>
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <div><p className="text-sm font-bold">{currentUser.name}</p><p className="text-xs text-slate-400">{currentUser.role} Role</p></div>
          <button onClick={() => setCurrentUser(null)} className="text-red-400 hover:text-red-300"><LogOut size={18} /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {currentScreen === "Dashboard" && <Dashboard />}
          {currentScreen === "Cheque Register" && <ChequeRegister />}
          {currentScreen === "Upload Statements" && <UploadStatements />}
          {currentScreen === "Reconciliation" && <Reconciliation />}
          {currentScreen === "Master Customers" && <MasterCustomers />}
          {currentScreen === "User Management" && <UserManagement />}

          {currentScreen === "Audit Trail" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center"><FileText className="mr-2" /> Audit Trail</h2>
                <button onClick={() => exportToExcel(auditTrail, "BTC_Audit_Trail")} className="bg-green-600 text-white px-4 py-2 rounded flex items-center text-sm font-bold shadow hover:bg-green-700"><Download size={16} className="mr-2" /> Export Excel</button>
              </div>
              <div className="bg-white shadow border rounded">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr><th className="p-3">Time</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Details</th></tr>
                  </thead>
                  <tbody>
                    {(auditTrail || []).map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{log.time}</td>
                        <td className="p-3 font-bold">{log.user}</td>
                        <td className="p-3 text-blue-600 font-medium">{log.action}</td>
                        <td className="p-3 text-gray-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}