import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './src/theme';
import Background from './src/components/Background';
import Setup from './src/screens/Setup';
import Onboarding from './src/screens/Onboarding';
import Today from './src/screens/Today';
import Plan from './src/screens/Plan';
import Tasks from './src/screens/Tasks';
import Progress from './src/screens/Progress';
import Profile from './src/screens/Profile';
import { loadState, saveState, EMPTY, getApiKey } from './src/storage';
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
  const [hasKey, setHasKey] = useState(false);
  const [tab, setTab] = useState('today');

  useEffect(() => {
    loadState().then(async (s) => {
      setState(s);
      setHasKey(!!(await getApiKey(s.settings.provider)));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [state, ready]);

  // Re-sync when times, titles or done-state change — done-state matters because a
  // finished task must stop nagging. Sub-task ticks and category edits don't trigger it.
  const weekSig = JSON.stringify(
    Object.entries(state.week).map(([d, ts]) => [d, (ts || []).map((t) => t.time + t.title + t.state)])
  );
  useEffect(() => {
    if (ready && state.onboarded) syncReminders(state.week);
  }, [weekSig, ready, state.onboarded]);

  const onPlan = (plan) =>
    setState((s) => ({ ...s, onboarded: true, goals: plan.goals || [], week: normalizeWeek(plan.week) }));

  if (!ready) return <View style={styles.root} />;

  const setup = !hasKey;
  const screen = setup ? (
    <Setup state={state} setState={setState} onDone={() => setHasKey(true)} />
  ) : !state.onboarded ? (
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
    <Profile state={state} setState={setState} onKeyCleared={() => setHasKey(false)} />
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg1} />
      <Background />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0}
      >
        <View style={{ flex: 1 }}>{screen}</View>
        {state.onboarded && !setup ? (
          <View style={styles.nav}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} style={styles.navBtn} onPress={() => setTab(t.key)}>
                <Ionicons name={t.icon} size={20} color={tab === t.key ? C.accent : C.txt2} />
                <Text style={[styles.navText, tab === t.key && { color: C.accent }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg0, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  nav: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: C.line, backgroundColor: C.bg1 },
  navBtn: { flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 12, gap: 4 },
  navText: { fontSize: 9, color: C.txt2, letterSpacing: 0.3 },
});
