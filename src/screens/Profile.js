import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { C, CAT_COLORS } from '../theme';
import { Card, Label } from '../components/ui';
import ProviderPicker from '../components/ProviderPicker';
import { clearReminders } from '../notify';

export default function Profile({ state, setState, onKeyCleared }) {
  const [cat, setCat] = useState('');

  const addCat = () => {
    if (!cat.trim()) return;
    setState({
      ...state,
      categories: [
        ...state.categories,
        { name: cat.trim(), color: CAT_COLORS[state.categories.length % CAT_COLORS.length] },
      ],
    });
    setCat('');
  };

  const removeCat = (name) =>
    Alert.alert('Remove ' + name + '?', 'Tasks in it keep the label but lose the colour.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setState({ ...state, categories: state.categories.filter((c) => c.name !== name) }),
      },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Label>You</Label>
      <Text style={styles.h1}>Profile</Text>

      <View style={{ marginTop: 22 }}>
        <ProviderPicker
          settings={state.settings}
          onSettings={(settings) => setState({ ...state, settings })}
        />
      </View>

      <Label style={{ marginTop: 22, marginBottom: 8 }}>Your categories</Label>
      <Card>
        <View style={styles.wrap}>
          {state.categories.map((c) => (
            <TouchableOpacity key={c.name} style={styles.catChip} onLongPress={() => removeCat(c.name)}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <Text style={styles.chipText}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={cat}
            onChangeText={setCat}
            placeholder="Name a new category"
            placeholderTextColor={C.txt3}
          />
          <TouchableOpacity style={styles.add} onPress={addCat}>
            <Text style={styles.primaryText}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>
          Anything you name becomes a schedulable area — music, side project, prayer, caring for
          someone. Long-press a category to remove it.
        </Text>
      </Card>

      {state.goals.length ? (
        <>
          <Label style={{ marginTop: 22, marginBottom: 8 }}>Active goals</Label>
          {state.goals.map((g, i) => (
            <Card key={i} style={{ marginBottom: 8 }}>
              <Text style={styles.goal}>{g.title}</Text>
              <Text style={styles.note}>{[g.deadline, g.metric].filter(Boolean).join('  •  ')}</Text>
            </Card>
          ))}
        </>
      ) : null}

      <TouchableOpacity
        style={[styles.ghost, { marginTop: 20 }]}
        onPress={() =>
          Alert.alert('Start over?', 'This clears the plan and reopens the interview.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Start over',
              style: 'destructive',
              onPress: async () => {
                await clearReminders();
                setState({ ...state, onboarded: false, week: {}, goals: [] });
              },
            },
          ])
        }
      >
        <Text style={styles.ghostText}>Rebuild my plan from scratch</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '600', color: C.txt, letterSpacing: -0.4, marginTop: 6 },
  chipText: { color: C.txt, fontSize: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 999, borderWidth: 0.5, borderColor: C.line, backgroundColor: C.bg2,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  input: {
    backgroundColor: C.bg0, borderWidth: 0.5, borderColor: C.line, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 9, color: C.txt, fontSize: 12,
  },
  primaryText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13 },
  add: { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  note: { fontSize: 11, color: C.txt3, marginTop: 9, lineHeight: 16 },
  goal: { fontSize: 13, color: C.txt, fontWeight: '500' },
  ghost: { borderWidth: 0.5, borderColor: C.line, borderRadius: 11, paddingVertical: 12, alignItems: 'center' },
  ghostText: { color: C.txt2, fontSize: 13 },
});
