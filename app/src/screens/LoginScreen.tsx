import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { styles } from "../styles";

interface LoginScreenProps {
  email: string;
  password: string;
  loading: boolean;
  errorMessage?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export function LoginScreen({
  email,
  password,
  loading,
  errorMessage,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.loginHero}>
        <Text style={styles.loginBrand}>Daylog Driver</Text>
        <Text style={styles.loginTag}>Sofor Mobil Uygulamasi</Text>
        <Text style={styles.loginHint}>Is asamasi, zorunlu fotograf, yakit talebi ve profil yonetimi</Text>
      </View>
      <View style={styles.loginCard}>
        <TextInput style={styles.input} value={email} onChangeText={onEmailChange} placeholder="E-posta" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={onPasswordChange} placeholder="Sifre" secureTextEntry />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <Pressable style={styles.primaryBtn} onPress={onSubmit} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? "Giris yapiliyor..." : "Giris Yap"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
