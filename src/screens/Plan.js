import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C } from '../theme';
import { Card, Label, Bar } from '../components/ui';
import TaskRow from '../components/TaskRow';
import { WEEK_ORDER, DAY_LABELS, todayKey, dayLoad, dayWeight, catColor, removeTask, moveTask } from '../util';

export default function Plan({ state, setState }) {
  const [day, setDay] = useState(todayKey());
  const tasks = state.week[day] || [];

  const update = (i, task) =>
    setState({ ...state, week: { ...state.week, [day]: tasks.map((t, k) => (k === i ? task : t)) } });
  const remove = (i) => setState({ ...state, week: removeTask(state.week, day, i) });
  const move = (i, to) => setState({ ...state, week: moveTask(state.week, day, i, to) });

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Label>Generated from your answers</Label>
      <Text style={styles.h1}>Your week, balanced</Text>
      <Text style={styles.sub}>No day carries more than three demanding blocks.</Text>

      <View style={styles.strip}>
        {WEEK_ORDER.map((d) => (
          <TouchableOpacity key={d} onPress={() => setDay(d)} style={[styles.day, day === d && styles.dayOn]}>
            <Text style={[styles.dayText, day === d && styles.dayTextOn]}>{DAY_LABELS[d][0]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={{ marginTop: 14 }}>
        <Label>Load per day</Label>
        {WEEK_ORDER.map((d) => {
          const load = dayLoad(state.week[d]);
          return (
            <View key={d} style={{ marginTop: 11 }}>
              <View style={styles.loadHead}>
                <Text style={styles.loadDay}>{DAY_LABELS[d]}</Text>
                <Text style={styles.loadPct}>{load}% · weight {dayWeight(state.week[d])}</Text>
              </View>
              <Bar pct={load} style={{ marginTop: 6 }} />
              <Text style={styles.loadMeta}>
                {(state.week[d] || []).length} blocks
                {(state.week[d] || []).length ? '  •  ' + (state.week[d] || []).map((t) => t.title).join(', ') : ''}
              </Text>
            </View>
          );
        })}
      </Card>

      <Label style={{ marginTop: 22, marginBottom: 4 }}>{DAY_LABELS[day]}</Label>
      {tasks.map((t, i) => (
        <TaskRow
          key={i}
          task={t}
          day={day}
          color={catColor(t.category, state.categories)}
          categories={state.categories}
          settings={state.settings}
          onChange={(x) => update(i, x)}
          onDelete={() => remove(i)}
          onMove={(to) => move(i, to)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '600', color: C.txt, letterSpacing: -0.4, marginTop: 6 },
  sub: { fontSize: 12, color: C.txt2, marginTop: 4 },
  strip: { flexDirection: 'row', gap: 5, marginTop: 18 },
  day: { flex: 1, paddingVertical: 10, borderWidth: 0.5, borderColor: C.line, borderRadius: 7, alignItems: 'center' },
  dayOn: { backgroundColor: C.accent, borderColor: C.accent },
  dayText: { color: C.txt2, fontSize: 11, fontWeight: '700' },
  dayTextOn: { color: '#0a0a0a' },
  loadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  loadDay: { fontSize: 13, color: C.txt, fontWeight: '500' },
  loadPct: { fontSize: 11, color: C.txt3 },
  loadMeta: { fontSize: 11, color: C.txt3, marginTop: 5 },
});
