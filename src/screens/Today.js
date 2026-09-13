import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { Card, Label } from '../components/ui';
import TaskRow from '../components/TaskRow';
import Mic from '../components/Mic';
import { todayKey, catColor, normalizeWeek } from '../util';
import { chat, extractPlan, stripPlan } from '../ai';
import { getApiKey } from '../storage';

export default function Today({ state, setState }) {
  const key = todayKey();
  const tasks = state.week[key] || [];
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [cat, setCat] = useState(state.categories[0]?.name || 'Work');
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachText, setCoachText] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (i, task) => {
    const week = { ...state.week, [key]: tasks.map((t, k) => (k === i ? task : t)) };
    setState({ ...state, week });
  };

  const add = () => {
    if (!title.trim()) return;
    const task = {
      title: title.trim(),
      time: time.trim(),
      category: cat,
      subs: [],
      state: 'pending',
      impact_done: 'Done. The big numbers are made of blocks exactly this size.',
      impact_miss: 'Skipped. One is nothing, a pattern is everything — and patterns start exactly here.',
    };
    setState({ ...state, week: { ...state.week, [key]: [...tasks, task] } });
    setTitle('');
    setTime('');
    setAdding(false);
  };

  const askCoach = async () => {
    if (!coachText.trim() || busy) return;
    setBusy(true);
    setReply('');
    try {
      const apiKey = await getApiKey(state.settings.provider);
      const out = await chat({
        ...state.settings,
        apiKey,
        messages: [
          {
            role: 'user',
            content:
              'Here is my current week plan as json:\n' +
              JSON.stringify(state.week) +
              '\n\nSomething changed: ' +
              coachText +
              '\n\nReschedule around it. Protect the deadlines, keep no day over three demanding blocks, ' +
              'and reply with two sentences explaining the trade before the json.',
          },
        ],
      });
      const plan = extractPlan(out);
      setReply(stripPlan(out));
      if (plan) setState({ ...state, week: normalizeWeek(plan.week) });
    } catch (e) {
      setReply(e.message);
    } finally {
      setBusy(false);
    }
  };

  const done = tasks.filter((t) => t.state === 'done').length;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Label>{new Date().toDateString()}</Label>
      <Text style={styles.h1}>Morning.</Text>
      <Text style={styles.sub}>
        {tasks.length
          ? `${tasks.length} blocks. ${done} done. The rest decide the quarter.`
          : 'Nothing scheduled. Talk to the coach and it will build the week.'}
      </Text>

      {tasks.length ? (
        <Card style={{ marginTop: 16, borderColor: 'rgba(255,106,61,0.4)' }}>
          <Label style={{ color: C.accent }}>Today's stakes</Label>
          <View style={styles.stakeRow}>
            <Ionicons name="trending-up" size={15} color={C.accent} />
            <Text style={styles.stakeUp}>{tasks[0].impact_done}</Text>
          </View>
          <View style={[styles.stakeRow, styles.stakeSplit]}>
            <Ionicons name="trending-down" size={15} color={C.txt2} />
            <Text style={styles.stakeDown}>{tasks[0].impact_miss}</Text>
          </View>
        </Card>
      ) : null}

      <Label style={{ marginTop: 22, marginBottom: 4 }}>The day — tap a task to open it</Label>
      {tasks.map((t, i) => (
        <TaskRow key={i} task={t} color={catColor(t.category, state.categories)} onChange={(x) => update(i, x)} settings={state.settings} />
      ))}

      <TouchableOpacity style={styles.ghost} onPress={() => setAdding(!adding)}>
        <Ionicons name="add" size={16} color={C.accent} />
        <Text style={styles.ghostText}>Add something to today</Text>
      </TouchableOpacity>

      {adding ? (
        <Card style={{ marginTop: 8 }}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What are you adding?"
            placeholderTextColor={C.txt3}
          />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <TextInput
              style={[styles.input, { width: 96 }]}
              value={time}
              onChangeText={setTime}
              placeholder="Time"
              placeholderTextColor={C.txt3}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {state.categories.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  onPress={() => setCat(c.name)}
                  style={[styles.chip, cat === c.name && { borderColor: c.color }]}
                >
                  <View style={[styles.chipDot, { backgroundColor: c.color }]} />
                  <Text style={styles.chipText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity style={styles.primary} onPress={add}>
            <Text style={styles.primaryText}>Add task</Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      <TouchableOpacity style={[styles.primary, { marginTop: 10 }]} onPress={() => setCoachOpen(!coachOpen)}>
        <Text style={styles.primaryText}>Something changed. Fix my day.</Text>
      </TouchableOpacity>

      {coachOpen ? (
        <Card style={{ marginTop: 8 }}>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            value={coachText}
            onChangeText={setCoachText}
            multiline
            placeholder="Fever since morning. I can't train today."
            placeholderTextColor={C.txt3}
          />
          <Mic
            style={{ marginTop: 8 }}
            label="Say it instead"
            onText={(t) => setCoachText((c) => (c ? c + ' ' + t : t))}
          />
          <TouchableOpacity style={styles.primary} onPress={askCoach} disabled={busy}>
            {busy ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.primaryText}>Reschedule</Text>}
          </TouchableOpacity>
          {reply ? <Text style={styles.reply}>{reply}</Text> : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '600', color: C.txt, letterSpacing: -0.4, marginTop: 6 },
  sub: { fontSize: 12, color: C.txt2, marginTop: 4, lineHeight: 18 },
  stakeRow: { flexDirection: 'row', gap: 9, marginTop: 10 },
  stakeSplit: { marginTop: 11, paddingTop: 11, borderTopWidth: 0.5, borderTopColor: C.line },
  stakeUp: { flex: 1, fontSize: 12, lineHeight: 18, color: C.txt },
  stakeDown: { flex: 1, fontSize: 12, lineHeight: 18, color: C.txt2 },
  ghost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14,
    borderWidth: 0.5, borderColor: C.line, borderRadius: 11, paddingVertical: 12,
  },
  ghostText: { color: C.txt, fontSize: 13 },
  input: {
    backgroundColor: C.bg0, borderWidth: 0.5, borderColor: C.line, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 9, color: C.txt, fontSize: 12,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8,
    borderRadius: 999, borderWidth: 0.5, borderColor: C.line, backgroundColor: C.bg2,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { color: C.txt, fontSize: 11.5 },
  primary: { backgroundColor: C.accent, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 9 },
  primaryText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13 },
  reply: { color: C.txt2, fontSize: 12, lineHeight: 18, marginTop: 10 },
});
