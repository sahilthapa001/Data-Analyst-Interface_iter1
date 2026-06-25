import { useState, useRef, useCallback, useMemo } from "react";
import {
  BarChart2, FileText, Database, Search, ChevronRight, ChevronDown,
  Folder, FolderOpen, TestTube, Microscope, FlaskConical, Bell, User,
  LogOut, Download, Plus, X, Clock, Filter, TrendingUp, Minus,
  CheckCircle, Sliders, BookOpen, RefreshCw, LineChart as LineIcon,
  BarChart as BarIcon, AlertCircle, ExternalLink,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavSection = "explorer" | "analytics" | "query";
type QueryType = "sample" | "experiment" | "result" | "compound" | "report";

type TreeNode = {
  id: string;
  label: string;
  type: "study" | "experiment" | "sample-group" | "result-group" | "report-group" | "sample" | "result" | "report";
  meta?: string;
  status?: "active" | "complete" | "flagged" | "archived";
  children?: TreeNode[];
};

type ChartConfig = {
  chartType: "line" | "bar" | "scatter";
  xAxis: string;
  yMetric: string;
  groupBy: string;
  filterExperiment: string;
  filterCompound: string;
  filterAllergen: string;
  filterOperator: string;
  dateFrom: string;
  dateTo: string;
  title: string;
};

type ReportBlock = {
  id: string;
  chartTitle: string;
  config: ChartConfig;
  note: string;
};

type AnalystReport = {
  id: string; title: string; experimentId: string; operator: string; date: string;
  allergen: string; compound: string; outcome: string; phase: string; abstract: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ANALYST = { name: "Marcus Delacroix", id: "DA-1093" };

const ALLERGENS = ["House Dust Mite", "Cat Dander", "Dog Dander", "Pollen (Birch)", "Pollen (Grass)", "Pollen (Ragweed)", "Mold (Aspergillus)", "Peanut", "Tree Nut", "Egg", "Milk", "Wheat", "Latex"];
const COMPOUNDS = ["ALG-4521", "ALG-4522", "ALG-4523", "ALG-5001", "ALG-5002", "CTRL-PLACEBO"];
const OPERATORS = ["Dr. Elena Vasquez", "Dr. James Okafor", "Dr. Sarah Chen", "T. Müller (Technician)", "R. Patel (Technician)"];
const PROTOCOLS = ["IgE Immunoassay (ELISA)", "Basophil Activation Test", "Skin Prick Test Correlation", "Nasal Provocation", "Double-Blind Placebo-Controlled", "ISAC Microarray"];
const MECHANISMS = ["IgE Blocking", "Mast Cell Stabilizer", "Anti-Histamine", "IL-4/IL-13 Inhibitor", "JAK Inhibitor", "Biologic (mAb)", "Other"];
const PHASES = ["Discovery", "Pre-clinical", "Phase I", "Phase II", "Phase III", "Approved"];
const METHODS = ["ELISA (IgE)", "ELISA (IgG4)", "FACS / Flow Cytometry", "Luminex Multiplex", "Western Blot", "SPT Wheal Measurement", "PBMC Stimulation Assay"];
const OUTCOMES = ["Positive Response", "Negative Response", "Partial Inhibition", "Full Inhibition", "Inconclusive", "Requires Repeat"];

// ─── Chart catalogue ──────────────────────────────────────────────────────────

const X_AXES = [
  { key: "week", label: "Treatment Week" },
  { key: "dose", label: "Dose Concentration (μg/mL)" },
  { key: "allergen", label: "Allergen" },
  { key: "compound", label: "Drug Compound" },
  { key: "date", label: "Test Date (chronological)" },
  { key: "patient", label: "Patient" },
];

const Y_METRICS = [
  { key: "igE", label: "IgE Level", unit: "IU/mL" },
  { key: "inhibition", label: "% Inhibition", unit: "%" },
  { key: "histamine", label: "Histamine Release", unit: "%" },
  { key: "il4", label: "IL-4", unit: "pg/mL" },
  { key: "il13", label: "IL-13", unit: "pg/mL" },
  { key: "cellViability", label: "Cell Viability", unit: "%" },
  { key: "cd63", label: "CD63 (Basophil Activation)", unit: "%" },
  { key: "igG4", label: "IgG4 Level", unit: "mg/L" },
];

const GROUP_BY = [
  { key: "compound", label: "Compound" },
  { key: "allergen", label: "Allergen" },
  { key: "operator", label: "Operator" },
  { key: "none", label: "None (single series)" },
];

// Pre-computed datasets keyed by [xAxis][yMetric]
const CHART_DATA: Record<string, Record<string, { x: string | number; [k: string]: string | number }[]>> = {
  week: {
    igE: [
      { x: "W0",  "ALG-4521": 141.2, "CTRL-PLACEBO": 139.8, "ALG-4522": 138.5 },
      { x: "W2",  "ALG-4521": 118.4, "CTRL-PLACEBO": 141.3, "ALG-4522": 121.8 },
      { x: "W4",  "ALG-4521": 96.1,  "CTRL-PLACEBO": 140.7, "ALG-4522": 103.4 },
      { x: "W6",  "ALG-4521": 82.7,  "CTRL-PLACEBO": 142.1, "ALG-4522": 91.7  },
      { x: "W8",  "ALG-4521": 74.5,  "CTRL-PLACEBO": 139.4, "ALG-4522": 85.2  },
      { x: "W10", "ALG-4521": 68.3,  "CTRL-PLACEBO": 141.8, "ALG-4522": 80.1  },
      { x: "W12", "ALG-4521": 63.1,  "CTRL-PLACEBO": 140.2, "ALG-4522": 76.9  },
    ],
    inhibition: [
      { x: "W0",  "ALG-4521": 0,    "CTRL-PLACEBO": 0, "ALG-4522": 0    },
      { x: "W2",  "ALG-4521": 16.7, "CTRL-PLACEBO": 0, "ALG-4522": 12.1 },
      { x: "W4",  "ALG-4521": 31.9, "CTRL-PLACEBO": 0, "ALG-4522": 25.3 },
      { x: "W6",  "ALG-4521": 41.4, "CTRL-PLACEBO": 0, "ALG-4522": 33.8 },
      { x: "W8",  "ALG-4521": 47.3, "CTRL-PLACEBO": 0, "ALG-4522": 38.4 },
      { x: "W10", "ALG-4521": 51.7, "CTRL-PLACEBO": 0, "ALG-4522": 42.1 },
      { x: "W12", "ALG-4521": 55.3, "CTRL-PLACEBO": 0, "ALG-4522": 45.8 },
    ],
    il4: [
      { x: "W0",  "ALG-4521": 12.1, "CTRL-PLACEBO": 11.9, "ALG-4522": 12.3 },
      { x: "W2",  "ALG-4521": 10.4, "CTRL-PLACEBO": 12.2, "ALG-4522": 10.8 },
      { x: "W4",  "ALG-4521": 8.1,  "CTRL-PLACEBO": 12.0, "ALG-4522": 8.9  },
      { x: "W6",  "ALG-4521": 6.7,  "CTRL-PLACEBO": 11.8, "ALG-4522": 7.5  },
      { x: "W8",  "ALG-4521": 5.8,  "CTRL-PLACEBO": 12.1, "ALG-4522": 6.8  },
      { x: "W10", "ALG-4521": 5.2,  "CTRL-PLACEBO": 12.3, "ALG-4522": 6.3  },
      { x: "W12", "ALG-4521": 4.9,  "CTRL-PLACEBO": 12.0, "ALG-4522": 5.9  },
    ],
    histamine: [
      { x: "W0",  "ALG-4521": 37.8, "CTRL-PLACEBO": 38.1, "ALG-4522": 37.5 },
      { x: "W2",  "ALG-4521": 30.4, "CTRL-PLACEBO": 38.4, "ALG-4522": 32.1 },
      { x: "W4",  "ALG-4521": 25.2, "CTRL-PLACEBO": 38.0, "ALG-4522": 27.8 },
      { x: "W6",  "ALG-4521": 21.7, "CTRL-PLACEBO": 37.9, "ALG-4522": 24.3 },
      { x: "W8",  "ALG-4521": 19.4, "CTRL-PLACEBO": 38.2, "ALG-4522": 22.1 },
      { x: "W10", "ALG-4521": 18.7, "CTRL-PLACEBO": 37.8, "ALG-4522": 21.4 },
      { x: "W12", "ALG-4521": 18.2, "CTRL-PLACEBO": 38.0, "ALG-4522": 20.9 },
    ],
    cellViability: [
      { x: "W0",  "ALG-4521": 98.2, "CTRL-PLACEBO": 98.0, "ALG-4522": 97.9 },
      { x: "W4",  "ALG-4521": 97.8, "CTRL-PLACEBO": 98.1, "ALG-4522": 97.3 },
      { x: "W8",  "ALG-4521": 97.5, "CTRL-PLACEBO": 98.2, "ALG-4522": 96.9 },
      { x: "W12", "ALG-4521": 97.4, "CTRL-PLACEBO": 98.1, "ALG-4522": 96.5 },
    ],
  },
  dose: {
    inhibition: [
      { x: 2.5,  "ALG-4521": 28.3, "ALG-4522": 22.1, "ALG-5001": 14.7 },
      { x: 5,    "ALG-4521": 39.4, "ALG-4522": 33.8, "ALG-5001": 22.3 },
      { x: 10,   "ALG-4521": 48.7, "ALG-4522": 41.2, "ALG-5001": 31.5 },
      { x: 20,   "ALG-4521": 61.3, "ALG-4522": 55.9, "ALG-5001": 42.8 },
      { x: 50,   "ALG-4521": 74.2, "ALG-4522": 68.5, "ALG-5001": 53.9 },
    ],
    igE: [
      { x: 2.5,  "ALG-4521": 118.4, "ALG-4522": 124.1, "ALG-5001": 131.7 },
      { x: 5,    "ALG-4521": 101.3, "ALG-4522": 108.6, "ALG-5001": 119.4 },
      { x: 10,   "ALG-4521": 84.7,  "ALG-4522": 93.4,  "ALG-5001": 108.2 },
      { x: 20,   "ALG-4521": 70.2,  "ALG-4522": 79.8,  "ALG-5001": 96.4  },
      { x: 50,   "ALG-4521": 58.4,  "ALG-4522": 67.3,  "ALG-5001": 85.1  },
    ],
  },
  // allergen x-axis: columns = compound names (same scheme as week/dose — never metric names)
  allergen: {
    igE:          [{ x: "Cat Dander", "ALG-4521": 74.3,  "CTRL-PLACEBO": 140.2, "ALG-4522": 91.4  }, { x: "Birch Pollen", "ALG-4521": 96.4,  "CTRL-PLACEBO": 140.8, "ALG-4522": 108.3 }, { x: "Dust Mite",    "ALG-4521": 44.7,  "CTRL-PLACEBO": 139.6, "ALG-4522": 55.2  }, { x: "Grass Pollen", "ALG-4521": 108.2, "CTRL-PLACEBO": 141.1, "ALG-4522": 118.7 }, { x: "Peanut",       "ALG-4521": 131.2, "CTRL-PLACEBO": 140.5, "ALG-4522": 139.8 }, { x: "Ragweed",      "ALG-4521": 89.1,  "CTRL-PLACEBO": 140.3, "ALG-4522": 101.4 }],
    inhibition:   [{ x: "Cat Dander", "ALG-4521": 47.7, "CTRL-PLACEBO": 0, "ALG-4522": 35.4 }, { x: "Birch Pollen", "ALG-4521": 31.2, "CTRL-PLACEBO": 0, "ALG-4522": 23.1 }, { x: "Dust Mite",    "ALG-4521": 67.4, "CTRL-PLACEBO": 0, "ALG-4522": 60.2 }, { x: "Grass Pollen", "ALG-4521": 22.9, "CTRL-PLACEBO": 0, "ALG-4522": 15.7 }, { x: "Peanut",       "ALG-4521": 7.6,  "CTRL-PLACEBO": 0, "ALG-4522": 4.2  }, { x: "Ragweed",      "ALG-4521": 35.4, "CTRL-PLACEBO": 0, "ALG-4522": 28.1 }],
    histamine:    [{ x: "Cat Dander", "ALG-4521": 18.2, "CTRL-PLACEBO": 38.1, "ALG-4522": 24.3 }, { x: "Birch Pollen", "ALG-4521": 26.4, "CTRL-PLACEBO": 38.4, "ALG-4522": 30.1 }, { x: "Dust Mite",    "ALG-4521": 12.8, "CTRL-PLACEBO": 37.9, "ALG-4522": 16.4 }, { x: "Grass Pollen", "ALG-4521": 31.7, "CTRL-PLACEBO": 38.2, "ALG-4522": 33.8 }, { x: "Peanut",       "ALG-4521": 38.9, "CTRL-PLACEBO": 38.5, "ALG-4522": 38.3 }, { x: "Ragweed",      "ALG-4521": 24.3, "CTRL-PLACEBO": 38.0, "ALG-4522": 27.1 }],
    il4:          [{ x: "Cat Dander", "ALG-4521": 5.1,  "CTRL-PLACEBO": 12.1, "ALG-4522": 6.8  }, { x: "Birch Pollen", "ALG-4521": 8.3,  "CTRL-PLACEBO": 12.4, "ALG-4522": 9.7  }, { x: "Dust Mite",    "ALG-4521": 3.8,  "CTRL-PLACEBO": 11.8, "ALG-4522": 4.9  }, { x: "Grass Pollen", "ALG-4521": 10.2, "CTRL-PLACEBO": 12.3, "ALG-4522": 11.1 }, { x: "Peanut",       "ALG-4521": 11.8, "CTRL-PLACEBO": 12.1, "ALG-4522": 11.9 }, { x: "Ragweed",      "ALG-4521": 7.6,  "CTRL-PLACEBO": 12.2, "ALG-4522": 8.8  }],
    cellViability:[{ x: "Cat Dander", "ALG-4521": 97.4, "CTRL-PLACEBO": 98.2, "ALG-4522": 96.8 }, { x: "Birch Pollen", "ALG-4521": 95.1, "CTRL-PLACEBO": 98.0, "ALG-4522": 94.3 }, { x: "Dust Mite",    "ALG-4521": 96.8, "CTRL-PLACEBO": 98.1, "ALG-4522": 96.2 }, { x: "Grass Pollen", "ALG-4521": 94.3, "CTRL-PLACEBO": 97.8, "ALG-4522": 93.7 }, { x: "Peanut",       "ALG-4521": 91.0, "CTRL-PLACEBO": 98.2, "ALG-4522": 90.4 }, { x: "Ragweed",      "ALG-4521": 95.8, "CTRL-PLACEBO": 98.0, "ALG-4522": 95.1 }],
    cd63:         [{ x: "Cat Dander", "ALG-4521": 22.1, "CTRL-PLACEBO": 48.8, "ALG-4522": 31.4 }, { x: "Birch Pollen", "ALG-4521": 28.4, "CTRL-PLACEBO": 48.3, "ALG-4522": 35.2 }, { x: "Dust Mite",    "ALG-4521": 12.4, "CTRL-PLACEBO": 48.1, "ALG-4522": 19.7 }, { x: "Grass Pollen", "ALG-4521": 34.1, "CTRL-PLACEBO": 47.9, "ALG-4522": 40.3 }, { x: "Peanut",       "ALG-4521": 44.2, "CTRL-PLACEBO": 48.5, "ALG-4522": 46.8 }, { x: "Ragweed",      "ALG-4521": 26.7, "CTRL-PLACEBO": 48.2, "ALG-4522": 33.1 }],
    igG4:         [{ x: "Cat Dander", "ALG-4521": 2.41, "CTRL-PLACEBO": 0.79, "ALG-4522": 2.03 }, { x: "Birch Pollen", "ALG-4521": 1.84, "CTRL-PLACEBO": 0.81, "ALG-4522": 1.52 }, { x: "Dust Mite",    "ALG-4521": 2.87, "CTRL-PLACEBO": 0.80, "ALG-4522": 2.41 }, { x: "Grass Pollen", "ALG-4521": 1.42, "CTRL-PLACEBO": 0.79, "ALG-4522": 1.18 }, { x: "Peanut",       "ALG-4521": 0.91, "CTRL-PLACEBO": 0.78, "ALG-4522": 0.84 }, { x: "Ragweed",      "ALG-4521": 1.97, "CTRL-PLACEBO": 0.80, "ALG-4522": 1.63 }],
  },
  // compound x-axis: columns = week labels (consistent — never metric names)
  compound: {
    igE:          [{ x: "ALG-4521", "W4": 96.1,  "W8": 74.5,  "W12": 63.1  }, { x: "ALG-4522", "W4": 103.4, "W8": 85.2,  "W12": 76.9  }, { x: "ALG-5001", "W4": 116.8, "W8": 104.2, "W12": 92.4  }, { x: "CTRL-PLACEBO", "W4": 140.7, "W8": 139.4, "W12": 140.2 }],
    inhibition:   [{ x: "ALG-4521", "W4": 31.9, "W8": 47.3, "W12": 55.3 }, { x: "ALG-4522", "W4": 25.3, "W8": 38.4, "W12": 45.8 }, { x: "ALG-5001", "W4": 15.2, "W8": 22.7, "W12": 28.9 }, { x: "CTRL-PLACEBO", "W4": 0, "W8": 0, "W12": 0 }],
    histamine:    [{ x: "ALG-4521", "W4": 25.2, "W8": 19.4, "W12": 18.2 }, { x: "ALG-4522", "W4": 27.8, "W8": 22.1, "W12": 20.9 }, { x: "ALG-5001", "W4": 31.4, "W8": 27.2, "W12": 24.1 }, { x: "CTRL-PLACEBO", "W4": 38.0, "W8": 38.2, "W12": 38.0 }],
    il4:          [{ x: "ALG-4521", "W4": 8.1, "W8": 5.8, "W12": 4.9 }, { x: "ALG-4522", "W4": 8.9, "W8": 6.8, "W12": 5.9 }, { x: "ALG-5001", "W4": 10.4, "W8": 8.7, "W12": 7.6 }, { x: "CTRL-PLACEBO", "W4": 12.0, "W8": 12.1, "W12": 12.0 }],
    cellViability:[{ x: "ALG-4521", "W4": 97.8, "W8": 97.5, "W12": 97.4 }, { x: "ALG-4522", "W4": 97.3, "W8": 96.9, "W12": 96.5 }, { x: "ALG-5001", "W4": 96.1, "W8": 95.4, "W12": 94.1 }, { x: "CTRL-PLACEBO", "W4": 98.1, "W8": 98.2, "W12": 98.1 }],
    cd63:         [{ x: "ALG-4521", "W4": 31.2, "W8": 22.8, "W12": 14.2 }, { x: "ALG-4522", "W4": 36.7, "W8": 28.4, "W12": 19.7 }, { x: "ALG-5001", "W4": 42.1, "W8": 35.8, "W12": 28.4 }, { x: "CTRL-PLACEBO", "W4": 48.3, "W8": 47.9, "W12": 48.1 }],
    igG4:         [{ x: "ALG-4521", "W4": 1.24, "W8": 1.87, "W12": 2.41 }, { x: "ALG-4522", "W4": 1.08, "W8": 1.52, "W12": 2.03 }, { x: "ALG-5001", "W4": 0.74, "W8": 1.02, "W12": 1.38 }, { x: "CTRL-PLACEBO", "W4": 0.80, "W8": 0.81, "W12": 0.79 }],
  },
};

// ─── Demo records ─────────────────────────────────────────────────────────────

const DEMO_SAMPLES_A = [
  { id: "SMP-20260623-041", patientId: "PT-9912", collectionDate: "2026-06-23", sampleType: "Serum", allergen: "Cat Dander", compound: "ALG-4521", volume: "2.5 mL", operator: "Dr. Elena Vasquez", outcome: "Processed" },
  { id: "SMP-20260623-040", patientId: "PT-8831", collectionDate: "2026-06-23", sampleType: "Plasma", allergen: "Pollen (Birch)", compound: "ALG-4521", volume: "3.0 mL", operator: "Dr. Elena Vasquez", outcome: "Processed" },
  { id: "SMP-20260623-039", patientId: "PT-7720", collectionDate: "2026-06-23", sampleType: "Whole Blood", allergen: "Peanut", compound: "", volume: "5.0 mL", operator: "Dr. Elena Vasquez", outcome: "Flagged — haemolysis" },
  { id: "SMP-20260622-035", patientId: "PT-4401", collectionDate: "2026-06-22", sampleType: "Nasal Lavage", allergen: "House Dust Mite", compound: "ALG-4522", volume: "1.8 mL", operator: "Dr. James Okafor", outcome: "Processed" },
  { id: "SMP-20260622-034", patientId: "PT-3312", collectionDate: "2026-06-22", sampleType: "Serum", allergen: "Pollen (Grass)", compound: "ALG-4522", volume: "2.2 mL", operator: "Dr. Sarah Chen", outcome: "Processed" },
  { id: "SMP-20260621-028", patientId: "PT-6614", collectionDate: "2026-06-21", sampleType: "Plasma", allergen: "Cat Dander", compound: "ALG-4521", volume: "2.8 mL", operator: "Dr. Elena Vasquez", outcome: "Processed" },
  { id: "SMP-20260618-019", patientId: "PT-2201", collectionDate: "2026-06-18", sampleType: "Serum", allergen: "Peanut", compound: "ALG-5001", volume: "2.5 mL", operator: "Dr. Sarah Chen", outcome: "Processed" },
  { id: "SMP-20260615-012", patientId: "PT-5503", collectionDate: "2026-06-15", sampleType: "Bronchoalveolar Lavage", allergen: "Mold (Aspergillus)", compound: "ALG-4522", volume: "4.0 mL", operator: "Dr. James Okafor", outcome: "Processed" },
];

const DEMO_EXPERIMENTS_A = [
  { id: "EXP-2026-0041", title: "ALG-4521 Dose-Response in Cat Dander", compound: "ALG-4521", allergen: "Cat Dander", protocol: "IgE Immunoassay (ELISA)", operator: "Dr. Elena Vasquez", startDate: "2026-03-12", endDate: "2026-06-12", status: "Complete", phase: "Phase II", endpoint: "IgE reduction at 12 weeks", n: 40, inhibition: "55.3% mean", outcome: "Primary endpoint met" },
  { id: "EXP-2026-0038", title: "ALG-4522 PBMC Stimulation — Dust Mite", compound: "ALG-4522", allergen: "House Dust Mite", protocol: "Basophil Activation Test", operator: "Dr. James Okafor", startDate: "2026-01-08", endDate: "2026-04-08", status: "Complete", phase: "Pre-clinical", endpoint: "Basophil activation reduction", n: 30, inhibition: "67.1% mean", outcome: "CD63 suppression confirmed" },
  { id: "EXP-2025-0019", title: "ALG-5001 Peanut Allergen Screening", compound: "ALG-5001", allergen: "Peanut", protocol: "ISAC Microarray", operator: "Dr. Sarah Chen", startDate: "2025-11-03", endDate: "2026-02-03", status: "Complete", phase: "Discovery", endpoint: "Specific IgE component reduction", n: 24, inhibition: "28.9% mean", outcome: "Below 30% threshold — dose optimisation required" },
  { id: "EXP-2026-0058", title: "ALG-4521 12-Week Follow-up (Birch Pollen)", compound: "ALG-4521", allergen: "Pollen (Birch)", protocol: "IgE Immunoassay (ELISA)", operator: "Dr. Elena Vasquez", startDate: "2026-05-01", endDate: "", status: "Active", phase: "Phase II", endpoint: "IgE reduction at 12 weeks", n: 28, inhibition: "31.2% at W8", outcome: "Ongoing" },
  { id: "EXP-2025-0031", title: "ALG-4521 Safety & Tolerability — Phase I", compound: "ALG-4521", allergen: "Cat Dander", protocol: "Double-Blind Placebo-Controlled", operator: "Dr. Elena Vasquez", startDate: "2025-01-15", endDate: "2025-09-30", status: "Complete", phase: "Phase I", endpoint: "Safety clearance", n: 60, inhibition: "N/A", outcome: "No dose-limiting toxicities — Phase II approved" },
];

const DEMO_RESULTS_A = [
  { id: "RES-20260623-041", sampleId: "SMP-20260623-041", experimentId: "EXP-2026-0041", testDate: "2026-06-23", testMethod: "ELISA (IgE)", operator: "Dr. Elena Vasquez", measurements: [{ label: "IgE Level", value: "74.3", unit: "IU/mL" }, { label: "% Inhibition", value: "47.7", unit: "%" }, { label: "Histamine Release", value: "18.2", unit: "%" }, { label: "IL-4", value: "5.1", unit: "pg/mL" }], outcome: "Positive Response", confidence: "High (>95%)" },
  { id: "RES-20260623-039", sampleId: "SMP-20260623-039", experimentId: "EXP-2026-0041", testDate: "2026-06-23", testMethod: "ELISA (IgE)", operator: "Dr. Elena Vasquez", measurements: [{ label: "IgE Level", value: "131.2", unit: "IU/mL" }, { label: "% Inhibition", value: "7.6", unit: "%" }], outcome: "Inconclusive", confidence: "Low (<80%)" },
  { id: "RES-20260622-035", sampleId: "SMP-20260622-035", experimentId: "EXP-2026-0038", testDate: "2026-06-22", testMethod: "FACS / Flow Cytometry", operator: "Dr. James Okafor", measurements: [{ label: "CD63 (Basophil)", value: "12.4", unit: "%" }, { label: "% Inhibition", value: "67.1", unit: "%" }, { label: "Cell Viability", value: "96.8", unit: "%" }], outcome: "Positive Response", confidence: "High (>95%)" },
  { id: "RES-20260621-028", sampleId: "SMP-20260621-028", experimentId: "EXP-2026-0041", testDate: "2026-06-21", testMethod: "ELISA (IgE)", operator: "Dr. Elena Vasquez", measurements: [{ label: "IgE Level", value: "68.8", unit: "IU/mL" }, { label: "% Inhibition", value: "51.5", unit: "%" }], outcome: "Positive Response", confidence: "High (>95%)" },
  { id: "RES-20260618-019", sampleId: "SMP-20260618-019", experimentId: "EXP-2025-0019", testDate: "2026-06-18", testMethod: "ISAC Microarray", operator: "Dr. Sarah Chen", measurements: [{ label: "IgE Level", value: "102.4", unit: "IU/mL" }, { label: "% Inhibition", value: "28.9", unit: "%" }], outcome: "Partial Inhibition", confidence: "Moderate (80–95%)" },
  { id: "RES-20260615-012", sampleId: "SMP-20260615-012", experimentId: "EXP-2026-0038", testDate: "2026-06-15", testMethod: "Luminex Multiplex", operator: "Dr. James Okafor", measurements: [{ label: "IL-4", value: "3.8", unit: "pg/mL" }, { label: "IL-13", value: "4.1", unit: "pg/mL" }, { label: "Cell Viability", value: "96.2", unit: "%" }], outcome: "Positive Response", confidence: "High (>95%)" },
];

const DEMO_COMPOUNDS_A = [
  { id: "ALG-4521", name: "Algezitinib", cas: "2341876-12-4", formula: "C22H24FN5O3", mw: "441.46 g/mol", mechanism: "IL-4/IL-13 Inhibitor", targetAllergen: "Inhalant Allergens (broad)", phase: "Phase II", purity: "99.20%", manufacturer: "ChemBridge Corp.", expiryDate: "2027-03-01", notes: "Primary candidate." },
  { id: "ALG-4522", name: "Brometazolide", cas: "1987432-05-2", formula: "C18H19BrN4O2", mw: "419.27 g/mol", mechanism: "Mast Cell Stabilizer", targetAllergen: "House Dust Mite", phase: "Pre-clinical", purity: "98.50%", manufacturer: "Sigma-Aldrich", expiryDate: "2026-12-31", notes: "" },
  { id: "ALG-5001", name: "Vexopalimab", cas: "2509341-77-1", formula: "C19H22N6O2", mw: "382.41 g/mol", mechanism: "IgE Blocking", targetAllergen: "Peanut", phase: "Discovery", purity: "97.80%", manufacturer: "Enamine Ltd.", expiryDate: "2028-01-15", notes: "Promising Ara h 2 binding." },
  { id: "CTRL-PLACEBO", name: "Microcrystalline Cellulose", cas: "9004-34-6", formula: "C6H10O5·n", mw: "—", mechanism: "Other", targetAllergen: "—", phase: "Approved", purity: "99.90%", manufacturer: "FMC BioPolymer", expiryDate: "2028-11-01", notes: "Control arm for all blinded trials." },
];

const INIT_REPORTS: AnalystReport[] = [
  { id: "RPT-2026-Q2-001", title: "Q2 2026 Interim Analysis — ALG-4521 Phase II", experimentId: "EXP-2026-0041", operator: "Marcus Delacroix", date: "2026-06-15", allergen: "Cat Dander", compound: "ALG-4521", outcome: "Positive — primary endpoint met", phase: "Phase II", abstract: "ALG-4521 demonstrated statistically significant IgE reduction at W12 across all dose cohorts. Mean inhibition 48.7% (95% CI 42.1–55.3%) vs. placebo 3.2%. No serious adverse events reported." },
  { id: "RPT-2026-Q1-002", title: "ALG-4522 Basophil Activation Study — Full Report", experimentId: "EXP-2026-0038", operator: "Marcus Delacroix", date: "2026-04-20", allergen: "House Dust Mite", compound: "ALG-4522", outcome: "Positive — CD63 suppression confirmed", phase: "Pre-clinical", abstract: "ALG-4522 at 5μg/mL achieved 67% mean CD63 reduction vs. baseline. Cell viability maintained above 95% in all treatment groups." },
  { id: "RPT-2025-Q4-003", title: "ALG-5001 Peanut Screening — Phase Report", experimentId: "EXP-2025-0019", operator: "Dr. Sarah Chen", date: "2026-02-10", allergen: "Peanut", compound: "ALG-5001", outcome: "Partial — component IgE reduction observed", phase: "Discovery", abstract: "Ara h 2 specific IgE reduced by 28%. Promising structural binding data warrants dose optimisation before advancing." },
  { id: "RPT-2025-Q3-004", title: "ALG-4521 Safety & Tolerability — Phase I Completion", experimentId: "EXP-2025-0031", operator: "Marcus Delacroix", date: "2025-09-30", allergen: "Cat Dander", compound: "ALG-4521", outcome: "Positive — cleared for Phase II", phase: "Phase I", abstract: "No dose-limiting toxicities observed across all 3 cohorts. Phase II initiation approved by safety committee." },
];

// ─── Tree data ─────────────────────────────────────────────────────────────────

const TREE_DATA: TreeNode[] = [
  {
    id: "study-alg4521", label: "ALG-4521 / Phase II", type: "study", status: "active",
    children: [
      {
        id: "exp-alg4521-01", label: "EXP-2026-0041 — Dose-Response (Cat Dander)", type: "experiment", meta: "Mar–Jun 2026 · n=40", status: "complete",
        children: [
          { id: "sg-alg4521-01", label: "Samples (n=40)", type: "sample-group", children: [
            { id: "smp-001", label: "SMP-20260312-001 · Serum · PT-9912", type: "sample", status: "complete" },
            { id: "smp-002", label: "SMP-20260312-002 · Plasma · PT-8831", type: "sample", status: "complete" },
            { id: "smp-003", label: "SMP-20260312-003 · Whole Blood · PT-7720", type: "sample", status: "flagged" },
            { id: "smp-004", label: "SMP-20260312-004 · Serum · PT-9205", type: "sample", status: "complete" },
            { id: "smp-005", label: "SMP-20260312-005 · Plasma · PT-6614", type: "sample", status: "complete" },
            { id: "smp-006", label: "SMP-20260312-006 · Serum · PT-3410", type: "sample", status: "complete" },
            { id: "smp-007", label: "SMP-20260312-007 · Nasal Lavage · PT-2201", type: "sample", status: "complete" },
          ]},
          { id: "rg-alg4521-01", label: "Results — ELISA (IgE)", type: "result-group", children: [
            { id: "res-001", label: "RES-20260325-001 · IgE 74.3 IU/mL · Inhibition 47.7%", type: "result", status: "complete" },
            { id: "res-002", label: "RES-20260325-002 · IgE 68.8 IU/mL · Inhibition 51.5%", type: "result", status: "complete" },
            { id: "res-003", label: "RES-20260325-003 · IgE 131.2 IU/mL · Inconclusive", type: "result", status: "flagged" },
            { id: "res-004", label: "RES-20260401-004 · IgE 71.2 IU/mL · Inhibition 49.9%", type: "result", status: "complete" },
            { id: "res-005", label: "RES-20260401-005 · IgE 66.4 IU/mL · Inhibition 53.0%", type: "result", status: "complete" },
          ]},
          { id: "rpg-alg4521-01", label: "Reports", type: "report-group", children: [
            { id: "rpt-001", label: "RPT-2026-Q2-001 · Q2 Interim Analysis", type: "report", status: "complete" },
            { id: "rpt-004", label: "RPT-2025-Q3-004 · Phase I Completion", type: "report", status: "complete" },
          ]},
        ],
      },
      {
        id: "exp-alg4521-02", label: "EXP-2026-0058 — 12-Week Follow-up (Birch Pollen)", type: "experiment", meta: "May 2026 – ongoing · n=28", status: "active",
        children: [
          { id: "sg-alg4521-02", label: "Samples (n=28)", type: "sample-group", children: [
            { id: "smp-010", label: "SMP-20260501-010 · Nasal Lavage · PT-4401", type: "sample", status: "complete" },
            { id: "smp-011", label: "SMP-20260501-011 · Serum · PT-3312", type: "sample", status: "active" },
            { id: "smp-012", label: "SMP-20260501-012 · Plasma · PT-8110", type: "sample", status: "active" },
            { id: "smp-013", label: "SMP-20260501-013 · Serum · PT-6620", type: "sample", status: "complete" },
          ]},
          { id: "rg-alg4521-02", label: "Results — Luminex Multiplex", type: "result-group", children: [
            { id: "res-010", label: "RES-20260620-010 · IL-4 Reduction 31%", type: "result", status: "active" },
            { id: "res-011", label: "RES-20260620-011 · IL-13 Reduction 28%", type: "result", status: "active" },
          ]},
          { id: "rpg-alg4521-02", label: "Reports", type: "report-group", children: [] },
        ],
      },
      {
        id: "exp-alg4521-03", label: "EXP-2025-0031 — Safety & Tolerability Phase I", type: "experiment", meta: "Jan–Sep 2025 · n=60", status: "complete",
        children: [
          { id: "sg-alg4521-03", label: "Samples (n=60)", type: "sample-group", children: [
            { id: "smp-020", label: "SMP-20250115-020 · Serum · PT-1101", type: "sample", status: "complete" },
            { id: "smp-021", label: "SMP-20250115-021 · Plasma · PT-2203", type: "sample", status: "complete" },
            { id: "smp-022", label: "SMP-20250115-022 · Whole Blood · PT-3305", type: "sample", status: "complete" },
          ]},
          { id: "rg-alg4521-03", label: "Results — Safety Panel", type: "result-group", children: [
            { id: "res-020", label: "RES-20250930-020 · No adverse events", type: "result", status: "complete" },
            { id: "res-021", label: "RES-20250930-021 · PK profile normal", type: "result", status: "complete" },
            { id: "res-022", label: "RES-20250930-022 · Liver enzymes normal", type: "result", status: "complete" },
          ]},
          { id: "rpg-alg4521-03", label: "Reports", type: "report-group", children: [
            { id: "rpt-004b", label: "RPT-2025-Q3-004 · Phase I Safety Report", type: "report", status: "complete" },
          ]},
        ],
      },
    ],
  },
  {
    id: "study-alg4522", label: "ALG-4522 / Pre-clinical", type: "study", status: "active",
    children: [
      {
        id: "exp-alg4522-01", label: "EXP-2026-0038 — PBMC Stimulation (Dust Mite)", type: "experiment", meta: "Jan–Apr 2026 · n=30", status: "complete",
        children: [
          { id: "sg-alg4522-01", label: "Samples (n=30)", type: "sample-group", children: [
            { id: "smp-030", label: "SMP-20260108-030 · Nasal Lavage · PT-4401", type: "sample", status: "complete" },
            { id: "smp-031", label: "SMP-20260108-031 · Serum · PT-5503", type: "sample", status: "complete" },
            { id: "smp-032", label: "SMP-20260108-032 · Bronchoalveolar Lavage · PT-6605", type: "sample", status: "complete" },
            { id: "smp-033", label: "SMP-20260108-033 · Plasma · PT-7707", type: "sample", status: "complete" },
          ]},
          { id: "rg-alg4522-01", label: "Results — Flow Cytometry", type: "result-group", children: [
            { id: "res-030", label: "RES-20260220-030 · CD63 −67% · Cell Viability 96.8%", type: "result", status: "complete" },
            { id: "res-031", label: "RES-20260220-031 · CD63 −71% · Cell Viability 97.1%", type: "result", status: "complete" },
            { id: "res-032", label: "RES-20260315-032 · IL-4 −3.8 pg/mL", type: "result", status: "complete" },
          ]},
          { id: "rpg-alg4522-01", label: "Reports", type: "report-group", children: [
            { id: "rpt-010", label: "RPT-2026-Q1-002 · Basophil Activation Full Report", type: "report", status: "complete" },
          ]},
        ],
      },
      {
        id: "exp-alg4522-02", label: "EXP-2026-0044 — Dose Escalation (Dust Mite)", type: "experiment", meta: "Jun 2026 – ongoing · n=15", status: "active",
        children: [
          { id: "sg-alg4522-02", label: "Samples (n=15)", type: "sample-group", children: [
            { id: "smp-040", label: "SMP-20260610-040 · Serum · PT-3312", type: "sample", status: "active" },
            { id: "smp-041", label: "SMP-20260610-041 · Plasma · PT-4414", type: "sample", status: "active" },
          ]},
          { id: "rg-alg4522-02", label: "Results — ELISA (IgE)", type: "result-group", children: [
            { id: "res-040", label: "RES-20260615-040 · IgE 88.2 IU/mL · Inh. 41%", type: "result", status: "active" },
          ]},
          { id: "rpg-alg4522-02", label: "Reports", type: "report-group", children: [] },
        ],
      },
    ],
  },
  {
    id: "study-alg5001", label: "ALG-5001 / Discovery", type: "study", status: "active",
    children: [
      {
        id: "exp-alg5001-01", label: "EXP-2025-0019 — Peanut Allergen Screening", type: "experiment", meta: "Nov 2025 – Feb 2026 · n=24", status: "complete",
        children: [
          { id: "sg-alg5001-01", label: "Samples (n=24)", type: "sample-group", children: [
            { id: "smp-050", label: "SMP-20251103-050 · Serum · PT-1101", type: "sample", status: "complete" },
            { id: "smp-051", label: "SMP-20251103-051 · Plasma · PT-2202", type: "sample", status: "complete" },
            { id: "smp-052", label: "SMP-20251103-052 · Whole Blood · PT-3303", type: "sample", status: "complete" },
          ]},
          { id: "rg-alg5001-01", label: "Results — ISAC Microarray", type: "result-group", children: [
            { id: "res-050", label: "RES-20260115-050 · IgE 102.4 IU/mL · Inh. 28.9%", type: "result", status: "complete" },
            { id: "res-051", label: "RES-20260115-051 · Ara h 2 IgE −28%", type: "result", status: "complete" },
            { id: "res-052", label: "RES-20260201-052 · Cell Viability 94.1%", type: "result", status: "complete" },
          ]},
          { id: "rpg-alg5001-01", label: "Reports", type: "report-group", children: [
            { id: "rpt-020", label: "RPT-2025-Q4-003 · Peanut Screening Phase Report", type: "report", status: "complete" },
          ]},
        ],
      },
      {
        id: "exp-alg5001-02", label: "EXP-2026-0071 — IL-4 Pathway Analysis (Peanut)", type: "experiment", meta: "Jun 2026 – ongoing · n=12", status: "active",
        children: [
          { id: "sg-alg5001-02", label: "Samples (n=12)", type: "sample-group", children: [
            { id: "smp-060", label: "SMP-20260610-060 · Serum · PT-4405", type: "sample", status: "active" },
            { id: "smp-061", label: "SMP-20260610-061 · Nasal Lavage · PT-5506", type: "sample", status: "active" },
          ]},
          { id: "rg-alg5001-02", label: "Results — Luminex Multiplex", type: "result-group", children: [
            { id: "res-060", label: "RES-20260620-060 · IL-4 9.4 pg/mL", type: "result", status: "active" },
          ]},
          { id: "rpg-alg5001-02", label: "Reports", type: "report-group", children: [] },
        ],
      },
    ],
  },
  {
    id: "study-ctrl", label: "CTRL Archive / Historical", type: "study", status: "archived",
    children: [
      {
        id: "exp-ctrl-01", label: "EXP-2023-0005 — Baseline IgE Survey", type: "experiment", meta: "Completed Nov 2023 · n=120", status: "archived",
        children: [
          { id: "sg-ctrl-01", label: "Samples (n=120)", type: "sample-group", children: [
            { id: "smp-070", label: "SMP-20230901-070 · Serum · PT-8801", type: "sample", status: "archived" },
            { id: "smp-071", label: "SMP-20230901-071 · Plasma · PT-8802", type: "sample", status: "archived" },
            { id: "smp-072", label: "SMP-20230901-072 · Whole Blood · PT-8803", type: "sample", status: "archived" },
          ]},
          { id: "rg-ctrl-01", label: "Results — ELISA (IgE)", type: "result-group", children: [
            { id: "res-070", label: "RES-20231101-070 · Baseline IgE 142 IU/mL avg", type: "result", status: "archived" },
            { id: "res-071", label: "RES-20231101-071 · Histamine Baseline 38.4% avg", type: "result", status: "archived" },
          ]},
          { id: "rpg-ctrl-01", label: "Reports", type: "report-group", children: [
            { id: "rpt-030", label: "RPT-2023-Annual · Baseline Reference Panel", type: "report", status: "archived" },
          ]},
        ],
      },
      {
        id: "exp-ctrl-02", label: "EXP-2022-0018 — Pre-study Allergen Panel", type: "experiment", meta: "Completed Mar 2022 · n=80", status: "archived",
        children: [
          { id: "sg-ctrl-02", label: "Samples (n=80)", type: "sample-group", children: [
            { id: "smp-080", label: "SMP-20220201-080 · Serum · PT-7701", type: "sample", status: "archived" },
            { id: "smp-081", label: "SMP-20220201-081 · Plasma · PT-7702", type: "sample", status: "archived" },
          ]},
          { id: "rg-ctrl-02", label: "Results — SPT Wheal", type: "result-group", children: [
            { id: "res-080", label: "RES-20220310-080 · SPT Cat Dander 8.4 mm avg", type: "result", status: "archived" },
            { id: "res-081", label: "RES-20220310-081 · SPT Dust Mite 11.2 mm avg", type: "result", status: "archived" },
            { id: "res-082", label: "RES-20220310-082 · SPT Pollen 9.7 mm avg", type: "result", status: "archived" },
          ]},
          { id: "rpg-ctrl-02", label: "Reports", type: "report-group", children: [
            { id: "rpt-040", label: "RPT-2022-Panel · Pre-study Allergen Baseline", type: "report", status: "archived" },
          ]},
        ],
      },
    ],
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false)[]) { return classes.filter(Boolean).join(" "); }

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
  const map: Record<string, string> = { active: "bg-emerald-400", complete: "bg-primary", flagged: "bg-amber-400", archived: "bg-muted-foreground" };
  return status ? <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 ml-auto", map[status])} /> : null;
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNodeRow({ node, depth, selected, onSelect }: { node: TreeNode; depth: number; selected: string | null; onSelect: (id: string) => void }) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const [open, setOpen] = useState(depth < 1);
  return (
    <div>
      <div onClick={() => { if (hasChildren) setOpen(o => !o); onSelect(node.id); }}
        className={cn("flex items-center gap-1.5 py-[5px] pr-2 rounded cursor-pointer select-none transition-colors", selected === node.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground")}
        style={{ paddingLeft: `${8 + depth * 14}px` }}>
        <span className="w-3 shrink-0">{hasChildren ? (open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />) : null}</span>
        {nodeIcon(node.type, open)}
        <span className={cn("text-xs truncate flex-1", hasChildren ? "font-medium" : "font-normal")}>{node.label}</span>
        {statusDot(node.status)}
      </div>
      {open && hasChildren && node.children!.map(c => <TreeNodeRow key={c.id} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />)}
    </div>
  );
}

// ─── Field Grid (shared detail component) ─────────────────────────────────────

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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "explorer", label: "DB Explorer", Icon: Database },
  { id: "analytics", label: "Analytics", Icon: BarChart2 },
  { id: "query", label: "Query & Reports", Icon: Search },
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
            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors text-left", active === id ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white")}>
            <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
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
          <button className="ml-auto text-sidebar-foreground hover:text-white transition-colors"><LogOut className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </aside>
  );
}

