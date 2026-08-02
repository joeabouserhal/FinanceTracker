import { TextInput, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { T } from "./ThemedText";
import { useTheme } from "@/theme/store";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

/** Brutalist search input with magnifier icon and clear button. */
export function SearchInput({ value, onChangeText, placeholder }: Props) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          backgroundColor: theme.background,
          borderWidth: 2,
          borderColor: theme.inputBorder,
          height: 44,
          paddingHorizontal: 10,
        }}
      >
        <MaterialCommunityIcons name="magnify" size={16} color={theme.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={{
            flex: 1,
            color: theme.ink,
            fontSize: 15,
            fontFamily: "IBMPlexMono",
            paddingVertical: 0,
            textAlignVertical: "center",
            includeFontPadding: false,
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          style={{ borderWidth: 2, borderColor: theme.muted, paddingHorizontal: 12, height: 44, justifyContent: "center", marginLeft: 6 }}
        >
          <T variant="body" style={{ color: theme.muted, fontSize: 16 }}>✕</T>
        </TouchableOpacity>
      )}
    </View>
  );
}
