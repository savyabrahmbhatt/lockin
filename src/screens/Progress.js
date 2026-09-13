import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { C } from '../theme';
import { Card, Label, Bar, Empty } from '../components/ui';
import { DAY_LABELS, weekStats, catColor, MAX_DAY_WEIGHT } from '../util';
import { weekInsights } from '../ai';
import { getApiKey } from '../storage';

function Kpi({ value, label, tone }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, tone && { color: tone }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export default function Progress({ state }) {
  const s = weekStats(state.week, state.categories);
  const [insight, setInsight] = useState('');
  const [busy, setBusy] = useState(false);

  // ponytail: send the computed summary, never the week itself. ~200 tokens instead of 3k,
  // and the model cannot get the arithmetic wrong because it does none.
  const ask = async () => {
    setBusy(true);
    setInsight('');
    try {
      const apiKey = await getApiKey(state.settings.provider);
      const out = await weekInsights({
        ...state.settings,
        apiKey,
        summary: {
          completion: s.pct,
          done: s.done,
          missed: s.missed,
          open: s.open,
          perfectDayStreak: s.streak,
          heaviestDay: s.heaviestDay,
          weightSpreadAcrossDays: s.spread,
          categories: s.byCategory.map((c) => ({ name: c.name, done: c.done, missed: c.missed, pct: c.pct })),
          days: s.byDay.map((d) => ({ day: d.day, pct: d.pct, weight: d.weight })),
          goals: state.goals.map((g) => g.title + ' by ' + g.deadline),
        },
      });
      setInsight(out.trim());
    } catch (e) {
      setInsight(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Label>This week</Label>
      <Text style={styles.h1}>Progress</Text>
      <Text style={styles.sub}>This is what showing up actually bought you.</Text>

      {!s.total ? (
        <Empty
          icon="bar-chart-outline"
          title="Nothing to measure yet"
          body="Close out a few blocks and this fills with your completion rate, effort split and the days you actually hold."
        />
      ) : null}

      {s.total ? (
        <>
      <Card style={{ marginTop: 16 }}>
        <Text style={styles.big}>{s.pct}%</Text>
        <Text style={styles.sub}>Of everything you closed out, this much got done.</Text>
        <Bar pct={s.pct} style={{ marginTop: 10 }} />
        <View style={styles.kpiRow}>
          <Kpi value={s.done} label="Done" tone={C.accent} />
          <Kpi value={s.missed} label="Missed" tone={C.miss} />
          <Kpi value={s.open} label="Still open" />
          <Kpi value={s.streak} label="Perfect days" />
        </View>
      </Card>

      <Card style={{ marginTop: 10 }}>
        <Label>Where the effort goes</Label>
        <Text style={styles.note}>
          Sorted by weight, not by count. A category with few heavy blocks outranks one with many light ones.
        </Text>
        {s.byCategory.length ? (
          s.byCategory.map((c) => (
            <View key={c.name} style={{ marginTop: 12 }}>
              <View style={styles.head}>
                <View style={styles.catName}>
                  <View style={[styles.dot, { backgroundColor: catColor(c.name, state.categories) }]} />
                  <Text style={styles.day}>{c.name}</Text>
                </View>
                <Text style={styles.pct}>{c.pct}% · {c.done}/{c.count}</Text>
              </View>
              <Bar pct={c.pct} style={{ marginTop: 5 }} />
              <Text style={styles.note}>
                {c.weight} effort points{c.missed ? ` · ${c.missed} missed` : ''}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.note}>Nothing scheduled yet.</Text>
        )}
      </Card>

      <Card style={{ marginTop: 10 }}>
        <Label>By day</Label>
        {s.byDay.map((d) => (
          <View key={d.day} style={{ marginTop: 10 }}>
            <View style={styles.head}>
              <Text style={styles.day}>{DAY_LABELS[d.day]}</Text>
              <Text style={styles.pct}>
                {d.count ? `${d.pct}% · weight ${d.weight}` : 'clear'}
              </Text>
            </View>
            <Bar pct={d.pct} style={{ marginTop: 5 }} />
          </View>
        ))}
        <Text style={styles.note}>
          {s.spread > 6
            ? `Your week is lopsided — ${s.spread} effort points between your heaviest and lightest day. That is how days get abandoned.`
            : 'Load is spread evenly enough that no single day can wreck the week.'}
        </Text>
      </Card>

      {s.strongest && s.weakest && s.strongest.day !== s.weakest.day ? (
        <Card style={{ marginTop: 10 }}>
          <Label>The pattern</Label>
          <Text style={styles.line}>
            {DAY_LABELS[s.strongest.day]} is your best day at {s.strongest.pct}%.
          </Text>
          <Text style={styles.line}>
            {DAY_LABELS[s.weakest.day]} is where it falls apart at {s.weakest.pct}%
            {s.weakest.weight > MAX_DAY_WEIGHT * 0.75 ? ' — and it is also one of your heaviest.' : '.'}
          </Text>
        </Card>
      ) : null}

      <Card style={{ marginTop: 10, borderColor: 'rgba(255,106,61,0.4)' }}>
        <Label style={{ color: C.accent }}>Coach's read</Label>
        {insight ? <Text style={styles.insight}>{insight}</Text> : null}
        <TouchableOpacity style={styles.primary} onPress={ask} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.primaryText}>{insight ? 'Read it again' : 'What should I change?'}</Text>
          )}
        </TouchableOpacity>
      </Card>

        </>
      ) : null}

      {state.goals.length ? (
        <Card style={{ marginTop: 10 }}>
          <Label>What is riding on this</Label>
          {state.goals.map((g, i) => (
            <View key={i} style={{ marginTop: 10 }}>
              <Text style={styles.goal}>{g.title}</Text>
              <Text style={styles.note}>{[g.deadline, g.metric].filter(Boolean).join('  •  ')}</Text>
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
  kpiRow: { flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 0.5, borderTopColor: C.line },
  kpi: { flex: 1 },
  kpiValue: { fontSize: 19, fontWeight: '700', color: C.txt },
  kpiLabel: { fontSize: 9.5, color: C.txt3, marginTop: 2, letterSpacing: 0.6, textTransform: 'uppercase' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  day: { fontSize: 12.5, color: C.txt },
  pct: { fontSize: 11, color: C.txt3 },
  note: { fontSize: 11, color: C.txt3, marginTop: 6, lineHeight: 16 },
  line: { fontSize: 12, color: C.txt2, marginTop: 8, lineHeight: 18 },
  insight: { fontSize: 12.5, color: C.txt, lineHeight: 20, marginTop: 8 },
  primary: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 11 },
  primaryText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13 },
  goal: { fontSize: 13, color: C.txt, fontWeight: '500' },
});
