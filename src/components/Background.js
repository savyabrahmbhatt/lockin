import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Defs, Pattern, Line, Path, Rect, Circle, G } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

function useSpin(duration, reverse) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [duration, v]);
  return v.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
}

export default function Background() {
  const spinA = useSpin(50000, false);
  const spinB = useSpin(36000, true);
  const breathe = useRef(new Animated.Value(0.2)).current;
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.5, duration: 3000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.2, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.timing(scan, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [breathe, scan]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="tex" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255,106,61,0.22)" strokeWidth="1" />
            <Line x1="10" y1="0" x2="10" y2="20" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </Pattern>
          <Pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <Path d="M30 0 L0 0 0 30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </Pattern>
        </Defs>
        <Rect width={W} height={H} fill="url(#tex)" />
        <Rect width={W} height={H} fill="url(#grid)" />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: breathe }]}>
        <Svg width={W} height={H}>
          <Path
            d={`M-20 ${H * 0.52} L${W * 0.2} ${H * 0.36} L${W * 0.33} ${H * 0.43} L${W * 0.52} ${H * 0.25} L${W * 0.72} ${H * 0.41} L${W * 0.86} ${H * 0.34} L${W + 20} ${H * 0.52} Z`}
            fill="rgba(255,106,61,0.12)"
            stroke="rgba(255,106,61,0.5)"
            strokeWidth="1"
          />
          <Path
            d={`M-20 ${H * 0.56} L${W * 0.14} ${H * 0.46} L${W * 0.3} ${H * 0.51} L${W * 0.5} ${H * 0.38} L${W * 0.66} ${H * 0.48} L${W * 0.82} ${H * 0.42} L${W + 20} ${H * 0.56} Z`}
            fill="rgba(8,8,10,0.6)"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.ring, { top: -60, right: -80, transform: [{ rotate: spinA }] }]}>
        <Svg width={260} height={260}>
          <G x={130} y={130}>
            <Circle r="120" fill="none" stroke="rgba(255,106,61,0.2)" strokeWidth="1" strokeDasharray="6,10" />
            <Circle r="82" fill="none" stroke="rgba(255,106,61,0.26)" strokeWidth="1" strokeDasharray="2,14" />
          </G>
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.ring, { bottom: 40, left: -110, transform: [{ rotate: spinB }] }]}>
        <Svg width={260} height={260}>
          <G x={130} y={130}>
            <Circle r="126" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3,12" />
            <Circle r="70" fill="none" stroke="rgba(255,106,61,0.2)" strokeWidth="1" strokeDasharray="10,8" />
          </G>
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.scan,
          { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [0, H] }) }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
  scan: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,106,61,0.45)' },
});
