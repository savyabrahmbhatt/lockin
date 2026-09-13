import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { Label, Bar } from '../components/ui';
import Mic from '../components/Mic';
import { chat, extractPlan, stripPlan } from '../ai';
import { getApiKey } from '../storage';
import { tap, win, nope } from '../haptics';

const OPENER =
  'Tell me what you actually want to change. Say it however it comes out — no categories, no dates unless you have them.';

// Plan generation takes a while on the slower models. Silence reads as a hang, so the
// wait narrates itself.
const STAGES = [
  'Reading everything you told me…',
  'Working out the real hours this needs…',
  'Splitting each goal into blocks…',
  'Balancing the load across seven days…',
  'Writing what each one costs you…',
];

function Building() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4200);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={styles.building}>
      <ActivityIndicator color={C.accent} />
      <Text style={styles.buildingText}>{STAGES[stage]}</Text>
    </View>
  );
}

function Typing() {
  const dot = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [dot]);
  return (
    <View style={styles.typing}>
      <Animated.View style={[styles.typingDot, { opacity: dot }]} />
      <Text style={styles.typingText}>Thinking</Text>
    </View>
  );
}

export default function Onboarding({ settings, onPlan }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: OPENER }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scroller = useRef(null);

  const answered = messages.filter((m) => m.role === 'user').length;
  const pct = Math.min(100, Math.round((answered / 7) * 100));
  // Past question four the model usually has enough to plan, so stop promising more.
  const deep = answered >= 4;

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    tap();
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const apiKey = await getApiKey(settings.provider);
      const reply = await chat({ ...settings, apiKey, messages: next.filter((m) => m.content !== OPENER) });
      const plan = extractPlan(reply);
      setMessages([...next, { role: 'assistant', content: stripPlan(reply) || 'Your plan is ready.' }]);
      if (plan) {
        win();
        onPlan(plan);
      }
    } catch (e) {
      nope();
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.headRow}>
          <Label>Setup — no forms</Label>
          <Text style={styles.count}>{answered ? `${answered} answered` : 'Question 1'}</Text>
        </View>
        <Bar pct={pct} style={{ marginTop: 8 }} />
        <Text style={styles.headNote}>
          {deep
            ? 'Almost there. It will build the plan as soon as it knows enough.'
            : 'It asks up to seven short questions, then builds the whole week.'}
        </Text>
      </View>

      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, i) => (
          <View key={i} style={m.role === 'assistant' ? styles.aiWrap : styles.userWrap}>
            <Text style={m.role === 'assistant' ? styles.ai : styles.user}>{m.content}</Text>
          </View>
        ))}
        {busy ? (deep ? <Building /> : <Typing />) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={C.accent} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <Mic onText={(t) => setDraft((d) => (d ? d + ' ' + t : t))} />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type, or tap the mic and talk"
          placeholderTextColor={C.txt3}
          multiline
        />
        <TouchableOpacity
          style={[styles.send, (!draft.trim() || busy) && styles.dim]}
          onPress={send}
          disabled={busy || !draft.trim()}
        >
          <Ionicons name="arrow-up" size={19} color="#0a0a0a" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: C.line },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontSize: 10.5, color: C.txt3 },
  headNote: { fontSize: 11, color: C.txt3, marginTop: 8, lineHeight: 16 },
  body: { padding: 16, paddingBottom: 24 },
  aiWrap: { marginBottom: 10, marginRight: 32 },
  userWrap: { marginBottom: 10, marginLeft: 44, alignItems: 'flex-end' },
  ai: {
    backgroundColor: 'rgba(255,106,61,0.09)', borderWidth: 0.5, borderColor: 'rgba(255,106,61,0.4)',
    borderRadius: 15, borderBottomLeftRadius: 4, padding: 13, fontSize: 13, lineHeight: 20, color: C.txt,
  },
  user: {
    backgroundColor: C.bg2, borderWidth: 0.5, borderColor: C.line, borderRadius: 15,
    borderBottomRightRadius: 4, padding: 13, fontSize: 13, lineHeight: 20, color: C.txt2,
  },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  typingText: { fontSize: 11.5, color: C.txt3 },
  building: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, padding: 14,
    borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(255,106,61,0.4)', backgroundColor: 'rgba(255,106,61,0.06)',
  },
  buildingText: { flex: 1, fontSize: 12.5, color: C.txt, lineHeight: 18 },
  errorBox: {
    flexDirection: 'row', gap: 9, marginTop: 10, padding: 12, borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(255,106,61,0.4)',
  },
  error: { flex: 1, color: C.txt2, fontSize: 12, lineHeight: 18 },
  composer: {
    flexDirection: 'row', gap: 7, padding: 12, alignItems: 'flex-end',
    borderTopWidth: 0.5, borderTopColor: C.line, backgroundColor: C.bg1,
  },
  input: {
    flex: 1, maxHeight: 110, minHeight: 42, backgroundColor: C.bg0, borderWidth: 0.5, borderColor: C.line,
    borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, color: C.txt, fontSize: 13,
  },
  send: {
    backgroundColor: C.accent, borderRadius: 11, width: 42, height: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  dim: { opacity: 0.35 },
});
