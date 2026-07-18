import { useState } from "react";
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, Link } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/utils/validation";
import { useAuth } from "@/hooks/useAuth";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";

export default function SignUp() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: SignUpInput) => {
    setServerError(null); setLoading(true);
    const error = await signUp(data.email, data.password);
    setLoading(false);
    if (error) setServerError(error.message);
    else router.replace("/(app)/dashboard");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flex: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <T variant="heading" style={{ fontSize: 32, marginBottom: 8 }}>Create{"\n"}Account</T>
        <T variant="body" style={{ color: colors.muted, fontSize: 16, marginBottom: 40 }}>Start tracking your spending</T>

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
          <TextInput style={inputStyle(errors.password)} placeholder="At least 8 characters" placeholderTextColor={colors.muted} secureTextEntry autoComplete="new-password" onBlur={onBlur} onChangeText={onChange} value={value} />
        )} />
        {errors.password && <T variant="body" style={{ color: colors.expense, fontSize: 12, marginTop: 4 }}>{errors.password.message}</T>}

        <T variant="label" style={{ marginTop: 16 }}>Confirm Password</T>
        <Controller control={control} name="confirmPassword" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput style={inputStyle(errors.confirmPassword)} placeholder="Re-enter your password" placeholderTextColor={colors.muted} secureTextEntry autoComplete="new-password" onBlur={onBlur} onChangeText={onChange} value={value} />
        )} />
        {errors.confirmPassword && <T variant="body" style={{ color: colors.expense, fontSize: 12, marginTop: 4 }}>{errors.confirmPassword.message}</T>}

        <TouchableOpacity style={{ backgroundColor: colors.accent, paddingVertical: 16, alignItems: "center", marginTop: 28, borderWidth: 2, borderColor: colors.accent }} onPress={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.background} /> : <T variant="body" style={{ color: colors.background, fontSize: 16, fontWeight: "700", textTransform: "uppercase" }}>Sign Up</T>}
        </TouchableOpacity>

        <Link href="/(auth)/sign-in" style={{ color: colors.accent, fontSize: 14, textAlign: "center", marginTop: 24, textDecorationLine: "underline", fontFamily: "IBMPlexSans" }}>
          Already have an account? Sign in
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = (error?: { message?: string }) => ({
  backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: error ? "#E8432E" : "#77746C", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "IBMPlexSans",
});
