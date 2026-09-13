import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C } from '../theme';
import { Card, Label, Bar, Empty } from '../components/ui';
import TaskRow from '../components/TaskRow';
import {
  WEEK_ORDER, DAY_LABELS, todayKey, dayLoad, dayWeight, catColor, removeTask, moveTask,
  byTime, MAX_DAY_WEIGHT,
} from '../util';
import { tap } from '../haptics';

export default function Plan({ state, setState }) {
  const today = todayKey();
  const [day, setDay] = useState(today);
  const tasks = state.week[day] || [];
  const ordered = tasks.map((t, i) => ({ t, i })).sort((a, b) => byTime(a.t, b.t));

  const update = (i, task) =>
    setState({ ...state, week: { ...state.week, [day]: tasks.map((t, k) => (k === i ? task : t)) } });
  const remove = (i) => setState({ ...state, week: removeTask(state.week, day, i) });
  const move = (i, to) => setState({ ...state, week: moveTask(state.week, day, i, to) });

  const weights = WEEK_ORDER.map((d) => dayWeight(state.week[d]));
  const busiest = Math.max(...weights);
  const total = weights.reduce((a, b) => a + b, 0);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Label>Generated from your answers</Label>
      <Text style={styles.h1}>Your week, balanced</Text>
      <Text style={styles.sub}>
        {total
          ? `${total} effort points across seven days. A day is full at ${MAX_DAY_WEIGHT}.`
          : 'Nothing planned yet.'}
      </Text>

      <View style={styles.strip}>
        {WEEK_ORDER.map((d) => {
          const w = dayWeight(state.week[d]);
          const on = day === d;
          return (
            <TouchableOpacity key={d} onPress={() => { tap(); setDay(d); }} style={[styles.day, on && styles.dayOn]}>
              <Text style={[styles.dayText, on && styles.dayTextOn]}>{DAY_LABELS[d].slice(0, 3)}</Text>
              <View style={styles.stripBarTrack}>
                <View
                  style={[
                    styles.stripBar,
                    {
                      height: busiest ? Math.max(2, (w / Math.max(busiest, MAX_DAY_WEIGHT)) * 18) : 2,
                      backgroundColor: on ? '#0a0a0a' : w > MAX_DAY_WEIGHT ? C.miss : C.accent,
                    },
                  ]}
                />
              </View>
              {d === today ? <View style={[styles.todayDot, on && { backgroundColor: '#0a0a0a' }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {total ? (
        <Card style={{ marginTop: 14 }}>
          <Label>Load per day</Label>
          {WEEK_ORDER.map((d) => {
            const load = dayLoad(state.week[d]);
            const w = dayWeight(state.week[d]);
            const items = state.week[d] || [];
            return (
              <TouchableOpacity key={d} onPress={() => { tap(); setDay(d); }} style={{ marginTop: 12 }}>
                <View style={styles.loadHead}>
                  <Text style={[styles.loadDay, d === today && { color: C.accent }]}>
                    {DAY_LABELS[d]}
                    {d === today ? '  ·  today' : ''}
                  </Text>
                  <Text style={styles.loadPct}>{items.length ? `${load}%` : 'rest'}</Text>
                </View>
                <Bar pct={load} style={{ marginTop: 6 }} />
                <Text style={styles.loadMeta} numberOfLines={1}>
                  {items.length
                    ? `${items.length} blocks · weight ${w}${w > MAX_DAY_WEIGHT ? ' · overloaded' : ''}`
                    : 'Nothing scheduled — this is the day that keeps the others possible.'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>
      ) : (
        <Empty
          icon="calendar-outline"
          title="No week yet"
          body="Finish the interview and the coach lays out all seven days here."
        />
      )}

      {total ? (
        <>
          <Label style={{ marginTop: 24, marginBottom: 4 }}>
            {DAY_LABELS[day]}
            {day === today ? ' — today' : ''}
          </Label>
          {ordered.length ? (
            ordered.map(({ t, i }) => (
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
            ))
          ) : (
            <Empty
              icon="bed-outline"
              title={DAY_LABELS[day] + ' is clear'}
              body="Recovery is part of the plan, not a gap in it. Leave it alone unless a deadline says otherwise."
            />
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '600', color: C.txt, letterSpacing: -0.4, marginTop: 6 },
  sub: { fontSize: 12, color: C.txt2, marginTop: 5, lineHeight: 18 },
  strip: { flexDirection: 'row', gap: 5, marginTop: 18 },
  day: {
    flex: 1, paddingTop: 9, paddingBottom: 8, borderWidth: 0.5, borderColor: C.line,
    borderRadius: 9, alignItems: 'center', gap: 6,
  },
  dayOn: { backgroundColor: C.accent, borderColor: C.accent },
  dayText: { color: C.txt2, fontSize: 10, fontWeight: '700' },
  dayTextOn: { color: '#0a0a0a' },
  stripBarTrack: { height: 18, justifyContent: 'flex-end' },
  stripBar: { width: 4, borderRadius: 2 },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent },
  loadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  loadDay: { fontSize: 13, color: C.txt, fontWeight: '500' },
  loadPct: { fontSize: 11, color: C.txt3, fontVariant: ['tabular-nums'] },
  loadMeta: { fontSize: 11, color: C.txt3, marginTop: 5 },
});
