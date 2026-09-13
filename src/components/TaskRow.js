import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { Label } from './ui';
import Mic from './Mic';
import { editTask } from '../ai';
import { getApiKey } from '../storage';
import { normalizeTask, WEEK_ORDER, DAY_LABELS, taskWeight, subProgress } from '../util';
import { tap, win, nope, bump } from '../haptics';

const NEXT = { pending: 'done', done: 'missed', missed: 'pending' };
const WEIGHT_LABEL = { 1: 'Trivial', 2: 'Light', 3: 'Real work', 4: 'Heavy', 5: 'Draining' };

export default function TaskRow({
  task, color, onChange, settings, categories = [], onDelete, onMove, day, badge, phase,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState('');
  const [draft, setDraft] = useState('');

  const state = task.state || 'pending';
  const subs = task.subs || [];
  const { done: subsDone, total: subsTotal } = subProgress(task);
  const isNow = phase === 'now' && state === 'pending';
  const isPast = phase === 'past' && state === 'pending';

  const cycle = () => {
    const next = NEXT[state];
    if (next === 'done') win();
    else if (next === 'missed') nope();
    else tap();
    onChange({ ...task, state: next });
  };

  const toggleSub = (i) => {
    tap();
    onChange({ ...task, subs: subs.map((s, k) => (k === i ? { ...s, done: !s.done } : s)) });
  };

  const addSub = () => {
    if (!draft.trim()) return;
    bump();
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
      win();
      setHeard('');
    } catch (e) {
      nope();
      setHeard(e.message);
    } finally {
      setBusy(false);
    }
  };

  const impact = state === 'done' ? task.impact_done : state === 'missed' ? task.impact_miss : null;
  const meta = [badge, task.time, task.category, WEIGHT_LABEL[taskWeight(task)]].filter(Boolean).join('  •  ');

  return (
    <View style={[styles.wrap, isNow && styles.wrapNow]}>
      {isNow ? (
        <View style={styles.nowTag}>
          <View style={styles.pulse} />
          <Text style={styles.nowText}>Happening now</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <TouchableOpacity
          onPress={cycle}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
          style={[styles.ring, state === 'done' && styles.ringDone, state === 'missed' && styles.ringMiss]}
        >
          {state === 'done' ? <Ionicons name="checkmark" size={14} color="#0a0a0a" /> : null}
          {state === 'missed' ? <Ionicons name="close" size={13} color={C.txt2} /> : null}
        </TouchableOpacity>

        {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => {
            tap();
            setOpen(!open);
          }}
        >
          <Text
            style={[
              styles.title,
              state === 'done' && styles.titleDone,
              isPast && styles.titlePast,
            ]}
          >
            {task.title}
          </Text>
          <Text style={styles.meta}>{meta}</Text>

          {subsTotal ? (
            <View style={styles.progress}>
              <View style={styles.pipes}>
                {subs.map((s, i) => (
                  <View key={i} style={[styles.pipe, s.done && { backgroundColor: C.accent }]} />
                ))}
              </View>
              <Text style={styles.progressText}>
                {subsDone}/{subsTotal}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { tap(); setOpen(!open); }} hitSlop={12} style={styles.chev}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={C.txt2} />
        </TouchableOpacity>
      </View>

      {open ? (
        <View style={styles.detail}>
          <Label>Breakdown</Label>
          {subs.length ? (
            subs.map((s, i) => (
              <TouchableOpacity key={i} style={styles.subRow} onPress={() => toggleSub(i)} hitSlop={{ top: 4, bottom: 4 }}>
                <Ionicons
                  name={s.done ? 'checkbox' : 'square-outline'}
                  size={17}
                  color={s.done ? C.accent : C.txt3}
                />
                <Text style={[styles.subText, s.done && styles.subDone]}>{s.title}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.empty}>No steps yet. Add one, or use the mic to have the coach fill them in.</Text>
          )}

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a step"
              placeholderTextColor={C.txt3}
              onSubmitEditing={addSub}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addSub}>
              <Ionicons name="add" size={18} color="#0a0a0a" />
            </TouchableOpacity>
          </View>

          {settings ? (
            <View style={styles.voice}>
              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator color={C.accent} size="small" />
                  <Text style={styles.heard}>Rewriting this task…</Text>
                </View>
              ) : (
                <Mic label="Change this by voice" onText={speak} />
              )}
              {!busy && heard ? <Text style={styles.heard}>{heard}</Text> : null}
            </View>
          ) : null}

          {/* Everything below is fiddly, so it stays folded until asked for. */}
          <TouchableOpacity style={styles.editToggle} onPress={() => { tap(); setEditing(!editing); }}>
            <Ionicons name={editing ? 'chevron-up' : 'options-outline'} size={15} color={C.txt2} />
            <Text style={styles.editToggleText}>{editing ? 'Hide options' : 'Category, effort, move, delete'}</Text>
          </TouchableOpacity>

          {editing ? (
            <View>
              {categories.length ? (
                <View style={styles.block}>
                  <Label>Category</Label>
                  <View style={styles.chips}>
                    {categories.map((c) => (
                      <TouchableOpacity
                        key={c.name}
                        onPress={() => { tap(); onChange({ ...task, category: c.name }); }}
                        style={[
                          styles.chip,
                          task.category === c.name && { borderColor: c.color, backgroundColor: 'rgba(255,255,255,0.07)' },
                        ]}
                      >
                        <View style={[styles.chipDot, { backgroundColor: c.color }]} />
                        <Text style={styles.chipText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.block}>
                <Label>Effort — this is what balances your week</Label>
                <View style={styles.chips}>
                  {[1, 2, 3, 4, 5].map((w) => (
                    <TouchableOpacity
                      key={w}
                      onPress={() => { tap(); onChange({ ...task, weight: w }); }}
                      style={[styles.chip, taskWeight(task) === w && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, taskWeight(task) === w && styles.chipTextOn]}>
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
                      <TouchableOpacity key={d} onPress={() => { bump(); onMove(d); }} style={styles.chip}>
                        <Text style={styles.chipText}>{DAY_LABELS[d].slice(0, 3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {onDelete ? (
                <TouchableOpacity
                  style={styles.delete}
                  onPress={() =>
                    Alert.alert('Delete this task?', task.title, [
                      { text: 'Keep it', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => { nope(); onDelete(); } },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={14} color={C.miss} />
                  <Text style={styles.deleteText}>Delete task</Text>
                </TouchableOpacity>
              ) : null}
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
  wrapNow: {
    borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 10, marginLeft: -12,
    backgroundColor: 'rgba(255,106,61,0.05)', borderBottomWidth: 0,
  },
  nowTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10 },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  nowText: { fontSize: 9, letterSpacing: 1.3, color: C.accent, fontWeight: '700', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 12 },
  ring: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.txt2,
    marginTop: 1, alignItems: 'center', justifyContent: 'center',
  },
  ringDone: { backgroundColor: C.accent, borderColor: C.accent },
  ringMiss: { backgroundColor: C.bg2, borderColor: C.line },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
  chev: { paddingTop: 4 },
  title: { fontSize: 13.5, color: C.txt, fontWeight: '500', lineHeight: 19 },
  titleDone: { color: C.txt2, textDecorationLine: 'line-through' },
  titlePast: { color: C.txt2 },
  meta: { fontSize: 11, color: C.txt3, marginTop: 3 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  pipes: { flexDirection: 'row', gap: 3, flex: 1 },
  pipe: { flex: 1, maxWidth: 26, height: 3, borderRadius: 2, backgroundColor: C.bg2 },
  progressText: { fontSize: 10, color: C.txt3, fontVariant: ['tabular-nums'] },
  detail: {
    marginLeft: 31, marginBottom: 12, padding: 13, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.line, backgroundColor: 'rgba(29,29,35,0.92)',
  },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  subText: { flex: 1, fontSize: 12.5, color: C.txt, lineHeight: 18 },
  subDone: { color: C.txt3, textDecorationLine: 'line-through' },
  empty: { fontSize: 11.5, color: C.txt3, lineHeight: 17, marginTop: 8 },
  addRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  input: {
    flex: 1, backgroundColor: C.bg0, borderWidth: 0.5, borderColor: C.line,
    borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, color: C.txt, fontSize: 12,
  },
  addBtn: {
    backgroundColor: C.accent, borderRadius: 8, width: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  voice: { marginTop: 12, gap: 8 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  heard: { flex: 1, color: C.txt2, fontSize: 11.5, lineHeight: 17 },
  editToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.line, paddingVertical: 6,
  },
  editToggleText: { color: C.txt2, fontSize: 11.5 },
  block: { marginTop: 14, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8,
    borderRadius: 999, borderWidth: 0.5, borderColor: C.line, backgroundColor: C.bg2,
  },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipTextOn: { color: '#0a0a0a', fontWeight: '700' },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: C.txt, fontSize: 11 },
  delete: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 16, paddingVertical: 11, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(138,58,36,0.6)',
  },
  deleteText: { color: C.miss, fontSize: 12, fontWeight: '600' },
  impact: {
    marginLeft: 31, marginBottom: 11, paddingVertical: 10, paddingHorizontal: 12,
    borderLeftWidth: 2, borderLeftColor: C.accent, backgroundColor: 'rgba(255,106,61,0.08)',
    color: C.txt2, fontSize: 11.5, lineHeight: 17, borderTopRightRadius: 8, borderBottomRightRadius: 8,
  },
});
