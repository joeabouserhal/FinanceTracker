import { useState } from "react";
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, Link } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@/utils/validation";
import { useAuth } from "@/hooks/useAuth";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInInput) => {
    setServerError(null); setLoading(true);
    const error = await signIn(data.email, data.password);
    setLoading(false);
    if (error) setServerError(error.message);
    else router.replace("/(app)/dashboard");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flex: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <T variant="heading" style={{ fontSize: 32, marginBottom: 8 }}>Finance{"\n"}Tracker</T>
        <T variant="body" style={{ color: colors.muted, fontSize: 16, marginBottom: 40 }}>Sign in to your account</T>

        {serverError && (
          <View style={{ borderWidth: 2, borderColor: colors.expense, padding: 12, marginBottom: 20 }}>
            <T variant="body" style={{ color: colors.expense, fontSize: 14 }}>{serverError}</T>
          </View>
        )}

        <T variant="label">Email</T>
        <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput style={inputStyle(errors.email)} placeholder="you@example.com" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" onBlur={onBlur} onChangeText={onChange} value={value} />
        )} />
        {errors.email && <T variant="body" style={{ color: colors.expense, fontSize: 12, marginTop: 4 }}>{errors.email.message}</T>}

        <T variant="label" style={{ marginTop: 16 }}>Password</T>
        <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput style={inputStyle(errors.password)} placeholder="Your password" placeholderTextColor={colors.muted} secureTextEntry autoComplete="password" onBlur={onBlur} onChangeText={onChange} value={value} />
        )} />
        {errors.password && <T variant="body" style={{ color: colors.expense, fontSize: 12, marginTop: 4 }}>{errors.password.message}</T>}

        <TouchableOpacity style={{ backgroundColor: colors.accent, paddingVertical: 16, alignItems: "center", marginTop: 28, borderWidth: 2, borderColor: colors.accent }} onPress={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.background} /> : <T variant="body" style={{ color: colors.background, fontSize: 16, fontWeight: "700", textTransform: "uppercase" }}>Sign In</T>}
        </TouchableOpacity>

        <Link href="/(auth)/sign-up" style={{ color: colors.accent, fontSize: 14, textAlign: "center", marginTop: 24, textDecorationLine: "underline", fontFamily: "IBMPlexSans" }}>
          Don't have an account? Sign up
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = (error?: { message?: string }) => ({
  backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: error ? "#E8432E" : "#77746C", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "IBMPlexSans",
});
