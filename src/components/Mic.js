import React, { useState, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { C } from '../theme';

// ponytail: on-device Android/iOS speech recognition. Free, no audio upload, no tokens.
// Events are global, so each Mic ignores results unless it is the one listening.
export default function Mic({ onText, label, style }) {
  const [listening, setListening] = useState(false);
  const mine = useRef(false);

  const stop = () => {
    mine.current = false;
    setListening(false);
  };

  useSpeechRecognitionEvent('result', (e) => {
    if (!mine.current) return;
    const text = e.results?.[0]?.transcript || '';
    if (e.isFinal) {
      stop();
      if (text.trim()) onText(text.trim());
    }
  });
  useSpeechRecognitionEvent('end', () => mine.current && stop());
  useSpeechRecognitionEvent('error', (e) => {
    if (!mine.current) return;
    stop();
    if (e.error !== 'no-speech' && e.error !== 'aborted') Alert.alert('Mic', e.message || e.error);
  });

  const toggle = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return stop();
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return Alert.alert('Mic', 'Microphone permission is off.');
    mine.current = true;
    setListening(true);
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false, continuous: false });
  };

  return (
    <TouchableOpacity style={[styles.btn, listening && styles.on, style]} onPress={toggle}>
      <Ionicons name={listening ? 'stop' : 'mic'} size={15} color={listening ? '#0a0a0a' : C.accent} />
      {label ? (
        <Text style={[styles.label, listening && { color: '#0a0a0a', fontWeight: '700' }]}>
          {listening ? 'Listening…' : label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 0.5, borderColor: 'rgba(255,106,61,0.5)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,106,61,0.08)',
  },
  on: { backgroundColor: C.accent, borderColor: C.accent },
  label: { color: C.accent, fontSize: 12 },
});
