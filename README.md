# My Territory Flutter App

This repository contains a Flutter app wrapper for the existing `My Territory` website prototype.

## What is included

- `flutter_app/`: Flutter project skeleton
- `flutter_app/lib/main.dart`: Main app entry point using `webview_flutter`
- `flutter_app/pubspec.yaml`: Flutter dependencies and asset configuration
- `flutter_app/assets/`: Website assets copied from the original prototype
  - `index.html`
  - `style.css`
  - `app.js`
- `.gitignore`: Ignore rules for Flutter and project files

## Features

- Loads the existing website prototype inside a Flutter `WebView`
- Uses the local site assets so the app can run offline once installed
- Includes a base Material app shell with loading indicator

## How to run

1. Install Flutter SDK: https://flutter.dev/docs/get-started/install
2. Open the `flutter_app` folder in your editor
3. Run:

```bash
flutter pub get
flutter run
```

## Notes

- This is a base conversion. The website HTML/CSS/JS is embedded as Flutter assets.
- For a native Flutter implementation, the UI can be rebuilt using Flutter widgets in `lib/main.dart`.
- OTP/password authentication remains in the web prototype and will continue to work inside the WebView.

## GitHub repo link

The intended GitHub repo is: https://github.com/OWAIS-SHAIKH-1/My-Territory.git

If you want, I can also help set up a full native Flutter UI version next.
