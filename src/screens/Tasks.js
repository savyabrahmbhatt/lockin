import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { C } from '../theme';
import { Label } from '../components/ui';
import TaskRow from '../components/TaskRow';
import { WEEK_ORDER, DAY_LABELS, catColor, removeTask, moveTask } from '../util';

export default function Tasks({ state, setState }) {
  const all = WEEK_ORDER.flatMap((d) => (state.week[d] || []).map((t, i) => ({ t, d, i })));
  const groups = state.categories
    .map((c) => ({ cat: c, items: all.filter((x) => (x.t.category || '').toLowerCase() === c.name.toLowerCase()) }))
    .filter((g) => g.items.length);
  const other = all.filter((x) => !state.categories.some((c) => c.name.toLowerCase() === (x.t.category || '').toLowerCase()));
  if (other.length) groups.push({ cat: { name: 'Uncategorised', color: C.txt3 }, items: other });

  const update = (d, i, task) =>
    setState({ ...state, week: { ...state.week, [d]: state.week[d].map((t, k) => (k === i ? task : t)) } });
  const remove = (d, i) => setState({ ...state, week: removeTask(state.week, d, i) });
  const move = (d, i, to) => setState({ ...state, week: moveTask(state.week, d, i, to) });

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Label>Everything in the week</Label>
      <Text style={styles.h1}>Tasks</Text>
      <Text style={styles.sub}>{all.length} blocks across seven days.</Text>
      {groups.map((g) => (
        <React.Fragment key={g.cat.name}>
          <Label style={{ marginTop: 20, marginBottom: 2, color: g.cat.color }}>{g.cat.name}</Label>
          {g.items.map((x) => (
            <TaskRow
              key={x.d + x.i}
              task={x.t}
              badge={DAY_LABELS[x.d].slice(0, 3)}
              day={x.d}
              color={catColor(x.t.category, state.categories)}
              categories={state.categories}
              settings={state.settings}
              onChange={(task) => update(x.d, x.i, task)}
              onDelete={() => remove(x.d, x.i)}
              onMove={(to) => move(x.d, x.i, to)}
            />
          ))}
        </React.Fragment>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '600', color: C.txt, letterSpacing: -0.4, marginTop: 6 },
  sub: { fontSize: 12, color: C.txt2, marginTop: 4 },
});
