import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View, StyleSheet } from 'react-native';
import { C, MANTRA } from '../theme';

export function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Bar({ pct, style }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    w.setValue(0);
    Animated.timing(w, { toValue: pct, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, w]);
  return (
    <View style={[styles.barTrack, style]}>
      <Animated.View
        style={[styles.barFill, { width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}

// ponytail: the loop distance has to be the measured width of one copy, not a guess.
// Guessing is what made it jump and cut words mid-letter. Two copies, slide exactly one.
export function Ticker() {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: -w,
        duration: (w / 40) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [w, x]);

  return (
    <View style={styles.ticker}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        <Text style={styles.tickerText} numberOfLines={1} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {MANTRA}
        </Text>
        <Text style={styles.tickerText} numberOfLines={1}>{MANTRA}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 9, letterSpacing: 1.6, color: C.txt3, textTransform: 'uppercase', fontWeight: '700' },
  card: { backgroundColor: 'rgba(20,20,24,0.9)', borderWidth: 0.5, borderColor: C.line, borderRadius: 14, padding: 14 },
  barTrack: { height: 5, backgroundColor: C.bg2, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  ticker: { overflow: 'hidden', backgroundColor: C.bg1, borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 7 },
  tickerText: { fontSize: 9.5, letterSpacing: 1.8, color: C.accent, fontWeight: '700' },
});
