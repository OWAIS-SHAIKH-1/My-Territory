import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

final dashboardSummary = <Map<String, String>>[
  {'label': 'Territory', 'value': '12 zones', 'hint': 'Explore more'},
  {'label': 'XP', 'value': '720', 'hint': 'Almost level 2'},
  {'label': 'Streak', 'value': '7 days', 'hint': 'Keep moving'},
  {'label': 'Strength', 'value': '82%', 'hint': 'Hold the line'},
];

final challenges = <Map<String, String>>[
  {'title': 'Walk 2 km', 'progress': '80%', 'badge': '🏃‍♂️'},
  {'title': 'Earn 150 XP', 'progress': '40%', 'badge': '⚡'},
  {'title': 'Maintain Territory', 'progress': '0%', 'badge': '🛡️'},
];

final leaderboard = <Map<String, String>>[
  {'rank': '1', 'name': 'TerritoryKing', 'score': '14800', 'badge': '👑'},
  {'rank': '2', 'name': 'AlphaRunner', 'score': '12500', 'badge': '🚀'},
  {'rank': '3', 'name': 'Smarty', 'score': '7800', 'badge': '🏆'},
];

final territories = <Map<String, dynamic>>[
  {
    'name': 'Home Base',
    'color': const Color(0xFF10B981),
    'points': [
      LatLng(37.4265, -122.1712),
      LatLng(37.4269, -122.1712),
      LatLng(37.4269, -122.1705),
      LatLng(37.4265, -122.1705),
    ],
    'center': LatLng(37.4267, -122.17085),
  },
  {
    'name': 'Alpha Kingdom',
    'color': const Color(0xFF8B5CF6),
    'points': [
      LatLng(37.4285, -122.1690),
      LatLng(37.4290, -122.1690),
      LatLng(37.4290, -122.1680),
      LatLng(37.4285, -122.1680),
    ],
    'center': LatLng(37.42875, -122.1685),
  },
  {
    'name': 'Beta Outpost',
    'color': const Color(0xFFEC4899),
    'points': [
      LatLng(37.4258, -122.1698),
      LatLng(37.4262, -122.1698),
      LatLng(37.4262, -122.1690),
      LatLng(37.4258, -122.1690),
    ],
    'center': LatLng(37.4260, -122.1694),
  },
];
