import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { C } from '../theme';
import { Label } from '../components/ui';
import Mic from '../components/Mic';
import { chat, extractPlan, stripPlan } from '../ai';
import { getApiKey } from '../storage';

const OPENER =
  'Tell me what you actually want to change. Say it however it comes out — no categories, no dates unless you have them.';

export default function Onboarding({ settings, onPlan }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: OPENER }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scroller = useRef(null);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const apiKey = await getApiKey(settings.provider);
      const reply = await chat({ ...settings, apiKey, messages: next.filter((m) => m.content !== OPENER) });
      const plan = extractPlan(reply);
      setMessages([...next, { role: 'assistant', content: stripPlan(reply) || 'Plan ready.' }]);
      if (plan) onPlan(plan);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.body}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        <Label>Setup — no forms</Label>
        <Text style={styles.h1}>Just talk to it.</Text>
        <Text style={styles.sub}>Say what you want. It asks until it knows enough to build the whole thing.</Text>
        <View style={{ marginTop: 18 }}>
          {messages.map((m, i) => (
            <Text key={i} style={m.role === 'assistant' ? styles.ai : styles.user}>
              {m.content}
            </Text>
          ))}
          {busy ? <ActivityIndicator color={C.accent} style={{ marginTop: 10 }} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>
      <View style={styles.composer}>
        <Mic onText={(t) => setDraft((d) => (d ? d + ' ' + t : t))} />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type or hold the mic and talk"
          placeholderTextColor={C.txt3}
          multiline
        />
        <TouchableOpacity style={styles.send} onPress={send} disabled={busy}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 24 },
  h1: { fontSize: 22, fontWeight: '600', color: C.txt, letterSpacing: -0.4, marginTop: 6 },
  sub: { fontSize: 12, color: C.txt2, marginTop: 4 },
  ai: {
    backgroundColor: 'rgba(255,106,61,0.09)', borderWidth: 0.5, borderColor: 'rgba(255,106,61,0.4)',
    borderRadius: 14, borderBottomLeftRadius: 4, padding: 13, fontSize: 12.5, lineHeight: 19,
    color: C.txt, marginBottom: 9,
  },
  user: {
    backgroundColor: C.bg2, borderWidth: 0.5, borderColor: C.line, borderRadius: 14,
    borderBottomRightRadius: 4, padding: 13, fontSize: 12.5, lineHeight: 19,
    color: C.txt2, marginBottom: 9, marginLeft: 40,
  },
  error: { color: C.accent, fontSize: 12, marginTop: 10, lineHeight: 18 },
  composer: {
    flexDirection: 'row', gap: 6, padding: 12,
    borderTopWidth: 0.5, borderTopColor: C.line, backgroundColor: C.bg1,
  },
  input: {
    flex: 1, maxHeight: 90, backgroundColor: C.bg0, borderWidth: 0.5, borderColor: C.line,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: C.txt, fontSize: 13,
  },
  send: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13 },
});
