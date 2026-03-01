import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import MiniChart from '../../components/MiniChart';
import { ChartData, useAppContext } from '../../context/AppContext';
import { colStats, runQuery } from '../../utils/csvParser';

const C = ['#00D4AA', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
const cc = (n: number) => Array.from({ length: n }, (_, i) => C[i % C.length]);

export default function InsightsScreen() {
  const { getActiveDataStore, savedInsights } = useAppContext();
  const ds = getActiveDataStore();

  const { charts, churnPct, numStats } = useMemo(() => {
    if (!ds) return { charts: [] as ChartData[], churnPct: null as number | null, numStats: [] as any[] };
    const { headers, rows, rowCount } = ds;
    const charts: ChartData[] = [];

    const churnCol = headers.find((h: string) => h.toLowerCase().includes('churn'));
    let churnPct: number | null = null;
    if (churnCol) {
      const yes = rows.filter((r: any) => ['yes', '1', 'true', 'churned'].includes(String(r[churnCol]).toLowerCase())).length;
      churnPct = +(yes / rowCount * 100).toFixed(1);
    }

    // Cat distributions
    const cats = headers.filter((h: string) => { const u = new Set(rows.map((r: any) => String(r[h]))); return u.size >= 2 && u.size <= 10; }).slice(0, 4);
    cats.forEach((col: string) => {
      try {
        const qr = runQuery(ds, { type: 'group_count', groupBy: col });
        if (qr.groups) {
          const labels = Object.keys(qr.groups), values = Object.values(qr.groups);
          charts.push({ type: labels.length <= 4 ? 'pie' : 'bar', labels, values, title: `Distribution: ${col}`, colors: cc(labels.length) });
        }
      } catch { }
    });

    // Churn by group charts
    if (churnCol) {
      const gcols = headers.filter((h: string) => h !== churnCol && !h.toLowerCase().includes('id'));
      gcols.slice(0, 3).forEach((gc: string) => {
        try {
          const qr = runQuery(ds, { type: 'churn_by_group', groupBy: gc, churnCol });
          if (qr.groups) {
            const labels = Object.keys(qr.groups), values = Object.values(qr.groups).map((v: any) => +v.toFixed(1));
            if (labels.length >= 2 && labels.length <= 8)
              charts.push({ type: 'bar', labels, values, title: `Churn % by ${gc}`, colors: cc(labels.length) });
          }
        } catch { }
      });
    }

    // Numeric stats
    const numHeaders = headers.filter((h: string) => rows.filter((r: any) => typeof r[h] === 'number').length > rowCount * .5).slice(0, 6);
    const numStats = numHeaders.map((h: string) => {
      const info = colStats(ds, h);
      return info.numeric ? { col: h, ...info } : null;
    }).filter(Boolean);

    return { charts, churnPct, numStats };
  }, [ds]);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="light" />
      <View style={st.hdr}><Text style={st.hdrT}>Insights</Text><Text style={st.hdrS}>{ds ? `Auto-generated from ${ds.fileName}` : 'Load a dataset first'}</Text></View>
      <ScrollView style={st.scroll} contentContainerStyle={st.content}>
        {!ds ? (
          <View style={st.empty}><Ionicons name="bar-chart-outline" size={50} color="#2D3748" /><Text style={st.emT}>No Data Yet</Text><Text style={st.emS}>Upload a CSV in the Dataset tab to see auto-generated insights.</Text></View>
        ) : (<>
          {/* KPIs */}
          <View style={st.kpiRow}>
            <KPI label="Records" value={ds.rowCount.toLocaleString()} color="#00D4AA" icon="layers" />
            <KPI label="Columns" value={String(ds.headers.length)} color="#4ECDC4" icon="grid" />
          </View>

          {churnPct !== null && (
            <View style={[st.churnCard, { borderColor: churnPct > 30 ? '#FF6B6B44' : '#00D4AA44' }]}>
              <View style={st.churnL}><Ionicons name="trending-down" size={26} color={churnPct > 30 ? '#FF6B6B' : '#00D4AA'} /><View><Text style={st.churnLbl}>Overall Churn Rate</Text><Text style={st.churnSub}>{ds.rowCount.toLocaleString()} customers</Text></View></View>
              <Text style={[st.churnVal, { color: churnPct > 30 ? '#FF6B6B' : '#00D4AA' }]}>{churnPct}%</Text>
            </View>
          )}

          {/* Stats */}
          {numStats.length > 0 && (
            <View style={st.sec}><Text style={st.secT}>📈 Numeric Stats</Text>
              {numStats.map((s: any) => (
                <View key={s.col} style={st.nCard}>
                  <Text style={st.nCol}>{s.col}</Text>
                  <View style={st.nRow}>
                    <Pill l="Avg" v={s.avg.toFixed(1)} /><Pill l="Min" v={String(s.min)} /><Pill l="Max" v={String(s.max)} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Charts */}
          {charts.length > 0 && (
            <View style={st.sec}><Text style={st.secT}>📊 Auto Charts</Text>
              {charts.map((c, i) => <View key={i} style={st.chartWrap}><MiniChart data={c} /></View>)}
            </View>
          )}

          {/* Saved */}
          {savedInsights.length > 0 && (
            <View style={st.sec}><Text style={st.secT}>🔖 Saved from Chat</Text>
              {savedInsights.filter(m => m.chartData).map(m => (
                <View key={m.id} style={st.chartWrap}>
                  <Text style={st.savedQ} numberOfLines={2}>&quot;{m.content.slice(0, 70)}&quot;</Text>
                  <MiniChart data={m.chartData!} />
                </View>
              ))}
            </View>
          )}
        </>)}
      </ScrollView>
    </SafeAreaView>
  );
}

function KPI({ label, value, color, icon }: any) {
  return <View style={[st.kpi, { borderColor: color + '30', backgroundColor: color + '0A' }]}><Ionicons name={icon} size={17} color={color} /><Text style={[st.kpiV, { color }]}>{value}</Text><Text style={st.kpiL}>{label}</Text></View>;
}
function Pill({ l, v }: { l: string; v: string }) {
  return <View style={st.pill}><Text style={st.pillL}>{l}</Text><Text style={st.pillV}>{v}</Text></View>;
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  hdr: { paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#1A2035' },
  hdrT: { color: '#E2E8F0', fontSize: 22, fontWeight: '800' }, hdrS: { color: '#4A5568', fontSize: 12, marginTop: 3 },
  scroll: { flex: 1 }, content: { padding: 18, gap: 14, paddingBottom: 36 },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 14 },
  emT: { color: '#718096', fontSize: 18, fontWeight: '700' }, emS: { color: '#4A5568', fontSize: 13, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: 9 },
  kpi: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  kpiV: { fontSize: 18, fontWeight: '800' }, kpiL: { color: '#4A5568', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  churnCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0F1525', borderRadius: 15, padding: 16, borderWidth: 1 },
  churnL: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  churnLbl: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' }, churnSub: { color: '#4A5568', fontSize: 10, marginTop: 2 },
  churnVal: { fontSize: 32, fontWeight: '800', letterSpacing: -.5 },
  sec: { gap: 10 }, secT: { color: '#E2E8F0', fontSize: 15, fontWeight: '700' },
  nCard: { backgroundColor: '#0F1525', borderRadius: 13, padding: 12, borderWidth: 1, borderColor: '#1A2035', gap: 7 },
  nCol: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  nRow: { flexDirection: 'row', gap: 7 },
  pill: { backgroundColor: '#0A0E1A', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#1A2035', alignItems: 'center' },
  pillL: { color: '#4A5568', fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .5 },
  pillV: { color: '#00D4AA', fontSize: 12, fontWeight: '700', marginTop: 1 },
  chartWrap: { backgroundColor: '#0F1525', borderRadius: 15, padding: 14, borderWidth: 1, borderColor: '#1A2035', gap: 8 },
  savedQ: { color: '#4A5568', fontSize: 11, fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: '#00D4AA33', paddingLeft: 8 },
});