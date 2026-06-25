import { useState, Fragment } from "react";
import {
  FlaskConical, TestTube, Microscope, ClipboardList, ChevronRight,
  Plus, Save, X, CheckCircle, AlertCircle, User, LogOut, Bell,
  LayoutDashboard, Database, Clock, Search, Sliders, Trash2,
  FileText, ChevronDown,
} from "lucide-react";

// ─── Core types ───────────────────────────────────────────────────────────────

type Section = "dashboard" | "samples" | "experiments" | "results" | "compounds" | "query" | "vocabulary";
type Toast = { id: number; type: "success" | "error"; message: string };
type HistoryEntry = { ts: string; author: string; action: "created" | "edited"; changes: { field: string; from: string; to: string }[] };
type Measurement = { key: string; label: string; value: string; unit: string };
type StudyArm = { role: "Control" | "Treatment"; compound: string; dose: string; n: string };

type Vocab = {
  sampleTypes: string[]; allergens: string[]; compounds: string[];
  operators: string[]; protocols: string[]; mechanisms: string[]; phases: string[];
};

type SampleRecord = {
  id: string; patientId: string; collectionDate: string; collectionTime: string;
  sampleType: string; allergen: string; compound: string; volume: string;
  concentration: string; ph: string; storageTemp: string; operator: string; notes: string;
  history: HistoryEntry[];
};
type ExperimentRecord = {
  id: string; title: string; protocol: string; compound: string; concentration: string;
  allergen: string; startDate: string; endDate: string; temperature: string; humidity: string;
  studyArms: StudyArm[]; primaryEndpoint: string; hypothesis: string;
  operator: string; notes: string; history: HistoryEntry[];
};
type ResultRecord = {
  id: string; sampleId: string; experimentId: string; testDate: string; testMethod: string;
  operator: string; measurements: Measurement[]; outcome: string; confidence: string;
  notes: string; history: HistoryEntry[];
};
type CompoundRecord = {
  id: string; compoundId: string; name: string; cas: string; formula: string; mw: string;
  solubility: string; purity: string; lotNumber: string; manufacturer: string;
  expiryDate: string; storageConditions: string; mechanism: string; targetAllergen: string;
  phase: string; notes: string; history: HistoryEntry[];
};
type Report = {
  id: string; title: string; experimentId: string; operator: string; date: string;
  allergen: string; compound: string; outcome: string; phase: string; abstract: string;
};

// ─── Vocabulary defaults ──────────────────────────────────────────────────────

const DEFAULT_VOCAB: Vocab = {
  sampleTypes: ["Serum", "Plasma", "Whole Blood", "Nasal Lavage", "Bronchoalveolar Lavage", "Skin Biopsy"],
  allergens: ["House Dust Mite", "Cat Dander", "Dog Dander", "Pollen (Birch)", "Pollen (Grass)", "Pollen (Ragweed)", "Mold (Aspergillus)", "Mold (Alternaria)", "Cockroach", "Shrimp", "Peanut", "Tree Nut", "Egg", "Milk", "Wheat", "Latex"],
  compounds: ["ALG-4521", "ALG-4522", "ALG-4523", "ALG-5001", "ALG-5002", "CTRL-PLACEBO"],
  operators: ["Dr. Elena Vasquez", "Dr. James Okafor", "Dr. Sarah Chen", "T. Müller (Technician)", "R. Patel (Technician)"],
  protocols: ["IgE Immunoassay (ELISA)", "Basophil Activation Test", "Skin Prick Test Correlation", "Nasal Provocation", "Bronchial Challenge", "Double-Blind Placebo-Controlled", "ISAC Microarray", "Custom Protocol"],
  mechanisms: ["IgE Blocking", "Mast Cell Stabilizer", "Anti-Histamine", "IL-4/IL-13 Inhibitor", "JAK Inhibitor", "CRTH2 Antagonist", "Biologic (mAb)", "Small Molecule", "Other"],
  phases: ["Discovery", "Pre-clinical", "Phase I", "Phase II", "Phase III", "Approved", "Discontinued"],
};

// ─── Measurement catalogue ────────────────────────────────────────────────────

const MEASUREMENT_CATALOGUE = [
  { key: "igE", label: "IgE Level", unit: "IU/mL" },
  { key: "igG4", label: "IgG4 Level", unit: "mg/L" },
  { key: "histamine", label: "Histamine Release", unit: "%" },
  { key: "inhibition", label: "% Inhibition", unit: "%" },
  { key: "il4", label: "IL-4", unit: "pg/mL" },
  { key: "il13", label: "IL-13", unit: "pg/mL" },
  { key: "cellViability", label: "Cell Viability", unit: "%" },
  { key: "cd63", label: "CD63 (Basophil Activation)", unit: "%" },
  { key: "sptWheal", label: "SPT Wheal Diameter", unit: "mm" },
  { key: "eosinophils", label: "Eosinophil Count", unit: "cells/μL" },
  { key: "totalIgE", label: "Total IgE", unit: "kU/L" },
];

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_SAMPLES: SampleRecord[] = [
  { id: "SMP-20260623-041", patientId: "PT-9912", collectionDate: "2026-06-23", collectionTime: "09:42", sampleType: "Serum", allergen: "Cat Dander", compound: "ALG-4521", volume: "2.5", concentration: "8.42", ph: "7.38", storageTemp: "-80", operator: "Dr. Elena Vasquez", notes: "", history: [{ ts: "23 Jun 2026, 09:43", author: "Dr. Elena Vasquez", action: "created", changes: [] }] },
  { id: "SMP-20260623-040", patientId: "PT-8831", collectionDate: "2026-06-23", collectionTime: "09:15", sampleType: "Plasma", allergen: "Pollen (Birch)", compound: "ALG-4521", volume: "3.0", concentration: "6.18", ph: "7.41", storageTemp: "-80", operator: "Dr. Elena Vasquez", notes: "", history: [{ ts: "23 Jun 2026, 09:16", author: "Dr. Elena Vasquez", action: "created", changes: [] }] },
  { id: "SMP-20260623-039", patientId: "PT-7720", collectionDate: "2026-06-23", collectionTime: "08:58", sampleType: "Whole Blood", allergen: "Peanut", compound: "", volume: "5.0", concentration: "", ph: "7.35", storageTemp: "4", operator: "Dr. Elena Vasquez", notes: "Mild haemolysis observed — flagged for review.", history: [{ ts: "23 Jun 2026, 08:59", author: "Dr. Elena Vasquez", action: "created", changes: [] }, { ts: "23 Jun 2026, 10:12", author: "Dr. Elena Vasquez", action: "edited", changes: [{ field: "Storage Temp", from: "-80", to: "4" }, { field: "Notes", from: "", to: "Mild haemolysis observed — flagged for review." }] }] },
  { id: "SMP-20260622-035", patientId: "PT-4401", collectionDate: "2026-06-22", collectionTime: "14:10", sampleType: "Nasal Lavage", allergen: "House Dust Mite", compound: "ALG-4522", volume: "1.8", concentration: "4.30", ph: "7.40", storageTemp: "-80", operator: "Dr. James Okafor", notes: "", history: [{ ts: "22 Jun 2026, 14:11", author: "Dr. James Okafor", action: "created", changes: [] }] },
  { id: "SMP-20260622-034", patientId: "PT-3312", collectionDate: "2026-06-22", collectionTime: "11:30", sampleType: "Serum", allergen: "Pollen (Grass)", compound: "ALG-4522", volume: "2.2", concentration: "7.10", ph: "7.36", storageTemp: "-80", operator: "Dr. Sarah Chen", notes: "", history: [{ ts: "22 Jun 2026, 11:31", author: "Dr. Sarah Chen", action: "created", changes: [] }] },
  { id: "SMP-20260621-028", patientId: "PT-6614", collectionDate: "2026-06-21", collectionTime: "10:05", sampleType: "Plasma", allergen: "Cat Dander", compound: "ALG-4521", volume: "2.8", concentration: "9.01", ph: "7.42", storageTemp: "-80", operator: "Dr. Elena Vasquez", notes: "", history: [{ ts: "21 Jun 2026, 10:06", author: "Dr. Elena Vasquez", action: "created", changes: [] }] },
];

const DEMO_EXPERIMENTS: ExperimentRecord[] = [
  { id: "EXP-2026-0041", title: "ALG-4521 Dose-Response in Cat Dander", protocol: "IgE Immunoassay (ELISA)", compound: "ALG-4521", concentration: "10", allergen: "Cat Dander", startDate: "2026-03-12", endDate: "2026-06-12", temperature: "22.0", humidity: "45", studyArms: [{ role: "Control", compound: "CTRL-PLACEBO", dose: "", n: "20" }, { role: "Treatment", compound: "ALG-4521", dose: "10", n: "20" }], primaryEndpoint: "IgE reduction at 12 weeks", hypothesis: "ALG-4521 will reduce IgE levels by ≥40% vs. placebo at 12 weeks.", operator: "Dr. Elena Vasquez", notes: "", history: [{ ts: "12 Mar 2026, 08:00", author: "Dr. Elena Vasquez", action: "created", changes: [] }, { ts: "14 Mar 2026, 11:22", author: "Dr. Elena Vasquez", action: "edited", changes: [{ field: "Concentration", from: "5", to: "10" }, { field: "Primary Endpoint", from: "", to: "IgE reduction at 12 weeks" }] }] },
  { id: "EXP-2026-0038", title: "ALG-4522 PBMC Stimulation — Dust Mite", protocol: "Basophil Activation Test", compound: "ALG-4522", concentration: "5", allergen: "House Dust Mite", startDate: "2026-01-08", endDate: "2026-04-08", temperature: "21.5", humidity: "48", studyArms: [{ role: "Control", compound: "CTRL-PLACEBO", dose: "", n: "15" }, { role: "Treatment", compound: "ALG-4522", dose: "5", n: "15" }], primaryEndpoint: "Basophil activation reduction", hypothesis: "ALG-4522 will significantly suppress basophil CD63 expression.", operator: "Dr. James Okafor", notes: "Slight protocol deviation on day 14 — temperature drifted to 23.1°C for 2h.", history: [{ ts: "08 Jan 2026, 09:00", author: "Dr. James Okafor", action: "created", changes: [] }, { ts: "22 Jan 2026, 16:05", author: "Dr. James Okafor", action: "edited", changes: [{ field: "Notes", from: "", to: "Slight protocol deviation on day 14 — temperature drifted to 23.1°C for 2h." }] }] },
  { id: "EXP-2025-0019", title: "ALG-5001 Peanut Allergen Screening", protocol: "ISAC Microarray", compound: "ALG-5001", concentration: "2.5", allergen: "Peanut", startDate: "2025-11-03", endDate: "2026-02-03", temperature: "22.5", humidity: "44", studyArms: [{ role: "Control", compound: "CTRL-PLACEBO", dose: "", n: "12" }, { role: "Treatment", compound: "ALG-5001", dose: "2.5", n: "12" }], primaryEndpoint: "Specific IgE component reduction", hypothesis: "ALG-5001 will reduce Ara h 2 specific IgE by ≥30%.", operator: "Dr. Sarah Chen", notes: "", history: [{ ts: "03 Nov 2025, 10:30", author: "Dr. Sarah Chen", action: "created", changes: [] }] },
];

