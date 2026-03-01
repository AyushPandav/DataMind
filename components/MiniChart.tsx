import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polyline, Rect, Text as ST, Stop } from 'react-native-svg';
import { ChartData } from '../context/AppContext';

const W = Math.min(Dimensions.get('window').width - 64, 480);
const H = 190;
const P = { t: 18, r: 16, b: 44, l: 46 };

export default function MiniChart({ data }: { data: ChartData }) {
  if (!data?.values?.length) return null;
  return (
    <View style={s.box}>
      <Text style={s.title}>{data.title}</Text>
      {data.type === 'pie' ? <Donut data={data} /> : data.type === 'line' ? <Line data={data} /> : <Bar data={data} />}
      <View style={s.leg}>
        {data.labels.slice(0, 8).map((l, i) => (
          <View key={i} style={s.legI}><View style={[s.dot, { backgroundColor: data.colors?.[i] || '#00D4AA' }]} /><Text style={s.legT} numberOfLines={1}>{l}</Text></View>
        ))}
      </View>
    </View>
  );
}

function Bar({ data }: { data: ChartData }) {
  const { labels, values, colors: c } = data;
  const mx = Math.max(...values, 1);
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const bw = Math.min((iw / labels.length) * 0.6, 56);
  const gap = iw / labels.length;
  return (
    <Svg width={W} height={H}>
      <Defs>{labels.map((_, i) => (
        <LinearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c?.[i] || '#00D4AA'} stopOpacity="1" />
          <Stop offset="1" stopColor={c?.[i] || '#00D4AA'} stopOpacity="0.45" />
        </LinearGradient>
      ))}</Defs>
      {[0, .25, .5, .75, 1].map((p, i) => {
        const y = P.t + ih * (1 - p);
        return (<G key={i}><ST x={P.l - 5} y={y + 3} fontSize={8} fill="#4A5568" textAnchor="end">{(mx * p).toFixed(mx < 10 ? 1 : 0)}</ST><Path d={`M${P.l} ${y}H${P.l + iw}`} stroke="#1A2035" strokeWidth={.7} /></G>);
      })}
      {labels.map((l, i) => {
        const bh = mx > 0 ? (values[i] / mx) * ih : 0;
        const x = P.l + i * gap + (gap - bw) / 2, y = P.t + ih - bh;
        return (<G key={i}>
          <Rect x={x} y={y} width={bw} height={Math.max(bh, 1)} fill={`url(#g${i})`} rx={3} />
          <ST x={x + bw / 2} y={y - 4} fontSize={9} fill={c?.[i] || '#00D4AA'} textAnchor="middle" fontWeight="bold">{values[i] % 1 === 0 ? values[i] : values[i].toFixed(1)}</ST>
          <ST x={x + bw / 2} y={P.t + ih + 14} fontSize={8} fill="#718096" textAnchor="middle">{l.length > 10 ? l.slice(0, 10) + '…' : l}</ST>
        </G>);
      })}
    </Svg>
  );
}

function Donut({ data }: { data: ChartData }) {
  const { values, colors: c } = data;
  const total = values.reduce((a, b) => a + b, 0);
  const cx = W / 2, cy = H / 2, r = Math.min(cx, cy) - 20, ir = r * .52;
  let sa = -Math.PI / 2;
  const arcs = values.map((v, i) => {
    const frac = total > 0 ? v / total : 0, a = frac * 2 * Math.PI, ea = sa + a;
    const d = arcPath(cx, cy, r, ir, sa, ea, a > Math.PI);
    const mid = sa + a / 2, lx = cx + r * .76 * Math.cos(mid), ly = cy + r * .76 * Math.sin(mid);
    const pct = (frac * 100).toFixed(1);
    sa = ea;
    return { d, color: c?.[i] || '#00D4AA', lx, ly, pct };
  });
  return (
    <Svg width={W} height={H}>
      {arcs.map((a, i) => (<G key={i}><Path d={a.d} fill={a.color} opacity={.88} stroke="#0A0E1A" strokeWidth={2} />{+a.pct > 7 && <ST x={a.lx} y={a.ly + 3} fontSize={9} fill="#0A0E1A" textAnchor="middle" fontWeight="bold">{a.pct}%</ST>}</G>))}
      <ST x={cx} y={cy - 4} fontSize={17} fill="#E2E8F0" textAnchor="middle" fontWeight="bold">{total}</ST>
      <ST x={cx} y={cy + 12} fontSize={8} fill="#4A5568" textAnchor="middle">total</ST>
    </Svg>
  );
}
function arcPath(cx: number, cy: number, r: number, ir: number, sa: number, ea: number, large: boolean) {
  const la = large ? 1 : 0;
  return `M${cx + r * Math.cos(sa)} ${cy + r * Math.sin(sa)}A${r} ${r} 0 ${la} 1 ${cx + r * Math.cos(ea)} ${cy + r * Math.sin(ea)}L${cx + ir * Math.cos(ea)} ${cy + ir * Math.sin(ea)}A${ir} ${ir} 0 ${la} 0 ${cx + ir * Math.cos(sa)} ${cy + ir * Math.sin(sa)}Z`;
}

function Line({ data }: { data: ChartData }) {
  const { labels, values, colors: c } = data;
  const mx = Math.max(...values, 1), mn = Math.min(...values, 0), rng = mx - mn || 1;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const pts = values.map((v, i) => ({ x: P.l + (i / Math.max(labels.length - 1, 1)) * iw, y: P.t + ih - ((v - mn) / rng) * ih }));
  const col = c?.[0] || '#00D4AA';
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x} ${P.t + ih}${pts.map(p => `L${p.x} ${p.y}`).join('')}L${pts[pts.length - 1].x} ${P.t + ih}Z`;
  return (
    <Svg width={W} height={H}>
      <Defs><LinearGradient id="la" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={col} stopOpacity=".25" /><Stop offset="1" stopColor={col} stopOpacity=".02" /></LinearGradient></Defs>
      {[0, .5, 1].map((p, i) => { const y = P.t + ih * (1 - p); return (<G key={i}><ST x={P.l - 5} y={y + 3} fontSize={8} fill="#4A5568" textAnchor="end">{(mn + rng * p).toFixed(0)}</ST><Path d={`M${P.l} ${y}H${P.l + iw}`} stroke="#1A2035" strokeWidth={.7} /></G>); })}
      <Path d={area} fill="url(#la)" />
      <Polyline points={poly} fill="none" stroke={col} strokeWidth={2.3} strokeLinejoin="round" />
      {pts.map((p, i) => (<G key={i}><Circle cx={p.x} cy={p.y} r={3.5} fill={col} stroke="#0A0E1A" strokeWidth={1.5} /><ST x={p.x} y={P.t + ih + 14} fontSize={8} fill="#718096" textAnchor="middle">{labels[i].length > 8 ? labels[i].slice(0, 8) + '…' : labels[i]}</ST></G>))}
    </Svg>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: '#0A0E1A', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#1A2035' },
  title: { color: '#E2E8F0', fontSize: 12, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  leg: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 },
  legI: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legT: { color: '#718096', fontSize: 10, maxWidth: 80 },
});