import { DataRow, DataStore } from '../context/AppContext';

/* ═══════════════════════  CSV PARSING  ═══════════════════════════════════ */

export function parseCSV(content: string, fileName: string): DataStore {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV needs a header + at least one data row.');
  const headers = parseLine(lines[0]);
  const rows: DataRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    const vals = parseLine(raw);
    const row: DataRow = {};
    headers.forEach((h, j) => {
      const v = (vals[j] ?? '').trim();
      const n = Number(v);
      row[h] = v !== '' && !isNaN(n) ? n : v;
    });
    rows.push(row);
  }
  return { headers, rows, fileName, rowCount: rows.length };
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') { q = !q; continue; }
    if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/* ═══════════════════════  SUMMARY FOR AI  ════════════════════════════════ */

export function buildDataSummary(ds: DataStore): string {
  const { headers, rows, rowCount, fileName } = ds;
  const cols = headers.map(h => {
    const vals = rows.map(r => r[h]);
    const nums = vals.filter(v => typeof v === 'number') as number[];
    if (nums.length > rowCount * 0.6) {
      return `${h} [numeric] min=${Math.min(...nums)} max=${Math.max(...nums)} avg=${(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)}`;
    }
    const freq: Record<string, number> = {};
    vals.forEach(v => { const k = String(v); freq[k] = (freq[k] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([k, n]) => `${k}(${n})`).join(', ');
    return `${h} [categorical, ${Object.keys(freq).length} unique] ${top}`;
  });
  const sample = rows.slice(0, 8).map(r =>
    headers.map(h => `${h}=${String(r[h]).slice(0, 25)}`).join(', ')
  ).join('\n');
  return `File: ${fileName}\nRows: ${rowCount}\nColumns:\n${cols.join('\n')}\n\nSample:\n${sample}`;
}

/* ═════════════════════  DATA QUERY ENGINE  ═══════════════════════════════ */

export interface Filter { column: string; op: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains'; value: string | number; }

export interface QueryOp {
  type: 'count' | 'group_count' | 'group_agg' | 'churn_by_group' | 'top_n' | 'stats';
  groupBy?: string;
  valueCol?: string;
  agg?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  filter?: Filter;
  churnCol?: string;
  topN?: number;
}

export interface QueryResult {
  value?: number | null;
  groups?: Record<string, number>;
  rawGroups?: Record<string, any>;
  stats?: { min: number; max: number; avg: number; median: number; std: number; count: number };
  label: string;
}

export function runQuery(ds: DataStore, op: QueryOp): QueryResult {
  const { rows } = ds;
  const filt = op.filter ? rows.filter(r => applyFilter(r, op.filter!)) : rows;

  switch (op.type) {
    case 'count':
      return { value: filt.length, label: 'Count' };

    case 'group_count': {
      const g = groupBy(filt, op.groupBy!);
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(g)) out[k] = v.length;
      return { groups: out, label: `Count by ${op.groupBy}` };
    }

    case 'group_agg': {
      const g = groupBy(filt, op.groupBy!);
      const agg = op.agg || 'avg';
      const vc = op.valueCol!;
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(g)) {
        const nums = v.map(r => Number(r[vc])).filter(n => !isNaN(n));
        out[k] = aggregate(nums, agg);
      }
      return { groups: out, label: `${agg} of ${vc} by ${op.groupBy}` };
    }

    case 'churn_by_group': {
      const gc = op.groupBy!, cc = op.churnCol || 'Churn';
      const g: Record<string, { t: number; c: number }> = {};
      for (const r of rows) {
        const k = String(r[gc]);
        if (!g[k]) g[k] = { t: 0, c: 0 };
        g[k].t++;
        const cv = String(r[cc]).toLowerCase();
        if (['yes', '1', 'true', 'churned'].includes(cv)) g[k].c++;
      }
      const rates: Record<string, number> = {};
      const raw: Record<string, any> = {};
      for (const [k, v] of Object.entries(g)) {
        rates[k] = v.t > 0 ? +(v.c / v.t * 100).toFixed(1) : 0;
        raw[k] = { total: v.t, churned: v.c };
      }
      return { groups: rates, rawGroups: raw, label: `Churn Rate by ${gc}` };
    }

    case 'top_n': {
      const vc = op.valueCol!, n = op.topN || 5;
      const lc = op.groupBy || ds.headers[0];
      const sorted = [...filt].filter(r => typeof r[vc] === 'number')
        .sort((a, b) => (b[vc] as number) - (a[vc] as number)).slice(0, n);
      const out: Record<string, number> = {};
      sorted.forEach(r => { out[String(r[lc]).slice(0, 20)] = r[vc] as number; });
      return { groups: out, label: `Top ${n} by ${vc}` };
    }

    case 'stats': {
      const vc = op.valueCol!;
      const nums = filt.map(r => Number(r[vc])).filter(n => !isNaN(n));
      if (!nums.length) return { value: null, label: `Stats: ${vc}` };
      const s = nums.sort((a, b) => a - b);
      const avg = s.reduce((a, b) => a + b, 0) / s.length;
      const mid = Math.floor(s.length / 2);
      const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
      const variance = s.reduce((a, v) => a + (v - avg) ** 2, 0) / s.length;
      return {
        stats: { min: s[0], max: s[s.length - 1], avg, median, std: Math.sqrt(variance), count: s.length },
        label: `Stats: ${vc}`,
      };
    }

    default: return { value: null, label: 'Unknown' };
  }
}

/* helpers */
function groupBy(rows: DataRow[], col: string) {
  const g: Record<string, DataRow[]> = {};
  for (const r of rows) { const k = String(r[col]); (g[k] ??= []).push(r); }
  return g;
}
function aggregate(nums: number[], agg: string): number {
  if (!nums.length) return 0;
  switch (agg) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'max': return Math.max(...nums);
    case 'min': return Math.min(...nums);
    case 'count': return nums.length;
    default: return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}
function applyFilter(r: DataRow, f: Filter): boolean {
  const v = r[f.column], fv = f.value;
  switch (f.op) {
    case '=': return String(v).toLowerCase() === String(fv).toLowerCase();
    case '!=': return String(v).toLowerCase() !== String(fv).toLowerCase();
    case '>': return Number(v) > Number(fv);
    case '<': return Number(v) < Number(fv);
    case '>=': return Number(v) >= Number(fv);
    case '<=': return Number(v) <= Number(fv);
    case 'contains': return String(v).toLowerCase().includes(String(fv).toLowerCase());
    default: return true;
  }
}

/* ═══════════════════  COLUMN STATS HELPER  ═══════════════════════════════ */

export function colStats(ds: DataStore, h: string) {
  const vals = ds.rows.map(r => r[h]);
  const nums = vals.filter(v => typeof v === 'number') as number[];
  if (nums.length > ds.rowCount * 0.5) {
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return { numeric: true as const, min: Math.min(...nums), max: Math.max(...nums), avg, count: nums.length };
  }
  const freq: Record<string, number> = {};
  vals.forEach(v => { const k = String(v); freq[k] = (freq[k] || 0) + 1; });
  return { numeric: false as const, unique: Object.keys(freq).length, top: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5) };
}