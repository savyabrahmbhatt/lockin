import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { C } from '../theme';
import { Card, Label, Bar } from '../components/ui';
import { WEEK_ORDER, DAY_LABELS, completion } from '../util';

export default function Progress({ state }) {
  const pct = completion(state.week);
  const perDay = WEEK_ORDER.map((d) => {
    const t = state.week[d] || [];
    return { d, pct: t.length ? Math.round((t.filter((x) => x.state === 'done').length / t.length) * 100) : 0 };
  });

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Label>This week</Label>
      <Text style={styles.h1}>Progress</Text>
      <Text style={styles.sub}>This is what showing up actually bought you.</Text>

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.big}>{pct}%</Text>
        <Text style={styles.sub}>Completion across the week.</Text>
        <Bar pct={pct} style={{ marginTop: 10 }} />
      </Card>

      <Card style={{ marginTop: 10 }}>
        <Label>By day</Label>
        {perDay.map((x) => (
          <View key={x.d} style={{ marginTop: 10 }}>
            <View style={styles.head}>
              <Text style={styles.day}>{DAY_LABELS[x.d]}</Text>
              <Text style={styles.pct}>{x.pct}%</Text>
            </View>
            <Bar pct={x.pct} style={{ marginTop: 5 }} />
          </View>
        ))}
      </Card>

      {state.goals.length ? (
        <Card style={{ marginTop: 10, borderColor: 'rgba(255,106,61,0.4)' }}>
          <Label style={{ color: C.accent }}>What is riding on this</Label>
          {state.goals.map((g, i) => (
            <View key={i} style={{ marginTop: 10 }}>
              <Text style={styles.goal}>{g.title}</Text>
              <Text style={styles.goalMeta}>
                {[g.deadline, g.metric].filter(Boolean).join('  •  ')}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '600', color: C.txt, letterSpacing: -0.4, marginTop: 6 },
  sub: { fontSize: 12, color: C.txt2, marginTop: 4 },
  big: { fontSize: 34, fontWeight: '700', color: C.txt, letterSpacing: -1 },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { fontSize: 12.5, color: C.txt },
  pct: { fontSize: 11, color: C.txt3 },
  goal: { fontSize: 13, color: C.txt, fontWeight: '500' },
  goalMeta: { fontSize: 11, color: C.txt3, marginTop: 2 },
});
