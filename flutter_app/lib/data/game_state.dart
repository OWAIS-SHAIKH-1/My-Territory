import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';

class GameState extends ChangeNotifier {
  static final GameState _instance = GameState._internal();
  factory GameState() => _instance;
  GameState._internal();

  // --- State Variables ---
  String username = "Smarty";
  String email = "runner@myterritory.com";
  String phone = "";
  String avatar = "🏃‍♂️";
  String avatarImage = ""; // Base64 profile photo

  int level = 12;
  int xp = 700;
  int xpMax = 1000;
  int streak = 7;
  int longestStreak = 18;
  int healthScore = 82;
  int totalCapturedArea = 24500;

  bool isLoggedIn = false;
  String trackingMode = "sim"; // sim vs device
  String speedMode = "walk"; // walk vs run

  List<Map<String, dynamic>> territories = [];
  List<Map<String, dynamic>> challenges = [];
  List<Map<String, dynamic>> leaderboard = [];
  List<Map<String, dynamic>> badges = [];
  List<Map<String, String>> chatMessages = [];

  // --- Tracking Session Variables ---
  bool isTracking = false;
  DateTime? trackingStartTime;
  List<LatLng> simulatedPath = [];
  double sessionDistanceKm = 0.0;
  double sessionSpeedKmH = 0.0;
  double sessionPeakSpeedKmH = 0.0;
  double maxSessionDistFromStart = 0.0;
  int sessionDurationSeconds = 0;
  LatLng userPos = LatLng(37.4270, -122.1700);

  // --- Actions & Methods ---
  Future<void> init() async {
    await loadState();
  }

  Future<void> loadState() async {
    final prefs = await SharedPreferences.getInstance();
    
    // Check if user is logged in
    isLoggedIn = prefs.getBool('my_territory_logged_in') ?? true;
    
    // Load User info if registered
    final userJson = prefs.getString('my_territory_user');
    if (userJson != null) {
      try {
        final u = jsonDecode(userJson) as Map<String, dynamic>;
        username = u['username'] ?? username;
        email = u['email'] ?? email;
        phone = u['phone'] ?? phone;
        avatar = u['avatar'] ?? avatar;
        avatarImage = u['avatarImage'] ?? avatarImage;
        level = u['level'] ?? level;
        xp = u['xp'] ?? xp;
        xpMax = 1000 + (level - 1) * 200;
        streak = u['streak'] ?? streak;
        totalCapturedArea = u['totalCapturedArea'] ?? totalCapturedArea;
      } catch (e) {
        debugPrint("Error loading user json: $e");
      }
    }

    final stateJson = prefs.getString('my_territory_game_state_v1');
    if (stateJson != null) {
      try {
        final data = jsonDecode(stateJson) as Map<String, dynamic>;
        longestStreak = data['longestStreak'] ?? 18;
        healthScore = data['healthScore'] ?? 82;
        
        // Load territories
        if (data['territories'] != null) {
          territories = List<Map<String, dynamic>>.from(
            (data['territories'] as List).map((t) => Map<String, dynamic>.from(t as Map)),
          );
        }
        
        // Load challenges
        if (data['challenges'] != null) {
          challenges = List<Map<String, dynamic>>.from(
            (data['challenges'] as List).map((c) => Map<String, dynamic>.from(c as Map)),
          );
        }
        
        // Load leaderboard
        if (data['leaderboard'] != null) {
          leaderboard = List<Map<String, dynamic>>.from(
            (data['leaderboard'] as List).map((l) => Map<String, dynamic>.from(l as Map)),
          );
        }
        
        // Load badges
        if (data['badges'] != null) {
          badges = List<Map<String, dynamic>>.from(
            (data['badges'] as List).map((b) => Map<String, dynamic>.from(b as Map)),
          );
        }
        
        // Load chat messages
        if (data['chatMessages'] != null) {
          chatMessages = List<Map<String, String>>.from(
            (data['chatMessages'] as List).map((m) => Map<String, String>.from(m as Map)),
          );
        }
      } catch (e) {
        debugPrint("Error parsing game state json, resetting to defaults: $e");
        _loadDefaults();
      }
    } else {
      _loadDefaults();
    }
    
    _syncLeaderboardUser();
    notifyListeners();
  }

