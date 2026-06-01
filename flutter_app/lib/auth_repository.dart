import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models/user.dart';

class AuthResult {
  final bool success;
  final String message;

  const AuthResult(this.success, this.message);
}

class AuthRepository {
  static const _userKey = 'my_territory_user';
  static const _phoneKey = 'my_territory_phone';
  static const _passwordHashKey = 'my_territory_password_hash';
  static const _otpKey = 'my_territory_pending_otp';
  static const _otpPhoneKey = 'my_territory_pending_otp_phone';
  static const _loggedInKey = 'my_territory_logged_in';

  Future<String> _hashPassword(String password) async {
    final bytes = utf8.encode(password);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  Future<AuthResult> register({
    required String username,
    required String email,
    required String phone,
    required String password,
    String avatar = '🏃‍♂️',
    String avatarImage = '',
  }) async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.containsKey(_userKey)) {
      return const AuthResult(false, 'An account already exists. Please log in.');
    }

    final user = UserProfile(
      username: username,
      email: email,
      phone: phone,
      avatar: avatar,
      avatarImage: avatarImage,
      level: 1,
      xp: 0,
      streak: 0,
      totalCapturedArea: 0,
    );

    await prefs.setString(_userKey, jsonEncode(user.toMap()));
    await prefs.setString(_phoneKey, phone);
    await prefs.setString(_passwordHashKey, await _hashPassword(password));
    await prefs.setBool(_loggedInKey, true);

    return const AuthResult(true, 'Welcome to My Territory!');
  }

  Future<AuthResult> loginWithPassword({
    required String phoneOrUsername,
    required String password,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey(_userKey)) {
      return const AuthResult(false, 'No account found. Please register first.');
    }

    final userJson = prefs.getString(_userKey);
    if (userJson == null) {
      return const AuthResult(false, 'Unable to load your account.');
    }

    final user = UserProfile.fromMap(jsonDecode(userJson) as Map<String, dynamic>);
    final hashedPassword = await _hashPassword(password);
    final storedHash = prefs.getString(_passwordHashKey);

    if (storedHash != hashedPassword) {
      return const AuthResult(false, 'Password does not match.');
    }

    if (phoneOrUsername != user.phone && phoneOrUsername.toLowerCase() != user.username.toLowerCase()) {
      return const AuthResult(false, 'Username or phone number does not match.');
    }

    await prefs.setBool(_loggedInKey, true);
    return const AuthResult(true, 'Login successful.');
  }

  Future<AuthResult> sendOtp(String phoneOrUsername) async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey(_userKey)) {
      return const AuthResult(false, 'No account is registered on this device.');
    }

    final userJson = prefs.getString(_userKey);
    if (userJson == null) {
      return const AuthResult(false, 'Unable to load your account.');
    }

    final user = UserProfile.fromMap(jsonDecode(userJson) as Map<String, dynamic>);
    if (phoneOrUsername != user.phone && phoneOrUsername.toLowerCase() != user.username.toLowerCase()) {
      return const AuthResult(false, 'Username or phone number does not match.');
    }

    final code = (Random().nextInt(900000) + 100000).toString();
    await prefs.setString(_otpKey, code);
    await prefs.setString(_otpPhoneKey, phoneOrUsername);

    return AuthResult(true, code);
  }

  Future<AuthResult> verifyOtp(String code) async {
    final prefs = await SharedPreferences.getInstance();
    final storedCode = prefs.getString(_otpKey);
    if (storedCode == null) {
      return const AuthResult(false, 'No OTP has been requested.');
    }
    if (code != storedCode) {
      return const AuthResult(false, 'The code is incorrect.');
    }

    await prefs.setBool(_loggedInKey, true);
    await prefs.remove(_otpKey);
    await prefs.remove(_otpPhoneKey);
    return const AuthResult(true, 'Phone verified successfully.');
  }

  Future<UserProfile?> currentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final isLoggedIn = prefs.getBool(_loggedInKey) ?? false;
    if (!isLoggedIn) {
      return null;
    }

    final userJson = prefs.getString(_userKey);
    if (userJson == null) {
      return null;
    }

    return UserProfile.fromMap(jsonDecode(userJson) as Map<String, dynamic>);
  }

  Future<bool> signOut() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_loggedInKey, false);
    return true;
  }
}
