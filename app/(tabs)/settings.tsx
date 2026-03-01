import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const MODELS = [
  { id: 'mistral-large-latest', label: 'Large', desc: 'Most accurate' },
  { id: 'mistral-small-latest', label: 'Small', desc: 'Faster' },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [model, setModel] = useState('mistral-large-latest');

  const logout = () => Alert.alert('Sign Out', 'Sure?', [
    { text: 'Cancel' },
    {
      text: 'Sign Out',
      style: 'destructive',
      onPress: async () => {
        try {
          console.log('🔐 Signing out...');
          await signOut();
          console.log('✅ Signed out successfully');
          router.replace('/login');
        } catch (e: any) {
          console.error('❌ Logout error:', e);
          Alert.alert('Error', e.message || 'Failed to sign out');
        }
      }
    }
  ]);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="light" />
      <View style={st.hdr}><Text style={st.hdrT}>Settings</Text><Text style={st.hdrS}>Configure AI & preferences</Text></View>
      <ScrollView style={st.scroll} contentContainerStyle={st.content}>

        {/* Account */}
        <Sec title="👤 Account">
          <View style={st.card}>
            <View style={st.profRow}>
              <View style={st.av}><Text style={st.avT}>{user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}</Text></View>
              <View style={{ flex: 1 }}><Text style={st.profN}>{user?.displayName || 'User'}</Text><Text style={st.profE}>{user?.email || ''}</Text></View>
            </View>
            <TouchableOpacity style={st.logoutBtn} onPress={logout}><Ionicons name="log-out-outline" size={15} color="#FC8181" /><Text style={st.logoutT}>Sign Out</Text></TouchableOpacity>
          </View>
        </Sec>



        {/* Model */}
        <Sec title="⚡ Model">
          <View style={st.card}>
            <View style={st.modRow}>
              {MODELS.map(m => (
                <TouchableOpacity key={m.id} style={[st.modBtn, model === m.id && st.modOn]} onPress={() => setModel(m.id)}>
                  <Text style={[st.modLbl, model === m.id && st.modLblOn]}>{m.label}</Text>
                  <Text style={st.modDesc}>{m.desc}</Text>
                  {model === m.id && <View style={st.modChk}><Ionicons name="checkmark" size={9} color="#0A0E1A" /></View>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Sec>

        {/* Modes */}
        <Sec title="🔍 Analysis Modes">
          <View style={st.card}>
            <ModeItem title="AI-Powered (Mistral)" desc="NLP understanding, complex queries" active={true} icon="sparkles" color="#00D4AA" />
            <View style={st.div} />
            <ModeItem title="Rule-Based (Built-in)" desc="Pattern matching for churn, avg, top-N, stats" active={false} icon="flash" color="#F6AD55" />
          </View>
        </Sec>

        {/* About */}
        <Sec title="ℹ️ About">
          <View style={st.card}>
            <View style={st.aboutRow}>
              <View style={st.aboutIco}><Ionicons name="analytics" size={22} color="#00D4AA" /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.aboutN}>DataMind v2</Text>
                <Text style={st.aboutD}>Conversational Data Intelligence — ask questions, get grounded answers.</Text>
              </View>
            </View>
            {['Dataset-agnostic CSV analysis', 'Anti-hallucination grounded answers', 'Transparent SQL query logic', 'Voice input & text-to-speech', 'Auto visualizations (bar, donut, line)', 'Offline rule-based engine'].map((f, i) => (
              <View key={i} style={st.feat}><View style={st.featDot} /><Text style={st.featT}>{f}</Text></View>
            ))}
          </View>
        </Sec>

        {/* Examples */}
        <Sec title="💡 Example Queries">
          <View style={st.card}>
            {['Churn rate by gender?', 'Average monthly charges by contract', 'Top 5 customers by total charges', 'Statistics for tenure', 'Distribution by internet service'].map((q, i) => (
              <View key={i} style={st.exRow}><View style={st.exN}><Text style={st.exNT}>{i + 1}</Text></View><Text style={st.exQ}>{q}</Text></View>
            ))}
          </View>
        </Sec>
      </ScrollView>
    </SafeAreaView>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={st.sec}><Text style={st.secTitle}>{title}</Text>{children}</View>;
}
function ModeItem({ title, desc, active, icon, color }: any) {
  return (
    <View style={st.modeRow}>
      <Ionicons name={icon} size={18} color={color} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={st.modeT}>{title}</Text>
          {active && <View style={[st.actBadge, { backgroundColor: color + '18', borderColor: color + '44' }]}><Text style={[st.actBadgeT, { color }]}>Active</Text></View>}
        </View>
        <Text style={st.modeD}>{desc}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  hdr: { paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#1A2035' },
  hdrT: { color: '#E2E8F0', fontSize: 22, fontWeight: '800' }, hdrS: { color: '#4A5568', fontSize: 12, marginTop: 3 },
  scroll: { flex: 1 }, content: { padding: 18, gap: 18, paddingBottom: 36 },
  sec: { gap: 8 }, secTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: '#0F1525', borderRadius: 15, padding: 16, borderWidth: 1, borderColor: '#1A2035', gap: 10 },
  profRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  av: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00D4AA18', borderWidth: 1, borderColor: '#00D4AA40', alignItems: 'center', justifyContent: 'center' },
  avT: { color: '#00D4AA', fontSize: 20, fontWeight: '800' },
  profN: { color: '#E2E8F0', fontSize: 15, fontWeight: '700' }, profE: { color: '#4A5568', fontSize: 11, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 11, borderRadius: 11, borderWidth: 1, borderColor: '#FC818128', backgroundColor: '#FC818108' },
  logoutT: { color: '#FC8181', fontSize: 13, fontWeight: '700' },
  label: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' }, hint: { color: '#4A5568', fontSize: 11, lineHeight: 16 },
  inRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0E1A', borderRadius: 11, borderWidth: 1, borderColor: '#1A2035', overflow: 'hidden' },
  inp: { flex: 1, color: '#E2E8F0', fontSize: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'monospace' },
  btnRow: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#00D4AA', borderRadius: 11, paddingVertical: 10 },
  saveOk: { backgroundColor: '#68D391' }, saveT: { color: '#0A0E1A', fontSize: 13, fontWeight: '700' },
  clrBtn: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#FC818140' },
  clrT: { color: '#FC8181', fontSize: 13, fontWeight: '600' },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#4ECDC412', borderRadius: 9, padding: 9, borderWidth: 1, borderColor: '#4ECDC428' },
  infoT: { color: '#4ECDC4', fontSize: 10, lineHeight: 15, flex: 1 },
  modRow: { flexDirection: 'row', gap: 9 },
  modBtn: { flex: 1, backgroundColor: '#0A0E1A', borderRadius: 11, padding: 12, borderWidth: 1, borderColor: '#1A2035', gap: 2, position: 'relative' as const },
  modOn: { borderColor: '#00D4AA55', backgroundColor: '#00D4AA0A' },
  modLbl: { color: '#718096', fontSize: 13, fontWeight: '700' }, modLblOn: { color: '#00D4AA' },
  modDesc: { color: '#4A5568', fontSize: 10 },
  modChk: { position: 'absolute' as const, top: 7, right: 7, width: 15, height: 15, borderRadius: 7, backgroundColor: '#00D4AA', alignItems: 'center', justifyContent: 'center' },
  div: { height: 1, backgroundColor: '#1A2035' },
  modeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modeT: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' }, modeD: { color: '#4A5568', fontSize: 11, marginTop: 1 },
  actBadge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 16, borderWidth: 1 },
  actBadgeT: { fontSize: 9, fontWeight: '700' },
  aboutRow: { flexDirection: 'row', gap: 12 },
  aboutIco: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#00D4AA12', borderWidth: 1, borderColor: '#00D4AA28', alignItems: 'center', justifyContent: 'center' },
  aboutN: { color: '#E2E8F0', fontSize: 15, fontWeight: '800', marginBottom: 3 }, aboutD: { color: '#718096', fontSize: 11, lineHeight: 16 },
  feat: { flexDirection: 'row', alignItems: 'center', gap: 8 }, featDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00D4AA' },
  featT: { color: '#A0AEC0', fontSize: 12, flex: 1 },
  exRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exN: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#00D4AA12', borderWidth: 1, borderColor: '#00D4AA28', alignItems: 'center', justifyContent: 'center' },
  exNT: { color: '#00D4AA', fontSize: 10, fontWeight: '700' }, exQ: { color: '#718096', fontSize: 12, flex: 1, lineHeight: 18 },
});