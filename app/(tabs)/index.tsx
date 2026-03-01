import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList, KeyboardAvoidingView, Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
} from 'react-native';
import MessageBubble from '../../components/MessageBubble';
import { ChatMessage, DataStore, useAppContext } from '../../context/AppContext';
import { queryAI, queryLocal } from '../../utils/aiService';
import { speak, stopSpeak, useVoice } from '../../utils/voiceService';

/* ─── dynamic suggestions from schema ─────────────────────────────────── */
function suggest(ds: DataStore): string[] {
  const h = ds.headers, lo = h.map(x => x.toLowerCase());
  const cat = h.filter(x => { const u = new Set(ds.rows.map(r => String(r[x]))); return u.size >= 2 && u.size <= 12; });
  const num = h.filter(x => ds.rows.filter(r => typeof r[x] === 'number').length > ds.rowCount * .5);
  const churn = h.find(x => x.toLowerCase().includes('churn'));
  const out: string[] = [];
  if (churn && cat.length) out.push(`Churn rate by ${cat.find(c => lo[h.indexOf(c)] === 'gender') || cat[0]}`);
  if (cat.length) out.push(`Show distribution by ${cat[out.length ? 1 : 0] || cat[0]}`);
  if (num.length && cat.length) out.push(`Average ${num[0]} by ${cat[0]}`);
  if (num.length) out.push(`Top 5 by ${num[num.length > 1 ? num.length - 1 : 0]}`);
  if (out.length < 3) out.push('Summary statistics');
  return out.slice(0, 4);
}