  void _loadDefaults() {
    // Standard starting territories
    territories = [
      {
        'id': 'zone-park',
        'owner': 'zone',
        'name': 'Stanford Oval Green',
        'strength': 100,
        'points': [
          [37.4276, -122.1706],
          [37.4282, -122.1702],
          [37.4280, -122.1694],
          [37.4274, -122.1697]
        ],
        'area': 14000
      },
      {
        'id': 'user-t1',
        'owner': 'user',
        'name': 'Home Base',
        'strength': 90,
        'points': [
          [37.4265, -122.1712],
          [37.4269, -122.1712],
          [37.4269, -122.1705],
          [37.4265, -122.1705]
        ],
        'area': 24500
      },
      {
        'id': 'ai-alpha-t1',
        'owner': 'alpha',
        'name': 'Alpha Kingdom',
        'strength': 70,
        'points': [
          [37.4285, -122.1690],
          [37.4290, -122.1690],
          [37.4290, -122.1680],
          [37.4285, -122.1680]
        ],
        'area': 25000
      },
      {
        'id': 'ai-beta-t1',
        'owner': 'beta',
        'name': 'Beta Outpost',
        'strength': 35,
        'points': [
          [37.4258, -122.1698],
          [37.4262, -122.1698],
          [37.4262, -122.1690],
          [37.4258, -122.1690]
        ],
        'area': 16000
      }
    ];

    // Standard starting challenges
    challenges = [
      { 'id': 'c1', 'title': 'Walk 2 km', 'desc': 'Track movement to complete', 'xpReward': 100, 'progress': 0.8, 'max': 2.0, 'unit': 'km', 'type': 'daily', 'completed': false, 'badge': '🏃‍♂️' },
      { 'id': 'c2', 'title': 'Earn 150 XP', 'desc': 'Gain XP from capturing zones', 'xpReward': 50, 'progress': 50.0, 'max': 150.0, 'unit': 'XP', 'type': 'daily', 'completed': false, 'badge': '⚡' },
      { 'id': 'c3', 'title': 'Maintain Territory', 'desc': 'Revisit and boost your Home Base', 'xpReward': 70, 'progress': 0.0, 'max': 1.0, 'unit': 'revisit', 'type': 'daily', 'completed': false, 'badge': '🛡️' },
      { 'id': 'c4', 'title': 'Weekend Warrior', 'desc': 'Capture 3 separate regions', 'xpReward': 300, 'progress': 1.0, 'max': 3.0, 'unit': 'captures', 'type': 'weekly', 'completed': false, 'badge': '👑' },
      { 'id': 'c5', 'title': 'Decay Defender', 'desc': 'Boost a decaying zone (below 50% strength)', 'xpReward': 150, 'progress': 0.0, 'max': 1.0, 'unit': 'defend', 'type': 'weekly', 'completed': false, 'badge': '🔥' }
    ];

    // Standard leaderboard
    leaderboard = [
      { 'rank': 1, 'name': 'TerritoryKing', 'avatar': '👑🏃‍♂️', 'score': 14800, 'size': '95,000m²', 'isUser': false },
      { 'rank': 2, 'name': 'AlphaRunner', 'avatar': '🏃‍♀️', 'score': 12500, 'size': '84,300m²', 'isUser': false },
      { 'rank': 3, 'name': 'BetaRunner', 'avatar': '🚴‍♂️', 'score': 9200, 'size': '62,100m²', 'isUser': false },
      { 'rank': 4, 'name': 'Smarty', 'avatar': '🏃‍♂️', 'score': 7800, 'size': '24,500m²', 'isUser': true },
      { 'rank': 5, 'name': 'JoggerMax', 'avatar': '🦁', 'score': 6200, 'size': '18,400m²', 'isUser': false }
    ];

    // Standard badges
    badges = [
      { 'id': 'b1', 'name': 'First Claim', 'icon': '🗺️', 'unlocked': true, 'desc': 'Captured your first territory.' },
      { 'id': 'b2', 'name': 'Week Streak', 'icon': '🔥', 'unlocked': true, 'desc': 'Maintained a 7-day walking streak.' },
      { 'id': 'b3', 'name': 'Defender', 'icon': '🛡️', 'unlocked': false, 'desc': 'Revisited a territory to boost strength.' },
      { 'id': 'b4', 'name': 'Legendary Walk', 'icon': '👑', 'unlocked': false, 'desc': 'Walked a total of 50 km.' }
    ];

    // Standard AI coach chat messages
    chatMessages = [
      { 'sender': 'coach', 'text': 'Hello there, Runner! I am **Terry**, your personal AI fitness coach. I analyze your activity consistency, territory sizes, and recovery levels.', 'time': '18:00' },
      { 'sender': 'coach', 'text': 'Based on your logs, you have been highly active in the park. You completed **3.5 km** today and improved your area coverage by **12%** compared to last week. Ready for a recommendation?', 'time': '18:01' }
    ];
  }

