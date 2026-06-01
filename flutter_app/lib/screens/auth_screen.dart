import 'package:flutter/material.dart';

import '../auth_repository.dart';
import '../data/game_state.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _authRepository = AuthRepository();
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _loginPhoneController = TextEditingController();
  final _loginPasswordController = TextEditingController();
  bool _isRegister = true;
  String _selectedAvatar = '🏃‍♂️';

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _loginPhoneController.dispose();
    _loginPasswordController.dispose();
    super.dispose();
  }

  void _showMessage(String message, {bool isError = false}) {
    final snackBar = SnackBar(
      content: Text(message),
      backgroundColor: isError ? Colors.redAccent : Colors.green,
    );
    ScaffoldMessenger.of(context).showSnackBar(snackBar);
  }

  Future<void> _submitRegistration() async {
    if (!_formKey.currentState!.validate()) return;

    final result = await _authRepository.register(
      username: _usernameController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      password: _passwordController.text,
      avatar: _selectedAvatar,
    );

    if (!mounted) return;
    if (result.success) {
      _showMessage(result.message);
      await GameState().loadState();
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/dashboard');
    } else {
      _showMessage(result.message, isError: true);
    }
  }

  Future<void> _submitLogin() async {
    if (_loginPhoneController.text.trim().isEmpty) {
      _showMessage('Enter your username or phone number to continue.', isError: true);
      return;
    }

    if (_loginPasswordController.text.isNotEmpty) {
      final result = await _authRepository.loginWithPassword(
        phoneOrUsername: _loginPhoneController.text.trim(),
        password: _loginPasswordController.text,
      );

      if (!mounted) return;
      if (result.success) {
        _showMessage(result.message);
        await GameState().loadState();
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/dashboard');
      } else {
        _showMessage(result.message, isError: true);
      }
      return;
    }

    final result = await _authRepository.sendOtp(_loginPhoneController.text.trim());
    if (!mounted) return;
    if (!result.success) {
      _showMessage(result.message, isError: true);
      return;
    }

    _showOtpDialog(result.message);
  }

  Future<void> _showOtpDialog(String code) async {
    final otpController = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Verify with OTP'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Enter the 6-digit code sent to your phone.'),
              const SizedBox(height: 12),
              TextField(
                controller: otpController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'OTP Code',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Prototype OTP: $code',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final result = await _authRepository.verifyOtp(otpController.text.trim());
                if (!mounted) return;
                if (result.success) {
                  await GameState().loadState();
                  if (context.mounted) {
                    Navigator.of(context).pop();
                    _showMessage(result.message);
                    Navigator.pushReplacementNamed(context, '/dashboard');
                  }
                } else {
                  _showMessage(result.message, isError: true);
                }
              },
              child: const Text('Verify'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                const Text('My Territory',
                    style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(
                  _isRegister
                      ? 'Create a secure account and start defending your territory.'
                      : 'Log in with password or OTP and get back to the game.',
                  style: const TextStyle(fontSize: 16, color: Colors.black54),
                ),
                const SizedBox(height: 28),
                if (_isRegister) _buildRegisterForm() else _buildLoginForm(),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isRegister = !_isRegister;
                    });
                  },
                  child: Text(_isRegister ? 'Already have an account? Log in' : 'Create a new account'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRegisterForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _usernameController,
            decoration: const InputDecoration(labelText: 'Username'),
            validator: (value) => (value == null || value.trim().length < 3) ? 'Enter at least 3 characters' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email'),
            validator: (value) {
              if (value == null || value.trim().isEmpty) return 'Enter your email';
              if (!value.contains('@')) return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone number'),
            validator: (value) => (value == null || value.trim().isEmpty) ? 'Phone is required' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _passwordController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Password'),
            validator: (value) => (value == null || value.length < 6) ? 'Use 6+ characters' : null,
          ),
          const SizedBox(height: 16),
          const Text('Select Emoji Avatar', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.blueGrey)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: ['🏃‍♂️', '🏃‍♀️', '🦁', '🦉', '⚡'].map((emoji) {
              final isSelected = _selectedAvatar == emoji;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedAvatar = emoji;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.teal.shade100 : Colors.grey.shade100,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? Colors.teal : Colors.grey.shade300,
                      width: 2,
                    ),
                  ),
                  child: Text(emoji, style: const TextStyle(fontSize: 24)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _submitRegistration,
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Text('Create Account'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _loginPhoneController,
          decoration: const InputDecoration(labelText: 'Username or phone number'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _loginPasswordController,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Password (optional)'),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _submitLogin,
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Text('Continue'),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _submitLogin,
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Text('Send OTP'),
          ),
        ),
      ],
    );
  }
}
