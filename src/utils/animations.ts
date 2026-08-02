import { useEffect, useState } from "react";
import { Animated, type LayoutChangeEvent } from "react-native";

/**
 * Expand/collapse with fade + height clip.
 * Height is measured from the CONTENT (`onContentLayout` must be attached to
 * the inner content view — NOT the clamped outer Animated.View, whose height
 * is capped by the animating maxHeight and would bake in a clipped value),
 * so tall filter panels are never cut off. Falls back to 500 until measured.
 */
export function useExpandCollapse(visible: boolean) {
  const [fadeAnim] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [heightAnim] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [render, setRender] = useState(visible);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    fadeAnim.stopAnimation();
    heightAnim.stopAnimation();
    if (visible) {
      requestAnimationFrame(() => {
        setRender(true);
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
  }, [visible, fadeAnim, heightAnim]);

  const onContentLayout = (e: LayoutChangeEvent) => {
    setContentHeight(e.nativeEvent.layout.height);
  };

  const maxHeight = contentHeight || 500;
  const outerStyle = {
    maxHeight: heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, maxHeight] }),
    overflow: "hidden" as const,
  };

  const innerStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
  };

  return { render, outerStyle, innerStyle, onContentLayout };
}
