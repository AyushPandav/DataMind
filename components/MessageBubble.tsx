import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChatMessage } from '../context/AppContext';
import MiniChart from './MiniChart';

export default function MessageBubble({ message: m, onSave }: { message: ChatMessage; onSave?: (m: ChatMessage) => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const copy = (t: string) => {
    if (Platform.OS === 'web') try { navigator.clipboard.writeText(t); } catch { }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  if (m.role === 'user') {
    return (
      <Animated.View style={[s.uWrap, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <View style={s.uBub}><Text style={s.uTxt}>{m.content}</Text></View>
      </Animated.View>
    );
  }

  if (m.isLoading) {
    return (
      <Animated.View style={[s.aWrap, { opacity: fade }]}>
        <View style={s.aBub}><PulseDots /></View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.aWrap, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {/* Header row */}
      <View style={s.hdr}>
        <View style={s.tag}><Ionicons name="analytics" size={11} color="#00D4AA" /><Text style={s.tagT}>DataMind</Text></View>
        <View style={s.hdrR}>
          {m.confidence ? <View style={s.conf}><Ionicons name="shield-checkmark" size={9} color="#68D391" /><Text style={s.confT}>{m.confidence}</Text></View> : null}
          {onSave && m.chartData ? <TouchableOpacity onPress={() => onSave(m)} style={{ padding: 4 }}><Ionicons name="bookmark-outline" size={14} color="#718096" /></TouchableOpacity> : null}
        </View>
      </View>

      <View style={s.aBub}>
        <Text style={s.aTxt}>{m.content}</Text>
        {m.chartData && <MiniChart data={m.chartData} />}

        {(m.queryLogic || m.explanation) && (
          <View style={s.expSec}>
            <TouchableOpacity style={s.expTog} onPress={() => setOpen(!open)}>
              <Ionicons name="code-slash" size={12} color="#4ECDC4" />
              <Text style={s.expTogT}>How was this derived?</Text>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color="#4ECDC4" />
            </TouchableOpacity>
            {open && (
              <View style={s.expC}>
                {m.queryLogic ? (
                  <View style={s.expB}>
                    <View style={s.expLR}>
                      <Text style={s.expL}>📋 QUERY LOGIC</Text>
                      <TouchableOpacity onPress={() => copy(m.queryLogic!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={11} color={copied ? '#68D391' : '#4A5568'} />
                        <Text style={{ color: copied ? '#68D391' : '#4A5568', fontSize: 9 }}>{copied ? 'Copied' : 'Copy'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={s.code}><Text style={s.codeT}>{m.queryLogic}</Text></View>
                  </View>
                ) : null}
                {m.explanation ? (
                  <View style={s.expB}>
                    <Text style={s.expL}>💡 EXPLANATION</Text>
                    <Text style={s.expTxt}>{m.explanation}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        )}
      </View>
      <Text style={s.ts}>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
    </Animated.View>
  );
}

function PulseDots() {
  const dots = [useRef(new Animated.Value(.3)).current, useRef(new Animated.Value(.3)).current, useRef(new Animated.Value(.3)).current];
  useEffect(() => {
    const anims = dots.map((d, i) => Animated.loop(Animated.sequence([Animated.delay(i * 150), Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }), Animated.timing(d, { toValue: .3, duration: 280, useNativeDriver: true })])));
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return <View style={{ flexDirection: 'row', gap: 5, padding: 4 }}>{dots.map((d, i) => <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#00D4AA', opacity: d }} />)}</View>;
}

const s = StyleSheet.create({
  uWrap: { alignItems: 'flex-end', marginVertical: 5, paddingHorizontal: 16 },
  uBub: { backgroundColor: '#00D4AA', borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 9, maxWidth: '80%' },
  uTxt: { color: '#0A0E1A', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  aWrap: { marginVertical: 5, paddingHorizontal: 16 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  hdrR: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F1525', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 16, borderWidth: 1, borderColor: '#00D4AA33' },
  tagT: { color: '#00D4AA', fontSize: 9, fontWeight: '700', letterSpacing: .5 },
  conf: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#68D39112', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 16, borderWidth: 1, borderColor: '#68D39128' },
  confT: { color: '#68D391', fontSize: 9, fontWeight: '600' },
  aBub: { backgroundColor: '#0F1525', borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#1A2035', padding: 14 },
  aTxt: { color: '#E2E8F0', fontSize: 13.5, lineHeight: 21 },
  expSec: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#1A2035', paddingTop: 8 },
  expTog: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  expTogT: { color: '#4ECDC4', fontSize: 11, fontWeight: '600', flex: 1 },
  expC: { marginTop: 8, gap: 10 },
  expB: { gap: 5 },
  expLR: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expL: { color: '#A0AEC0', fontSize: 10, fontWeight: '700', letterSpacing: .8 },
  code: { backgroundColor: '#070B14', borderRadius: 7, padding: 9, borderWidth: 1, borderColor: '#1A2035' },
  codeT: { color: '#68D391', fontSize: 10.5, fontFamily: 'Courier', lineHeight: 17 },
  expTxt: { color: '#A0AEC0', fontSize: 11.5, lineHeight: 17 },
  ts: { color: '#2D3748', fontSize: 9, marginTop: 3, marginLeft: 4 },
});