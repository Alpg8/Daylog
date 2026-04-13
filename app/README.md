# Daylog Mobile (Expo)

Bu klasor, Daylog icin akilli telefon (iOS/Android) mobil uygulama prototipini icerir.

## 1) Kurulum

```bash
cd mobile
npm install
```

## 2) API Base URL

`src/config.ts` dosyasindaki `API_BASE_URL` degerini backend adresinize gore guncelleyin.

- Emulator icin ornek: `http://10.0.2.2:3001` (Android emulator)
- Fiziksel cihaz icin: `http://<bilgisayar-lan-ip>:3001`

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
