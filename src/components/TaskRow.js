import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { Label } from './ui';
import Mic from './Mic';
import { editTask } from '../ai';
import { getApiKey } from '../storage';
import { normalizeTask, WEEK_ORDER, DAY_LABELS, taskWeight } from '../util';

const NEXT = { pending: 'done', done: 'missed', missed: 'pending' };
const WEIGHT_LABEL = { 1: 'Trivial', 2: 'Light', 3: 'Real work', 4: 'Heavy', 5: 'Draining' };

export default function TaskRow({ task, color, onChange, settings, categories = [], onDelete, onMove, day, badge }) {
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
            {[badge, task.time, task.category, WEIGHT_LABEL[taskWeight(task)], subs.length ? subs.length + ' steps' : null]
              .filter(Boolean)
              .join('  •  ')}
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

          {categories.length ? (
            <View style={styles.block}>
              <Label>Category</Label>
              <View style={styles.chips}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => onChange({ ...task, category: c.name })}
                    style={[styles.chip, task.category === c.name && { borderColor: c.color, backgroundColor: 'rgba(255,255,255,0.06)' }]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: c.color }]} />
                    <Text style={styles.chipText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.block}>
            <Label>Effort</Label>
            <View style={styles.chips}>
              {[1, 2, 3, 4, 5].map((w) => (
                <TouchableOpacity
                  key={w}
                  onPress={() => onChange({ ...task, weight: w })}
                  style={[styles.chip, taskWeight(task) === w && styles.chipOn]}
                >
                  <Text style={[styles.chipText, taskWeight(task) === w && { color: '#0a0a0a', fontWeight: '700' }]}>
                    {WEIGHT_LABEL[w]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {onMove ? (
            <View style={styles.block}>
              <Label>Move to</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {WEEK_ORDER.filter((d) => d !== day).map((d) => (
                  <TouchableOpacity key={d} onPress={() => onMove(d)} style={styles.chip}>
                    <Text style={styles.chipText}>{DAY_LABELS[d].slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

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

          {onDelete ? (
            <TouchableOpacity
              style={styles.delete}
              onPress={() =>
                Alert.alert('Delete this task?', task.title, [
                  { text: 'Keep it', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                ])
              }
            >
              <Ionicons name="trash-outline" size={14} color={C.miss} />
              <Text style={styles.deleteText}>Delete task</Text>
            </TouchableOpacity>
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
  block: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.line, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, borderWidth: 0.5, borderColor: C.line, backgroundColor: C.bg2,
  },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: C.txt, fontSize: 11 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, paddingVertical: 9 },
  deleteText: { color: C.miss, fontSize: 12, fontWeight: '600' },
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
