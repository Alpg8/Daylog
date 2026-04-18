import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { styles } from "../styles";

interface LoginScreenProps {
  email: string;
  password: string;
  loading: boolean;
  errorMessage?: string;
  darkMode?: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export function LoginScreen({
  email,
  password,
  loading,
  errorMessage,
  darkMode = false,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginScreenProps) {
  const c = darkMode;
  return (
    <SafeAreaView style={[styles.screen, c && styles.screenDark]}>
      <View style={styles.loginHero}>
        <Text style={styles.loginBrand}>Daylog Driver</Text>
        <Text style={styles.loginTag}>Sofor Mobil Uygulamasi</Text>
        <Text style={styles.loginHint}>Is asamasi, zorunlu fotograf, yakit talebi ve profil yonetimi</Text>
      </View>
      <View style={[styles.loginCard, c && styles.loginCardDark]}>
        <TextInput style={[styles.input, c && styles.inputDark]} value={email} onChangeText={onEmailChange} placeholder="E-posta" placeholderTextColor={c ? "#64748b" : undefined} autoCapitalize="none" />
        <TextInput style={[styles.input, c && styles.inputDark]} value={password} onChangeText={onPasswordChange} placeholder="Sifre" placeholderTextColor={c ? "#64748b" : undefined} secureTextEntry />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <Pressable style={styles.primaryBtn} onPress={onSubmit} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? "Giris yapiliyor..." : "Giris Yap"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
