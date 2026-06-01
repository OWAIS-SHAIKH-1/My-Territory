import 'package:flutter/material.dart';

import 'screens/auth_screen.dart';
import 'screens/dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyTerritoryApp());
}

class MyTerritoryApp extends StatelessWidget {
  const MyTerritoryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'My Territory',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const StartupScreen(),
        '/dashboard': (context) => const DashboardScreen(),
      },
    );
  }
}

class StartupScreen extends StatelessWidget {
  const StartupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AuthScreen();
  }
}
