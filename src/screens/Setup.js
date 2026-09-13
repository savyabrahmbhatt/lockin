import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../theme';
import ProviderPicker from '../components/ProviderPicker';

export default function Setup({ state, setState, onDone }) {
  const [ready, setReady] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.h1}>First, pick your brain.</Text>
      <Text style={styles.sub}>
        Lock In runs on an AI model of your choosing. Two taps and a key, then you never think
        about this screen again.
      </Text>

      <View style={{ marginTop: 22 }}>
        <ProviderPicker
          settings={state.settings}
          onSettings={(settings) => setState({ ...state, settings })}
          onSaved={() => setReady(true)}
        />
      </View>

      <TouchableOpacity style={[styles.primary, !ready && styles.dim]} onPress={onDone} disabled={!ready}>
        <Text style={styles.primaryText}>{ready ? 'Start the interview' : 'Save a key to continue'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '600', color: C.txt, letterSpacing: -0.5, marginTop: 14 },
  sub: { fontSize: 12.5, color: C.txt2, marginTop: 7, lineHeight: 19 },
  primary: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  dim: { opacity: 0.35 },
  primaryText: { color: '#0a0a0a', fontWeight: '700', fontSize: 13.5 },
});
