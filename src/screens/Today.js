import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { Card, Label, Ticker, Bar } from '../components/ui';
import TaskRow from '../components/TaskRow';
import Mic from '../components/Mic';
import {
  todayKey, catColor, normalizeWeek, normalizeTask, removeTask, moveTask, dayLoad, DAY_LABELS,
} from '../util';
import { chat, extractPlan, stripPlan, splitTask } from '../ai';
import { getApiKey } from '../storage';

const greet = (h) => (h < 5 ? 'Still up.' : h < 12 ? 'Morning.' : h < 17 ? 'Afternoon.' : 'Evening.');

export default function Today({ state, setState }) {
  const key = todayKey();
  const tasks = state.week[key] || [];
  const now = new Date();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [breaking, setBreaking] = useState(false);
  const [addNote, setAddNote] = useState('');
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachText, setCoachText] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (i, task) =>
    setState({ ...state, week: { ...state.week, [key]: tasks.map((t, k) => (k === i ? task : t)) } });
  const remove = (i) => setState({ ...state, week: removeTask(state.week, key, i) });
  const move = (i, to) => setState({ ...state, week: moveTask(state.week, key, i, to) });

  // Typed entry goes through the model exactly like a spoken one, so you get real steps
  // instead of a bare line. Falls back to a plain task if the call fails.
  const add = async () => {
    const text = title.trim();
    if (!text || breaking) return;
    setBreaking(true);
    setAddNote('Breaking it into steps…');
    let task;
    try {
      const apiKey = await getApiKey(state.settings.provider);
      task = await splitTask({
        ...state.settings,
        apiKey,
        text,
        categories: state.categories.map((c) => c.name),
        day: DAY_LABELS[key],
      });
      setAddNote('');
    } catch (e) {
      task = { title: text, time: '', category: state.categories[0]?.name || 'Work', weight: 3, subs: [] };
      setAddNote(e.message);
    }
    setState({ ...state, week: { ...state.week, [key]: [...tasks, normalizeTask(task)] } });
    setTitle('');
    setBreaking(false);
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
              '\n\nReschedule around it. Protect the deadlines, keep every day inside the weight ' +
              'limits, and reply with two sentences explaining the trade before the json.',
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
  const next = tasks.find((t) => (t.state || 'pending') === 'pending');

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Ticker />
      <View style={{ padding: 16 }}>
        <Label>{now.toDateString()}</Label>
        <Text style={styles.h1}>{greet(now.getHours())}</Text>
        <Text style={styles.sub}>
          {tasks.length
            ? `${tasks.length} blocks. ${done} done. The rest decide the quarter.`
            : 'Nothing scheduled today. Tell the coach what changed and it will fill the day.'}
        </Text>

        {tasks.length ? (
          <Card style={{ marginTop: 14 }}>
            <View style={styles.loadHead}>
              <Label>Today's load</Label>
              <Text style={styles.loadPct}>{dayLoad(tasks)}%</Text>
            </View>
            <Bar pct={dayLoad(tasks)} style={{ marginTop: 8 }} />
          </Card>
        ) : null}

        {next ? (
          <Card style={{ marginTop: 10, borderColor: 'rgba(255,106,61,0.4)' }}>
            <Label style={{ color: C.accent }}>Up next — {next.title}</Label>
            <View style={styles.stakeRow}>
              <Ionicons name="trending-up" size={15} color={C.accent} />
              <Text style={styles.stakeUp}>{next.impact_done}</Text>
            </View>
            <View style={[styles.stakeRow, styles.stakeSplit]}>
              <Ionicons name="trending-down" size={15} color={C.txt2} />
              <Text style={styles.stakeDown}>{next.impact_miss}</Text>
            </View>
          </Card>
        ) : null}

        <Label style={{ marginTop: 22, marginBottom: 4 }}>The day — tap a task to open it</Label>
        {tasks.map((t, i) => (
          <TaskRow
            key={i}
            task={t}
            day={key}
            color={catColor(t.category, state.categories)}
            categories={state.categories}
            settings={state.settings}
            onChange={(x) => update(i, x)}
            onDelete={() => remove(i)}
            onMove={(to) => move(i, to)}
          />
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
              placeholder="Leg day at the gym after work"
              placeholderTextColor={C.txt3}
              multiline
            />
            <Text style={styles.hint}>
              Say it however you like. The coach picks the time, the category and the actual steps.
            </Text>
            <Mic style={{ marginTop: 8 }} label="Say it instead" onText={(t) => setTitle((v) => (v ? v + ' ' + t : t))} />
            <TouchableOpacity style={styles.primary} onPress={add} disabled={breaking}>
              {breaking ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.primaryText}>Add and break it down</Text>}
            </TouchableOpacity>
            {addNote ? <Text style={styles.reply}>{addNote}</Text> : null}
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
            <Mic style={{ marginTop: 8 }} label="Say it instead" onText={(t) => setCoachText((c) => (c ? c + ' ' + t : t))} />
            <TouchableOpacity style={styles.primary} onPress={askCoach} disabled={busy}>
              {busy ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.primaryText}>Reschedule</Text>}
            </TouchableOpacity>
            {reply ? <Text style={styles.reply}>{reply}</Text> : null}
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '600', color: C.txt, letterSpacing: -0.4, marginTop: 6 },
  sub: { fontSize: 12, color: C.txt2, marginTop: 4, lineHeight: 18 },
  loadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadPct: { fontSize: 12, color: C.txt2, fontWeight: '600' },
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
    paddingHorizontal: 10, paddingVertical: 9, color: C.txt, fontSize: 12, minHeight: 40,
  },
  hint: { fontSize: 10.5, color: C.txt3, marginTop: 7, lineHeight: 15 },
  primary: { backgroundColor: C.accent, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 9 },
  primaryText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13 },
  reply: { color: C.txt2, fontSize: 12, lineHeight: 18, marginTop: 10 },
});
