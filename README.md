# My-Territory
Transforming fitness into a real-world territory game.

## My Territory Flutter App

This repository contains a Flutter app wrapper for the existing `My Territory` website prototype.

## What is included

- `flutter_app/`: Flutter project skeleton
- `flutter_app/lib/main.dart`: Main app entry point using a native Flutter UI
- `flutter_app/pubspec.yaml`: Flutter dependencies and asset configuration
- `flutter_app/lib/`: Native app screens, auth repository, and sample app data
- `.gitignore`: Ignore rules for Flutter and project files

## Features

- Native mobile UI built with Flutter widgets instead of a WebView
- Local auth flow with phone/OTP and password login stubbed for prototype use
- Dashboard, profile, and map screens built for mobile navigation
- Placeholder architecture ready for backend REST API integration
- Essential mobile packages added for future expansion:
  - `google_maps_flutter`
  - `geolocator`
  - `firebase_core`
  - `firebase_auth`
  - `cloud_firestore`
  - `firebase_messaging`

## How to run

1. Install Flutter SDK: https://flutter.dev/docs/get-started/install
2. Open the `flutter_app` folder in your editor
3. Run:

```bash
flutter pub get
flutter run
```

## Build Android APK

When the app is ready:

```bash
flutter build apk
```

Output:

```bash
build/app/outputs/flutter-apk/app-release.apk
```

## Build Play Store Package

Google now prefers AAB files. Generate:

```bash
flutter build appbundle
```

Output:

```bash
build/app/outputs/bundle/release/app-release.aab
```

## Notes

- This is a native Flutter app shell built with widgets and local state management.
- Phone/OTP and password auth are implemented locally for prototype flow and can be wired to a backend REST API.
- Android and iOS launcher icon asset sets are added under `flutter_app/android/app/src/main/res` and `flutter_app/ios/Runner/Assets.xcassets/AppIcon.appiconset`.
- Minimal Android and iOS platform config files have been added for mobile publishing.
- The current architecture is ready for a backend REST API layer and future native feature expansion.

## GitHub repo link

The intended GitHub repo is: https://github.com/OWAIS-SHAIKH-1/My-Territory.git

If you want, I can also help set up a full native Flutter UI version next.
