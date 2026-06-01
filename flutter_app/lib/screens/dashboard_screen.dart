import 'package:flutter/material.dart';

import '../auth_repository.dart';
import '../data/sample_data.dart';
import '../models/user.dart';
import 'map_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _authRepository = AuthRepository();
  late final Future<UserProfile?> _userFuture;
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _userFuture = _authRepository.currentUser();
  }

  void _signOut() async {
    await _authRepository.signOut();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/');
  }

  Widget _buildHome(UserProfile user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Welcome back, ${user.username}!', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Text('Your territory journey is ready. Track progress, defend zones, and win rewards.', style: const TextStyle(color: Colors.black54)),
          const SizedBox(height: 20),
          SizedBox(
            height: 140,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: dashboardSummary.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (context, index) {
                final item = dashboardSummary[index];
                return Container(
                  width: 180,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 18, offset: const Offset(0, 8))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['label']!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.blueGrey)),
                      const Spacer(),
                      Text(item['value']!, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 6),
                      Text(item['hint']!, style: const TextStyle(color: Colors.black45)),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 24),
          const Text('Active challenges', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          Column(
            children: challenges.map((challenge) {
              return Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                elevation: 2,
                margin: const EdgeInsets.only(bottom: 14),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Text(challenge['badge']!, style: const TextStyle(fontSize: 28)),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(challenge['title']!, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 6),
                            Text(challenge['progress']!, style: const TextStyle(color: Colors.black54)),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Colors.black26),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          const Text('Leaderboard', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          Column(
            children: leaderboard.map((entry) {
              return ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                tileColor: Colors.white,
                leading: CircleAvatar(backgroundColor: Colors.blue.shade100, child: Text(entry['rank']!)),
                title: Text(entry['name']!, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('${entry['badge']}  ${entry['score']} pts'),
                trailing: const Icon(Icons.military_tech_outlined, color: Colors.black26),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildProfile(UserProfile user) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              CircleAvatar(radius: 30, child: Text(user.avatar, style: const TextStyle(fontSize: 24))),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user.username, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text(user.email, style: const TextStyle(color: Colors.black54)),
                ],
              )
            ],
          ),
          const SizedBox(height: 24),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Account summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  Text('Level ${user.level}', style: const TextStyle(color: Colors.black87)),
                  const SizedBox(height: 6),
                  Text('XP ${user.xp}', style: const TextStyle(color: Colors.black87)),
                  const SizedBox(height: 6),
                  Text('Streak ${user.streak} days', style: const TextStyle(color: Colors.black87)),
                  const SizedBox(height: 6),
                  Text('Captured ${user.totalCapturedArea} m²', style: const TextStyle(color: Colors.black87)),
                ],
              ),
            ),
          ),
          const Spacer(),
          FilledButton.tonal(
            onPressed: _signOut,
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Text('Log Out'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserProfile?>(
      future: _userFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final user = snapshot.data;
        if (user == null) {
          return const Scaffold(body: Center(child: Text('Session expired. Please log in again.')));
        }

        final pages = <Widget>[
          _buildHome(user),
          const MapScreen(),
          _buildProfile(user),
        ];

        return Scaffold(
          appBar: AppBar(
            title: const Text('My Territory'),
            centerTitle: true,
          ),
          body: pages[_selectedIndex],
          bottomNavigationBar: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              setState(() {
                _selectedIndex = index;
              });
            },
            destinations: const [
              NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
              NavigationDestination(icon: Icon(Icons.map_outlined), label: 'Map'),
              NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
            ],
          ),
        );
      },
    );
  }
}
