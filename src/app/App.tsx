import { useState } from "react";
import {
  BarChart2,
  FileText,
  Database,
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  TestTube,
  Microscope,
  Activity,
  Bell,
  User,
  LogOut,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type NavSection = "explorer" | "analytics" | "reports";

const ANALYST = { name: "Marcus Delacroix", id: "DA-1093", role: "Principal Data Analyst" };

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Tree Data ────────────────────────────────────────────────────────────────

type TreeNode = {
  id: string;
  label: string;
  type: "study" | "experiment" | "sample-group" | "result-group" | "report-group" | "sample" | "result" | "report";
  meta?: string;
  status?: "active" | "complete" | "flagged" | "archived";
  children?: TreeNode[];
};

const TREE_DATA: TreeNode[] = [
  {
    id: "study-alg4521",
    label: "ALG-4521 / Phase II",
    type: "study",
    status: "active",
    children: [
      {
        id: "exp-alg4521-01",
        label: "EXP-2024-0041 — Dose-Response (Cat Dander)",
        type: "experiment",
        meta: "Started 2024-03-12",
        status: "complete",
        children: [
          {
            id: "sg-alg4521-01",
            label: "Samples (n=40)",
            type: "sample-group",
            children: [
              { id: "smp-001", label: "SMP-20240312-001 · Serum · PT-9912", type: "sample", status: "complete" },
              { id: "smp-002", label: "SMP-20240312-002 · Plasma · PT-8831", type: "sample", status: "complete" },
              { id: "smp-003", label: "SMP-20240312-003 · Whole Blood · PT-7720", type: "sample", status: "flagged" },
            ],
          },
          {
            id: "rg-alg4521-01",
            label: "Results (ELISA / IgE)",
            type: "result-group",
            children: [
              { id: "res-001", label: "RES-20240325-001 · IgE Reduction 48%", type: "result", status: "complete" },
              { id: "res-002", label: "RES-20240325-002 · Inconclusive", type: "result", status: "flagged" },
            ],
          },
          {
            id: "rpg-alg4521-01",
            label: "Reports",
            type: "report-group",
            children: [
              { id: "rpt-001", label: "RPT-Q1-2024 · Interim Analysis", type: "report", status: "complete" },
            ],
          },
        ],
      },
      {
        id: "exp-alg4521-02",
        label: "EXP-2024-0058 — 12-Week Follow-up (Birch Pollen)",
        type: "experiment",
        meta: "Started 2024-05-01",
        status: "active",
        children: [
          {
            id: "sg-alg4521-02",
            label: "Samples (n=28)",
            type: "sample-group",
            children: [
              { id: "smp-010", label: "SMP-20240501-010 · Nasal Lavage · PT-4401", type: "sample", status: "complete" },
              { id: "smp-011", label: "SMP-20240501-011 · Serum · PT-3312", type: "sample", status: "active" },
            ],
          },
          { id: "rg-alg4521-02", label: "Results (Luminex Multiplex)", type: "result-group", children: [] },
          { id: "rpg-alg4521-02", label: "Reports", type: "report-group", children: [] },
        ],
      },
    ],
  },
  {
    id: "study-alg4522",
    label: "ALG-4522 / Pre-clinical",
    type: "study",
    status: "active",
    children: [
      {
        id: "exp-alg4522-01",
        label: "EXP-2024-0019 — PBMC Stimulation (Dust Mite)",
        type: "experiment",
        meta: "Started 2024-01-08",
        status: "complete",
        children: [
          {
            id: "sg-alg4522-01",
            label: "Samples (n=60)",
            type: "sample-group",
            children: [
              { id: "smp-020", label: "SMP-20240108-020 · PBMC · PT-5501", type: "sample", status: "complete" },
            ],
          },
          {
            id: "rg-alg4522-01",
            label: "Results (Flow Cytometry)",
            type: "result-group",
            children: [
              { id: "res-020", label: "RES-20240220-020 · Basophil Act. -67%", type: "result", status: "complete" },
            ],
          },
          { id: "rpg-alg4522-01", label: "Reports", type: "report-group", children: [
            { id: "rpt-010", label: "RPT-PreClin-2024 · Safety Assessment", type: "report", status: "complete" },
          ]},
        ],
      },
    ],
  },
  {
    id: "study-ctrl",
    label: "CTRL Archive / Historical",
    type: "study",
    status: "archived",
    children: [
      {
        id: "exp-ctrl-01",
        label: "EXP-2023-0005 — Baseline IgE Survey",
        type: "experiment",
        meta: "Completed 2023-11-30",
        status: "archived",
        children: [
          { id: "sg-ctrl-01", label: "Samples (n=120)", type: "sample-group", children: [] },
          { id: "rg-ctrl-01", label: "Results (ELISA)", type: "result-group", children: [] },
          { id: "rpg-ctrl-01", label: "Reports", type: "report-group", children: [
            { id: "rpt-ctrl-01", label: "RPT-2023-Annual · Baseline Reference", type: "report", status: "archived" },
          ]},
        ],
      },
    ],
  },
];

// ─── Chart data ───────────────────────────────────────────────────────────────

const IgE_TREND = [
  { week: "W0", control: 142, alg4521: 140 },
  { week: "W2", control: 139, alg4521: 118 },
  { week: "W4", control: 141, alg4521: 96 },
  { week: "W6", control: 144, alg4521: 82 },
  { week: "W8", control: 140, alg4521: 74 },
  { week: "W10", control: 143, alg4521: 68 },
  { week: "W12", control: 141, alg4521: 63 },
];

const INHIBITION_DATA = [
  { compound: "ALG-4521", dose10: 48, dose50: 74 },
  { compound: "ALG-4522", dose10: 39, dose50: 68 },
  { compound: "ALG-5001", dose10: 28, dose50: 53 },
];

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function nodeIcon(type: TreeNode["type"], open?: boolean) {
  if (type === "study") return open ? <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  if (type === "experiment") return open ? <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" /> : <Folder className="w-3.5 h-3.5 text-primary shrink-0" />;
  if (type === "sample-group") return open ? <FolderOpen className="w-3.5 h-3.5 text-accent shrink-0" /> : <Folder className="w-3.5 h-3.5 text-accent shrink-0" />;
  if (type === "result-group") return open ? <FolderOpen className="w-3.5 h-3.5 text-violet-400 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-violet-400 shrink-0" />;
  if (type === "report-group") return open ? <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  if (type === "sample") return <TestTube className="w-3 h-3 text-accent shrink-0" />;
  if (type === "result") return <Microscope className="w-3 h-3 text-violet-400 shrink-0" />;
  return <FileText className="w-3 h-3 text-muted-foreground shrink-0" />;
}

function statusDot(status?: TreeNode["status"]) {
  if (!status) return null;
  const map: Record<string, string> = { active: "bg-emerald-400", complete: "bg-primary", flagged: "bg-amber-400", archived: "bg-muted-foreground" };
  return <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 ml-auto", map[status])} />;
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNodeRow({ node, depth, selected, onSelect }: { node: TreeNode; depth: number; selected: string | null; onSelect: (id: string) => void }) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const [open, setOpen] = useState(depth < 1);
  const isSelected = selected === node.id;

  return (
    <div>
      <div
        onClick={() => { if (hasChildren) setOpen(o => !o); onSelect(node.id); }}
        className={cn("flex items-center gap-1.5 py-[5px] pr-2 rounded cursor-pointer select-none transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <span className="w-3 shrink-0">
          {hasChildren ? (open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />) : null}
        </span>
        {nodeIcon(node.type, open)}
        <span className={cn("text-xs truncate flex-1", hasChildren ? "font-medium" : "font-normal")}>{node.label}</span>
        {statusDot(node.status)}
      </div>
      {open && hasChildren && node.children!.map(child => (
        <TreeNodeRow key={child.id} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ─── Tree Panel ───────────────────────────────────────────────────────────────

function TreePanel({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const shown = search.trim()
    ? TREE_DATA.filter(n => JSON.stringify(n).toLowerCase().includes(search.toLowerCase()))
    : TREE_DATA;

  return (
    <div className="flex flex-col h-full border-r border-border bg-card" style={{ width: 272, minWidth: 220 }}>
      <div className="px-3 py-3 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Database Explorer</p>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-7 pr-7 py-1.5 text-xs bg-muted border border-border rounded focus:outline-none focus:border-primary transition-all"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground" /></button>}
        </div>
      </div>

      <div className="px-3 py-2 border-b border-border flex items-center gap-3">
        {[{ color: "bg-emerald-400", label: "Active" }, { color: "bg-primary", label: "Complete" }, { color: "bg-amber-400", label: "Flagged" }, { color: "bg-muted-foreground", label: "Archived" }].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", color)} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-1 px-1">
        {shown.map(node => <TreeNodeRow key={node.id} node={node} depth={0} selected={selected} onSelect={onSelect} />)}
      </div>
    </div>
  );
}

// ─── Explorer detail pane (minimal — no record detail, just a placeholder) ────

function ExplorerDetail({ id }: { id: string | null }) {
  if (!id) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
        <Database className="w-8 h-8 opacity-20" />
        <p className="text-sm">Select a record from the explorer to view details</p>
        <p className="text-xs opacity-60">Full record detail view coming in next iteration</p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
      <Database className="w-8 h-8 opacity-30" />
      <p className="text-sm font-mono">{id}</p>
      <p className="text-xs opacity-60">Detailed record view not yet implemented</p>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 4, border: "1px solid rgba(15,25,35,0.1)", boxShadow: "none" };

function Analytics() {
  const KPI = [
    { label: "Avg IgE Reduction (W12)", value: "55.3%", delta: "+8.1% vs baseline", trend: "up" },
    { label: "Flagged Samples", value: "3", delta: "0.7% of total", trend: "neutral" },
    { label: "Active Patients", value: "68", delta: "across 2 studies", trend: "neutral" },
    { label: "ALG-4521 Inhibition", value: "74%", delta: "at 50 μg/mL", trend: "up" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Cross-study immunological data · Updated 23 Jun 2026 07:00</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI.map(({ label, value, delta, trend }) => (
          <div key={label} className="bg-card border border-border rounded p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-light text-foreground mt-1">{value}</p>
            <div className="flex items-center gap-1 mt-1">
              {trend === "up" ? <TrendingUp className="w-3 h-3 text-primary" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
              <p className="text-[11px] text-muted-foreground font-mono">{delta}</p>
            </div>
          </div>
        ))}
      </div>

      {/* IgE trend — only one chart in this iteration */}
      <div className="bg-card border border-border rounded p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold">IgE Level — 12-Week Trend</p>
            <p className="text-xs text-muted-foreground mt-0.5">ALG-4521 vs. Control · EXP-2024-0041</p>
          </div>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted rounded border border-border text-muted-foreground hover:bg-secondary transition-colors">
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={IgE_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,25,35,0.06)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fontFamily: "DM Mono" }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono" }} domain={[50, 160]} unit=" IU" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="control" name="Control" stroke="#B0BEC5" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="alg4521" name="ALG-4521" stroke="#006D77" strokeWidth={2} dot={{ r: 3, fill: "#006D77" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inhibition — simplified, 2 dose levels only */}
      <div className="bg-card border border-border rounded p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold">Dose-Response Inhibition</p>
          <p className="text-xs text-muted-foreground mt-0.5">% inhibition at 10 and 50 μg/mL · all compounds</p>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={INHIBITION_DATA} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,25,35,0.06)" />
              <XAxis dataKey="compound" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono" }} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="rect" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="dose10" name="10 μg/mL" fill="#83C5BE" radius={[2, 2, 0, 0]} />
              <Bar dataKey="dose50" name="50 μg/mL" fill="#006D77" radius={[2, 2, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-muted border border-border rounded p-4 flex items-center gap-3">
        <BarChart2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">Cytokine correlation scatter and sample volume breakdown charts are planned for the next iteration.</p>
      </div>
    </div>
  );
}

// ─── Reports (simplified — no status filter) ──────────────────────────────────

const REPORTS = [
  { id: "RPT-Q1-2024", title: "Q1 2024 Interim Analysis — ALG-4521", study: "ALG-4521 Phase II", date: "2024-04-15", status: "Approved" },
  { id: "RPT-PreClin-A", title: "Pre-clinical Safety Assessment — ALG-4522", study: "ALG-4522 Pre-clinical", date: "2024-03-01", status: "Approved" },
  { id: "RPT-2023-Annual", title: "2023 Annual Baseline IgE Reference", study: "CTRL Archive", date: "2023-12-20", status: "Archived" },
  { id: "RPT-DRAFT-001", title: "ALG-5001 Discovery Phase — Screening Summary", study: "ALG-5001 Discovery", date: "2024-06-18", status: "Draft" },
];

function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{REPORTS.length} documents · filtering not yet available</p>
      </div>

      <div className="bg-card border border-border rounded divide-y divide-border">
        <div className="grid px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ gridTemplateColumns: "1fr 200px 100px 80px" }}>
          <span>Report</span><span>Study</span><span>Date</span><span>Status</span>
        </div>
        {REPORTS.map(r => (
          <div key={r.id} className="grid px-4 py-3 items-center hover:bg-muted/40 transition-colors group" style={{ gridTemplateColumns: "1fr 200px 100px 80px" }}>
            <div>
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{r.title}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{r.id}</p>
            </div>
            <span className="text-xs text-muted-foreground">{r.study}</span>
            <span className="text-xs font-mono text-muted-foreground">{r.date.slice(0, 7)}</span>
            <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded w-fit",
              r.status === "Approved" ? "bg-primary/10 text-primary" :
              r.status === "Draft" ? "bg-amber-50 text-amber-700" :
              "bg-muted text-muted-foreground"
            )}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "explorer", label: "DB Explorer", Icon: Database },
  { id: "analytics", label: "Analytics", Icon: BarChart2 },
  { id: "reports", label: "Reports", Icon: FileText },
];

function Sidebar({ active, onNav }: { active: NavSection; onNav: (s: NavSection) => void }) {
  return (
    <aside className="flex flex-col w-56 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-sidebar-primary flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold tracking-tight leading-none">AllerGen Labs</p>
            <p className="text-sidebar-foreground text-[10px] mt-0.5 font-mono tracking-widest uppercase opacity-60">Data Analytics</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => onNav(id as NavSection)}
            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors text-left",
              active === id ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
            {active === id && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-sidebar-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{ANALYST.name}</p>
            <p className="text-sidebar-foreground text-[10px] font-mono opacity-60">{ANALYST.id}</p>
          </div>
          <button className="ml-auto text-sidebar-foreground hover:text-white transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [section, setSection] = useState<NavSection>("explorer");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const TITLES: Record<NavSection, string> = {
    explorer: "Database Explorer",
    analytics: "Analytics",
    reports: "Reports",
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active={section} onNav={setSection} />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 shrink-0 bg-card border-b border-border flex items-center px-6 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>AllerGen Labs</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{TITLES[section]}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 rounded bg-muted">v0.1 · Read-only</span>
            <button className="relative p-2 rounded hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {section === "explorer" && (
            <>
              <TreePanel selected={selectedId} onSelect={setSelectedId} />
              <ExplorerDetail id={selectedId} />
            </>
          )}
          {section === "analytics" && <div className="flex-1 overflow-y-auto p-8"><Analytics /></div>}
          {section === "reports" && <div className="flex-1 overflow-y-auto p-8"><Reports /></div>}
        </div>
      </div>
    </div>
  );
}
