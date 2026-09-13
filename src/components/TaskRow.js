import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { Label } from './ui';
import Mic from './Mic';
import { editTask } from '../ai';
import { getApiKey } from '../storage';
import { normalizeTask } from '../util';

const NEXT = { pending: 'done', done: 'missed', missed: 'pending' };

export default function TaskRow({ task, color, onChange, settings }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState('');
  const state = task.state || 'pending';
  const subs = task.subs || [];

  const cycle = () => onChange({ ...task, state: NEXT[state] });
  const toggleSub = (i) =>
    onChange({ ...task, subs: subs.map((s, k) => (k === i ? { ...s, done: !s.done } : s)) });

  const [draft, setDraft] = useState('');
  const addSub = () => {
    if (!draft.trim()) return;
    onChange({ ...task, subs: [...subs, { title: draft.trim(), done: false }] });
    setDraft('');
  };

  const speak = async (text) => {
    if (!settings) return;
    setHeard(text);
    setBusy(true);
    try {
      const apiKey = await getApiKey(settings.provider);
      const next = await editTask({ ...settings, apiKey, task, instruction: text });
      onChange(normalizeTask({ ...next, state: next.state || task.state || 'pending' }));
      setHeard('');
    } catch (e) {
      setHeard(e.message);
    } finally {
      setBusy(false);
    }
  };

  const impact =
    state === 'done' ? task.impact_done : state === 'missed' ? task.impact_miss : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={cycle}
          style={[styles.ring, state === 'done' && styles.ringDone, state === 'missed' && styles.ringMiss]}
        >
          {state === 'done' ? <Ionicons name="checkmark" size={13} color="#0a0a0a" /> : null}
          {state === 'missed' ? <Ionicons name="close" size={12} color={C.txt2} /> : null}
        </TouchableOpacity>
        {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setOpen(!open)}>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.meta}>
            {[task.time, task.category, subs.length ? subs.length + ' steps' : null].filter(Boolean).join('  •  ')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOpen(!open)} hitSlop={10}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={C.txt2} />
        </TouchableOpacity>
      </View>

      {open ? (
        <View style={styles.detail}>
          <Label>Breakdown</Label>
          {subs.map((s, i) => (
            <TouchableOpacity key={i} style={styles.subRow} onPress={() => toggleSub(i)}>
              <Ionicons
                name={s.done ? 'checkbox' : 'square-outline'}
                size={16}
                color={s.done ? C.accent : C.txt3}
              />
              <Text style={[styles.subText, s.done && styles.subDone]}>{s.title}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a step"
              placeholderTextColor={C.txt3}
              onSubmitEditing={addSub}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addSub}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {settings ? (
            <View style={styles.voice}>
              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator color={C.accent} size="small" />
                  <Text style={styles.heard}>{heard}</Text>
                </View>
              ) : (
                <Mic label="Change this by voice" onText={speak} />
              )}
              {!busy && heard ? <Text style={styles.heard}>{heard}</Text> : null}
              <Text style={styles.hint}>
                "Swap bench for incline press" · "Move it to 6 am" · "Add 20 minutes of stretching"
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {impact ? (
        <Text
          style={[
            styles.impact,
            state === 'missed' && { borderLeftColor: C.miss, backgroundColor: 'rgba(255,255,255,0.04)' },
          ]}
        >
          {impact}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 0.5, borderBottomColor: C.line },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 11 },
  ring: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.txt2,
    marginTop: 2, alignItems: 'center', justifyContent: 'center',
  },
  ringDone: { backgroundColor: C.accent, borderColor: C.accent },
  ringMiss: { backgroundColor: C.bg2, borderColor: C.line },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
  title: { fontSize: 13, color: C.txt, fontWeight: '500', lineHeight: 18 },
  meta: { fontSize: 11, color: C.txt3, marginTop: 2 },
  detail: {
    marginLeft: 31, marginBottom: 12, padding: 12, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.line, backgroundColor: 'rgba(29,29,35,0.9)',
  },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  subText: { flex: 1, fontSize: 12.5, color: C.txt },
  subDone: { color: C.txt3, textDecorationLine: 'line-through' },
  addRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  input: {
    flex: 1, backgroundColor: C.bg0, borderWidth: 0.5, borderColor: C.line,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: C.txt, fontSize: 12,
  },
  addBtn: { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 13, justifyContent: 'center' },
  addBtnText: { color: '#0a0a0a', fontWeight: '700', fontSize: 12 },
  voice: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.line, gap: 8 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heard: { flex: 1, color: C.txt2, fontSize: 11.5, lineHeight: 17 },
  hint: { color: C.txt3, fontSize: 10.5, lineHeight: 15 },
  impact: {
    marginLeft: 31, marginBottom: 11, paddingVertical: 9, paddingHorizontal: 11,
    borderLeftWidth: 2, borderLeftColor: C.accent, backgroundColor: 'rgba(255,106,61,0.08)',
    color: C.txt2, fontSize: 11.5, lineHeight: 17, borderTopRightRadius: 8, borderBottomRightRadius: 8,
  },
});