  Future<void> saveState() async {
    final prefs = await SharedPreferences.getInstance();
    
    // Save User profile info
    final u = {
      'username': username,
      'email': email,
      'phone': phone,
      'avatar': avatar,
      'avatarImage': avatarImage,
      'level': level,
      'xp': xp,
      'streak': streak,
      'totalCapturedArea': totalCapturedArea,
    };
    await prefs.setString('my_territory_user', jsonEncode(u));

    // Save game state variables
    final state = {
      'longestStreak': longestStreak,
      'healthScore': healthScore,
      'territories': territories,
      'challenges': challenges,
      'leaderboard': leaderboard,
      'badges': badges,
      'chatMessages': chatMessages
    };
    await prefs.setString('my_territory_game_state_v1', jsonEncode(state));
  }

  void _syncLeaderboardUser() {
    final userRankIndex = leaderboard.indexWhere((l) => l['isUser'] == true);
    if (userRankIndex != -1) {
      leaderboard[userRankIndex]['name'] = username;
      leaderboard[userRankIndex]['avatar'] = avatarImage.isNotEmpty ? '🖼️' : avatar;
      leaderboard[userRankIndex]['score'] = level * 1000 + xp;
      leaderboard[userRankIndex]['size'] = '${totalCapturedArea.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}m²';
    }
  }

  // --- XP Level Logic ---
  void addXP(int amount) {
    xp += amount;
    
    // c2: earn 150 xp
    final c2 = challenges.firstWhere((c) => c['id'] == 'c2');
    if (!c2['completed']) {
      c2['progress'] = min(c2['max'] as double, (c2['progress'] as double) + amount);
      _checkChallengeCompletion(c2);
    }

    if (xp >= xpMax) {
      xp -= xpMax;
      level++;
      xpMax = 1000 + (level - 1) * 200;
      // Triggers UI level up dialog check
    }
    _syncLeaderboardUser();
    saveState();
    notifyListeners();
  }

  void _checkChallengeCompletion(Map<String, dynamic> challenge) {
    if (!challenge['completed'] && challenge['progress'] >= challenge['max']) {
      challenge['completed'] = true;
      addXP(challenge['xpReward'] as int);
      
      // b3: defender badge unlocks on maintain territory
      if (challenge['id'] == 'c3') {
        final b3 = badges.firstWhere((b) => b['id'] == 'b3');
        if (!b3['unlocked']) {
          b3['unlocked'] = true;
        }
      }
    }
  }

  // --- Game Actions ---
  void revisitTerritory(String id) {
    final tIndex = territories.indexWhere((t) => t['id'] == id);
    if (tIndex != -1) {
      final t = territories[tIndex];
      if (t['owner'] != 'user') return;
      
      final oldStrength = t['strength'] as int;
      t['strength'] = min(100, oldStrength + 20);

      // c3: maintain territory
      final c3 = challenges.firstWhere((c) => c['id'] == 'c3');
      if (!c3['completed']) {
        c3['progress'] = 1.0;
        _checkChallengeCompletion(c3);
      }

      // c5: decay defender (boost below 50%)
      final c5 = challenges.firstWhere((c) => c['id'] == 'c5');
      if (!c5['completed'] && oldStrength < 50) {
        c5['progress'] = 1.0;
        _checkChallengeCompletion(c5);
      }

      addXP(30);
      saveState();
      notifyListeners();
    }
  }

  void fastForwardTime(int days) {
    final userTerrs = territories.where((t) => t['owner'] == 'user').toList();
    if (userTerrs.isEmpty) return;

    for (var t in userTerrs) {
      final decay = days * 15;
      final oldS = t['strength'] as int;
      t['strength'] = max(0, oldS - decay);

      if (t['strength'] == 0 && oldS > 0) {
        t['owner'] = 'neutral';
        final lostArea = t['area'] as int? ?? 12000;
        totalCapturedArea = max(0, totalCapturedArea - lostArea);
      } else if (t['strength'] <= 30 && oldS > 30) {
        // Warning threshold reached
      }
    }

    // Sync health score based on average strength
    final userT = territories.where((t) => t['owner'] == 'user');
    if (userT.isNotEmpty) {
      healthScore = (userT.map((t) => t['strength'] as int).reduce((a, b) => a + b) / userT.length).round();
    } else {
      healthScore = 0;
    }

    _syncLeaderboardUser();
    saveState();
    notifyListeners();
  }

