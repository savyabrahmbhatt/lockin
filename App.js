import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './src/theme';
import { Ticker } from './src/components/ui';
import Background from './src/components/Background';
import Onboarding from './src/screens/Onboarding';
import Today from './src/screens/Today';
import Plan from './src/screens/Plan';
import Tasks from './src/screens/Tasks';
import Progress from './src/screens/Progress';
import Profile from './src/screens/Profile';
import { loadState, saveState, EMPTY } from './src/storage';
import { normalizeWeek } from './src/util';
import { syncReminders } from './src/notify';

const TABS = [
  { key: 'today', label: 'Today', icon: 'locate-outline' },
  { key: 'plan', label: 'Plan', icon: 'calendar-outline' },
  { key: 'tasks', label: 'Tasks', icon: 'checkmark-done-outline' },
  { key: 'progress', label: 'Progress', icon: 'bar-chart-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
];

export default function App() {
  const [state, setState] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('today');

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [state, ready]);

  // ponytail: reschedule only when the shape of the week changes, not on every checkbox tap.
  const weekSig = JSON.stringify(
    Object.entries(state.week).map(([d, ts]) => [d, (ts || []).map((t) => t.time + t.title)])
  );
  useEffect(() => {
    if (ready && state.onboarded) syncReminders(state.week);
  }, [weekSig, ready, state.onboarded]);

  const onPlan = (plan) =>
    setState((s) => ({ ...s, onboarded: true, goals: plan.goals || [], week: normalizeWeek(plan.week) }));

  if (!ready) return <View style={styles.root} />;

  const screen = !state.onboarded ? (
    <Onboarding settings={state.settings} onPlan={onPlan} />
  ) : tab === 'today' ? (
    <Today state={state} setState={setState} />
  ) : tab === 'plan' ? (
    <Plan state={state} setState={setState} />
  ) : tab === 'tasks' ? (
    <Tasks state={state} setState={setState} />
  ) : tab === 'progress' ? (
    <Progress state={state} />
  ) : (
    <Profile state={state} setState={setState} />
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg1} />
      <Background />
      <Ticker />
      <View style={{ flex: 1 }}>{screen}</View>
      {state.onboarded ? (
        <View style={styles.nav}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={styles.navBtn} onPress={() => setTab(t.key)}>
              <Ionicons name={t.icon} size={20} color={tab === t.key ? C.accent : C.txt2} />
              <Text style={[styles.navText, tab === t.key && { color: C.accent }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity style={styles.skip} onPress={() => setState({ ...state, onboarded: true })}>
          <Text style={styles.skipText}>Skip setup for now</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg0, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  nav: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: C.line, backgroundColor: C.bg1 },
  navBtn: { flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 12, gap: 4 },
  navText: { fontSize: 9, color: C.txt2, letterSpacing: 0.3 },
  skip: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: C.line, backgroundColor: C.bg1 },
  skipText: { color: C.txt3, fontSize: 12 },
});
