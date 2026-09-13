import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { Card, Label, Ticker, Bar, Empty } from '../components/ui';
import TaskRow from '../components/TaskRow';
import Mic from '../components/Mic';
import {
  todayKey, catColor, normalizeWeek, normalizeTask, removeTask, moveTask, dayLoad,
  DAY_LABELS, byTime, taskPhase,
} from '../util';
import { chat, extractPlan, stripPlan, splitTask } from '../ai';
import { getApiKey } from '../storage';
import { tap, bump, win, nope } from '../haptics';

const greet = (h) => (h < 5 ? 'Still up.' : h < 12 ? 'Morning.' : h < 17 ? 'Afternoon.' : 'Evening.');

export default function Today({ state, setState }) {
  const key = todayKey();
  const tasks = state.week[key] || [];

  // Re-render each minute so "happening now" stays true without the user touching anything.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [breaking, setBreaking] = useState(false);
  const [addNote, setAddNote] = useState('');
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachText, setCoachText] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  // Sort for display only — the stored order stays as the coach wrote it.
  const ordered = tasks.map((t, i) => ({ t, i })).sort((a, b) => byTime(a.t, b.t));

  const update = (i, task) =>
    setState({ ...state, week: { ...state.week, [key]: tasks.map((t, k) => (k === i ? task : t)) } });
  const remove = (i) => setState({ ...state, week: removeTask(state.week, key, i) });
  const move = (i, to) => setState({ ...state, week: moveTask(state.week, key, i, to) });

  const add = async () => {
    const text = title.trim();
    if (!text || breaking) return;
    bump();
    setBreaking(true);
    setAddNote('');
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
      win();
    } catch (e) {
      task = { title: text, time: '', category: state.categories[0]?.name || 'Work', weight: 3, subs: [] };
      nope();
      setAddNote('Added as-is — ' + e.message);
    }
    setState({ ...state, week: { ...state.week, [key]: [...tasks, normalizeTask(task)] } });
    setTitle('');
    setBreaking(false);
    setAdding(false);
  };

  const askCoach = async () => {
    if (!coachText.trim() || busy) return;
    bump();
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
      if (plan) {
        setState({ ...state, week: normalizeWeek(plan.week) });
        setCoachText('');
        win();
      }
    } catch (e) {
      nope();
      setReply(e.message);
    } finally {
      setBusy(false);
    }
  };

  const done = tasks.filter((t) => t.state === 'done').length;
  const left = tasks.filter((t) => (t.state || 'pending') === 'pending').length;
  const next = ordered.map((x) => x.t).find((t) => (t.state || 'pending') === 'pending');
  const load = dayLoad(tasks);

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Ticker />
      <View style={{ padding: 16 }}>
        <Label>{now.toDateString()}</Label>
        <Text style={styles.h1}>{greet(now.getHours())}</Text>
        <Text style={styles.sub}>
          {!tasks.length
            ? 'Nothing scheduled today.'
            : left === 0
            ? `All ${tasks.length} blocks closed out. That is a day you can't get back and didn't waste.`
            : `${left} left of ${tasks.length}. ${done} done.`}
        </Text>

        {tasks.length ? (
          <Card style={{ marginTop: 14 }}>
            <View style={styles.loadHead}>
              <Label>Today's load</Label>
              <Text style={styles.loadPct}>{load}%</Text>
            </View>
            <Bar pct={load} style={{ marginTop: 8 }} />
            <Text style={styles.note}>
              {load > 100
                ? 'Overloaded. Move something or today collapses on its own.'
                : load >= 85
                ? 'A full day. Protect the first block and the rest follows.'
                : load >= 40
                ? 'Manageable. No excuses hiding in this one.'
                : 'A light day. Bank something extra or genuinely rest.'}
            </Text>
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

        {tasks.length ? (
          <>
            <View style={styles.listHead}>
              <Label>The day</Label>
              <Text style={styles.hintSmall}>Tap the circle: done → missed → clear</Text>
            </View>
            {ordered.map(({ t, i }) => (
              <TaskRow
                key={i}
                task={t}
                day={key}
                phase={taskPhase(t, nowMin)}
                color={catColor(t.category, state.categories)}
                categories={state.categories}
                settings={state.settings}
                onChange={(x) => update(i, x)}
                onDelete={() => remove(i)}
                onMove={(to) => move(i, to)}
              />
            ))}
          </>
        ) : (
          <Empty
            icon="moon-outline"
            title="Today is empty"
            body="Add a block below, or tell the coach what changed and it will rebuild the week around it."
          />
        )}

        <TouchableOpacity style={styles.ghost} onPress={() => { tap(); setAdding(!adding); }}>
          <Ionicons name={adding ? 'close' : 'add'} size={16} color={C.accent} />
          <Text style={styles.ghostText}>{adding ? 'Cancel' : 'Add something to today'}</Text>
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
              autoFocus
            />
            <Text style={styles.note}>
              Say it however it comes out. The coach picks the time, the category and the actual steps.
            </Text>
            <Mic style={{ marginTop: 8 }} label="Say it instead" onText={(t) => setTitle((v) => (v ? v + ' ' + t : t))} />
            <TouchableOpacity style={[styles.primary, !title.trim() && styles.dim]} onPress={add} disabled={breaking || !title.trim()}>
              {breaking ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color="#0a0a0a" size="small" />
                  <Text style={styles.primaryText}>Breaking it into steps…</Text>
                </View>
              ) : (
                <Text style={styles.primaryText}>Add and break it down</Text>
              )}
            </TouchableOpacity>
            {addNote ? <Text style={styles.reply}>{addNote}</Text> : null}
          </Card>
        ) : null}

        <TouchableOpacity style={[styles.primary, { marginTop: 10 }]} onPress={() => { tap(); setCoachOpen(!coachOpen); }}>
          <Text style={styles.primaryText}>Something changed. Fix my day.</Text>
        </TouchableOpacity>

        {coachOpen ? (
          <Card style={{ marginTop: 8 }}>
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
              value={coachText}
              onChangeText={setCoachText}
              multiline
              placeholder="Fever since morning. I can't train today."
              placeholderTextColor={C.txt3}
            />
            <Mic style={{ marginTop: 8 }} label="Say it instead" onText={(t) => setCoachText((c) => (c ? c + ' ' + t : t))} />
            <TouchableOpacity style={[styles.primary, !coachText.trim() && styles.dim]} onPress={askCoach} disabled={busy || !coachText.trim()}>
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color="#0a0a0a" size="small" />
                  <Text style={styles.primaryText}>Rebuilding the week…</Text>
                </View>
              ) : (
                <Text style={styles.primaryText}>Reschedule</Text>
              )}
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
  h1: { fontSize: 23, fontWeight: '600', color: C.txt, letterSpacing: -0.5, marginTop: 6 },
  sub: { fontSize: 12.5, color: C.txt2, marginTop: 5, lineHeight: 19 },
  loadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadPct: { fontSize: 12, color: C.txt2, fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { fontSize: 11, color: C.txt3, marginTop: 8, lineHeight: 16 },
  stakeRow: { flexDirection: 'row', gap: 9, marginTop: 10 },
  stakeSplit: { marginTop: 11, paddingTop: 11, borderTopWidth: 0.5, borderTopColor: C.line },
  stakeUp: { flex: 1, fontSize: 12, lineHeight: 18, color: C.txt },
  stakeDown: { flex: 1, fontSize: 12, lineHeight: 18, color: C.txt2 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, marginBottom: 4 },
  hintSmall: { fontSize: 10, color: C.txt3 },
  ghost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14,
    borderWidth: 0.5, borderColor: C.line, borderRadius: 11, paddingVertical: 13,
  },
  ghostText: { color: C.txt, fontSize: 13 },
  input: {
    backgroundColor: C.bg0, borderWidth: 0.5, borderColor: C.line, borderRadius: 9,
    paddingHorizontal: 11, paddingVertical: 10, color: C.txt, fontSize: 12.5, minHeight: 42,
  },
  primary: { backgroundColor: C.accent, borderRadius: 11, paddingVertical: 14, alignItems: 'center', marginTop: 9 },
  dim: { opacity: 0.4 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  primaryText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13 },
  reply: { color: C.txt2, fontSize: 12, lineHeight: 18, marginTop: 11 },
});