const DEMO_RESULTS: ResultRecord[] = [
  { id: "RES-20260623-041", sampleId: "SMP-20260623-041", experimentId: "EXP-2026-0041", testDate: "2026-06-23", testMethod: "ELISA (IgE)", operator: "Dr. Elena Vasquez", measurements: [{ key: "igE", label: "IgE Level", value: "74.3", unit: "IU/mL" }, { key: "histamine", label: "Histamine Release", value: "18.2", unit: "%" }, { key: "inhibition", label: "% Inhibition", value: "47.7", unit: "%" }, { key: "il4", label: "IL-4", value: "5.1", unit: "pg/mL" }, { key: "cellViability", label: "Cell Viability", value: "97.4", unit: "%" }], outcome: "Positive Response", confidence: "High (>95%)", notes: "Strong IgE suppression consistent with W12 projection.", history: [{ ts: "23 Jun 2026, 11:05", author: "Dr. Elena Vasquez", action: "created", changes: [] }] },
  { id: "RES-20260623-039", sampleId: "SMP-20260623-039", experimentId: "EXP-2026-0041", testDate: "2026-06-23", testMethod: "ELISA (IgE)", operator: "Dr. Elena Vasquez", measurements: [{ key: "igE", label: "IgE Level", value: "131.2", unit: "IU/mL" }, { key: "histamine", label: "Histamine Release", value: "38.9", unit: "%" }, { key: "inhibition", label: "% Inhibition", value: "7.6", unit: "%" }, { key: "cellViability", label: "Cell Viability", value: "91.0", unit: "%" }], outcome: "Inconclusive", confidence: "Low (<80%)", notes: "Haemolysis in source sample may have skewed IgE reading. Repeat recommended.", history: [{ ts: "23 Jun 2026, 11:18", author: "Dr. Elena Vasquez", action: "created", changes: [] }, { ts: "23 Jun 2026, 14:02", author: "Dr. Elena Vasquez", action: "edited", changes: [{ field: "Outcome", from: "Requires Repeat", to: "Inconclusive" }, { field: "Confidence", from: "Moderate (80–95%)", to: "Low (<80%)" }] }] },
  { id: "RES-20260622-035", sampleId: "SMP-20260622-035", experimentId: "EXP-2026-0038", testDate: "2026-06-22", testMethod: "FACS / Flow Cytometry", operator: "Dr. James Okafor", measurements: [{ key: "cd63", label: "CD63 (Basophil Activation)", value: "12.4", unit: "%" }, { key: "inhibition", label: "% Inhibition", value: "67.1", unit: "%" }, { key: "cellViability", label: "Cell Viability", value: "96.8", unit: "%" }], outcome: "Positive Response", confidence: "High (>95%)", notes: "", history: [{ ts: "22 Jun 2026, 16:40", author: "Dr. James Okafor", action: "created", changes: [] }] },
  { id: "RES-20260621-028", sampleId: "SMP-20260621-028", experimentId: "EXP-2026-0041", testDate: "2026-06-21", testMethod: "ELISA (IgE)", operator: "Dr. Elena Vasquez", measurements: [{ key: "igE", label: "IgE Level", value: "68.8", unit: "IU/mL" }, { key: "inhibition", label: "% Inhibition", value: "51.5", unit: "%" }, { key: "cellViability", label: "Cell Viability", value: "98.1", unit: "%" }], outcome: "Positive Response", confidence: "High (>95%)", notes: "", history: [{ ts: "21 Jun 2026, 15:10", author: "Dr. Elena Vasquez", action: "created", changes: [] }] },
];

const DEMO_COMPOUNDS: CompoundRecord[] = [
  { id: "cmp-1", compoundId: "ALG-4521", name: "Algezitinib", cas: "2341876-12-4", formula: "C22H24FN5O3", mw: "441.46", solubility: "12.400", purity: "99.20", lotNumber: "LOT-240301", manufacturer: "ChemBridge Corp.", expiryDate: "2027-03-01", storageConditions: "-20°C, protect from light", mechanism: "IL-4/IL-13 Inhibitor", targetAllergen: "Inhalant Allergens (broad)", phase: "Phase II", notes: "Primary candidate. Excellent aqueous solubility at physiological pH.", history: [{ ts: "01 Mar 2024, 10:00", author: "Dr. Elena Vasquez", action: "created", changes: [] }, { ts: "15 May 2024, 09:30", author: "Dr. Elena Vasquez", action: "edited", changes: [{ field: "Phase", from: "Phase I", to: "Phase II" }, { field: "Purity", from: "98.70", to: "99.20" }] }] },
  { id: "cmp-2", compoundId: "ALG-4522", name: "Brometazolide", cas: "1987432-05-2", formula: "C18H19BrN4O2", mw: "419.27", solubility: "6.800", purity: "98.50", lotNumber: "LOT-240115", manufacturer: "Sigma-Aldrich", expiryDate: "2026-12-31", storageConditions: "-20°C, desiccate", mechanism: "Mast Cell Stabilizer", targetAllergen: "House Dust Mite", phase: "Pre-clinical", notes: "", history: [{ ts: "15 Jan 2024, 14:20", author: "Dr. Elena Vasquez", action: "created", changes: [] }] },
  { id: "cmp-3", compoundId: "ALG-5001", name: "Vexopalimab", cas: "2509341-77-1", formula: "C19H22N6O2", mw: "382.41", solubility: "9.100", purity: "97.80", lotNumber: "LOT-251103", manufacturer: "Enamine Ltd.", expiryDate: "2028-01-15", storageConditions: "-20°C, protect from light", mechanism: "IgE Blocking", targetAllergen: "Peanut", phase: "Discovery", notes: "Early screening stage. Promising Ara h 2 binding in silico.", history: [{ ts: "03 Nov 2025, 11:00", author: "Dr. Sarah Chen", action: "created", changes: [] }] },
  { id: "cmp-4", compoundId: "CTRL-PLACEBO", name: "Microcrystalline Cellulose (Placebo)", cas: "9004-34-6", formula: "C6H10O5·n", mw: "—", solubility: "—", purity: "99.90", lotNumber: "LOT-231101", manufacturer: "FMC BioPolymer", expiryDate: "2028-11-01", storageConditions: "Room temp, dry", mechanism: "Other", targetAllergen: "", phase: "Approved", notes: "Control arm for all blinded trials.", history: [{ ts: "01 Nov 2023, 08:00", author: "Dr. Elena Vasquez", action: "created", changes: [] }] },
];

