import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { Card, Label } from './ui';
import { PROVIDERS, defaultModel } from '../ai';
import { getApiKey, setApiKey } from '../storage';

// Shared by first-run Setup and the Profile tab so there is one place to get this wrong.
export default function ProviderPicker({ settings, onSettings, onSaved }) {
  const provider = settings.provider;
  const model = settings.model || defaultModel(provider);
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getApiKey(provider).then((k) => {
      setKey(k);
      setSaved(!!k);
    });
  }, [provider]);

  const save = async () => {
    await setApiKey(provider, key.trim());
    setSaved(!!key.trim());
    if (key.trim() && onSaved) onSaved();
  };

  return (
    <View>
      <Label style={{ marginBottom: 8 }}>Step 1 — who does the thinking</Label>
      <View style={styles.row}>
        {Object.keys(PROVIDERS).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => onSettings({ ...settings, provider: p, model: '' })}
            style={[styles.tab, provider === p && styles.tabOn]}
          >
            <Text style={[styles.tabText, provider === p && styles.tabTextOn]}>{PROVIDERS[p].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Label style={{ marginTop: 20, marginBottom: 8 }}>Step 2 — how hard it thinks</Label>
      {PROVIDERS[provider].models.map((m) => (
        <TouchableOpacity
          key={m.id}
          onPress={() => onSettings({ ...settings, model: m.id })}
          style={[styles.model, model === m.id && styles.modelOn]}
        >
          <View style={styles.modelHead}>
            <Text style={[styles.modelName, model === m.id && { color: C.accent }]}>{m.name}</Text>
            {model === m.id ? <Ionicons name="checkmark-circle" size={17} color={C.accent} /> : null}
          </View>
          <Text style={styles.modelBlurb}>{m.blurb}</Text>
          <Text style={styles.modelId}>{m.id}</Text>
        </TouchableOpacity>
      ))}

      <Label style={{ marginTop: 20, marginBottom: 8 }}>Step 3 — your key</Label>
      <Card>
        <Text style={styles.help}>
          Lock In has no server. You bring a key from {PROVIDERS[provider].label} and the app talks to
          them directly from your phone. The key is stored in the phone's keystore and never sent
          anywhere else. You pay {PROVIDERS[provider].label} for what you use — usually a few cents a week.
        </Text>
        <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(PROVIDERS[provider].keyUrl)}>
          <Ionicons name="open-outline" size={14} color={C.accent} />
          <Text style={styles.linkText}>Get a {PROVIDERS[provider].label} key</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={key}
          onChangeText={(v) => {
            setKey(v);
            setSaved(false);
          }}
          placeholder={PROVIDERS[provider].keyHint}
          placeholderTextColor={C.txt3}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <TouchableOpacity style={styles.primary} onPress={save}>
          <Text style={styles.primaryText}>{saved ? 'Saved' : 'Save key'}</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 0.5, borderColor: C.line, backgroundColor: C.bg2, alignItems: 'center' },
  tabOn: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { color: C.txt, fontSize: 12.5 },
  tabTextOn: { color: '#0a0a0a', fontWeight: '700' },
  model: {
    borderWidth: 0.5, borderColor: C.line, borderRadius: 12, padding: 13, marginBottom: 7,
    backgroundColor: 'rgba(20,20,24,0.9)',
  },
  modelOn: { borderColor: C.accent, backgroundColor: 'rgba(255,106,61,0.08)' },
  modelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelName: { fontSize: 14, fontWeight: '600', color: C.txt },
  modelBlurb: { fontSize: 11.5, color: C.txt2, marginTop: 4, lineHeight: 17 },
  modelId: { fontSize: 10, color: C.txt3, marginTop: 5 },
  help: { fontSize: 11.5, color: C.txt2, lineHeight: 18 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  linkText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: C.bg0, borderWidth: 0.5, borderColor: C.line, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 10, color: C.txt, fontSize: 12, marginTop: 10,
  },
  primary: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 9 },
  primaryText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13 },
});