export default function ChatScreen() {
  const { dataStores, getActiveDataStore, apiKey, messages, addMessage, updateMessage, clearMessages, saveInsight, updateRow, addRow, deleteRow, updateCell, bulkUpdateCells } = useAppContext();
  const ds = getActiveDataStore();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [tts, setTts] = useState(false);
  const list = useRef<FlatList>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const tips = useMemo(() => ds ? suggest(ds) : [], [ds]);

  /* voice */
  const { status: vs, interim, toggle: micToggle, supported: micOk } = useVoice(
    (txt) => setInput(txt),
    (msg) => Alert.alert('Voice', msg),
  );
  const listening = vs === 'listening';

  useEffect(() => {
    if (listening) {
      loopRef.current = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.25, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]));
      loopRef.current.start();
    } else { loopRef.current?.stop(); Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }).start(); }
  }, [listening]);

  /* send */
  const send = useCallback(async (q?: string) => {
    const txt = (q || input).trim();
    if (!txt || busy) return;
    if (!ds) { Alert.alert('No Dataset', 'Upload a CSV in the Dataset tab first.'); return; }
    setInput(''); setBusy(true); stopSpeak();

    const uid = `u${Date.now()}`, aid = `a${Date.now()}`;
    addMessage({ id: uid, role: 'user', content: txt, timestamp: new Date() });
    addMessage({ id: aid, role: 'assistant', content: '', timestamp: new Date(), isLoading: true });
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);

    try {
      const r = apiKey ? await queryAI(txt, ds, apiKey) : queryLocal(txt, ds);
      
      // Apply CSV updates if any
      if (r.updates && r.updates.length > 0) {
        const cellUpdates: Array<any> = [];
        const otherUpdates: Array<any> = [];
        
        // Separate cell updates from other updates for batch processing
        r.updates.forEach((update: any) => {
          if (update.type === 'update_cell' && typeof update.rowIndex === 'number' && update.column && update.value !== undefined) {
            cellUpdates.push(update);
          } else {
            otherUpdates.push(update);
          }
        });
        
        // Apply cell updates in bulk for efficiency
        if (cellUpdates.length > 0) {
          bulkUpdateCells(cellUpdates.map((u: any) => ({ rowIndex: u.rowIndex, column: u.column, value: u.value })));
        }
        
        // Apply other updates one by one
        otherUpdates.forEach((update: any) => {
          try {
            if (update.type === 'add_row' && update.row) {
              addRow(update.row);
            } else if (update.type === 'delete_row' && typeof update.rowIndex === 'number') {
              deleteRow(update.rowIndex);
            }
          } catch { }
        });
      }
      
      updateMessage(aid, { content: r.answer, queryLogic: r.queryLogic, explanation: r.explanation, chartData: r.chartData, confidence: r.confidence, isLoading: false });
      if (tts) speak(r.answer);
    } catch (e: any) {
      updateMessage(aid, { content: `⚠️ ${e.message}`, isLoading: false });
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [input, busy, ds, apiKey, tts, addMessage, updateMessage, bulkUpdateCells, addRow, deleteRow]);

  const renderMsg = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble message={item} onSave={item.chartData ? saveInsight : undefined} />
  ), [saveInsight]);

  const mode = apiKey ? 'AI · Mistral' : 'Rule-Based';
  const modeC = apiKey ? '#00D4AA' : '#F6AD55';

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={st.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={st.hdr}>
          <View style={st.hdrL}>
            <View style={st.logo}><Ionicons name="analytics" size={19} color="#00D4AA" /></View>
            <View>
              <Text style={st.hdrTitle}>DataMind</Text>
              <Text style={st.hdrSub}>{ds ? `📂 ${ds.fileName} · ${ds.rowCount.toLocaleString()} rows` : 'No dataset'}</Text>
            </View>
          </View>
          <View style={st.hdrR}>
            <View style={[st.badge, { borderColor: modeC + '44', backgroundColor: modeC + '12' }]}>
              <View style={[st.badgeDot, { backgroundColor: modeC }]} />
              <Text style={[st.badgeT, { color: modeC }]}>{mode}</Text>
            </View>
            <TouchableOpacity style={[st.ic, tts && st.icOn]} onPress={() => { setTts(v => !v); stopSpeak(); }}>
              <Ionicons name={tts ? 'volume-high' : 'volume-mute'} size={15} color={tts ? '#00D4AA' : '#4A5568'} />
            </TouchableOpacity>
            {messages.length > 0 && <TouchableOpacity onPress={() => Alert.alert('Clear', 'Clear chat?', [{ text: 'No' }, { text: 'Yes', style: 'destructive', onPress: () => { clearMessages(); stopSpeak(); } }])}><Ionicons name="trash-outline" size={17} color="#4A5568" /></TouchableOpacity>}
          </View>
        </View>

        {/* Listening bar */}
        {listening && (
          <View style={st.lisBar}>
            <View style={st.lisDot} />
            <Text style={st.lisT}>{interim || 'Listening… speak your question'}</Text>
            <TouchableOpacity onPress={micToggle}><Ionicons name="stop-circle" size={17} color="#FF6B6B" /></TouchableOpacity>
          </View>
        )}

        {/* Body */}
        {messages.length === 0 ? (
          <View style={st.empty}>
            <View style={st.emIco}><Ionicons name="chatbubbles-outline" size={44} color="#2D3748" /></View>
            <Text style={st.emTitle}>Ask Your Data Anything</Text>
            <Text style={st.emSub}>{ds ? `${ds.rowCount.toLocaleString()} rows loaded · try these:` : 'Load a CSV dataset first.'}</Text>
            {ds && <View style={st.tips}>{tips.map((t, i) => (
              <TouchableOpacity key={i} style={st.tip} onPress={() => send(t)}>
                <Ionicons name="sparkles-outline" size={11} color="#00D4AA" />
                <Text style={st.tipT}>{t}</Text>
                <Ionicons name="arrow-forward" size={11} color="#00D4AA" />
              </TouchableOpacity>
            ))}</View>}
            {micOk && <TouchableOpacity style={st.voiceHint} onPress={micToggle}>
              <Ionicons name="mic" size={15} color="#A78BFA" />
              <Text style={st.vhT}>Or tap the mic to ask by voice</Text>
            </TouchableOpacity>}
          </View>
        ) : (
          <FlatList ref={list} data={messages} renderItem={renderMsg} keyExtractor={m => m.id}
            contentContainerStyle={{ paddingVertical: 10 }} showsVerticalScrollIndicator={false}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })} />
        )}

        {/* Input */}
        <View style={st.inArea}>
          {!ds && <View style={st.warn}><Ionicons name="warning-outline" size={13} color="#F6AD55" /><Text style={st.warnT}>Upload a CSV in the Dataset tab</Text></View>}
          <View style={st.inRow}>
            {micOk && (
              <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <TouchableOpacity style={[st.mic, listening && st.micOn]} onPress={micToggle} disabled={!ds || busy}>
                  <Ionicons name={listening ? 'stop' : 'mic'} size={17} color={listening ? '#fff' : '#718096'} />
                </TouchableOpacity>
              </Animated.View>
            )}
            <TextInput style={st.inp} value={listening && interim ? interim : input} onChangeText={setInput}
              placeholder={listening ? 'Listening…' : ds ? 'Ask about your data…' : 'Load data first…'}
              placeholderTextColor={listening ? '#A78BFA' : '#2D3748'} multiline maxLength={500}
              editable={!!ds && !busy && !listening} onSubmitEditing={() => send()} returnKeyType="send" />
            <TouchableOpacity style={[st.sendBtn, (!input.trim() || busy || !ds) && st.sendOff]} onPress={() => send()} disabled={!input.trim() || busy || !ds}>
              {busy ? <ActivityIndicator size="small" color="#0A0E1A" /> : <Ionicons name="send" size={17} color="#0A0E1A" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' }, flex: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A2035' },
  hdrL: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hdrR: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#00D4AA15', borderWidth: 1, borderColor: '#00D4AA33', alignItems: 'center', justifyContent: 'center' },
  hdrTitle: { color: '#E2E8F0', fontSize: 16, fontWeight: '700' },
  hdrSub: { color: '#4A5568', fontSize: 10, marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 16, borderWidth: 1 },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeT: { fontSize: 9, fontWeight: '700' },
  ic: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#0F1525', borderWidth: 1, borderColor: '#1A2035', alignItems: 'center', justifyContent: 'center' },
  icOn: { borderColor: '#00D4AA44', backgroundColor: '#00D4AA12' },
  lisBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B6B12', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#FF6B6B28' },
  lisDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B6B' },
  lisT: { color: '#FCA5A5', fontSize: 12, flex: 1, fontStyle: 'italic' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emIco: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#0F1525', borderWidth: 1, borderColor: '#1A2035', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emTitle: { color: '#E2E8F0', fontSize: 19, fontWeight: '700', marginBottom: 6 },
  emSub: { color: '#4A5568', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  tips: { width: '100%', gap: 7 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0F1525', borderRadius: 11, padding: 12, borderWidth: 1, borderColor: '#1A2035' },
  tipT: { color: '#A0AEC0', fontSize: 12.5, flex: 1 },
  voiceHint: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#A78BFA12', borderRadius: 11, borderWidth: 1, borderColor: '#A78BFA28' },
  vhT: { color: '#A78BFA', fontSize: 12 },
  inArea: { borderTopWidth: 1, borderTopColor: '#1A2035', padding: 14, gap: 7 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F6AD5512', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#F6AD5528' },
  warnT: { color: '#F6AD55', fontSize: 11, flex: 1 },
  inRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  mic: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#0F1525', borderWidth: 1, borderColor: '#1A2035', alignItems: 'center', justifyContent: 'center' },
  micOn: { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B55' },
  inp: { flex: 1, backgroundColor: '#0F1525', borderRadius: 13, borderWidth: 1, borderColor: '#1A2035', color: '#E2E8F0', fontSize: 13, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 90 },
  sendBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#00D4AA', alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: '#1A2035' },
});