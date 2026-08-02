import { Modal, View, TouchableOpacity } from "react-native";
import { T } from "@/components/ThemedText";
import { useTheme } from "@/theme/store";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
}

export function ThemedAlert({ visible, title, message, onDismiss }: Props) {
  const theme = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backdrop, padding: 24 }}>
        <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 24, width: "100%", maxWidth: 320 }}>
          <T variant="heading" style={{ fontSize: 18, marginBottom: 12 }}>{title}</T>
          <T variant="body" style={{ color: theme.muted, fontSize: 14, marginBottom: 24 }}>{message}</T>
          <TouchableOpacity
            onPress={onDismiss}
            style={{ borderWidth: 2, borderColor: theme.accent, backgroundColor: theme.accent, paddingVertical: 12, alignItems: "center" }}
          >
            <T variant="body" style={{ color: theme.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>OK</T>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface ConfirmProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ThemedConfirm({ visible, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive, onConfirm, onCancel }: ConfirmProps) {
  const theme = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backdrop, padding: 24 }}>
        <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 24, width: "100%", maxWidth: 320 }}>
          <T variant="heading" style={{ fontSize: 18, marginBottom: 12 }}>{title}</T>
          <T variant="body" style={{ color: theme.muted, fontSize: 14, marginBottom: 24 }}>{message}</T>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={onCancel} style={{ flex: 1, borderWidth: 2, borderColor: theme.muted, paddingVertical: 12, alignItems: "center" }}>
              <T variant="body" style={{ color: theme.muted, fontSize: 14, textTransform: "uppercase" }}>{cancelLabel}</T>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={{ flex: 1, borderWidth: 2, borderColor: destructive ? theme.expense : theme.accent, backgroundColor: destructive ? theme.expense : theme.accent, paddingVertical: 12, alignItems: "center" }}
            >
              <T variant="body" style={{ color: theme.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>{confirmLabel}</T>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