// ─── DB Explorer ──────────────────────────────────────────────────────────────

function ExplorerSection() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return TREE_DATA;
    const q = search.toLowerCase();
    function f(n: TreeNode): TreeNode | null {
      const match = n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);
      const kids = (n.children || []).map(f).filter(Boolean) as TreeNode[];
      return (match || kids.length) ? { ...n, children: kids } : null;
    }
    return TREE_DATA.map(f).filter(Boolean) as TreeNode[];
  }, [search]);

  // Find selected node for detail
  const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) { const found = findNode(n.children, id); if (found) return found; }
    }
    return null;
  };
  const node = selected ? findNode(TREE_DATA, selected) : null;

  return (
    <div className="flex flex-1 min-h-0">
      {/* Tree */}
      <div className="flex flex-col border-r border-border bg-card" style={{ width: 288, minWidth: 240 }}>
        <div className="px-3 py-3 border-b border-border space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Database Explorer</p>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input className="w-full pl-7 pr-7 py-1.5 text-xs bg-muted border border-border rounded focus:outline-none focus:border-primary transition-all"
              placeholder="Search studies, samples…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>}
          </div>
        </div>
        <div className="px-3 py-2 border-b border-border flex items-center gap-3 flex-wrap">
          {[{ color: "bg-emerald-400", label: "Active" }, { color: "bg-primary", label: "Complete" }, { color: "bg-amber-400", label: "Flagged" }, { color: "bg-muted-foreground", label: "Archived" }].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1"><span className={cn("w-1.5 h-1.5 rounded-full", color)} /><span className="text-[10px] text-muted-foreground">{label}</span></span>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto py-1 px-1">
          {filtered.map(n => <TreeNodeRow key={n.id} node={n} depth={0} selected={selected} onSelect={setSelected} />)}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!node ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Database className="w-8 h-8 opacity-20" />
            <p className="text-sm">Select a record from the explorer to view details</p>
          </div>
        ) : (
          <div className="max-w-xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {nodeIcon(node.type, false)}
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{node.type.replace("-", " ")}</span>
                  {node.status && <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded",
                    node.status === "active" ? "bg-emerald-50 text-emerald-700" :
                    node.status === "complete" ? "bg-primary/10 text-primary" :
                    node.status === "flagged" ? "bg-amber-50 text-amber-700" :
                    "bg-muted text-muted-foreground")}>{node.status}</span>}
                </div>
                <h2 className="text-base font-semibold text-foreground leading-snug">{node.label}</h2>
                {node.meta && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{node.meta}</p>}
              </div>
              <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>

            {/* Node-type specific detail */}
            {node.type === "study" && (() => {
              const exp = DEMO_EXPERIMENTS_A.find(e => e.compound === node.id.replace("study-","").replace("alg","ALG-").toUpperCase().replace(/(\d)(\d)/, "$1$2")) ||
                DEMO_EXPERIMENTS_A.find(e => node.label.includes(e.compound));
              return (
                <div className="bg-card border border-border rounded divide-y divide-border">
                  <div className="px-4 py-2.5 flex gap-4"><span className="text-xs text-muted-foreground w-28 shrink-0">Experiments</span><span className="text-xs font-mono text-foreground">{(node.children || []).length} logged</span></div>
                  <div className="px-4 py-2.5 flex gap-4"><span className="text-xs text-muted-foreground w-28 shrink-0">Status</span><span className="text-xs font-mono text-foreground">{node.status}</span></div>
                </div>
              );
            })()}

            {(node.type === "experiment") && (() => {
              const exp = DEMO_EXPERIMENTS_A.find(e => node.label.includes(e.id) || node.id.includes(e.id.toLowerCase().replace(/-/g, "")));
              if (!exp) return null;
              return (
                <div className="bg-card border border-border rounded divide-y divide-border">
                  {[["Compound", exp.compound], ["Allergen", exp.allergen], ["Protocol", exp.protocol], ["Operator", exp.operator], ["Start Date", exp.startDate], ["End Date", exp.endDate || "Ongoing"], ["Phase", exp.phase], ["n =", String(exp.n)], ["Primary Endpoint", exp.endpoint], ["Inhibition (mean)", exp.inhibition], ["Outcome", exp.outcome]].map(([k, v]) => (
                    <div key={k} className="px-4 py-2.5 flex gap-4"><span className="text-xs text-muted-foreground w-28 shrink-0">{k}</span><span className="text-xs font-mono text-foreground flex-1">{v}</span></div>
                  ))}
                </div>
              );
            })()}

            {(node.type === "sample-group" || node.type === "result-group" || node.type === "report-group") && (
              <div className="bg-card border border-border rounded p-5 text-center">
                <p className="text-sm text-muted-foreground">{(node.children?.length ?? 0) === 0 ? "This folder is empty." : `Contains ${node.children?.length} items. Expand in the tree to browse.`}</p>
              </div>
            )}

            {node.type === "sample" && (() => {
              const s = DEMO_SAMPLES_A.find(r => node.label.includes(r.id));
              if (!s) return <div className="bg-card border border-border rounded p-4"><p className="text-xs text-muted-foreground">{node.label}</p></div>;
              return <div className="bg-card border border-border rounded divide-y divide-border">
                {[["Sample ID", s.id], ["Patient ID", s.patientId], ["Collection Date", s.collectionDate], ["Sample Type", s.sampleType], ["Allergen", s.allergen], ["Drug Compound", s.compound || "None"], ["Volume", s.volume], ["Operator", s.operator], ["Status", s.outcome]].map(([k, v]) => (
                  <div key={k} className="px-4 py-2.5 flex gap-4"><span className="text-xs text-muted-foreground w-28 shrink-0">{k}</span><span className="text-xs font-mono text-foreground">{v}</span></div>
                ))}
              </div>;
            })()}

            {node.type === "result" && (() => {
              const r = DEMO_RESULTS_A.find(r => node.label.includes(r.id));
              if (!r) return <div className="bg-card border border-border rounded p-4"><p className="text-xs text-muted-foreground">{node.label}</p></div>;
              return <div className="bg-card border border-border rounded divide-y divide-border">
                {[["Result ID", r.id], ["Sample Ref", r.sampleId], ["Experiment", r.experimentId], ["Test Date", r.testDate], ["Method", r.testMethod], ["Operator", r.operator], ["Outcome", r.outcome], ["Confidence", r.confidence]].map(([k, v]) => (
                  <div key={k} className="px-4 py-2.5 flex gap-4"><span className="text-xs text-muted-foreground w-28 shrink-0">{k}</span><span className="text-xs font-mono text-foreground">{v}</span></div>
                ))}
                {r.measurements.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Measurements</p>
                    <div className="flex flex-wrap gap-2">
                      {r.measurements.map(m => <span key={m.label} className="text-xs bg-muted border border-border rounded px-2.5 py-1 font-mono">{m.label}: <strong>{m.value}</strong> {m.unit}</span>)}
                    </div>
                  </div>
                )}
              </div>;
            })()}

            {node.type === "report" && (() => {
              const rpt = INIT_REPORTS.find(r => node.label.includes(r.id));
              if (!rpt) return <div className="bg-card border border-border rounded p-4"><p className="text-xs text-muted-foreground">{node.label}</p></div>;
              return <div className="bg-card border border-border rounded divide-y divide-border">
                {[["Report ID", rpt.id], ["Experiment", rpt.experimentId], ["Compound", rpt.compound], ["Allergen", rpt.allergen], ["Operator", rpt.operator], ["Date", rpt.date], ["Phase", rpt.phase], ["Outcome", rpt.outcome]].map(([k, v]) => (
                  <div key={k} className="px-4 py-2.5 flex gap-4"><span className="text-xs text-muted-foreground w-28 shrink-0">{k}</span><span className="text-xs font-mono text-foreground">{v}</span></div>
                ))}
                <div className="px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Abstract</p><p className="text-xs text-foreground leading-relaxed">{rpt.abstract}</p></div>
              </div>;
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#006D77", "#83C5BE", "#E29578", "#B0BEC5", "#9C27B0", "#FF9800"];
const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 4, border: "1px solid rgba(15,25,35,0.1)", boxShadow: "none" };

const DEFAULT_CONFIG: ChartConfig = {
  chartType: "line", xAxis: "week", yMetric: "igE", groupBy: "compound",
  filterExperiment: "", filterCompound: "", filterAllergen: "", filterOperator: "",
  dateFrom: "", dateTo: "", title: "",
};

function getChartData(config: ChartConfig) {
  const raw = CHART_DATA[config.xAxis]?.[config.yMetric] || CHART_DATA[config.xAxis]?.["igE"] || [];
  // Apply compound filter
  if (config.filterCompound && raw.length > 0 && raw[0][config.filterCompound] !== undefined) {
    return raw.map(row => ({ x: row.x, [config.filterCompound]: row[config.filterCompound] }));
  }
  return raw;
}

function getSeriesKeys(data: Record<string, unknown>[]): string[] {
  if (!data.length) return [];
  // Deduplicate to prevent recharts from receiving sibling elements with the same key
  return [...new Set(Object.keys(data[0]).filter(k => k !== "x"))];
}

function autoTitle(config: ChartConfig) {
  const xLabel = X_AXES.find(a => a.key === config.xAxis)?.label || config.xAxis;
  const yLabel = Y_METRICS.find(m => m.key === config.yMetric)?.label || config.yMetric;
  const yUnit = Y_METRICS.find(m => m.key === config.yMetric)?.unit || "";
  return `${yLabel} (${yUnit}) vs ${xLabel}`;
}

function AnalyticsSection({ reports, setReports }: { reports: AnalystReport[]; setReports: React.Dispatch<React.SetStateAction<AnalystReport[]>> }) {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [showFilters, setShowFilters] = useState(false);
  const [reportBlocks, setReportBlocks] = useState<ReportBlock[]>([]);
  const [reportTitle, setReportTitle] = useState("");
  const [reportAbstract, setReportAbstract] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const sc = (k: keyof ChartConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setConfig(c => ({ ...c, [k]: e.target.value }));

  // KPI: inhibition compound selector
  const [kpiCompound, setKpiCompound] = useState("ALG-4521");
  // Data quality panel expand state
  const [expandedFlagged, setExpandedFlagged] = useState<string | null>(null);
  const [expandedInconclusive, setExpandedInconclusive] = useState<string | null>(null);

  // Computed KPIs from actual records
  const kpiPatients = useMemo(() => new Set(DEMO_SAMPLES_A.map(s => s.patientId)).size, []);
  const kpiActiveStudies = useMemo(() => DEMO_EXPERIMENTS_A.filter(e => e.status === "Active").length, []);
  const kpiFlaggedSamples = useMemo(() => DEMO_SAMPLES_A.filter(s => s.outcome.startsWith("Flagged")).length, []);
  const kpiInconclusiveResults = useMemo(() => DEMO_RESULTS_A.filter(r => r.outcome === "Inconclusive" || r.outcome === "Partial Inhibition").length, []);
  const kpiMeanInhibition = useMemo(() => {
    const vals = DEMO_RESULTS_A
      .filter(r => {
        const sample = DEMO_SAMPLES_A.find(s => s.id === r.sampleId);
        return !kpiCompound || sample?.compound === kpiCompound;
      })
      .flatMap(r => r.measurements.filter(m => m.label === "% Inhibition").map(m => parseFloat(m.value)))
      .filter(v => !isNaN(v));
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  }, [kpiCompound]);
  const kpiInhibitionPhase = useMemo(() => {
    const exp = DEMO_EXPERIMENTS_A.find(e => e.compound === kpiCompound);
    return exp ? exp.phase : "—";
  }, [kpiCompound]);

  const chartData = useMemo(() => getChartData(config), [config]);
  const seriesKeys = useMemo(() => getSeriesKeys(chartData as any), [chartData]);
  const displayTitle = config.title || autoTitle(config);

  // Live summary statistics derived from the current chart data
  const summaryStats = useMemo(() => {
    if (!chartData.length || !seriesKeys.length) return [];
    return seriesKeys.map(k => {
      const vals = chartData.map(d => Number(d[k])).filter(v => !isNaN(v));
      const n = vals.length;
      if (n === 0) return null;
      const mean = vals.reduce((a, b) => a + b, 0) / n;
      const sd = n > 1 ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
      const se = sd / Math.sqrt(n);
      return {
        series: k, n,
        mean: mean.toFixed(2),
        sd: sd.toFixed(2),
        min: Math.min(...vals).toFixed(1),
        max: Math.max(...vals).toFixed(1),
        ci: `${(mean - 1.96 * se).toFixed(1)} – ${(mean + 1.96 * se).toFixed(1)}`,
      };
    }).filter(Boolean) as { series: string; n: number; mean: string; sd: string; min: string; max: string; ci: string }[];
  }, [chartData, seriesKeys]);

  const exportSVG = useCallback(() => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `chart-${Date.now()}.svg`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }, []);

  const addToReport = () => {
    const block: ReportBlock = { id: `blk-${Date.now()}`, chartTitle: displayTitle, config: { ...config }, note: "" };
    setReportBlocks(bs => [...bs, block]);
    setShowComposer(true);
  };

  const generateReport = () => {
    if (!reportTitle) return;
    const newRpt: AnalystReport = {
      id: `RPT-DA-${Date.now()}`, title: reportTitle,
      experimentId: config.filterExperiment || "—", operator: ANALYST.name,
      date: new Date().toISOString().slice(0, 10),
      allergen: config.filterAllergen || "All allergens",
      compound: config.filterCompound || "All compounds",
      outcome: "Analysis complete",
      phase: "—", abstract: reportAbstract || `${reportBlocks.length} chart(s) compiled by ${ANALYST.name}.`,
    };
    setReports(rs => [newRpt, ...rs]);
    setReportSaved(true);
    setTimeout(() => { setReportSaved(false); setReportBlocks([]); setReportTitle(""); setReportAbstract(""); setShowComposer(false); }, 2500);
  };

  const sCls = "text-xs bg-input-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer";
  const iCls = "text-xs bg-input-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors w-full font-mono";

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build charts from study data, filter by any dimension, and compose reports</p>
        </div>
        {reportBlocks.length > 0 && (
          <button onClick={() => setShowComposer(s => !s)}
            className="flex items-center gap-2 text-xs px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
            <BookOpen className="w-3.5 h-3.5" />
            Report Composer ({reportBlocks.length})
          </button>
        )}
      </div>

      {/* KPI strip — computed from actual records */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Unique patients */}
        <div className="bg-card border border-border rounded p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unique Patients</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-2xl font-light text-foreground">{kpiPatients}</p>
            <Minus className="w-4 h-4 text-muted-foreground mb-0.5" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">{kpiActiveStudies} active studies</p>
        </div>

        {/* Mean inhibition — configurable by compound */}
        <div className="bg-card border border-border rounded p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mean % Inhibition</p>
            <select
              className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-primary cursor-pointer font-mono"
              value={kpiCompound}
              onChange={e => setKpiCompound(e.target.value)}
            >
              {COMPOUNDS.filter(c => c !== "CTRL-PLACEBO").map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-2xl font-light text-foreground">{kpiMeanInhibition}%</p>
            <TrendingUp className="w-4 h-4 text-primary mb-0.5" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            {kpiCompound} · {kpiInhibitionPhase} · across {DEMO_RESULTS_A.filter(r => DEMO_SAMPLES_A.find(s => s.id === r.sampleId)?.compound === kpiCompound).length} results
          </p>
        </div>

        {/* Flagged records */}
        <div className="bg-card border border-border rounded p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Records Needing Review</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-2xl font-light text-foreground">{kpiFlaggedSamples + kpiInconclusiveResults}</p>
            <AlertCircle className="w-4 h-4 text-amber-500 mb-0.5" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            {kpiFlaggedSamples} flagged sample{kpiFlaggedSamples !== 1 ? "s" : ""} · {kpiInconclusiveResults} inconclusive result{kpiInconclusiveResults !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Pipeline */}
        <div className="bg-card border border-border rounded p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compounds in Pipeline</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-2xl font-light text-foreground">{DEMO_COMPOUNDS_A.filter(c => c.id !== "CTRL-PLACEBO").length}</p>
            <Minus className="w-4 h-4 text-muted-foreground mb-0.5" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            {DEMO_COMPOUNDS_A.filter(c => c.phase === "Phase II").length} Phase II · {DEMO_COMPOUNDS_A.filter(c => c.phase === "Pre-clinical").length} Pre-clinical · {DEMO_COMPOUNDS_A.filter(c => c.phase === "Discovery").length} Discovery
          </p>
        </div>
      </div>

      {/* Study status table */}
      <div className="bg-card border border-border rounded">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Study Status</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Experiment", "Compound", "Phase", "n", "Primary Endpoint", "Current Inhibition", "Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DEMO_EXPERIMENTS_A.map(e => (
                <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-muted-foreground whitespace-nowrap">{e.id}</td>
                  <td className="px-4 py-2.5 font-mono font-medium text-primary">{e.compound}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("font-mono px-1.5 py-0.5 rounded text-[10px]",
                      e.phase === "Phase II" ? "bg-primary/10 text-primary" :
                      e.phase === "Phase I" ? "bg-violet-50 text-violet-700" :
                      e.phase === "Pre-clinical" ? "bg-accent/30 text-accent-foreground" :
                      "bg-amber-50 text-amber-700")}>{e.phase}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono">{e.n}</td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[180px] truncate">{e.endpoint}</td>
                  <td className="px-4 py-2.5 font-mono">{e.inhibition}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("font-mono px-1.5 py-0.5 rounded text-[10px]",
                      e.status === "Complete" ? "bg-primary/10 text-primary" :
                      e.status === "Active" ? "bg-emerald-50 text-emerald-700" :
                      "bg-muted text-muted-foreground")}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data quality panel */}
      <div className="grid grid-cols-2 gap-4">
        {/* Flagged Samples */}
        <div className="bg-card border border-border rounded">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flagged Samples</p>
            <button className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors" title="Open full view (not implemented)">
              <ExternalLink className="w-3 h-3" /> Open
            </button>
          </div>
          <div className="p-3 space-y-2">
            {DEMO_SAMPLES_A.filter(s => s.outcome.startsWith("Flagged")).map(s => (
              <div key={s.id} className="border border-amber-200 rounded overflow-hidden">
                <button
                  onClick={() => setExpandedFlagged(expandedFlagged === s.id ? null : s.id)}
                  className="w-full flex items-center gap-3 p-2.5 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-foreground">{s.id}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.outcome}</p>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-amber-400 shrink-0 transition-transform", expandedFlagged === s.id && "rotate-180")} />
                </button>
                {expandedFlagged === s.id && (
                  <div className="bg-white border-t border-amber-100 px-3 py-2.5 space-y-1.5">
                    {[["Patient", s.patientId], ["Sample Type", s.sampleType], ["Allergen", s.allergen], ["Operator", s.operator], ["Date", s.collectionDate], ["Reason", s.outcome]].map(([l, v]) => (
                      <div key={l} className="flex gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-20 shrink-0">{l}</span>
                        <span className="text-xs font-mono text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inconclusive Results */}
        <div className="bg-card border border-border rounded">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inconclusive Results</p>
            <button className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors" title="Open full view (not implemented)">
              <ExternalLink className="w-3 h-3" /> Open
            </button>
          </div>
          <div className="p-3 space-y-2">
            {DEMO_RESULTS_A.filter(r => r.outcome === "Inconclusive" || r.outcome === "Partial Inhibition").map(r => (
              <div key={r.id} className="border border-amber-200 rounded overflow-hidden">
                <button
                  onClick={() => setExpandedInconclusive(expandedInconclusive === r.id ? null : r.id)}
                  className="w-full flex items-center gap-3 p-2.5 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-foreground">{r.id}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.outcome} · {r.testMethod}</p>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-amber-400 shrink-0 transition-transform", expandedInconclusive === r.id && "rotate-180")} />
                </button>
                {expandedInconclusive === r.id && (
                  <div className="bg-white border-t border-amber-100 px-3 py-2.5 space-y-1.5">
                    {[["Sample", r.sampleId], ["Experiment", r.experimentId], ["Method", r.testMethod], ["Operator", r.operator], ["Date", r.testDate], ["Outcome", r.outcome], ["Confidence", r.confidence]].map(([l, v]) => (
                      <div key={l} className="flex gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-20 shrink-0">{l}</span>
                        <span className="text-xs font-mono text-foreground">{v}</span>
                      </div>
                    ))}
                    {r.measurements.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Measurements</span>
                        <div className="flex flex-wrap gap-1.5">
                          {r.measurements.map(m => (
                            <span key={m.label} className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 font-mono">{m.label}: {m.value} {m.unit}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Builder */}
      <div className="bg-card border border-border rounded">
        {/* Config row */}
        <div className="px-5 py-4 border-b border-border space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Chart type */}
            <div className="flex bg-muted border border-border rounded p-0.5 gap-0.5 shrink-0">
              {([["line", LineIcon, "Line"], ["bar", BarIcon, "Bar"], ["scatter", BarChart2, "Scatter"]] as const).map(([t, Icon, label]) => (
                <button key={t} onClick={() => setConfig(c => ({ ...c, chartType: t }))}
                  className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors", config.chartType === t ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground shrink-0">X Axis</label>
              <select className={sCls} value={config.xAxis} onChange={sc("xAxis")}>
                {X_AXES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground shrink-0">Y Axis</label>
              <select className={sCls} value={config.yMetric} onChange={sc("yMetric")}>
                {Y_METRICS.map(m => <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground shrink-0">Group by</label>
              <select className={sCls} value={config.groupBy} onChange={sc("groupBy")}>
                {GROUP_BY.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>

            <button onClick={() => setShowFilters(s => !s)}
              className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors ml-auto", showFilters ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground")}>
              <Filter className="w-3 h-3" /> Filters {showFilters ? "▲" : "▼"}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 pt-2 border-t border-border">
              <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Experiment</label>
                <select className={sCls} value={config.filterExperiment} onChange={sc("filterExperiment")}>
                  <option value="">All experiments</option>
                  {DEMO_EXPERIMENTS_A.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compound</label>
                <select className={sCls} value={config.filterCompound} onChange={sc("filterCompound")}>
                  <option value="">All compounds</option>
                  {COMPOUNDS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Allergen</label>
                <select className={sCls} value={config.filterAllergen} onChange={sc("filterAllergen")}>
                  <option value="">All allergens</option>
                  {ALLERGENS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label>
                <select className={sCls} value={config.filterOperator} onChange={sc("filterOperator")}>
                  <option value="">All operators</option>
                  {OPERATORS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date From</label>
                <input type="date" className={iCls} value={config.dateFrom} onChange={sc("dateFrom")} />
              </div>
              <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date To</label>
                <input type="date" className={iCls} value={config.dateTo} onChange={sc("dateTo")} />
              </div>
              <div className="flex flex-col gap-1 col-span-2"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chart Title (optional)</label>
                <input className={iCls} placeholder={autoTitle(config)} value={config.title} onChange={sc("title")} />
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">{displayTitle}</p>
            <div className="flex gap-2">
              <button onClick={exportSVG} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted rounded border border-border hover:bg-secondary transition-colors text-muted-foreground">
                <Download className="w-3 h-3" /> Export SVG
              </button>
              <button onClick={addToReport} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">
                <Plus className="w-3 h-3" /> Add to Report
              </button>
            </div>
          </div>

          <div ref={chartRef} className="h-72">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded">
                No data available for this combination. Try changing X axis or metric.
              </div>
            ) : (
              <ResponsiveContainer
                key={`${config.chartType}-${config.xAxis}-${config.yMetric}`}
                width="100%" height="100%"
              >
                {config.chartType === "line" ? (
                  <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,25,35,0.06)" />
                    <XAxis dataKey="x" tick={{ fontSize: 10, fontFamily: "DM Mono, monospace" }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono, monospace" }} unit={` ${Y_METRICS.find(m => m.key === config.yMetric)?.unit || ""}`} width={60} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    {seriesKeys.map((k, i) => <Line key={`line-${k}-${i}`} type="monotone" dataKey={k} name={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />)}
                  </LineChart>
                ) : config.chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,25,35,0.06)" />
                    <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono, monospace" }} width={60} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="rect" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    {seriesKeys.map((k, i) => <Bar key={`bar-${k}-${i}`} dataKey={k} name={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[2, 2, 0, 0]} />)}
                  </BarChart>
                ) : (
                  // Scatter: flatten all series into {x, y, series} rows so axes are consistent
                  <ScatterChart margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,25,35,0.06)" />
                    <XAxis dataKey="cx" type="number" name={X_AXES.find(a => a.key === config.xAxis)?.label || "x"} tick={{ fontSize: 10, fontFamily: "DM Mono, monospace" }} />
                    <YAxis dataKey="cy" type="number" name={Y_METRICS.find(m => m.key === config.yMetric)?.label || "y"} tick={{ fontSize: 10, fontFamily: "DM Mono, monospace" }} width={60} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    {seriesKeys.map((k, i) => (
                      <Scatter
                        key={`scatter-${k}-${i}`}
                        name={k}
                        data={chartData.map((d, di) => ({ cx: di, cy: Number(d[k]) ?? 0 }))}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Summary statistics — live from current chart */}
      {summaryStats.length > 0 && (
        <div className="bg-card border border-border rounded">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Summary Statistics — {displayTitle}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">Updates live with chart</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Series", "n", "Mean", "Std Dev", "Min", "Max", "95% CI"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summaryStats.map((s, i) => (
                  <tr key={s.series} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="font-mono font-medium text-foreground">{s.series}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{s.n}</td>
                    <td className="px-4 py-2.5 font-mono font-medium text-foreground">{s.mean}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{s.sd}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{s.min}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{s.max}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{s.ci}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Composer */}
      {showComposer && (
        <div className="bg-card border border-border rounded">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Report Composer</p>
              <p className="text-xs text-muted-foreground mt-0.5">{reportBlocks.length} chart{reportBlocks.length !== 1 ? "s" : ""} added — fill in details and generate</p>
            </div>
            <button onClick={() => setShowComposer(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 space-y-4">
            {/* Chart blocks */}
            <div className="space-y-2">
              {reportBlocks.map((blk, i) => (
                <div key={blk.id} className="flex items-center gap-3 bg-muted/40 border border-border rounded px-3 py-2.5">
                  <BarChart2 className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{blk.chartTitle}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{blk.config.chartType} · {blk.config.xAxis} vs {blk.config.yMetric}</p>
                  </div>
                  <input className="flex-1 text-xs bg-input-background border border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
                    placeholder="Add a note for this chart…"
                    value={blk.note}
                    onChange={e => setReportBlocks(bs => bs.map((b, idx) => idx === i ? { ...b, note: e.target.value } : b))} />
                  <button onClick={() => setReportBlocks(bs => bs.filter(b => b.id !== blk.id))} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            {/* Report metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Report Title <span className="text-destructive">*</span></label>
                <input className="text-sm bg-input-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Q3 2026 IgE Analysis — ALG-4521" value={reportTitle} onChange={e => setReportTitle(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Abstract / Summary</label>
              <textarea className="text-sm bg-input-background border border-border rounded px-3 py-2 h-20 resize-none focus:outline-none focus:border-primary transition-colors" placeholder="Summarise findings, methodology, and conclusions…" value={reportAbstract} onChange={e => setReportAbstract(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={generateReport} disabled={!reportTitle || reportSaved}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-60">
                {reportSaved ? <><CheckCircle className="w-4 h-4" /> Report Saved</> : <><BookOpen className="w-4 h-4" /> Generate Report</>}
              </button>
              <button onClick={() => { setReportBlocks([]); setShowComposer(false); }} className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/70 transition-colors">
                <X className="w-4 h-4" /> Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Query & Reports ──────────────────────────────────────────────────────────

function QuerySection({ reports }: { reports: AnalystReport[] }) {
  const [qtype, setQtype] = useState<QueryType>("sample");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [ran, setRan] = useState(false);
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters(f => ({ ...f, [k]: e.target.value }));
  const changeType = (t: QueryType) => { setQtype(t); setFilters({}); setRan(false); setExpandedDetail(null); };
  const reset = () => { setFilters({}); setRan(false); setExpandedDetail(null); };

  // Filtered results
  const filteredSamples = DEMO_SAMPLES_A.filter(r =>
    (!filters.patientId || r.patientId.toLowerCase().includes(filters.patientId.toLowerCase())) &&
    (!filters.allergen || r.allergen === filters.allergen) &&
    (!filters.sampleType || r.sampleType === filters.sampleType) &&
    (!filters.compound || r.compound === filters.compound) &&
    (!filters.operator || r.operator === filters.operator) &&
    (!filters.dateFrom || r.collectionDate >= filters.dateFrom) &&
    (!filters.dateTo || r.collectionDate <= filters.dateTo)
  );

  const filteredExps = DEMO_EXPERIMENTS_A.filter(r =>
    (!filters.title || r.title.toLowerCase().includes(filters.title.toLowerCase())) &&
    (!filters.compound || r.compound === filters.compound) &&
    (!filters.allergen || r.allergen === filters.allergen) &&
    (!filters.protocol || r.protocol === filters.protocol) &&
    (!filters.operator || r.operator === filters.operator) &&
    (!filters.phase || r.phase === filters.phase) &&
    (!filters.dateFrom || r.startDate >= filters.dateFrom) &&
    (!filters.dateTo || !r.endDate || r.endDate <= filters.dateTo)
  );

  const filteredResults = DEMO_RESULTS_A.filter(r =>
    (!filters.sampleId || r.sampleId.toLowerCase().includes(filters.sampleId.toLowerCase())) &&
    (!filters.experimentId || r.experimentId.toLowerCase().includes(filters.experimentId.toLowerCase())) &&
    (!filters.testMethod || r.testMethod === filters.testMethod) &&
    (!filters.outcome || r.outcome === filters.outcome) &&
    (!filters.operator || r.operator === filters.operator) &&
    (!filters.dateFrom || r.testDate >= filters.dateFrom) &&
    (!filters.dateTo || r.testDate <= filters.dateTo)
  );

  const filteredCompounds = DEMO_COMPOUNDS_A.filter(r =>
    (!filters.compoundId || r.id.toLowerCase().includes(filters.compoundId.toLowerCase())) &&
    (!filters.name || r.name.toLowerCase().includes(filters.name.toLowerCase())) &&
    (!filters.mechanism || r.mechanism === filters.mechanism) &&
    (!filters.phase || r.phase === filters.phase) &&
    (!filters.targetAllergen || r.targetAllergen === filters.targetAllergen)
  );

  const filteredReports = reports.filter(r =>
    (!filters.title || r.title.toLowerCase().includes(filters.title.toLowerCase())) &&
    (!filters.compound || r.compound === filters.compound) &&
    (!filters.allergen || r.allergen === filters.allergen) &&
    (!filters.operator || r.operator === filters.operator) &&
    (!filters.phase || r.phase === filters.phase) &&
    (!filters.dateFrom || r.date >= filters.dateFrom) &&
    (!filters.dateTo || r.date <= filters.dateTo)
  );

  const sCls = "text-xs bg-input-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer w-full";
  const iCls = "text-xs bg-input-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors w-full font-mono";

  const Q_TABS: { id: QueryType; label: string }[] = [
    { id: "sample", label: "Samples" },
    { id: "experiment", label: "Experiments" },
    { id: "result", label: "Results" },
    { id: "compound", label: "Compounds" },
    { id: "report", label: "Reports" },
  ];

  const ResultRow = ({ id, cols, detail }: { id: string; cols: React.ReactNode[]; detail: React.ReactNode }) => (
    <div>
      <div className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
        {cols.map((c, i) => <div key={i} className={i === 1 ? "flex-1 min-w-0" : "shrink-0"}>{c}</div>)}
        <button onClick={() => setExpandedDetail(expandedDetail === id ? null : id)}
          className={cn("flex items-center gap-1 text-xs px-2.5 py-1 rounded border shrink-0 transition-colors", expandedDetail === id ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground")}>
          <ChevronDown className={cn("w-3 h-3 transition-transform", expandedDetail === id && "rotate-180")} />
          {expandedDetail === id ? "Close" : "Open"}
        </button>
      </div>
      {expandedDetail === id && <div className="border-t border-border bg-muted/20 px-5 py-4">{detail}</div>}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">Query & Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search across all record types with contextual filters</p>
      </div>

      {/* Type tabs */}
      <div className="flex bg-card border border-border rounded p-1 gap-0.5">
        {Q_TABS.map(t => (
          <button key={t.id} onClick={() => changeType(t.id)}
            className={cn("flex-1 text-xs py-2 rounded transition-colors font-medium flex items-center justify-center gap-1.5",
              qtype === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded p-5 space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Filter Criteria</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {qtype === "sample" && (<>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Patient ID</label><input className={iCls} placeholder="PT-XXXX" value={filters.patientId||""} onChange={sf("patientId")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Allergen</label><select className={sCls} value={filters.allergen||""} onChange={sf("allergen")}><option value="">Any</option>{ALLERGENS.map(a=><option key={a}>{a}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample Type</label><select className={sCls} value={filters.sampleType||""} onChange={sf("sampleType")}><option value="">Any</option>{["Serum","Plasma","Whole Blood","Nasal Lavage","Bronchoalveolar Lavage","Skin Biopsy"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drug Compound</label><select className={sCls} value={filters.compound||""} onChange={sf("compound")}><option value="">Any</option>{COMPOUNDS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label><select className={sCls} value={filters.operator||""} onChange={sf("operator")}><option value="">Any</option>{OPERATORS.map(o=><option key={o}>{o}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date From</label><input type="date" className={iCls} value={filters.dateFrom||""} onChange={sf("dateFrom")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date To</label><input type="date" className={iCls} value={filters.dateTo||""} onChange={sf("dateTo")} /></div>
          </>)}
          {qtype === "experiment" && (<>
            <div className="flex flex-col gap-1 col-span-2"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label><input className={iCls} placeholder="Search title…" value={filters.title||""} onChange={sf("title")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drug Compound</label><select className={sCls} value={filters.compound||""} onChange={sf("compound")}><option value="">Any</option>{COMPOUNDS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Allergen</label><select className={sCls} value={filters.allergen||""} onChange={sf("allergen")}><option value="">Any</option>{ALLERGENS.map(a=><option key={a}>{a}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Protocol</label><select className={sCls} value={filters.protocol||""} onChange={sf("protocol")}><option value="">Any</option>{PROTOCOLS.map(p=><option key={p}>{p}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phase</label><select className={sCls} value={filters.phase||""} onChange={sf("phase")}><option value="">Any</option>{PHASES.map(p=><option key={p}>{p}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label><select className={sCls} value={filters.operator||""} onChange={sf("operator")}><option value="">Any</option>{OPERATORS.map(o=><option key={o}>{o}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Start Date From</label><input type="date" className={iCls} value={filters.dateFrom||""} onChange={sf("dateFrom")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">End Date To</label><input type="date" className={iCls} value={filters.dateTo||""} onChange={sf("dateTo")} /></div>
          </>)}
          {qtype === "result" && (<>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample ID</label><input className={iCls} placeholder="SMP-…" value={filters.sampleId||""} onChange={sf("sampleId")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Experiment ID</label><input className={iCls} placeholder="EXP-…" value={filters.experimentId||""} onChange={sf("experimentId")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Test Method</label><select className={sCls} value={filters.testMethod||""} onChange={sf("testMethod")}><option value="">Any</option>{METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outcome</label><select className={sCls} value={filters.outcome||""} onChange={sf("outcome")}><option value="">Any</option>{OUTCOMES.map(o=><option key={o}>{o}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label><select className={sCls} value={filters.operator||""} onChange={sf("operator")}><option value="">Any</option>{OPERATORS.map(o=><option key={o}>{o}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date From</label><input type="date" className={iCls} value={filters.dateFrom||""} onChange={sf("dateFrom")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date To</label><input type="date" className={iCls} value={filters.dateTo||""} onChange={sf("dateTo")} /></div>
          </>)}
          {qtype === "compound" && (<>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compound ID</label><input className={iCls} placeholder="ALG-…" value={filters.compoundId||""} onChange={sf("compoundId")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</label><input className={iCls} placeholder="Search name…" value={filters.name||""} onChange={sf("name")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mechanism</label><select className={sCls} value={filters.mechanism||""} onChange={sf("mechanism")}><option value="">Any</option>{MECHANISMS.map(m=><option key={m}>{m}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phase</label><select className={sCls} value={filters.phase||""} onChange={sf("phase")}><option value="">Any</option>{PHASES.map(p=><option key={p}>{p}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Target Allergen</label><select className={sCls} value={filters.targetAllergen||""} onChange={sf("targetAllergen")}><option value="">Any</option>{ALLERGENS.map(a=><option key={a}>{a}</option>)}</select></div>
          </>)}
          {qtype === "report" && (<>
            <div className="flex flex-col gap-1 col-span-2"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label><input className={iCls} placeholder="Search report title…" value={filters.title||""} onChange={sf("title")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drug Compound</label><select className={sCls} value={filters.compound||""} onChange={sf("compound")}><option value="">Any</option>{COMPOUNDS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Allergen</label><select className={sCls} value={filters.allergen||""} onChange={sf("allergen")}><option value="">Any</option>{ALLERGENS.map(a=><option key={a}>{a}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phase</label><select className={sCls} value={filters.phase||""} onChange={sf("phase")}><option value="">Any</option>{PHASES.map(p=><option key={p}>{p}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</label><select className={sCls} value={filters.operator||""} onChange={sf("operator")}><option value="">Any</option>{OPERATORS.map(o=><option key={o}>{o}</option>)}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date From</label><input type="date" className={iCls} value={filters.dateFrom||""} onChange={sf("dateFrom")} /></div>
            <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date To</label><input type="date" className={iCls} value={filters.dateTo||""} onChange={sf("dateTo")} /></div>
          </>)}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setRan(true)} type="button"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 transition-colors">
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          <button onClick={reset} type="button"
            className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-muted-foreground text-xs rounded hover:bg-secondary transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {ran && (
        <div className="bg-card border border-border rounded">
          {qtype === "sample" && (<>
            <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredSamples.length} samples</p></div>
            {filteredSamples.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No records match.</p> : (
              <div className="divide-y divide-border">
                {filteredSamples.map(rec => (
                  <ResultRow key={rec.id} id={rec.id}
                    cols={[
                      <span className="font-mono text-xs text-muted-foreground w-44">{rec.id}</span>,
                      <span className="text-sm text-foreground truncate">{rec.allergen}</span>,
                      <span className="text-xs text-muted-foreground w-20">{rec.sampleType}</span>,
                      <span className="font-mono text-xs text-muted-foreground w-16">{rec.patientId}</span>,
                      <span className="text-xs text-muted-foreground w-28 truncate">{rec.operator.split(" ").slice(-1)[0]}</span>,
                    ]}
                    detail={<FieldGrid rows={[["Patient ID",rec.patientId],["Collection Date",rec.collectionDate],["Sample Type",rec.sampleType],["Allergen",rec.allergen],["Drug Compound",rec.compound||"None"],["Volume",rec.volume],["Operator",rec.operator],["Status",rec.outcome]].map(([l,v])=>({ label: l as string, value: v as string }))} />}
                  />
                ))}
              </div>
            )}
          </>)}

          {qtype === "experiment" && (<>
            <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredExps.length} experiments</p></div>
            {filteredExps.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No records match.</p> : (
              <div className="divide-y divide-border">
                {filteredExps.map(rec => (
                  <ResultRow key={rec.id} id={rec.id}
                    cols={[
                      <span className="font-mono text-xs text-muted-foreground w-32">{rec.id}</span>,
                      <span className="text-sm text-foreground truncate">{rec.title}</span>,
                      <span className="font-mono text-xs text-primary w-20">{rec.compound}</span>,
                      <span className="text-xs text-muted-foreground w-24">{rec.phase}</span>,
                      <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded w-20 text-center", rec.status === "Complete" ? "bg-primary/10 text-primary" : rec.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>{rec.status}</span>,
                    ]}
                    detail={<FieldGrid rows={[["Compound",rec.compound],["Allergen",rec.allergen],["Protocol",rec.protocol],["Operator",rec.operator],["Start Date",rec.startDate],["End Date",rec.endDate||"Ongoing"],["Phase",rec.phase],["n",String(rec.n)],["Endpoint",rec.endpoint],["Inhibition",rec.inhibition],["Outcome",rec.outcome]].map(([l,v])=>({ label: l as string, value: v as string }))} />}
                  />
                ))}
              </div>
            )}
          </>)}

          {qtype === "result" && (<>
            <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredResults.length} results</p></div>
            {filteredResults.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No records match.</p> : (
              <div className="divide-y divide-border">
                {filteredResults.map(rec => (
                  <ResultRow key={rec.id} id={rec.id}
                    cols={[
                      <span className="font-mono text-xs text-muted-foreground w-44">{rec.id}</span>,
                      <span className="font-mono text-xs text-foreground truncate">{rec.sampleId}</span>,
                      <span className="text-xs text-muted-foreground w-36 truncate">{rec.testMethod}</span>,
                      <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded", rec.outcome === "Positive Response" || rec.outcome === "Full Inhibition" ? "bg-primary/10 text-primary" : rec.outcome === "Inconclusive" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground")}>{rec.outcome}</span>,
                    ]}
                    detail={<div className="space-y-3">
                      <FieldGrid rows={[["Sample ID",rec.sampleId],["Experiment",rec.experimentId],["Test Date",rec.testDate],["Method",rec.testMethod],["Operator",rec.operator],["Outcome",rec.outcome],["Confidence",rec.confidence]].map(([l,v])=>({ label: l as string, value: v as string }))} />
                      {rec.measurements.length > 0 && <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Measurements</p><div className="flex flex-wrap gap-2">{rec.measurements.map(m=><span key={m.label} className="text-xs bg-card border border-border rounded px-2.5 py-1 font-mono">{m.label}: <strong>{m.value}</strong> {m.unit}</span>)}</div></div>}
                    </div>}
                  />
                ))}
              </div>
            )}
          </>)}

          {qtype === "compound" && (<>
            <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredCompounds.length} compounds</p></div>
            {filteredCompounds.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No records match.</p> : (
              <div className="divide-y divide-border">
                {filteredCompounds.map(rec => (
                  <ResultRow key={rec.id} id={rec.id}
                    cols={[
                      <span className="font-mono text-xs font-medium text-primary w-24">{rec.id}</span>,
                      <span className="text-sm text-foreground truncate">{rec.name}</span>,
                      <span className="text-xs text-muted-foreground w-36 truncate">{rec.mechanism}</span>,
                      <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded", rec.phase === "Phase II" || rec.phase === "Approved" ? "bg-primary/10 text-primary" : rec.phase === "Discovery" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground")}>{rec.phase}</span>,
                    ]}
                    detail={<FieldGrid rows={[["ID",rec.id],["Name",rec.name],["CAS",rec.cas],["Formula",rec.formula],["Mol. Weight",rec.mw],["Purity",rec.purity],["Mechanism",rec.mechanism],["Target Allergen",rec.targetAllergen],["Phase",rec.phase],["Manufacturer",rec.manufacturer],["Expiry",rec.expiryDate],["Notes",rec.notes]].map(([l,v])=>({ label: l as string, value: v as string }))} />}
                  />
                ))}
              </div>
            )}
          </>)}

          {qtype === "report" && (<>
            <div className="px-5 py-3 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filteredReports.length} reports</p></div>
            {filteredReports.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No reports match.</p> : (
              <div className="divide-y divide-border">
                {filteredReports.map(rep => (
                  <ResultRow key={rep.id} id={rep.id}
                    cols={[
                      <span className="font-mono text-xs text-muted-foreground w-36">{rep.id}</span>,
                      <span className="text-sm text-foreground truncate">{rep.title}</span>,
                      <span className="font-mono text-xs text-primary w-20">{rep.compound}</span>,
                      <span className="text-xs text-muted-foreground w-20 font-mono">{rep.date}</span>,
                      <span className={cn("text-[11px] font-mono px-1.5 py-0.5 rounded", rep.outcome.startsWith("Positive") ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-700")}>{rep.phase}</span>,
                    ]}
                    detail={<div className="space-y-3">
                      <FieldGrid rows={[["Report ID",rep.id],["Experiment",rep.experimentId],["Compound",rep.compound],["Allergen",rep.allergen],["Operator",rep.operator],["Date",rep.date],["Phase",rep.phase],["Outcome",rep.outcome]].map(([l,v])=>({ label: l as string, value: v as string }))} />
                      <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Abstract</p><p className="text-xs text-foreground leading-relaxed">{rep.abstract}</p></div>
                    </div>}
                  />
                ))}
              </div>
            )}
          </>)}
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [section, setSection] = useState<NavSection>("explorer");
  const [reports, setReports] = useState<AnalystReport[]>(INIT_REPORTS);

  const TITLES: Record<NavSection, string> = {
    explorer: "Database Explorer",
    analytics: "Analytics",
    query: "Query & Reports",
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
            <button className="p-2 rounded hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {section === "explorer" && <ExplorerSection />}
          {section === "analytics" && <AnalyticsSection reports={reports} setReports={setReports} />}
          {section === "query" && <QuerySection reports={reports} />}
        </div>
      </div>
    </div>
  );
}