const DEMO_REPORTS: Report[] = [
  { id: "RPT-2026-Q2-001", title: "Q2 2026 Interim Analysis — ALG-4521 Phase II", experimentId: "EXP-2026-0041", operator: "Dr. Elena Vasquez", date: "2026-06-15", allergen: "Cat Dander", compound: "ALG-4521", outcome: "Positive — primary endpoint met", phase: "Phase II", abstract: "ALG-4521 demonstrated statistically significant IgE reduction at W12 across all dose cohorts. Mean inhibition 48.7% (95% CI 42.1–55.3%) vs. placebo 3.2%. No serious adverse events reported." },
  { id: "RPT-2026-Q1-002", title: "ALG-4522 Basophil Activation Study — Full Report", experimentId: "EXP-2026-0038", operator: "Dr. James Okafor", date: "2026-04-20", allergen: "House Dust Mite", compound: "ALG-4522", outcome: "Positive — CD63 suppression confirmed", phase: "Pre-clinical", abstract: "ALG-4522 at 5μg/mL achieved 67% mean CD63 reduction vs. baseline. Cell viability maintained above 95% in all treatment groups. Minor protocol deviation on day 14 did not affect statistical validity." },
  { id: "RPT-2025-Q4-003", title: "ALG-5001 Peanut Screening — Phase Report", experimentId: "EXP-2025-0019", operator: "Dr. Sarah Chen", date: "2026-02-10", allergen: "Peanut", compound: "ALG-5001", outcome: "Partial — component IgE reduction observed", phase: "Discovery", abstract: "Ara h 2 specific IgE reduced by 28% (below 30% threshold). Promising structural binding data warrants dose optimisation before advancing to pre-clinical phase." },
  { id: "RPT-2025-Q3-004", title: "ALG-4521 Safety & Tolerability — Phase I Completion", experimentId: "EXP-2025-0007", operator: "Dr. Elena Vasquez", date: "2025-09-30", allergen: "Cat Dander", compound: "ALG-4521", outcome: "Positive — cleared for Phase II", phase: "Phase I", abstract: "No dose-limiting toxicities observed across all 3 dose cohorts. PK profile consistent with once-daily oral administration. Phase II initiation approved by safety committee." },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

const LAB_WORKER = { name: "Dr. Elena Vasquez", id: "LW-2847" };

function cn(...classes: (string | undefined | false)[]) { return classes.filter(Boolean).join(" "); }

function now() { return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

function diffFields(oldData: Record<string, string>, newData: Record<string, string>, labels: Record<string, string>): { field: string; from: string; to: string }[] {
  return Object.keys(labels).filter(k => (oldData[k] ?? "") !== (newData[k] ?? "")).map(k => ({ field: labels[k], from: oldData[k] ?? "", to: newData[k] ?? "" }));
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (type: Toast["type"], message: string) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };
  return { toasts, success: (m: string) => add("success", m) };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const iCls = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors font-mono placeholder:font-sans placeholder:text-muted-foreground";
const sCls = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors appearance-none cursor-pointer";

function HistoryPanel({ history }: { history: HistoryEntry[] }) {
  return (
    <div className="border-t border-border bg-muted/30 px-5 py-3 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Change history</p>
      <ol className="relative border-l border-border ml-2 space-y-3">
        {[...history].reverse().map((entry, i) => (
          <li key={i} className="pl-4 relative">
            <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-background bg-border" />
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded", entry.action === "created" ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-700")}>{entry.action}</span>
              <span className="text-[11px] text-muted-foreground font-mono">{entry.ts}</span>
              <span className="text-[11px] text-muted-foreground">· {entry.author}</span>
            </div>
            {entry.changes.length > 0 && (
              <ul className="space-y-0.5">
                {entry.changes.map((c, j) => (
                  <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1.5 flex-wrap">
                    <span className="font-medium text-foreground shrink-0">{c.field}:</span>
                    {c.from && <span className="line-through opacity-50 truncate max-w-[160px]">{c.from}</span>}
                    {c.from && <span className="opacity-40">→</span>}
                    <span className="text-foreground truncate max-w-[160px]">{c.to || <em className="opacity-40">empty</em>}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Detail panels ───────────────────────────────────────────────────────────

function FieldGrid({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  const visible = rows.filter(r => r.value !== "" && r.value !== null && r.value !== undefined);
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
      {visible.map(({ label, value }) => (
        <div key={label} className="flex gap-3 min-w-0">
          <span className="text-xs text-muted-foreground w-28 shrink-0 pt-px">{label}</span>
          <span className="text-xs text-foreground font-mono flex-1 min-w-0 break-words">{value}</span>
        </div>
      ))}
    </div>
  );
}

function SampleDetailPanel({ rec }: { rec: SampleRecord }) {
  return (
    <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-3">
      <FieldGrid rows={[
        { label: "Patient ID", value: rec.patientId },
        { label: "Sample Type", value: rec.sampleType },
        { label: "Collection Date", value: rec.collectionDate },
        { label: "Collection Time", value: rec.collectionTime },
        { label: "Allergen", value: rec.allergen },
        { label: "Drug Compound", value: rec.compound || "None" },
        { label: "Volume", value: rec.volume ? `${rec.volume} mL` : "" },
        { label: "Concentration", value: rec.concentration ? `${rec.concentration} mg/mL` : "" },
        { label: "pH", value: rec.ph },
        { label: "Storage Temp", value: rec.storageTemp ? `${rec.storageTemp} °C` : "" },
        { label: "Operator", value: rec.operator },
        { label: "Notes", value: rec.notes },
      ]} />
    </div>
  );
}

function ExperimentDetailPanel({ rec }: { rec: ExperimentRecord }) {
  return (
    <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-4">
      <FieldGrid rows={[
        { label: "Protocol", value: rec.protocol },
        { label: "Drug Compound", value: rec.compound },
        { label: "Concentration", value: rec.concentration ? `${rec.concentration} μg/mL` : "" },
        { label: "Allergen", value: rec.allergen },
        { label: "Start Date", value: rec.startDate },
        { label: "End Date", value: rec.endDate },
        { label: "Temperature", value: rec.temperature ? `${rec.temperature} °C` : "" },
        { label: "Humidity", value: rec.humidity ? `${rec.humidity}%` : "" },
        { label: "Primary Endpoint", value: rec.primaryEndpoint },
        { label: "Operator", value: rec.operator },
        { label: "Notes", value: rec.notes },
      ]} />
      {rec.studyArms.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Study Arms</p>
          <div className="space-y-1.5">
            {rec.studyArms.map((arm, i) => (
              <div key={i} className="flex items-center gap-3 text-xs bg-card border border-border rounded px-3 py-1.5">
                <span className={cn("font-semibold w-16 shrink-0", arm.role === "Control" ? "text-muted-foreground" : "text-primary")}>{arm.role}</span>
                <span className="font-mono flex-1">{arm.compound}</span>
                {arm.dose && <span className="font-mono text-muted-foreground">{arm.dose} μg/mL</span>}
                <span className="text-muted-foreground shrink-0">n = {arm.n || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {rec.hypothesis && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Hypothesis</p>
          <p className="text-xs text-foreground leading-relaxed">{rec.hypothesis}</p>
        </div>
      )}
    </div>
  );
}

function ResultDetailPanel({ rec }: { rec: ResultRecord }) {
  return (
    <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-4">
      <FieldGrid rows={[
        { label: "Sample ID", value: rec.sampleId },
        { label: "Experiment ID", value: rec.experimentId },
        { label: "Test Date", value: rec.testDate },
        { label: "Method", value: rec.testMethod },
        { label: "Operator", value: rec.operator },
        { label: "Outcome", value: rec.outcome },
        { label: "Confidence", value: rec.confidence },
        { label: "Notes", value: rec.notes },
      ]} />
      {rec.measurements.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Measurements</p>
          <div className="flex flex-wrap gap-2">
            {rec.measurements.map(m => (
              <span key={m.key} className="text-xs bg-card border border-border rounded px-2.5 py-1 font-mono">
                {m.label}: <strong>{m.value}</strong> <span className="text-muted-foreground">{m.unit}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompoundDetailPanel({ rec }: { rec: CompoundRecord }) {
  return (
    <div className="border-t border-border bg-muted/20 px-5 py-4">
      <FieldGrid rows={[
        { label: "Internal ID", value: rec.compoundId },
        { label: "Name", value: rec.name },
        { label: "CAS Number", value: rec.cas },
        { label: "Formula", value: rec.formula },
        { label: "Mol. Weight", value: rec.mw ? `${rec.mw} g/mol` : "" },
        { label: "Solubility", value: rec.solubility ? `${rec.solubility} mg/mL` : "" },
        { label: "Purity", value: rec.purity ? `${rec.purity}%` : "" },
        { label: "Lot Number", value: rec.lotNumber },
        { label: "Manufacturer", value: rec.manufacturer },
        { label: "Expiry Date", value: rec.expiryDate },
        { label: "Storage", value: rec.storageConditions },
        { label: "Mechanism", value: rec.mechanism },
        { label: "Target Allergen", value: rec.targetAllergen },
        { label: "Phase", value: rec.phase },
        { label: "Notes", value: rec.notes },
      ]} />
    </div>
  );
}

function SessionList<T extends { id: string; history: HistoryEntry[] }>({
  records, expandedHistory, setExpandedHistory, onEdit, columns,
}: {
  records: T[];
  expandedHistory: string | null;
  setExpandedHistory: (id: string | null) => void;
  onEdit: (rec: T) => void;
  columns: (rec: T) => React.ReactNode[];
}) {
  if (records.length === 0) return null;
  return (
    <div className="mt-8 bg-card border border-border rounded">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted this session</p>
      </div>
      <div className="divide-y divide-border">
        {records.map(rec => (
          <div key={rec.id}>
            <div className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
              {columns(rec).map((cell, i) => <Fragment key={i}>{cell}</Fragment>)}
              <button onClick={() => setExpandedHistory(expandedHistory === rec.id ? null : rec.id)}
                className={cn("flex items-center gap-1 text-xs shrink-0 transition-colors", expandedHistory === rec.id ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Clock className="w-3 h-3" />{rec.history.length}
              </button>
              <button onClick={() => onEdit(rec)} className="text-xs text-primary hover:underline shrink-0">Edit</button>
            </div>
            {expandedHistory === rec.id && <HistoryPanel history={rec.history} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditBanner({ id, label, onCancel }: { id: string; label?: string; onCancel: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded px-4 py-3 flex items-center gap-3">
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="text-xs text-amber-700 flex-1">Editing <span className="font-mono font-semibold">{label || id}</span> — save to apply changes.</p>
      <button type="button" onClick={onCancel} className="text-xs text-amber-700 underline">Cancel</button>
    </div>
  );
}

function FormButtons({ isEdit, primaryLabel, onCancel, onClear, disabled }: { isEdit: boolean; primaryLabel: string; onCancel?: () => void; onClear?: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-3">
      <button type="submit" disabled={disabled}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-60">
        {disabled ? <CheckCircle className="w-4 h-4" /> : isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {disabled ? "Saved" : isEdit ? "Save Changes" : primaryLabel}
      </button>
      <button type="button" onClick={isEdit ? onCancel : onClear}
        className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/70 transition-colors">
        <X className="w-4 h-4" />{isEdit ? "Cancel" : "Clear"}
      </button>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "samples", label: "Sample Registration", Icon: TestTube },
  { id: "experiments", label: "Experiment Log", Icon: FlaskConical },
  { id: "results", label: "Test Results", Icon: Microscope },
  { id: "compounds", label: "Compound Records", Icon: Database },
];
const NAV2 = [
  { id: "query", label: "Search & Reports", Icon: Search },
  { id: "vocabulary", label: "Manage Vocabularies", Icon: Sliders },
];

function Sidebar({ active, onNav }: { active: Section; onNav: (s: Section) => void }) {
  return (
    <aside className="flex flex-col w-60 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-sidebar-primary flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold tracking-tight leading-none">AllerGen Labs</p>
            <p className="text-sidebar-foreground text-[10px] mt-0.5 font-mono tracking-widest uppercase opacity-60">Research Division</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
        <div className="space-y-0.5">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => onNav(id as Section)}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors text-left", active === id ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white")}>
              <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
              {active === id && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
            </button>
          ))}
        </div>
        <div className="border-t border-sidebar-border pt-4 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground opacity-40 px-3 mb-2">Tools</p>
          {NAV2.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => onNav(id as Section)}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors text-left", active === id ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white")}>
              <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
              {active === id && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
            </button>
          ))}
        </div>
      </nav>
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-sidebar-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{LAB_WORKER.name}</p>
            <p className="text-sidebar-foreground text-[10px] font-mono opacity-60">{LAB_WORKER.id}</p>
          </div>
          <button className="ml-auto text-sidebar-foreground hover:text-white transition-colors"><LogOut className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </aside>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ samples, onNav }: { samples: SampleRecord[]; onNav: (s: Section) => void }) {
  const [expandedSample, setExpandedSample] = useState<string | null>(null);
  const STATS = [
    { label: "Samples Today", value: String(samples.filter(s => s.collectionDate === "2026-06-23").length), delta: "today", Icon: TestTube, color: "text-primary" },
    { label: "Active Experiments", value: "3", delta: "ongoing", Icon: FlaskConical, color: "text-accent" },
    { label: "Pending Results", value: "4", delta: "review", Icon: ClipboardList, color: "text-amber-600" },
    { label: "Compounds Logged", value: "4", delta: "in database", Icon: Database, color: "text-violet-600" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Good morning, Dr. Vasquez</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tuesday, 23 June 2026 · Lab Station B-4</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(({ label, value, delta, Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-3xl font-light text-foreground mt-1">{value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{delta}</p>
              </div>
              <div className={cn("mt-0.5", color)}><Icon className="w-5 h-5 opacity-70" /></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Quick Entry</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([["Register Sample", "samples", TestTube], ["Log Experiment", "experiments", FlaskConical], ["Record Result", "results", Microscope], ["Add Compound", "compounds", Database]] as const).map(([label, section, Icon]) => (
            <button key={section} onClick={() => onNav(section as Section)}
              className="flex flex-col items-center gap-2 py-4 px-3 rounded border border-border hover:border-primary hover:bg-primary/5 transition-all group">
              <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs text-muted-foreground group-hover:text-primary font-medium transition-colors text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Samples</h2>
        </div>
        <div className="divide-y divide-border">
          {samples.slice(0, 5).map(s => (
            <div key={s.id}>
              <div
                className="px-5 py-3 flex items-center gap-4 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => setExpandedSample(expandedSample === s.id ? null : s.id)}
              >
                <span className="font-mono text-xs text-muted-foreground w-44 shrink-0">{s.id}</span>
                <span className="text-sm text-foreground flex-1">{s.allergen}</span>
                <span className="text-xs text-muted-foreground w-24 shrink-0">{s.sampleType}</span>
                <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{s.patientId}</span>
                <span className="font-mono text-xs text-muted-foreground w-10 shrink-0 text-right">{s.collectionTime}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", expandedSample === s.id && "rotate-180")} />
              </div>
              {expandedSample === s.id && <SampleDetailPanel rec={s} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sample Registration ──────────────────────────────────────────────────────

const EMPTY_SAMPLE = { patientId: "", collectionDate: "", collectionTime: "", sampleType: "", allergen: "", compound: "", volume: "", concentration: "", ph: "", storageTemp: "", operator: LAB_WORKER.name, notes: "" };
const SAMPLE_LABELS: Record<string, string> = { patientId: "Patient ID", collectionDate: "Collection Date", collectionTime: "Collection Time", sampleType: "Sample Type", allergen: "Allergen", compound: "Drug Compound", volume: "Volume (mL)", concentration: "Concentration", ph: "pH", storageTemp: "Storage Temp", operator: "Operator", notes: "Notes" };

function SamplesSection({ records, setRecords, vocab, onSuccess }: { records: SampleRecord[]; setRecords: React.Dispatch<React.SetStateAction<SampleRecord[]>>; vocab: Vocab; onSuccess: (m: string) => void }) {
  const [form, setForm] = useState(EMPTY_SAMPLE);
  const [submitted, setSubmitted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const startEdit = (rec: SampleRecord) => {
    const { id, history, ...fields } = rec; setForm(fields); setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setForm(EMPTY_SAMPLE); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const old = records.find(r => r.id === editingId)!;
      const entry: HistoryEntry = { ts: now(), author: LAB_WORKER.name, action: "edited", changes: diffFields(old as any, form, SAMPLE_LABELS) };
      setRecords(rs => rs.map(r => r.id === editingId ? { id: editingId, ...form, history: [...r.history, entry] } : r));
      onSuccess(`Sample ${editingId} updated`); setEditingId(null); setForm(EMPTY_SAMPLE);
    } else {
      const id = `SMP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`;
      const entry: HistoryEntry = { ts: now(), author: LAB_WORKER.name, action: "created", changes: [] };
      setRecords(rs => [{ id, ...form, history: [entry] }, ...rs]);
      onSuccess(`Sample ${id} registered`); setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setForm(EMPTY_SAMPLE); }, 2000);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Sample Registration</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Register a new biological sample for allergen testing</p>
      </div>

      {true && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient & Collection</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Patient ID" required><input className={iCls} placeholder="PT-XXXX" value={form.patientId} onChange={set("patientId")} required /></Field>
              <Field label="Sample Type" required>
                <select className={sCls} value={form.sampleType} onChange={set("sampleType")} required>
                  <option value="">Select type…</option>
                  {vocab.sampleTypes.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Collection Date" required><input type="date" className={iCls} value={form.collectionDate} onChange={set("collectionDate")} required /></Field>
              <Field label="Collection Time" required><input type="time" className={iCls} value={form.collectionTime} onChange={set("collectionTime")} required /></Field>
              <Field label="Operator">
                <select className={sCls} value={form.operator} onChange={set("operator")}>
                  {vocab.operators.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="bg-card border border-border rounded p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allergen & Compound</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Allergen" required>
                <select className={sCls} value={form.allergen} onChange={set("allergen")} required>
                  <option value="">Select allergen…</option>
                  {vocab.allergens.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Drug Compound">
                <select className={sCls} value={form.compound} onChange={set("compound")}>
                  <option value="">None / not applicable</option>
                  {vocab.compounds.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="bg-card border border-border rounded p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Physical Properties</h2>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Volume (mL)" required><input type="number" step="0.01" className={iCls} placeholder="0.00" value={form.volume} onChange={set("volume")} required /></Field>
              <Field label="Concentration (mg/mL)"><input type="number" step="0.001" className={iCls} placeholder="0.000" value={form.concentration} onChange={set("concentration")} /></Field>
              <Field label="pH"><input type="number" step="0.1" min="0" max="14" className={iCls} placeholder="7.4" value={form.ph} onChange={set("ph")} /></Field>
              <Field label="Storage Temp (°C)" required><input type="number" step="0.5" className={iCls} placeholder="-80" value={form.storageTemp} onChange={set("storageTemp")} required /></Field>
            </div>
          </div>
          <div className="bg-card border border-border rounded p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h2>
            <textarea className={cn(iCls, "h-24 resize-none font-sans")} placeholder="Any observations, anomalies, or special handling instructions…" value={form.notes} onChange={set("notes")} />
          </div>
          {editingId && <EditBanner id={editingId} onCancel={cancelEdit} />}
          <FormButtons isEdit={!!editingId} primaryLabel="Register Sample" onCancel={cancelEdit} onClear={() => setForm(EMPTY_SAMPLE)} disabled={submitted} />
        </form>
      )}

      <SessionList records={records} expandedHistory={expandedHistory} setExpandedHistory={setExpandedHistory} onEdit={startEdit}
        columns={rec => [
          <span className="font-mono text-xs text-muted-foreground w-44 shrink-0">{rec.id}</span>,
          <span className="text-sm text-foreground flex-1 min-w-0 truncate">{rec.allergen || "—"}</span>,
          <span className="text-xs text-muted-foreground w-28 shrink-0">{rec.sampleType || "—"}</span>,
          <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{rec.patientId}</span>,
        ]}
      />
    </div>
  );
}

// ─── Experiment Log ───────────────────────────────────────────────────────────

const EMPTY_EXPERIMENT = { title: "", protocol: "", compound: "", concentration: "", allergen: "", startDate: "", endDate: "", temperature: "", humidity: "", primaryEndpoint: "", hypothesis: "", operator: LAB_WORKER.name, notes: "" };
const DEFAULT_ARMS: StudyArm[] = [{ role: "Control", compound: "CTRL-PLACEBO", dose: "", n: "" }];
const EXP_LABELS: Record<string, string> = { title: "Title", protocol: "Protocol", compound: "Drug Compound", concentration: "Concentration", allergen: "Allergen", startDate: "Start Date", endDate: "End Date", temperature: "Temperature", humidity: "Humidity", primaryEndpoint: "Primary Endpoint", hypothesis: "Hypothesis", operator: "Operator", notes: "Notes" };

function ExperimentLog({ records, setRecords, vocab, onSuccess }: { records: ExperimentRecord[]; setRecords: React.Dispatch<React.SetStateAction<ExperimentRecord[]>>; vocab: Vocab; onSuccess: (m: string) => void }) {
  const [form, setForm] = useState(EMPTY_EXPERIMENT);
  const [studyArms, setStudyArms] = useState<StudyArm[]>(DEFAULT_ARMS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const addArm = () => setStudyArms(arms => [...arms, { role: "Treatment", compound: vocab.compounds[0] || "", dose: "", n: "" }]);
  const removeArm = (i: number) => setStudyArms(arms => arms.filter((_, idx) => idx !== i));
  const updateArm = (i: number, patch: Partial<StudyArm>) => setStudyArms(arms => arms.map((a, idx) => idx === i ? { ...a, ...patch } : a));

  const startEdit = (rec: ExperimentRecord) => {
    const { id, history, studyArms: arms, ...f } = rec;
    setForm(f); setStudyArms(arms); setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setForm(EMPTY_EXPERIMENT); setStudyArms(DEFAULT_ARMS); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const old = records.find(r => r.id === editingId)!;
      const armStr = (arms: StudyArm[]) => arms.map(a => `${a.role}: ${a.compound}${a.dose ? ` ${a.dose}μg/mL` : ""} (n=${a.n})`).join(" | ");
      const armChanges = JSON.stringify(old.studyArms) !== JSON.stringify(studyArms)
        ? [{ field: "Study Arms", from: armStr(old.studyArms), to: armStr(studyArms) }] : [];
      const entry: HistoryEntry = { ts: now(), author: LAB_WORKER.name, action: "edited", changes: [...diffFields(old as any, form, EXP_LABELS), ...armChanges] };
      setRecords(rs => rs.map(r => r.id === editingId ? { id: editingId, ...form, studyArms, history: [...r.history, entry] } : r));
      onSuccess(`Experiment ${editingId} updated`); setEditingId(null); setForm(EMPTY_EXPERIMENT); setStudyArms(DEFAULT_ARMS);
    } else {
      const id = `EXP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      setRecords(rs => [{ id, ...form, studyArms, history: [{ ts: now(), author: LAB_WORKER.name, action: "created", changes: [] }] }, ...rs]);
      onSuccess(`Experiment ${id} logged`); setForm(EMPTY_EXPERIMENT); setStudyArms(DEFAULT_ARMS);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6"><h1 className="text-xl font-semibold">Experiment Log</h1><p className="text-sm text-muted-foreground mt-0.5">Document experimental procedures and parameters</p></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experiment Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Experiment Title" required><input className={cn(iCls, "font-sans")} placeholder="e.g. ALG-4521 Dose-Response in Cat Dander" value={form.title} onChange={set("title")} required /></Field>
            <Field label="Protocol" required>
              <select className={sCls} value={form.protocol} onChange={set("protocol")} required>
                <option value="">Select protocol…</option>
                {vocab.protocols.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Start Date" required><input type="date" className={iCls} value={form.startDate} onChange={set("startDate")} required /></Field>
            <Field label="Projected End Date"><input type="date" className={iCls} value={form.endDate} onChange={set("endDate")} /></Field>
            <Field label="Operator">
              <select className={sCls} value={form.operator} onChange={set("operator")}>
                {vocab.operators.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drug & Allergen</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Drug Compound" required>
              <select className={sCls} value={form.compound} onChange={set("compound")} required>
                <option value="">Select compound…</option>
                {vocab.compounds.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Dose Concentration (μg/mL)" required><input type="number" step="0.01" className={iCls} placeholder="0.00" value={form.concentration} onChange={set("concentration")} required /></Field>
            <Field label="Allergen" required>
              <select className={sCls} value={form.allergen} onChange={set("allergen")} required>
                <option value="">Select allergen…</option>
                {vocab.allergens.map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Primary Endpoint"><input className={cn(iCls, "font-sans")} placeholder="e.g. IgE reduction at 12 weeks" value={form.primaryEndpoint} onChange={set("primaryEndpoint")} /></Field>
          </div>
        </div>
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conditions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ambient Temperature (°C)"><input type="number" step="0.1" className={iCls} placeholder="22.0" value={form.temperature} onChange={set("temperature")} /></Field>
            <Field label="Relative Humidity (%)"><input type="number" step="1" min="0" max="100" className={iCls} placeholder="45" value={form.humidity} onChange={set("humidity")} /></Field>
          </div>
        </div>

        <div className="bg-card border border-border rounded p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Study Arms</h2>
            <button type="button" onClick={addArm}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Arm
            </button>
          </div>
          {studyArms.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded">No study arms defined yet.</p>
          )}
          {studyArms.map((arm, i) => (
            <div key={i} className="flex items-center gap-3 bg-muted/40 border border-border rounded px-3 py-2">
              <select value={arm.role} onChange={e => updateArm(i, { role: e.target.value as StudyArm["role"] })}
                className="text-xs bg-transparent border-none outline-none font-semibold text-foreground w-24 shrink-0 cursor-pointer">
                <option>Control</option>
                <option>Treatment</option>
              </select>
              <select value={arm.compound} onChange={e => updateArm(i, { compound: e.target.value })}
                className="flex-1 text-xs bg-input-background border border-border rounded px-2 py-1 focus:outline-none focus:border-primary cursor-pointer">
                {vocab.compounds.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Dose μg/mL"
                value={arm.dose} onChange={e => updateArm(i, { dose: e.target.value })}
                disabled={arm.role === "Control"}
                className="w-28 text-xs bg-input-background border border-border rounded px-2 py-1 font-mono focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed" />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">n =</span>
                <input type="number" min="1" placeholder="—" value={arm.n} onChange={e => updateArm(i, { n: e.target.value })}
                  className="w-16 text-xs bg-input-background border border-border rounded px-2 py-1 font-mono focus:outline-none focus:border-primary" />
              </div>
              <button type="button" onClick={() => removeArm(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hypothesis & Notes</h2>
          <Field label="Hypothesis"><textarea className={cn(iCls, "h-20 resize-none font-sans")} placeholder="State the experimental hypothesis…" value={form.hypothesis} onChange={set("hypothesis")} /></Field>
          <Field label="Additional Notes"><textarea className={cn(iCls, "h-20 resize-none font-sans")} placeholder="Observations, deviations, special conditions…" value={form.notes} onChange={set("notes")} /></Field>
        </div>
        {editingId && <EditBanner id={editingId} onCancel={cancelEdit} />}
        <FormButtons isEdit={!!editingId} primaryLabel="Log Experiment" onCancel={cancelEdit} onClear={() => setForm(EMPTY_EXPERIMENT)} />
      </form>
      <SessionList records={records} expandedHistory={expandedHistory} setExpandedHistory={setExpandedHistory} onEdit={startEdit}
        columns={rec => [
          <span className="font-mono text-xs text-muted-foreground w-32 shrink-0">{rec.id}</span>,
          <span className="text-sm text-foreground flex-1 min-w-0 truncate">{rec.title}</span>,
          <span className="font-mono text-xs text-primary w-20 shrink-0 truncate">{rec.compound}</span>,
          <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{rec.allergen}</span>,
        ]}
      />
    </div>
  );
}

// ─── Test Results ─────────────────────────────────────────────────────────────

const OUTCOMES = ["Positive Response", "Negative Response", "Partial Inhibition", "Full Inhibition", "Inconclusive", "Requires Repeat"];
const METHODS = ["ELISA (IgE)", "ELISA (IgG4)", "FACS / Flow Cytometry", "Luminex Multiplex", "Western Blot", "RAST Score", "SPT Wheal Measurement", "PBMC Stimulation Assay"];
const EMPTY_RESULT_FORM = { sampleId: "", experimentId: "", testDate: "", testMethod: "", operator: LAB_WORKER.name, outcome: "", confidence: "", notes: "" };

function TestResults({ records, setRecords, vocab, onSuccess }: { records: ResultRecord[]; setRecords: React.Dispatch<React.SetStateAction<ResultRecord[]>>; vocab: Vocab; onSuccess: (m: string) => void }) {
  const [form, setForm] = useState(EMPTY_RESULT_FORM);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const addMeasurement = () => {
    const used = new Set(measurements.map(m => m.key));
    const next = MEASUREMENT_CATALOGUE.find(m => !used.has(m.key));
    if (next) setMeasurements(ms => [...ms, { ...next, value: "" }]);
  };

  const updateMeasurement = (i: number, key: string, value: string) => {
    setMeasurements(ms => ms.map((m, idx) => {
      if (idx !== i) return m;
      if (key !== m.key) {
        const cfg = MEASUREMENT_CATALOGUE.find(c => c.key === key)!;
        return { ...cfg, value };
      }
      return { ...m, value };
    }));
  };

  const removeMeasurement = (i: number) => setMeasurements(ms => ms.filter((_, idx) => idx !== i));

  const usedKeys = new Set(measurements.map(m => m.key));
  const availableFor = (currentKey: string) => MEASUREMENT_CATALOGUE.filter(c => c.key === currentKey || !usedKeys.has(c.key));

  const startEdit = (rec: ResultRecord) => {
    const { id, history, measurements: ms, ...f } = rec;
    setForm(f); setMeasurements(ms); setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setForm(EMPTY_RESULT_FORM); setMeasurements([]); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mChanges = editingId ? [{ field: "Measurements", from: records.find(r => r.id === editingId)!.measurements.map(m => `${m.label}: ${m.value}`).join(", "), to: measurements.map(m => `${m.label}: ${m.value}`).join(", ") }].filter(c => c.from !== c.to) : [];
    if (editingId) {
      const entry: HistoryEntry = { ts: now(), author: LAB_WORKER.name, action: "edited", changes: [...diffFields(records.find(r => r.id === editingId)! as any, form as any, { sampleId: "Sample ID", testMethod: "Method", outcome: "Outcome", confidence: "Confidence", notes: "Notes", operator: "Operator" }), ...mChanges] };
      setRecords(rs => rs.map(r => r.id === editingId ? { id: editingId, ...form, measurements, history: [...r.history, entry] } : r));
      onSuccess(`Result ${editingId} updated`); setEditingId(null); setForm(EMPTY_RESULT_FORM); setMeasurements([]);
    } else {
      const id = `RES-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`;
      setRecords(rs => [{ id, ...form, measurements, history: [{ ts: now(), author: LAB_WORKER.name, action: "created", changes: [] }] }, ...rs]);
      onSuccess(`Result for ${form.sampleId} recorded`); setForm(EMPTY_RESULT_FORM); setMeasurements([]);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6"><h1 className="text-xl font-semibold">Test Results</h1><p className="text-sm text-muted-foreground mt-0.5">Record immunological assay results and measurements</p></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">References</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sample ID" required><input className={iCls} placeholder="SMP-YYYYMMDD-XXX" value={form.sampleId} onChange={set("sampleId")} required /></Field>
            <Field label="Experiment ID"><input className={iCls} placeholder="EXP-YYYY-XXXX" value={form.experimentId} onChange={set("experimentId")} /></Field>
            <Field label="Test Date" required><input type="date" className={iCls} value={form.testDate} onChange={set("testDate")} required /></Field>
            <Field label="Test Method" required>
              <select className={sCls} value={form.testMethod} onChange={set("testMethod")} required>
                <option value="">Select method…</option>
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Operator">
              <select className={sCls} value={form.operator} onChange={set("operator")}>
                {vocab.operators.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="bg-card border border-border rounded p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Measurements</h2>
            <button type="button" onClick={addMeasurement} disabled={usedKeys.size >= MEASUREMENT_CATALOGUE.length}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" /> Add Measurement
            </button>
          </div>
          {measurements.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded">
              No measurements added yet. Click "Add Measurement" to begin.
            </p>
          )}
          {measurements.map((m, i) => (
            <div key={i} className="flex items-center gap-3 bg-muted/40 border border-border rounded px-3 py-2">
              <select className="text-xs bg-transparent border-none outline-none font-medium text-foreground w-48 shrink-0 cursor-pointer"
                value={m.key}
                onChange={e => updateMeasurement(i, e.target.value, m.value)}>
                {availableFor(m.key).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <input type="number" step="any" className="flex-1 min-w-0 text-sm bg-input-background border border-border rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-ring/30 focus:border-primary"
                placeholder="0.00" value={m.value} onChange={e => updateMeasurement(i, m.key, e.target.value)} />
              <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">{m.unit}</span>
              <button type="button" onClick={() => removeMeasurement(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outcome Assessment</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Outcome" required>
              <select className={sCls} value={form.outcome} onChange={set("outcome")} required>
                <option value="">Select outcome…</option>
                {OUTCOMES.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Confidence Level">
              <select className={sCls} value={form.confidence} onChange={set("confidence")}>
                <option value="">Select…</option>
                <option>High (&gt;95%)</option>
                <option>Moderate (80–95%)</option>
                <option>Low (&lt;80%)</option>
              </select>
            </Field>
          </div>
          <Field label="Interpretation Notes">
            <textarea className={cn(iCls, "h-24 resize-none font-sans")} placeholder="Describe the result, anomalies, or next steps…" value={form.notes} onChange={set("notes")} />
          </Field>
        </div>
        {editingId && <EditBanner id={editingId} onCancel={cancelEdit} />}
        <FormButtons isEdit={!!editingId} primaryLabel="Record Result" onCancel={cancelEdit} onClear={() => { setForm(EMPTY_RESULT_FORM); setMeasurements([]); }} />
      </form>
      <SessionList records={records} expandedHistory={expandedHistory} setExpandedHistory={setExpandedHistory} onEdit={startEdit}
        columns={rec => [
          <span className="font-mono text-xs text-muted-foreground w-44 shrink-0">{rec.id}</span>,
          <span className="font-mono text-xs text-foreground w-40 shrink-0 truncate">{rec.sampleId || "—"}</span>,
          <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{rec.testMethod || "—"}</span>,
          <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0",
            rec.outcome === "Positive Response" || rec.outcome === "Full Inhibition" ? "bg-primary/10 text-primary" :
            rec.outcome === "Inconclusive" || rec.outcome === "Requires Repeat" ? "bg-amber-50 text-amber-700" :
            "bg-muted text-muted-foreground")}>{rec.outcome || "—"}</span>,
        ]}
      />
    </div>
  );
}

// ─── Compound Records ─────────────────────────────────────────────────────────

const EMPTY_COMPOUND = { compoundId: "", name: "", cas: "", formula: "", mw: "", solubility: "", purity: "", lotNumber: "", manufacturer: "", expiryDate: "", storageConditions: "", mechanism: "", targetAllergen: "", phase: "", notes: "" };
const COMPOUND_LABELS: Record<string, string> = { compoundId: "ID", name: "Name", cas: "CAS", formula: "Formula", mw: "Mol. Weight", solubility: "Solubility", purity: "Purity", lotNumber: "Lot Number", manufacturer: "Manufacturer", expiryDate: "Expiry Date", storageConditions: "Storage", mechanism: "Mechanism", targetAllergen: "Target Allergen", phase: "Phase", notes: "Notes" };

function CompoundRecords({ records, setRecords, vocab, onSuccess }: { records: CompoundRecord[]; setRecords: React.Dispatch<React.SetStateAction<CompoundRecord[]>>; vocab: Vocab; onSuccess: (m: string) => void }) {
  const [form, setForm] = useState(EMPTY_COMPOUND);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const startEdit = (rec: CompoundRecord) => { const { id, history, ...f } = rec; setForm(f); setEditingId(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const cancelEdit = () => { setForm(EMPTY_COMPOUND); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const old = records.find(r => r.id === editingId)!;
      const entry: HistoryEntry = { ts: now(), author: LAB_WORKER.name, action: "edited", changes: diffFields(old as any, form, COMPOUND_LABELS) };
      setRecords(rs => rs.map(r => r.id === editingId ? { id: editingId, ...form, history: [...r.history, entry] } : r));
      onSuccess(`Compound ${form.compoundId} updated`); setEditingId(null); setForm(EMPTY_COMPOUND);
    } else {
      setRecords(rs => [{ id: `cmp-${Date.now()}`, ...form, history: [{ ts: now(), author: LAB_WORKER.name, action: "created", changes: [] }] }, ...rs]);
      onSuccess(`Compound ${form.compoundId || form.name} added`); setForm(EMPTY_COMPOUND);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6"><h1 className="text-xl font-semibold">Compound Records</h1><p className="text-sm text-muted-foreground mt-0.5">Add or update drug compound entries in the database</p></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compound Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Internal ID" required><input className={iCls} placeholder="ALG-XXXX" value={form.compoundId} onChange={set("compoundId")} required /></Field>
            <Field label="IUPAC / Common Name" required><input className={cn(iCls, "font-sans")} placeholder="Compound name" value={form.name} onChange={set("name")} required /></Field>
            <Field label="CAS Number"><input className={iCls} placeholder="XXXXXXX-XX-X" value={form.cas} onChange={set("cas")} /></Field>
            <Field label="Molecular Formula"><input className={iCls} placeholder="e.g. C21H27NO3" value={form.formula} onChange={set("formula")} /></Field>
            <Field label="Molecular Weight (g/mol)"><input type="number" step="0.01" className={iCls} placeholder="0.00" value={form.mw} onChange={set("mw")} /></Field>
            <Field label="Development Phase">
              <select className={sCls} value={form.phase} onChange={set("phase")}>
                <option value="">Select phase…</option>
                {vocab.phases.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Physical & Chemical Properties</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Solubility (mg/mL)"><input type="number" step="0.001" className={iCls} placeholder="0.000" value={form.solubility} onChange={set("solubility")} /></Field>
            <Field label="Purity (%)"><input type="number" step="0.01" min="0" max="100" className={iCls} placeholder="99.00" value={form.purity} onChange={set("purity")} /></Field>
            <Field label="Lot Number"><input className={iCls} placeholder="LOT-XXXXXX" value={form.lotNumber} onChange={set("lotNumber")} /></Field>
            <Field label="Manufacturer"><input className={cn(iCls, "font-sans")} placeholder="Supplier name" value={form.manufacturer} onChange={set("manufacturer")} /></Field>
            <Field label="Expiry Date"><input type="date" className={iCls} value={form.expiryDate} onChange={set("expiryDate")} /></Field>
            <Field label="Storage Conditions"><input className={cn(iCls, "font-sans")} placeholder="e.g. -20°C, protect from light" value={form.storageConditions} onChange={set("storageConditions")} /></Field>
          </div>
        </div>
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pharmacology</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mechanism of Action">
              <select className={sCls} value={form.mechanism} onChange={set("mechanism")}>
                <option value="">Select mechanism…</option>
                {vocab.mechanisms.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Target Allergen">
              <select className={sCls} value={form.targetAllergen} onChange={set("targetAllergen")}>
                <option value="">Select target…</option>
                <option>Inhalant Allergens (broad)</option>
                <option>Food Allergens (broad)</option>
                {vocab.allergens.map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes"><textarea className={cn(iCls, "h-24 resize-none font-sans")} placeholder="Mechanism details, observed effects, known interactions…" value={form.notes} onChange={set("notes")} /></Field>
        </div>
        {editingId && <EditBanner id={editingId} label={form.compoundId} onCancel={cancelEdit} />}
        <FormButtons isEdit={!!editingId} primaryLabel="Add Compound" onCancel={cancelEdit} onClear={() => setForm(EMPTY_COMPOUND)} />
      </form>
      <SessionList records={records} expandedHistory={expandedHistory} setExpandedHistory={setExpandedHistory} onEdit={startEdit}
        columns={rec => [
          <span className="font-mono text-xs font-medium text-primary w-24 shrink-0">{rec.compoundId}</span>,
          <span className="text-sm text-foreground flex-1 min-w-0 truncate">{rec.name}</span>,
          <span className="text-xs text-muted-foreground w-36 shrink-0 truncate">{rec.mechanism || "—"}</span>,
          <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0",
            rec.phase === "Phase II" || rec.phase === "Phase III" || rec.phase === "Approved" ? "bg-primary/10 text-primary" :
            rec.phase === "Discovery" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground")}>{rec.phase || "—"}</span>,
        ]}
      />
    </div>
  );
}

// ─── Query & Reports ──────────────────────────────────────────────────────────

type QueryType = "sample" | "experiment" | "result" | "compound" | "report";

function QuerySection({ samples, experiments, results, compounds, reports, vocab }: {
  samples: SampleRecord[]; experiments: ExperimentRecord[]; results: ResultRecord[];
  compounds: CompoundRecord[]; reports: Report[]; vocab: Vocab;
}) {
  const [qtype, setQtype] = useState<QueryType>("sample");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [ran, setRan] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);

  const toggleDetail = (id: string) => { setExpandedDetail(p => p === id ? null : id); };

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters(f => ({ ...f, [k]: e.target.value }));

  const Q_TABS: { id: QueryType; label: string }[] = [
    { id: "sample", label: "Samples" },
    { id: "experiment", label: "Experiments" },
    { id: "result", label: "Results" },
    { id: "compound", label: "Compounds" },
    { id: "report", label: "Reports" },
  ];

  const changeType = (t: QueryType) => { setQtype(t); setFilters({}); setRan(false); setExpandedHistory(null); setExpandedDetail(null); };

  const filteredSamples = samples.filter(r =>
    (!filters.patientId || r.patientId.toLowerCase().includes(filters.patientId.toLowerCase())) &&
    (!filters.allergen || r.allergen === filters.allergen) &&
    (!filters.sampleType || r.sampleType === filters.sampleType) &&
    (!filters.operator || r.operator === filters.operator)
  );
  const filteredExps = experiments.filter(r =>
    (!filters.title || r.title.toLowerCase().includes(filters.title.toLowerCase())) &&
    (!filters.compound || r.compound === filters.compound) &&
    (!filters.allergen || r.allergen === filters.allergen) &&
    (!filters.operator || r.operator === filters.operator)
  );
  const filteredResults = results.filter(r =>
    (!filters.sampleId || r.sampleId.toLowerCase().includes(filters.sampleId.toLowerCase())) &&
    (!filters.outcome || r.outcome === filters.outcome) &&
    (!filters.operator || r.operator === filters.operator)
  );
  const filteredCompounds = compounds.filter(r =>
    (!filters.compoundId || r.compoundId.toLowerCase().includes(filters.compoundId.toLowerCase())) &&
    (!filters.name || r.name.toLowerCase().includes(filters.name.toLowerCase())) &&
    (!filters.phase || r.phase === filters.phase) &&
    (!filters.mechanism || r.mechanism === filters.mechanism)
  );
  const filteredReports = reports.filter(r =>
    (!filters.title || r.title.toLowerCase().includes(filters.title.toLowerCase())) &&
    (!filters.operator || r.operator === filters.operator) &&
    (!filters.compound || r.compound === filters.compound) &&
    (!filters.allergen || r.allergen === filters.allergen)
  );

  const inputCls = "w-full px-3 py-1.5 text-xs bg-input-background border border-border rounded focus:outline-none focus:border-primary transition-colors font-mono placeholder:font-sans placeholder:text-muted-foreground";
  const selCls = "w-full px-3 py-1.5 text-xs bg-input-background border border-border rounded focus:outline-none focus:border-primary transition-colors appearance-none";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Search & Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Query any record type, view full history, and browse experiment reports</p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-0 bg-card border border-border rounded p-1">
        {Q_TABS.map(t => (
          <button key={t.id} onClick={() => changeType(t.id)}
            className={cn("flex-1 text-xs py-2 rounded transition-colors font-medium",
              qtype === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded p-5 space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Filters</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {qtype === "sample" && (<>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Patient ID</label><input className={inputCls} placeholder="PT-XXXX" value={filters.patientId || ""} onChange={sf("patientId")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Allergen</label><select className={selCls} value={filters.allergen || ""} onChange={sf("allergen")}><option value="">Any</option>{vocab.allergens.map(a => <option key={a}>{a}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample Type</label><select className={selCls} value={filters.sampleType || ""} onChange={sf("sampleType")}><option value="">Any</option>{vocab.sampleTypes.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label><select className={selCls} value={filters.operator || ""} onChange={sf("operator")}><option value="">Any</option>{vocab.operators.map(o => <option key={o}>{o}</option>)}</select></div>
          </>)}
          {qtype === "experiment" && (<>
            <div className="flex flex-col gap-1 col-span-2"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label><input className={inputCls} placeholder="Search title…" value={filters.title || ""} onChange={sf("title")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drug Compound</label><select className={selCls} value={filters.compound || ""} onChange={sf("compound")}><option value="">Any</option>{vocab.compounds.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Allergen</label><select className={selCls} value={filters.allergen || ""} onChange={sf("allergen")}><option value="">Any</option>{vocab.allergens.map(a => <option key={a}>{a}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label><select className={selCls} value={filters.operator || ""} onChange={sf("operator")}><option value="">Any</option>{vocab.operators.map(o => <option key={o}>{o}</option>)}</select></div>
          </>)}
          {qtype === "result" && (<>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample ID</label><input className={inputCls} placeholder="SMP-…" value={filters.sampleId || ""} onChange={sf("sampleId")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outcome</label><select className={selCls} value={filters.outcome || ""} onChange={sf("outcome")}><option value="">Any</option>{OUTCOMES.map(o => <option key={o}>{o}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label><select className={selCls} value={filters.operator || ""} onChange={sf("operator")}><option value="">Any</option>{vocab.operators.map(o => <option key={o}>{o}</option>)}</select></div>
          </>)}
          {qtype === "compound" && (<>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compound ID</label><input className={inputCls} placeholder="ALG-…" value={filters.compoundId || ""} onChange={sf("compoundId")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</label><input className={inputCls} placeholder="Search name…" value={filters.name || ""} onChange={sf("name")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phase</label><select className={selCls} value={filters.phase || ""} onChange={sf("phase")}><option value="">Any</option>{vocab.phases.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mechanism</label><select className={selCls} value={filters.mechanism || ""} onChange={sf("mechanism")}><option value="">Any</option>{vocab.mechanisms.map(m => <option key={m}>{m}</option>)}</select></div>
          </>)}
          {qtype === "report" && (<>
            <div className="flex flex-col gap-1 col-span-2"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label><input className={inputCls} placeholder="Search report title…" value={filters.title || ""} onChange={sf("title")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label><select className={selCls} value={filters.operator || ""} onChange={sf("operator")}><option value="">Any</option>{vocab.operators.map(o => <option key={o}>{o}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drug Compound</label><select className={selCls} value={filters.compound || ""} onChange={sf("compound")}><option value="">Any</option>{vocab.compounds.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Allergen</label><select className={selCls} value={filters.allergen || ""} onChange={sf("allergen")}><option value="">Any</option>{vocab.allergens.map(a => <option key={a}>{a}</option>)}</select></div>
          </>)}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setRan(true)} type="button"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 transition-colors">
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          <button onClick={() => { setFilters({}); setRan(false); }} type="button"
            className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-muted-foreground text-xs rounded hover:bg-secondary transition-colors">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {ran && (
        <div className="bg-card border border-border rounded">
          {qtype === "sample" && (
            <>
              <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredSamples.length} samples</p></div>
              {filteredSamples.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No records match the filters.</p> : (
                <div className="divide-y divide-border">
                  {filteredSamples.map(rec => (
                    <div key={rec.id}>
                      <div className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                        <span className="font-mono text-xs text-muted-foreground w-44 shrink-0">{rec.id}</span>
                        <span className="text-sm flex-1 truncate">{rec.allergen}</span>
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{rec.sampleType}</span>
                        <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{rec.patientId}</span>
                        <button onClick={() => setExpandedHistory(expandedHistory === rec.id ? null : rec.id)}
                          className={cn("flex items-center gap-1 text-xs shrink-0 transition-colors", expandedHistory === rec.id ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                          <Clock className="w-3 h-3" />{rec.history.length}
                        </button>
                        <button onClick={() => toggleDetail(rec.id)}
                          className={cn("flex items-center gap-1 text-xs px-2.5 py-1 rounded border shrink-0 transition-colors", expandedDetail === rec.id ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground")}>
                          <ChevronDown className={cn("w-3 h-3 transition-transform", expandedDetail === rec.id && "rotate-180")} />
                          {expandedDetail === rec.id ? "Close" : "Open"}
                        </button>
                      </div>
                      {expandedDetail === rec.id && <SampleDetailPanel rec={rec} />}
                      {expandedHistory === rec.id && <HistoryPanel history={rec.history} />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {qtype === "experiment" && (
            <>
              <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredExps.length} experiments</p></div>
              {filteredExps.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No records match the filters.</p> : (
                <div className="divide-y divide-border">
                  {filteredExps.map(rec => (
                    <div key={rec.id}>
                      <div className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                        <span className="font-mono text-xs text-muted-foreground w-32 shrink-0">{rec.id}</span>
                        <span className="text-sm flex-1 truncate">{rec.title}</span>
                        <span className="font-mono text-xs text-primary shrink-0">{rec.compound}</span>
                        <span className="text-xs text-muted-foreground w-24 shrink-0">{rec.operator.split(" ").slice(-1)[0]}</span>
                        <button onClick={() => setExpandedHistory(expandedHistory === rec.id ? null : rec.id)}
                          className={cn("flex items-center gap-1 text-xs shrink-0 transition-colors", expandedHistory === rec.id ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                          <Clock className="w-3 h-3" />{rec.history.length}
                        </button>
                        <button onClick={() => toggleDetail(rec.id)}
                          className={cn("flex items-center gap-1 text-xs px-2.5 py-1 rounded border shrink-0 transition-colors", expandedDetail === rec.id ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground")}>
                          <ChevronDown className={cn("w-3 h-3 transition-transform", expandedDetail === rec.id && "rotate-180")} />
                          {expandedDetail === rec.id ? "Close" : "Open"}
                        </button>
                      </div>
                      {expandedDetail === rec.id && <ExperimentDetailPanel rec={rec} />}
                      {expandedHistory === rec.id && <HistoryPanel history={rec.history} />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {qtype === "result" && (
            <>
              <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredResults.length} results</p></div>
              {filteredResults.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No records match the filters.</p> : (
                <div className="divide-y divide-border">
                  {filteredResults.map(rec => (
                    <div key={rec.id}>
                      <div className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                        <span className="font-mono text-xs text-muted-foreground w-44 shrink-0">{rec.id}</span>
                        <span className="font-mono text-xs flex-1 truncate">{rec.sampleId}</span>
                        <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">{rec.testMethod}</span>
                        <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0",
                          rec.outcome === "Positive Response" || rec.outcome === "Full Inhibition" ? "bg-primary/10 text-primary" :
                          rec.outcome === "Inconclusive" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground")}>{rec.outcome}</span>
                        <button onClick={() => setExpandedHistory(expandedHistory === rec.id ? null : rec.id)}
                          className={cn("flex items-center gap-1 text-xs shrink-0 transition-colors", expandedHistory === rec.id ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                          <Clock className="w-3 h-3" />{rec.history.length}
                        </button>
                        <button onClick={() => toggleDetail(rec.id)}
                          className={cn("flex items-center gap-1 text-xs px-2.5 py-1 rounded border shrink-0 transition-colors", expandedDetail === rec.id ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground")}>
                          <ChevronDown className={cn("w-3 h-3 transition-transform", expandedDetail === rec.id && "rotate-180")} />
                          {expandedDetail === rec.id ? "Close" : "Open"}
                        </button>
                      </div>
                      {expandedDetail === rec.id && <ResultDetailPanel rec={rec} />}
                      {expandedHistory === rec.id && <HistoryPanel history={rec.history} />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {qtype === "compound" && (
            <>
              <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredCompounds.length} compounds</p></div>
              {filteredCompounds.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No records match the filters.</p> : (
                <div className="divide-y divide-border">
                  {filteredCompounds.map(rec => (
                    <div key={rec.id}>
                      <div className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                        <span className="font-mono text-xs font-medium text-primary w-24 shrink-0">{rec.compoundId}</span>
                        <span className="text-sm flex-1 truncate">{rec.name}</span>
                        <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">{rec.mechanism}</span>
                        <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0",
                          rec.phase === "Phase II" || rec.phase === "Approved" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{rec.phase}</span>
                        <button onClick={() => setExpandedHistory(expandedHistory === rec.id ? null : rec.id)}
                          className={cn("flex items-center gap-1 text-xs shrink-0 transition-colors", expandedHistory === rec.id ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                          <Clock className="w-3 h-3" />{rec.history.length}
                        </button>
                        <button onClick={() => toggleDetail(rec.id)}
                          className={cn("flex items-center gap-1 text-xs px-2.5 py-1 rounded border shrink-0 transition-colors", expandedDetail === rec.id ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground")}>
                          <ChevronDown className={cn("w-3 h-3 transition-transform", expandedDetail === rec.id && "rotate-180")} />
                          {expandedDetail === rec.id ? "Close" : "Open"}
                        </button>
                      </div>
                      {expandedDetail === rec.id && <CompoundDetailPanel rec={rec} />}
                      {expandedHistory === rec.id && <HistoryPanel history={rec.history} />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {qtype === "report" && (
            <>
              <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredReports.length} reports</p></div>
              {filteredReports.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No reports match the filters.</p> : (
                <div className="divide-y divide-border">
                  {filteredReports.map(rep => (
                    <div key={rep.id}>
                      <div
                        className="px-5 py-3 flex items-start gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleDetail(rep.id)}
                      >
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-medium text-foreground">{rep.title}</span>
                            <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0",
                              rep.outcome.startsWith("Positive") ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-700")}>{rep.phase}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
                            <span>{rep.id}</span><span>·</span><span>{rep.experimentId}</span><span>·</span><span>{rep.operator}</span><span>·</span><span>{rep.date}</span>
                          </div>
                        </div>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 transition-transform", expandedDetail === rep.id && "rotate-180")} />
                      </div>
                      {expandedDetail === rep.id && (
                        <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Abstract</p>
                          <p className="text-xs text-foreground leading-relaxed">{rep.abstract}</p>
                          <FieldGrid rows={[
                            { label: "Report ID", value: rep.id },
                            { label: "Experiment", value: rep.experimentId },
                            { label: "Operator", value: rep.operator },
                            { label: "Date", value: rep.date },
                            { label: "Allergen", value: rep.allergen },
                            { label: "Compound", value: rep.compound },
                            { label: "Phase", value: rep.phase },
                            { label: "Outcome", value: rep.outcome },
                          ]} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vocabulary Manager ───────────────────────────────────────────────────────

const VOCAB_CATEGORIES = [
  { key: "sampleTypes" as keyof Vocab, label: "Sample Types", hint: "e.g. Synovial Fluid" },
  { key: "allergens" as keyof Vocab, label: "Allergens", hint: "e.g. Cockroach Extract" },
  { key: "compounds" as keyof Vocab, label: "Drug Compounds", hint: "e.g. ALG-5003" },
  { key: "operators" as keyof Vocab, label: "Operators", hint: "e.g. Dr. Ana Souza" },
  { key: "protocols" as keyof Vocab, label: "Test Protocols", hint: "e.g. Western Blot (custom)" },
  { key: "mechanisms" as keyof Vocab, label: "Mechanisms of Action", hint: "e.g. PDE4 Inhibitor" },
  { key: "phases" as keyof Vocab, label: "Development Phases", hint: "e.g. Phase IV" },
];

function VocabularySection({ vocab, setVocab }: { vocab: Vocab; setVocab: React.Dispatch<React.SetStateAction<Vocab>> }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const add = (key: keyof Vocab) => {
    const val = (inputs[key] || "").trim();
    if (!val || vocab[key].includes(val)) return;
    setVocab(v => ({ ...v, [key]: [...v[key], val] }));
    setInputs(i => ({ ...i, [key]: "" }));
  };

  const remove = (key: keyof Vocab, val: string) => {
    setVocab(v => ({ ...v, [key]: v[key].filter(x => x !== val) }));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Manage Vocabularies</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add or remove options from dropdown menus across all forms</p>
      </div>
      {VOCAB_CATEGORIES.map(({ key, label, hint }) => (
        <div key={key} className="bg-card border border-border rounded p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h2>
          <div className="flex flex-wrap gap-2">
            {vocab[key].map(val => (
              <span key={val} className="flex items-center gap-1.5 text-xs bg-muted border border-border rounded px-2.5 py-1 font-mono">
                {val}
                <button onClick={() => remove(key, val)} className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <input
              className="flex-1 px-3 py-2 text-sm bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
              placeholder={hint}
              value={inputs[key] || ""}
              onChange={e => setInputs(i => ({ ...i, [key]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(key); } }}
            />
            <button onClick={() => add(key)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded shadow-lg text-sm font-medium pointer-events-auto bg-primary text-primary-foreground">
          <CheckCircle className="w-4 h-4 shrink-0" />{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const [vocab, setVocab] = useState<Vocab>(DEFAULT_VOCAB);
  const [samples, setSamples] = useState<SampleRecord[]>(DEMO_SAMPLES);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>(DEMO_EXPERIMENTS);
  const [results, setResults] = useState<ResultRecord[]>(DEMO_RESULTS);
  const [compounds, setCompounds] = useState<CompoundRecord[]>(DEMO_COMPOUNDS);
  const { toasts, success } = useToasts();

  const TITLES: Record<Section, string> = {
    dashboard: "Overview", samples: "Sample Registration", experiments: "Experiment Log",
    results: "Test Results", compounds: "Compound Records", query: "Search & Reports",
    vocabulary: "Manage Vocabularies",
  };

  const handleNav = (s: Section) => setSection(s);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active={section} onNav={handleNav} />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 shrink-0 bg-card border-b border-border flex items-center px-6 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>AllerGen Labs</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{TITLES[section]}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          {section === "dashboard" && <Dashboard samples={samples} onNav={handleNav} />}
          {section === "samples" && <SamplesSection records={samples} setRecords={setSamples} vocab={vocab} onSuccess={success} />}
          {section === "experiments" && <ExperimentLog records={experiments} setRecords={setExperiments} vocab={vocab} onSuccess={success} />}
          {section === "results" && <TestResults records={results} setRecords={setResults} vocab={vocab} onSuccess={success} />}
          {section === "compounds" && <CompoundRecords records={compounds} setRecords={setCompounds} vocab={vocab} onSuccess={success} />}
          {section === "query" && <QuerySection samples={samples} experiments={experiments} results={results} compounds={compounds} reports={DEMO_REPORTS} vocab={vocab} />}
          {section === "vocabulary" && <VocabularySection vocab={vocab} setVocab={setVocab} />}
        </main>
      </div>
      <ToastStack toasts={toasts} />
    </div>
  );
}