  // --- Map Tracing Capture Session Logic ---
  void startSession() {
    isTracking = true;
    trackingStartTime = DateTime.now();
    simulatedPath = [userPos];
    sessionDistanceKm = 0.0;
    sessionSpeedKmH = speedMode == "walk" ? 5.0 : 15.0;
    sessionPeakSpeedKmH = sessionSpeedKmH;
    maxSessionDistFromStart = 0.0;
    sessionDurationSeconds = 0;
    notifyListeners();
  }

  void moveAvatar(double latOffset, double lngOffset) {
    if (!isTracking) return;

    final factor = speedMode == "walk" ? 1.0 : 2.5;
    final lat = userPos.latitude + latOffset * factor;
    final lng = userPos.longitude + lngOffset * factor;
    
    userPos = LatLng(lat, lng);
    simulatedPath.add(userPos);

    // Calculate distance
    const distance = Distance();
    double distM = 0;
    for (int i = 1; i < simulatedPath.length; i++) {
      distM += distance.as(LengthUnit.Meter, simulatedPath[i - 1], simulatedPath[i]);
    }
    sessionDistanceKm = distM / 1000.0;

    // Update daily challenge c1 progress
    final c1 = challenges.firstWhere((c) => c['id'] == 'c1');
    if (!c1['completed']) {
      c1['progress'] = min(c1['max'] as double, 0.8 + sessionDistanceKm);
      _checkChallengeCompletion(c1);
    }

    // Calc live distance from start to check loop closure
    final distFromStart = distance.as(LengthUnit.Meter, simulatedPath.first, userPos);
    if (distFromStart > maxSessionDistFromStart) {
      maxSessionDistFromStart = distFromStart;
    }

    notifyListeners();
  }

  // Live Area estimation (Shoelace algorithm)
  double getLiveEstArea() {
    if (simulatedPath.length < 3) return 0.0;
    
    final origin = simulatedPath.first;
    final x = <double>[];
    final y = <double>[];

    for (var coord in simulatedPath) {
      final dx = (coord.longitude - origin.longitude) * 111300.0 * cos(origin.latitude * pi / 180.0);
      final dy = (coord.latitude - origin.latitude) * 111300.0;
      x.add(dx);
      y.add(dy);
    }

    // Add closure point
    x.add(x.first);
    y.add(y.first);

    double sum1 = 0.0;
    double sum2 = 0.0;
    for (int i = 0; i < x.length - 1; i++) {
      sum1 += x[i] * y[i + 1];
      sum2 += y[i] * x[i + 1];
    }
    return (sum1 - sum2).abs() * 0.5;
  }

  bool checkLoopClosure() {
    if (!isTracking || simulatedPath.length < 15) return false;
    if (maxSessionDistFromStart < 20.0) return false; // must travel at least 20m from start

    const distance = Distance();
    
    // Check closure against start coordinates (indices 0 to 5)
    for (int i = 0; i < min(6, simulatedPath.length - 10); i++) {
      final dist = distance.as(LengthUnit.Meter, userPos, simulatedPath[i]);
      if (dist < 15.0) { // closed loop
        simulatedPath.add(simulatedPath[i]);
        completeCapture();
        return true;
      }
    }
    return false;
  }

  void completeCapture() {
    if (!isTracking) return;
    isTracking = false;

    final estArea = getLiveEstArea().round();
    if (estArea > 100) {
      if (sessionPeakSpeedKmH > 30.0) {
        // Suspended for speed cheat
        chatMessages.add({
          'sender': 'coach',
          'text': '❌ **Cheat Detected!** Peak speed was ${sessionPeakSpeedKmH.toStringAsFixed(1)} km/h. Capture suspended.',
          'time': DateTime.now().toLocal().toString().substring(11, 16)
        });
      } else {
        final newId = 'user-capture-${DateTime.now().millisecondsSinceEpoch}';
        final newName = 'Sector ${territories.length + 1}';

        // Add to territories list
        final points = simulatedPath.map((p) => [p.latitude, p.longitude]).toList();
        territories.add({
          'id': newId,
          'owner': 'user',
          'name': newName,
          'strength': 100,
          'points': points,
          'area': estArea
        });

        totalCapturedArea += estArea;
        
        // c4 weekly captures update
        final c4 = challenges.firstWhere((c) => c['id'] == 'c4');
        if (!c4['completed']) {
          c4['progress'] = min(c4['max'] as double, (c4['progress'] as double) + 1.0);
          _checkChallengeCompletion(c4);
        }

        // b1 first claim badge
        final b1 = badges.firstWhere((b) => b['id'] == 'b1');
        if (!b1['unlocked']) {
          b1['unlocked'] = true;
        }

        addXP(50 + (estArea / 500).floor());
      }
    }

    simulatedPath.clear();
    _syncLeaderboardUser();
    saveState();
    notifyListeners();
  }

