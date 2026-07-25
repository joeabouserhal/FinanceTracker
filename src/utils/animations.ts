import { useRef, useEffect, useState } from "react";
import { Animated } from "react-native";

export function useExpandCollapse(visible: boolean) {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const heightAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [render, setRender] = useState(visible);

  useEffect(() => {
    fadeAnim.stopAnimation();
    heightAnim.stopAnimation();
    if (visible) {
      setRender(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(heightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(heightAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start(() => {
        setRender(false);
      });
    }
  }, [visible]);

  const outerStyle = {
    maxHeight: heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }),
    overflow: "hidden" as const,
  };

  const innerStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
  };

  return { render, outerStyle, innerStyle };
}
