import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { C, CAT_COLORS } from '../theme';
import { Card, Label } from '../components/ui';
import { PROVIDERS } from '../ai';
import { getApiKey, setApiKey } from '../storage';

export default function Profile({ state, setState }) {
  const provider = state.settings.provider;
  const [key, setKey] = useState('');
  const [model, setModel] = useState(state.settings.model);
  const [cat, setCat] = useState('');

  useEffect(() => {
    getApiKey(provider).then(setKey);
    setModel(state.settings.model);
  }, [provider, state.settings.model]);

  const saveKey = async () => {
    await setApiKey(provider, key.trim());
    setState({ ...state, settings: { ...state.settings, model: model.trim() } });
    Alert.alert('Saved', 'Key stored in the device keystore.');
  };

  const addCat = () => {
    if (!cat.trim()) return;
    setState({
      ...state,
      categories: [...state.categories, { name: cat.trim(), color: CAT_COLORS[state.categories.length % CAT_COLORS.length] }],
    });
    setCat('');
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Label>You</Label>
      <Text style={styles.h1}>Profile</Text>

      <Label style={{ marginTop: 22, marginBottom: 8 }}>AI provider</Label>
      <Card>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Object.keys(PROVIDERS).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setState({ ...state, settings: { ...state.settings, provider: p, model: '' } })}
              style={[styles.chip, provider === p && styles.chipOn]}
            >
              <Text style={[styles.chipText, provider === p && styles.chipTextOn]}>{PROVIDERS[p].label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={key}
          onChangeText={setKey}
          placeholder={PROVIDERS[provider].keyHint}
          placeholderTextColor={C.txt3}
          autoCapitalize="none"
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={model}
          onChangeText={setModel}
          placeholder={'Model (default ' + PROVIDERS[provider].defaultModel + ')'}
          placeholderTextColor={C.txt3}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.primary} onPress={saveKey}>
          <Text style={styles.primaryText}>Save</Text>
        </TouchableOpacity>
        <Text style={styles.note}>
          Your key never leaves the phone except to call {PROVIDERS[provider].label} directly. You pay your own usage.
        </Text>
      </Card>

      <Label style={{ marginTop: 22, marginBottom: 8 }}>Your categories</Label>
      <Card>
        <View style={styles.wrap}>
          {state.categories.map((c) => (
            <View key={c.name} style={styles.catChip}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <Text style={styles.chipText}>{c.name}</Text>
            </View>
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
        <Text style={styles.note}>Anything you name becomes a schedulable area — music, side project, prayer, caring for someone.</Text>
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
            { text: 'Start over', style: 'destructive', onPress: () => setState({ ...state, onboarded: false, week: {}, goals: [] }) },
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
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 0.5, borderColor: C.line, backgroundColor: C.bg2 },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.txt, fontSize: 12 },
  chipTextOn: { color: '#0a0a0a', fontWeight: '700' },
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
  primary: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 9 },
  primaryText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13 },
  add: { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  note: { fontSize: 11, color: C.txt3, marginTop: 9, lineHeight: 16 },
  goal: { fontSize: 13, color: C.txt, fontWeight: '500' },
  ghost: { borderWidth: 0.5, borderColor: C.line, borderRadius: 11, paddingVertical: 12, alignItems: 'center' },
  ghostText: { color: C.txt2, fontSize: 13 },
});
