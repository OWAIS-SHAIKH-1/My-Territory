import 'dart:convert';
import 'package:flutter/material.dart';

import '../auth_repository.dart';
import '../data/game_state.dart';
import 'map_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _authRepository = AuthRepository();
  int _selectedIndex = 0;
  String _activeChallengeFilter = "daily";
  String _activeLeaderboardFilter = "local";
  
  final _usernameController = TextEditingController();
  final _chatController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _usernameController.text = GameState().username;
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _chatController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _signOut() async {
    await _authRepository.signOut();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/');
  }

  // --- 1. Dashboard (Home) View ---
  Widget _buildHome(GameState state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Welcome Banner
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome Back, ${state.username}',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                ),
                const SizedBox(height: 4),
                const Text('Payments & Activity Updates', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Zarss Stat Cards
          Row(
            children: [
              Expanded(
                child: _buildZarssCard(
                  color: const Color(0xFFE2ECE9),
                  textColor: const Color(0xFF1A3C33),
                  title: 'Captured Area',
                  value: '${state.totalCapturedArea} m²',
                  pct: '+17%',
                  badgeColor: const Color(0xFFC2D6D0),
                  badgeTextColor: const Color(0xFF244B40),
                  icon: Icons.public_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildZarssCard(
                  color: const Color(0xFFFDF1CC),
                  textColor: const Color(0xFF4B3D16),
                  title: 'Health Score',
                  value: '${state.healthScore}/100',
                  pct: '+23%',
                  badgeColor: const Color(0xFFEED080),
                  badgeTextColor: const Color(0xFF4B3B12),
                  icon: Icons.favorite_border_outlined,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Pro Coach Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFC2C3FC), Color(0xFFA2A6F9)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Terry Pro Coach',
                        style: TextStyle(color: Color(0xFF1E1B5C), fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Get personalized smart routes and goals.',
                        style: TextStyle(color: const Color(0xFF1E1B5C).withOpacity(0.85), fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('AI Pro Coach successfully activated for session!')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF5252D4),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Unlock AI', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                )
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Start Activity CTA
          FilledButton.icon(
            onPressed: () {
              setState(() {
                _selectedIndex = 1; // Switch to Map
              });
              state.startSession();
            },
            icon: const Icon(Icons.play_arrow_rounded, size: 24),
            label: const Text('START ACTIVITY', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
          const SizedBox(height: 24),

          // Zarss Weekly Chart
          _buildWeeklyChart(state),
          const SizedBox(height: 20),

          // Last Actions Logs
          _buildRecentActions(state),
          const SizedBox(height: 20),

          // Daily Quests Preview
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Daily Quests', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              Chip(
                label: Text('3 Active', style: TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w800)),
                backgroundColor: Color(0xFFE2ECE9),
                side: BorderSide.none,
                padding: EdgeInsets.zero,
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildQuestsList(state, isHome: true),
        ],
      ),
    );
  }

  Widget _buildZarssCard({
    required Color color,
    required Color textColor,
    required String title,
    required String value,
    required String pct,
    required Color badgeColor,
    required Color badgeTextColor,
    required IconData icon,
  }) {
    return Container(
      height: 115,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, size: 12, color: textColor.withOpacity(0.8)),
                  const SizedBox(width: 4),
                  Text(title.toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: textColor.withOpacity(0.8))),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: badgeColor, borderRadius: BorderRadius.circular(8)),
                child: Text(pct, style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: badgeTextColor)),
              )
            ],
          ),
          const Spacer(),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: textColor, letterSpacing: -0.5)),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  int _selectedChartBarIndex = 2; // Default Wed active matching web
  Widget _buildWeeklyChart(GameState state) {
    final dailyValues = [
      { 'day': 'Mon', 'pct': 0.40, 'val': '16,240 m²' },
      { 'day': 'Tue', 'pct': 0.65, 'val': '24,575 m²' },
      { 'day': 'Wed', 'pct': 0.82, 'val': '33,567 m²' },
      { 'day': 'Thu', 'pct': 0.30, 'val': '10,120 m²' },
      { 'day': 'Fri', 'pct': 0.55, 'val': '18,450 m²' },
      { 'day': 'Sat', 'pct': 0.75, 'val': '29,800 m²' },
      { 'day': 'Sun', 'pct': (state.healthScore / 100.0), 'val': '${state.totalCapturedArea} m²' },
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 18, offset: const Offset(0, 6))],
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('User in The Last Week', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.black)),
                  const SizedBox(height: 2),
                  Text('+ 3.2% captures', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.blueGrey.shade800)),
                ],
              ),
              const Text('See statistics for all time', style: TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 140,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(dailyValues.length, (index) {
                final dayData = dailyValues[index];
                final isSelected = _selectedChartBarIndex == index;
                final barHeight = dayData['pct'] as double;
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedChartBarIndex = index;
                      });
                    },
                    child: Column(
                      children: [
                        Expanded(
                          child: Stack(
                            alignment: Alignment.bottomCenter,
                            clipBehavior: Clip.none,
                            children: [
                              // Dotted grid line & tooltip
                              if (isSelected) ...[
                                Positioned(
                                  top: -20,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: Colors.black,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(dayData['val'] as String, style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w800)),
                                  ),
                                ),
                                Container(
                                  width: 1,
                                  color: Colors.blue.withOpacity(0.3),
                                ),
                              ],
                              
                              // Bar Container
                              Container(
                                width: 14,
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                alignment: Alignment.bottomCenter,
                                child: FractionallySizedBox(
                                  heightFactor: barHeight,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: isSelected ? Colors.blue : Colors.blueGrey.shade300,
                                      borderRadius: BorderRadius.circular(7),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(dayData['day'] as String, style: const TextStyle(fontSize: 9, color: Colors.black54, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                );
              }),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildRecentActions(GameState state) {
    final List<Map<String, dynamic>> logs = [];
    final userTerrs = state.territories.where((t) => t['owner'] == 'user').toList();
    for (var ut in userTerrs) {
      logs.add({
        'name': 'You (${ut['name']})',
        'value': '${ut['area']} m²',
        'status': (ut['strength'] as int) < 45 ? 'Fading' : 'Healthy',
        'avatar': state.avatar,
        'date': '1 Jun 2026',
        'avatarImage': state.avatarImage
      });
    }

    logs.addAll([
      { 'name': 'David Astee (AI)', 'value': '14,560 m²', 'status': 'Captured', 'avatar': '🦁', 'date': '1 Jun 2026' },
      { 'name': 'Maria Hulama (AI)', 'value': '42,430 m²', 'status': 'Healthy', 'avatar': '🦉', 'date': '31 May 2026' },
      { 'name': 'Arnold Swarz (AI)', 'value': '3,412 m²', 'status': 'Healthy', 'avatar': '⚡', 'date': '30 May 2026' }
    ]);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Last Actions & Logs', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
              Text('View All Logs', style: TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 16),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: logs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final log = logs[index];
              Color chipBg = const Color(0xFFE2ECE9);
              Color chipText = const Color(0xFF244B40);
              if (log['status'] == 'Fading') {
                chipBg = const Color(0xFFFDF1CC);
                chipText = const Color(0xFF5A4C24);
              } else if (log['status'] == 'Captured') {
                chipBg = const Color(0xFFE2ECF7);
                chipText = Colors.blue;
              }
              
              final avatarImg = log['avatarImage'] as String?;
              Widget avatarWidget = Text(log['avatar'] as String, style: const TextStyle(fontSize: 15));
              if (avatarImg != null && avatarImg.isNotEmpty) {
                avatarWidget = ClipOval(child: Image.memory(base64Decode(avatarImg.split(',').last), fit: BoxFit.cover, width: 32, height: 32));
              }

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: Colors.white,
                      child: avatarWidget,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(log['name'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
                    ),
                    Text(log['value'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(color: chipBg, borderRadius: BorderRadius.circular(6)),
                      child: Text((log['status'] as String).toUpperCase(), style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: chipText)),
                    ),
                    const SizedBox(width: 8),
                    Text(log['date'] as String, style: const TextStyle(fontSize: 9, color: Colors.black45, fontWeight: FontWeight.w800)),
                  ],
                ),
              );
            },
          )
        ],
      ),
    );
  }

  // --- 2. Defense Center View ---
  Widget _buildDefense(GameState state) {
    final userTerrs = state.territories.where((t) => t['owner'] == 'user').toList();
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('🛡️ Defense Center', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const Text('Monitor your territories and defend them from time decay simulation.', style: TextStyle(color: Colors.black54, fontSize: 13)),
          const SizedBox(height: 16),

          // Time Machine
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.orange.shade100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('⏳ Time Machine (Demo)', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.w800, fontSize: 14)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(6)),
                      child: const Text('Skip Time', style: TextStyle(color: Colors.deepOrange, fontSize: 8, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text('Skip days into the future to show how territories decay over time.', style: TextStyle(color: Colors.black54, fontSize: 11)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => state.fastForwardTime(1),
                        child: const Text('+1 Day', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => state.fastForwardTime(3),
                        child: const Text('+3 Days', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => state.fastForwardTime(7),
                        child: const Text('+7 Days', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                )
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Decay List
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Territory Health & Decay', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              Text('${userTerrs.length} Active', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.blueGrey)),
            ],
          ),
          const SizedBox(height: 10),
          
          if (userTerrs.isEmpty)
            Center(
              child: Container(
                padding: const EdgeInsets.all(24),
                child: const Column(
                  children: [
                    Text('🗺️', style: TextStyle(fontSize: 32)),
                    SizedBox(height: 8),
                    Text('No territories yet - go capture some on the map!', style: TextStyle(color: Colors.black45)),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: userTerrs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final t = userTerrs[index];
                final strength = t['strength'] as int;
                
                Color progressColor = Colors.green;
                String icon = '🟢';
                if (strength <= 15) {
                  progressColor = Colors.red;
                  icon = '🚨';
                } else if (strength <= 44) {
                  progressColor = Colors.orange;
                  icon = '⚠️';
                } else if (strength <= 74) {
                  progressColor = Colors.amber;
                  icon = '🟡';
                }

                return Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 1,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Text(icon, style: const TextStyle(fontSize: 24)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(t['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                                  Text('$strength%', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: progressColor)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('${t['area']} m²', style: const TextStyle(fontSize: 10, color: Colors.black45)),
                              const SizedBox(height: 6),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: strength / 100.0,
                                  backgroundColor: Colors.grey.shade100,
                                  valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                                  minHeight: 6,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        IconButton.filledTonal(
                          onPressed: () => state.revisitTerritory(t['id'] as String),
                          icon: const Icon(Icons.shield_outlined, size: 18),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // --- 3. Quests & Badges View ---
  Widget _buildQuests(GameState state) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: const TabBar(
              tabs: [
                Tab(text: 'Missions'),
                Tab(text: 'Earned Badges'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                // Tab 1: Missions
                SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ChoiceChip(
                            label: const Text('Daily'),
                            selected: _activeChallengeFilter == 'daily',
                            onSelected: (val) {
                              setState(() {
                                _activeChallengeFilter = 'daily';
                              });
                            },
                          ),
                          const SizedBox(width: 12),
                          ChoiceChip(
                            label: const Text('Weekly'),
                            selected: _activeChallengeFilter == 'weekly',
                            onSelected: (val) {
                              setState(() {
                                _activeChallengeFilter = 'weekly';
                              });
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildQuestsList(state, isHome: false),
                    ],
                  ),
                ),
                
                // Tab 2: Badges
                GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.1,
                  ),
                  itemCount: state.badges.length,
                  itemBuilder: (context, index) {
                    final b = state.badges[index];
                    final isUnlocked = b['unlocked'] as bool;
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isUnlocked ? Colors.white : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: isUnlocked ? Colors.teal.shade100 : Colors.grey.shade200),
                        boxShadow: isUnlocked ? [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)] : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              Text(b['icon'] as String, style: const TextStyle(fontSize: 32)),
                              if (!isUnlocked)
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(color: Colors.black.withOpacity(0.4), shape: BoxShape.circle),
                                  child: const Icon(Icons.lock_outline, color: Colors.white, size: 18),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(b['name'] as String, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: isUnlocked ? Colors.black : Colors.grey)),
                          const SizedBox(height: 2),
                          Text(b['desc'] as String, style: const TextStyle(fontSize: 9, color: Colors.black45), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildQuestsList(GameState state, {required bool isHome}) {
    final list = state.challenges.where((c) {
      if (isHome) return c['type'] == 'daily';
      return c['type'] == _activeChallengeFilter;
    }).toList();

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final q = list[index];
        final completed = q['completed'] as bool;
        final progress = q['progress'] as double;
        final maxVal = q['max'] as double;
        final percent = (progress / maxVal);

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: completed ? const Color(0xFFF3FAF7) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: completed ? const Color(0xFF10B981).withOpacity(0.2) : Colors.grey.shade100),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: Colors.grey.shade50, shape: BoxShape.circle),
                alignment: Alignment.center,
                child: Text(q['badge'] as String, style: const TextStyle(fontSize: 22)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(q['title'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                    if (!isHome) ...[
                      const SizedBox(height: 2),
                      Text(q['desc'] as String, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('+${q['xpReward']} XP', style: const TextStyle(fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.w800)),
                        Text('${progress.toStringAsFixed(1)} / $maxVal ${q['unit']}', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.black45)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                        value: percent,
                        backgroundColor: Colors.grey.shade100,
                        valueColor: AlwaysStoppedAnimation<Color>(completed ? const Color(0xFF10B981) : Colors.blue),
                        minHeight: 5,
                      ),
                    )
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Icon(
                completed ? Icons.check_circle_rounded : Icons.radio_button_off_rounded,
                color: completed ? const Color(0xFF10B981) : Colors.grey.shade300,
              )
            ],
          ),
        );
      },
    );
  }

  // --- 4. Leaderboard View ---
  Widget _buildLeaderboard(GameState state) {
    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ChoiceChip(
                label: const Text('Local Area'),
                selected: _activeLeaderboardFilter == 'local',
                onSelected: (val) {
                  setState(() {
                    _activeLeaderboardFilter = 'local';
                  });
                },
              ),
              const SizedBox(width: 12),
              ChoiceChip(
                label: const Text('College Campus'),
                selected: _activeLeaderboardFilter == 'college',
                onSelected: (val) {
                  setState(() {
                    _activeLeaderboardFilter = 'college';
                  });
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Podium UI
                _buildPodium(state),
                const SizedBox(height: 24),
                
                // Rank List
                const Text('Top Rankings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 10),
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: state.leaderboard.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final item = state.leaderboard[index];
                    final rank = item['rank'] as int;
                    final isUser = item['isUser'] as bool;
                    
                    String medal = rank.toString();
                    if (rank == 1) medal = '🥇';
                    else if (rank == 2) medal = '🥈';
                    else if (rank == 3) medal = '🥉';

                    Widget avatarWidget = Text(item['avatar'] as String, style: const TextStyle(fontSize: 16));
                    if (isUser && state.avatarImage.isNotEmpty) {
                      avatarWidget = ClipOval(child: Image.memory(base64Decode(state.avatarImage.split(',').last), fit: BoxFit.cover, width: 32, height: 32));
                    }

                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: isUser ? const Color(0xFFE2ECF7) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isUser ? Colors.blue.withOpacity(0.2) : Colors.grey.shade100),
                      ),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 24,
                            child: Center(
                              child: Text(medal, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          CircleAvatar(radius: 16, backgroundColor: Colors.grey.shade100, child: avatarWidget),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                                Text('Turf: ${item['size']}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                              ],
                            ),
                          ),
                          Text('${item['score']} XP', style: const TextStyle(fontSize: 12, color: Color(0xFF10B981), fontWeight: FontWeight.w800)),
                        ],
                      ),
                    );
                  },
                )
              ],
            ),
          ),
        )
      ],
    );
  }

  Widget _buildPodium(GameState state) {
    if (state.leaderboard.length < 3) return const SizedBox.shrink();
    // Re-sort mock data
    final copy = List<Map<String, dynamic>>.from(state.leaderboard);
    copy.sort((a, b) => (b['score'] as int).compareTo(a['score'] as int));

    final r1 = copy[0];
    final r2 = copy[1];
    final r3 = copy[2];

    Widget getAvatar(Map<String, dynamic> item) {
      if (item['isUser'] == true && state.avatarImage.isNotEmpty) {
        return ClipOval(child: Image.memory(base64Decode(state.avatarImage.split(',').last), fit: BoxFit.cover, width: 44, height: 44));
      }
      return Text(item['avatar'] as String, style: const TextStyle(fontSize: 22));
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        // Rank 2
        _buildPodiumStep(r2, '2', 100, Colors.grey.shade100, getAvatar(r2)),
        const SizedBox(width: 14),
        // Rank 1
        _buildPodiumStep(r1, '1', 135, const Color(0xFFFDF1CC), getAvatar(r1), isWinner: true),
        const SizedBox(width: 14),
        // Rank 3
        _buildPodiumStep(r3, '3', 85, Colors.grey.shade50, getAvatar(r3)),
      ],
    );
  }

  Widget _buildPodiumStep(Map<String, dynamic> item, String stepNum, double height, Color bgColor, Widget avatarWidget, {bool isWinner = false}) {
    return Container(
      width: 90,
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(16),
          topRight: Radius.circular(16),
          bottomLeft: Radius.circular(10),
          bottomRight: Radius.circular(10),
        ),
        border: Border.all(color: isWinner ? Colors.orange.shade200 : Colors.grey.shade200),
      ),
      child: Column(
        children: [
          if (isWinner)
            const Text('👑', style: TextStyle(fontSize: 14)),
          CircleAvatar(
            radius: 18,
            backgroundColor: Colors.white,
            child: avatarWidget,
          ),
          const SizedBox(height: 4),
          Text(item['name'] as String, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
          Text('${item['score']} XP', style: const TextStyle(fontSize: 8, color: Color(0xFF10B981), fontWeight: FontWeight.w700)),
          const Spacer(),
          Text(stepNum, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: isWinner ? Colors.orange : Colors.grey)),
        ],
      ),
    );
  }

  // --- 5. AI Coach View ---
  Widget _buildCoach(GameState state) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      }
    });

    return Column(
      children: [
        // Coach Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: Colors.white,
          child: Row(
            children: [
              const CircleAvatar(
                backgroundColor: Color(0xFFE2ECE9),
                child: Text('🤖', style: TextStyle(fontSize: 20)),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Terry - AI Coach', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                  Row(
                    children: [
                      Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle)),
                      const SizedBox(width: 4),
                      const Text('Online', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w800)),
                    ],
                  )
                ],
              )
            ],
          ),
        ),
        
        // Chat History Viewport
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: state.chatMessages.length,
            itemBuilder: (context, index) {
              final msg = state.chatMessages[index];
              final isCoach = msg['sender'] == 'coach';
              
              return Align(
                alignment: isCoach ? Alignment.centerLeft : Alignment.centerRight,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                  decoration: BoxDecoration(
                    color: isCoach ? Colors.white : Colors.blue.shade100,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: isCoach ? const Radius.circular(4) : const Radius.circular(16),
                      bottomRight: isCoach ? const Radius.circular(16) : const Radius.circular(4),
                    ),
                    border: isCoach ? Border.all(color: Colors.grey.shade200) : null,
                  ),
                  child: Column(
                    crossAxisAlignment: isCoach ? CrossAxisAlignment.start : CrossAxisAlignment.end,
                    children: [
                      Text(msg['text'] as String, style: const TextStyle(fontSize: 12, color: Colors.black87, height: 1.4)),
                      const SizedBox(height: 4),
                      Text(msg['time'] as String, style: const TextStyle(fontSize: 8, color: Colors.black45)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Quick Prompts Chips
        Container(
          height: 44,
          color: Colors.grey.shade50,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            children: [
              _buildPromptChip(state, 'Analyze performance', 'Analyze my workout consistency'),
              _buildPromptChip(state, 'Goal suggestions', 'Suggest a target for tomorrow'),
              _buildPromptChip(state, 'Check fatigue level', 'Am I overtraining? Check fatigue'),
              _buildPromptChip(state, 'Streak protection', 'How do I get territory protection?'),
            ],
          ),
        ),

        // Chat Input Form
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _chatController,
                  decoration: InputDecoration(
                    hintText: 'Ask Terry about your training...',
                    hintStyle: const TextStyle(fontSize: 12),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    fillColor: Colors.grey.shade50,
                    filled: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: () {
                  final text = _chatController.text.trim();
                  if (text.isNotEmpty) {
                    state.sendCoachMessage(text);
                    _chatController.clear();
                  }
                },
                icon: const Icon(Icons.send_rounded, size: 18),
              )
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPromptChip(GameState state, String label, String prompt) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: ActionChip(
        label: Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
        onPressed: () => state.sendCoachMessage(prompt),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: EdgeInsets.zero,
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }

  // --- 6. Settings (Profile) View ---
  Widget _buildSettings(GameState state) {
    final avatarImg = state.avatarImage;
    Widget avatarWidget = Text(state.avatar, style: const TextStyle(fontSize: 32));
    if (avatarImg.isNotEmpty) {
      avatarWidget = ClipOval(child: Image.memory(base64Decode(avatarImg.split(',').last), fit: BoxFit.cover, width: 84, height: 84));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Profile Card
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            elevation: 1,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 42,
                    backgroundColor: Colors.grey.shade50,
                    child: avatarWidget,
                  ),
                  const SizedBox(height: 12),
                  
                  // Username textbox editor
                  SizedBox(
                    width: 220,
                    child: TextField(
                      controller: _usernameController,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(vertical: 6),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.black12, style: BorderStyle.solid)),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
                      ),
                      onChanged: (val) {
                        if (val.trim().isNotEmpty) {
                          state.username = val.trim();
                          state.saveState();
                        }
                      },
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text('Level ${state.level} Explorer', style: const TextStyle(color: Colors.blueGrey, fontSize: 12, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 16),
                  
                  // Emojis Picker
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: ['🏃‍♂️', '🏃‍♀️', '🦁', '🦉', '⚡'].map((emoji) {
                      final isSel = state.avatar == emoji && state.avatarImage.isEmpty;
                      return GestureDetector(
                        onTap: () {
                          state.avatar = emoji;
                          state.avatarImage = "";
                          state.saveState();
                        },
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: isSel ? Colors.teal.shade50 : Colors.transparent,
                            shape: BoxShape.circle,
                            border: Border.all(color: isSel ? Colors.teal : Colors.transparent),
                          ),
                          child: Text(emoji, style: const TextStyle(fontSize: 18)),
                        ),
                      );
                    }).toList(),
                  )
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Lifetime Stats
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 1,
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Lifetime Achievements', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  _buildStatRow('Total Captured Area', '${state.totalCapturedArea} m²'),
                  const Divider(),
                  _buildStatRow('Weekly Consistency', '94%'),
                  const Divider(),
                  _buildStatRow('Longest Streak', '${state.longestStreak} Days'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Settings Action buttons
          OutlinedButton.icon(
            onPressed: () {
              state.spawnRivals();
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Rival competitor zones successfully spawned nearby!')));
            },
            icon: const Icon(Icons.shuffle_rounded),
            label: const Text('Spawn Competitor Territories', style: TextStyle(fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Reset All Data?'),
                  content: const Text('This will wipe your profile back to Level 1 and delete all captured zones. This cannot be undone.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
                    FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Reset')),
                  ],
                ),
              );
              if (confirm == true) {
                await state.resetData();
                _signOut();
              }
            },
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Reset App Data', style: TextStyle(fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.redAccent,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              side: const BorderSide(color: Colors.redAccent),
            ),
          ),
          const SizedBox(height: 20),
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

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.green)),
        ],
      ),
    );
  }

  // --- Main Build Navigation (Responsive) ---
  @override
  Widget build(BuildContext context) {
    final state = GameState();

    return ListenableBuilder(
      listenable: state,
      builder: (context, _) {
        final MapScreen mapScreen = const MapScreen();
        
        final pages = <Widget>[
          _buildHome(state),
          mapScreen,
          _buildDefense(state),
          _buildQuests(state),
          _buildLeaderboard(state),
          _buildCoach(state),
          _buildSettings(state),
        ];

        return LayoutBuilder(
          builder: (context, constraints) {
            final isLaptopView = constraints.maxWidth >= 768;
            
            Widget scaffold = Scaffold(
              appBar: AppBar(
                title: const Text('My Territory', style: TextStyle(fontWeight: FontWeight.w800)),
                centerTitle: true,
                elevation: 0,
                backgroundColor: Colors.white,
                foregroundColor: Colors.black,
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
                  NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Home'),
                  NavigationDestination(icon: Icon(Icons.map_outlined), label: 'Map'),
                  NavigationDestination(icon: Icon(Icons.shield_outlined), label: 'Defense'),
                  NavigationDestination(icon: Icon(Icons.assignment_outlined), label: 'Quests'),
                  NavigationDestination(icon: Icon(Icons.emoji_events_outlined), label: 'Rank'),
                  NavigationDestination(icon: Icon(Icons.chat_bubble_outline), label: 'Coach'),
                  NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Profile'),
                ],
              ),
            );

            if (isLaptopView) {
              // Laptop/Desktop View: Show centered mobile simulator shell
              return Scaffold(
                backgroundColor: const Color(0xFF0F172A),
                body: Center(
                  child: Container(
                    width: 450,
                    height: MediaQuery.of(context).size.height * 0.95,
                    margin: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.35),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                      border: Border.all(color: Colors.grey.shade800, width: 2),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: scaffold,
                  ),
                ),
              );
            }

            return scaffold;
          },
        );
      },
    );
  }
}
