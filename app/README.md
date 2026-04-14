# Daylog Mobile (Expo)

Bu klasor, Daylog icin akilli telefon (iOS/Android) mobil uygulama prototipini icerir.

## 1) Kurulum

```bash
cd app
npm install
```

## 2) API Base URL

Uygulama gelistirme modunda Expo host'unu otomatik algilar.

Uretim/staging icin build zamaninda su environment degiskenini verin:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

## 3) Calistirma

```bash
npm run start
```

- iOS simulator: `npm run ios`
- Android emulator: `npm run android`

## 4) Demo Giris

- Email: `driver@example.com`
- Sifre: `Driver12345!`

## Ozellikler (Prototip)

- Mobil login (`/api/auth/mobile-login`)
- Islerim (`/api/driver/tasks`)
- Bildirimler (`/api/driver/notifications`)
- Yakit talebi + fotograf (`/api/driver/fuel-request`)
- Profil ve cikis

## Not

Bu prototip Expo ile hizli MVP amaclidir. Sonraki adimda React Navigation, state yonetimi, push notification, offline cache ve store release pipeline eklenebilir.

## App Store / Play Store Build

### Ilk kurulum

```bash
npx eas login
npx eas init
npm run doctor
```

### Test build (internal)

```bash
npm run build:android:preview
npm run build:ios:preview
```

### Production build

```bash
npm run build:android:production
npm run build:ios:production
```

### Store submit

```bash
npm run submit:android
npm run submit:ios
```

Not: iOS publish icin Apple Developer ve App Store Connect, Android publish icin Google Play Console hesaplarinizin hazir olmasi gerekir.
