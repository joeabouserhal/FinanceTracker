import { useState } from "react";
import { Animated, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";

interface Props {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedFAB({ onPress, children, style }: Props) {
  const [scale] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
