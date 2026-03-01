import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type VoiceStatus = 'idle' | 'listening' | 'off';

/**
 * Speech-to-text via the Web Speech API (Chrome/Edge only).
 * Returns transcript via onResult callback.
 * Note: Requires HTTPS or localhost to function.
 */
export function useVoice(onResult: (text: string) => void, onErr?: (msg: string) => void) {
    const [status, setStatus] = useState<VoiceStatus>('idle');
    const [interim, setInterim] = useState('');
    const recRef = useRef<any>(null);

    const isSecureContext = typeof window !== 'undefined' && 
        (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    const supported = Platform.OS === 'web' && typeof window !== 'undefined' && isSecureContext &&
        !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    useEffect(() => {
        if (!supported) { 
            setStatus('off'); 
            return; 
        }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const r = new SR();
        r.lang = 'en-US'; r.continuous = false; r.interimResults = true; r.maxAlternatives = 1;

        r.onstart = () => { setStatus('listening'); setInterim(''); };
        r.onresult = (e: any) => {
            let fin = '', tmp = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                e.results[i].isFinal ? (fin += t) : (tmp += t);
            }
            setInterim(tmp);
            if (fin) { setInterim(''); setStatus('idle'); onResult(fin.trim()); }
        };
        r.onerror = (e: any) => {
            setStatus('idle'); setInterim('');
            const errorMap: Record<string, string> = {
                'not-allowed': `Microphone permission denied. Check browser security settings or ensure the site is served over HTTPS.`,
                'no-speech': 'No speech detected. Please try again.',
                'network': 'Network error. Check your connection.',
                'audio-capture': 'No microphone found or microphone access denied.',
                'service-not-allowed': 'Speech Recognition service blocked by security policy.',
            };
            const msg = errorMap[e.error] || `Voice error: ${e.error}`;
            onErr?.(msg);
        };
        r.onend = () => { setStatus(s => s === 'listening' ? 'idle' : s); setInterim(''); };
        recRef.current = r;
        return () => { try { r.abort(); } catch { } };
    }, []);

    const toggle = useCallback(() => {
        if (!isSecureContext) { 
            onErr?.('⚠️ Microphone requires HTTPS or localhost. Currently on: ' + (typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.host : 'unknown')); 
            return; 
        }
        if (!supported) { onErr?.('Voice not supported — use Chrome or Edge on HTTPS/localhost.'); return; }
        if (status === 'listening') { try { recRef.current?.stop(); } catch { } }
        else { try { recRef.current?.start(); } catch { onErr?.('Could not start mic. Ensure microphone permissions are granted.'); } }
    }, [status, supported, isSecureContext]);

    return { status, interim, toggle, supported };
}

/** Text-to-speech — reads answer aloud (web only). */
export function speak(text: string) {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').replace(/[📊📋💡🔍⚠️•]/g, '').replace(/\*\*/g, '').slice(0, 400);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'en-US'; u.rate = 1.05;
    window.speechSynthesis.speak(u);
}

export function stopSpeak() {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}