  void stopSession() {
    isTracking = false;
    simulatedPath.clear();
    saveState();
    notifyListeners();
  }

  // --- AI Coach Chat replies ---
  void sendCoachMessage(String text) {
    if (text.trim().isEmpty) return;
    final timeStr = DateTime.now().toLocal().toString().substring(11, 16);
    chatMessages.add({
      'sender': 'user',
      'text': text,
      'time': timeStr
    });
    
    notifyListeners();

    // Simulated response delay
    Future.delayed(const Duration(milliseconds: 800), () {
      final lower = text.toLowerCase();
      String reply = "I analyze your logs, consistency, and active streaks. Walking at this time keeps your metabolism active! What training recommendation do you need today?";

      if (lower.contains("analyze") || lower.contains("performance") || lower.contains("workout")) {
        reply = "📊 **Consistency Report**: You matches your weekly average. You completed active captures and defended Home Base. Fatigue status is **Low**. Excellent rhythm!";
      } else if (lower.contains("goal") || lower.contains("suggest") || lower.contains("tomorrow")) {
        reply = "🎯 **Tomorrow's Goal**: Let's challenge ourselves. Walk **2.5 km** at the Stanford Oval and complete a full loop to expand your territory boundaries. This will secure you +100 XP!";
      } else if (lower.contains("overtrain") || lower.contains("fatigue") || lower.contains("recovery")) {
        reply = "🛡️ **Overtraining Check**: Your health consistency is stable. You completed workouts consecutively. You are not overtraining, but I suggest focusing on short, low-intensity walks tomorrow to recover.";
      } else if (lower.contains("streak") || lower.contains("protection") || lower.contains("shield")) {
        reply = "🔥 **Streak Protection**: Maintain active logs daily (minimum 100m walks or captures) to secure your streak rewards. At day 10, you unlock a **Territory Shield** which slows down decay by 50%!";
      }

      chatMessages.add({
        'sender': 'coach',
        'text': reply,
        'time': DateTime.now().toLocal().toString().substring(11, 16)
      });
      notifyListeners();
      saveState();
    });
  }

  // --- Rivals and Resets ---
  void spawnRivals() {
    final center = userPos;
    final colors = ['alpha', 'beta'];
    final r = Random();

    for (int i = 0; i < 3; i++) {
      final owner = colors[r.nextInt(2)];
      final ox = (r.nextDouble() - 0.5) * 0.003;
      final oy = (r.nextDouble() - 0.5) * 0.003;

      final pts = [
        [center.latitude + ox - 0.0003, center.longitude + oy - 0.0004],
        [center.latitude + ox + 0.0003, center.longitude + oy - 0.0004],
        [center.latitude + ox + 0.0003, center.longitude + oy + 0.0004],
        [center.latitude + ox - 0.0003, center.longitude + oy + 0.0004]
      ];

      territories.add({
        'id': 'spawn-ai-${DateTime.now().millisecondsSinceEpoch}-$i',
        'owner': owner,
        'name': 'Spawn Sector ${i + 1}',
        'strength': 50 + r.nextInt(50),
        'points': pts,
        'area': 12000
      });
    }

    saveState();
    notifyListeners();
  }

  Future<void> resetData() async {
    final prefs = await SharedPreferences.getInstance();
    
    // Wipe profile
    username = "";
    level = 1;
    xp = 0;
    xpMax = 1000;
    streak = 0;
    longestStreak = 0;
    healthScore = 0;
    totalCapturedArea = 0;
    avatar = "🏃‍♂️";
    avatarImage = "";
    isLoggedIn = false;

    // Reset models
    _loadDefaults();
    
    await prefs.remove('my_territory_logged_in');
    await prefs.remove('my_territory_user');
    await prefs.remove('my_territory_game_state_v1');
    await prefs.remove('my_territory_pending_otp');
    await prefs.remove('my_territory_password_hash');
    
    notifyListeners();
  }
}
