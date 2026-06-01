import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../data/game_state.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  final FocusNode _focusNode = FocusNode();
  Timer? _timer;
  StreamSubscription<Position>? _gpsSubscription;

  @override
  void initState() {
    super.initState();
    _startTimer();
    
    // Auto request keyboard focus for simulator controls
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _stopGpsTracking();
    _focusNode.dispose();
    _mapController.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final state = GameState();
      if (state.isTracking) {
        setState(() {
          state.sessionDurationSeconds++;
        });

        // Simulated drift / movement in simulator mode
        if (state.trackingMode == "sim" && Random().nextDouble() > 0.8) {
          state.moveAvatar(
            (Random().nextDouble() - 0.5) * 0.00002,
            (Random().nextDouble() - 0.5) * 0.00002,
          );
        }
        
        state.checkLoopClosure();
      }
    });
  }

  // --- Real Device GPS Geolocation ---
  Future<void> _startGpsTracking() async {
    final state = GameState();
    
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showToast('Location services are disabled. Using Simulator.');
      state.trackingMode = 'sim';
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _showToast('Location permissions are denied. Using Simulator.');
        state.trackingMode = 'sim';
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      _showToast('Permissions permanently denied. Using Simulator.');
      state.trackingMode = 'sim';
      return;
    }

    _showToast('📡 GPS Signal active. Calibrating...');

    _gpsSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 2,
      ),
    ).listen((Position position) {
      if (state.trackingMode != 'device') return;

      final latLng = LatLng(position.latitude, position.longitude);
      
      setState(() {
        state.userPos = latLng;
        _mapController.move(latLng, _mapController.camera.zoom);

        if (state.isTracking) {
          state.simulatedPath.add(latLng);
          
          // Speed conversion m/s to km/h
          final speed = position.speed * 3.6;
          state.sessionSpeedKmH = speed;
          if (speed > state.sessionPeakSpeedKmH) {
            state.sessionPeakSpeedKmH = speed;
          }
          
          state.checkLoopClosure();
        }
      });
    }, onError: (e) {
      _showToast('GPS Error: $e. Falling back.');
      state.trackingMode = 'sim';
    });
  }

  void _stopGpsTracking() {
    _gpsSubscription?.cancel();
    _gpsSubscription = null;
  }

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      duration: const Duration(seconds: 3),
    ));
  }

  List<LatLng> _pointsToLatLng(List<dynamic> points) {
    return points.map((p) {
      if (p is LatLng) return p;
      final list = p as List<dynamic>;
      return LatLng(list[0] as double, list[1] as double);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = GameState();

    return ListenableBuilder(
      listenable: state,
      builder: (context, _) {
        // Build territories layer
        final polygons = state.territories.map((terr) {
          Color color = Colors.grey;
          double fillOpacity = 0.2;
          
          if (terr['owner'] == 'user') {
            color = const Color(0xFF3B82F6);
            fillOpacity = (terr['strength'] as int) / 200.0;
          } else if (terr['owner'] == 'alpha') {
            color = const Color(0xFFA855F7);
            fillOpacity = (terr['strength'] as int) / 200.0;
          } else if (terr['owner'] == 'beta') {
            color = const Color(0xFFEC4899);
            fillOpacity = (terr['strength'] as int) / 200.0;
          } else if (terr['owner'] == 'zone') {
            color = const Color(0xFF10B981);
            fillOpacity = 0.35;
          }

          final pts = _pointsToLatLng(terr['points'] as List<dynamic>);

          return Polygon(
            points: pts,
            color: color.withOpacity(fillOpacity),
            borderStrokeWidth: terr['owner'] == 'user' ? 3.0 : 2.0,
            borderColor: color,
          );
        }).toList();

        // Build active polyline path drawing
        final polylines = <Polyline>[];
        if (state.isTracking && state.simulatedPath.isNotEmpty) {
          polylines.add(
            Polyline(
              points: state.simulatedPath,
              color: const Color(0xFFFBBF24),
              strokeWidth: 5.0,
              strokeCap: StrokeCap.round,
              strokeJoin: StrokeJoin.round,
            ),
          );
        }

        // Build custom marker for User avatar
        final markers = <Marker>[];
        
        Widget avatarWidget = Text(state.avatar, style: const TextStyle(fontSize: 22));
        if (state.avatarImage.isNotEmpty) {
          avatarWidget = ClipOval(
            child: Image.memory(
              base64Decode(state.avatarImage.split(',').last),
              fit: BoxFit.cover,
              width: 32,
              height: 32,
            ),
          );
        }

        markers.add(
          Marker(
            point: state.userPos,
            width: 44,
            height: 44,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Pulsing Halo
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6).withOpacity(0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF3B82F6), width: 1.5),
                  ),
                ),
                // Emoji / Image Avatar
                CircleAvatar(
                  radius: 16,
                  backgroundColor: Colors.white,
                  child: avatarWidget,
                ),
              ],
            ),
          ),
        );

        // Format Duration clock text
        final mins = (state.sessionDurationSeconds ~/ 60).toString().padLeft(2, '0');
        final secs = (state.sessionDurationSeconds % 60).toString().padLeft(2, '0');
        final durationStr = '$mins:$secs';

        return KeyboardListener(
          focusNode: _focusNode,
          onKeyEvent: (KeyEvent event) {
            if (state.trackingMode != "sim") return;
            if (event is KeyDownEvent) {
              final key = event.logicalKey;
              if (key == LogicalKeyboardKey.arrowUp) {
                state.moveAvatar(0.00005, 0);
              } else if (key == LogicalKeyboardKey.arrowDown) {
                state.moveAvatar(-0.00005, 0);
              } else if (key == LogicalKeyboardKey.arrowLeft) {
                state.moveAvatar(0, -0.00006);
              } else if (key == LogicalKeyboardKey.arrowRight) {
                state.moveAvatar(0, 0.00006);
              }
            }
          },
          child: Scaffold(
            body: Stack(
              children: [
                // Flutter Map Tile View
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: state.userPos,
                    initialZoom: 16,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                      subdomains: const ['a', 'b', 'c', 'd'],
                    ),
                    PolygonLayer(polygons: polygons),
                    PolylineLayer(polylines: polylines),
                    MarkerLayer(markers: markers),
                  ],
                ),

                // Floating Legend
                Positioned(
                  top: 12,
                  right: 12,
                  child: Card(
                    color: const Color(0xFF1F2937).withOpacity(0.9),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLegendItem(const Color(0xFF3B82F6), 'You'),
                          const SizedBox(height: 4),
                          _buildLegendItem(const Color(0xFFA855F7), 'Alpha (AI)'),
                          const SizedBox(height: 4),
                          _buildLegendItem(const Color(0xFFEC4899), 'Beta (AI)'),
                          const SizedBox(height: 4),
                          _buildLegendItem(const Color(0xFF10B981), 'Park Zone'),
                        ],
                      ),
                    ),
                  ),
                ),

                // Map Simulator HUD Controls
                Positioned(
                  left: 12,
                  right: 12,
                  bottom: 12,
                  child: Card(
                    color: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    elevation: 8,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Tracking Mode Toggles
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Tracking Mode:', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                              Row(
                                children: [
                                  ChoiceChip(
                                    label: const Text('🎮 Sim', style: TextStyle(fontSize: 10)),
                                    selected: state.trackingMode == 'sim',
                                    onSelected: (val) {
                                      if (val) {
                                        setState(() {
                                          state.trackingMode = 'sim';
                                          _stopGpsTracking();
                                        });
                                      }
                                    },
                                  ),
                                  const SizedBox(width: 6),
                                  ChoiceChip(
                                    label: const Text('📡 Device GPS', style: TextStyle(fontSize: 10)),
                                    selected: state.trackingMode == 'device',
                                    onSelected: (val) {
                                      if (val) {
                                        setState(() {
                                          state.trackingMode = 'device';
                                          _startGpsTracking();
                                        });
                                      }
                                    },
                                  ),
                                ],
                              )
                            ],
                          ),
                          const Divider(height: 12),

                          // Live HUD Stats
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildHudStat('${state.sessionDistanceKm.toStringAsFixed(2)} km', 'Distance'),
                              _buildHudStat(durationStr, 'Duration'),
                              _buildHudStat('${state.getLiveEstArea().round()} m²', 'Est. Area'),
                              _buildHudStat('${state.sessionSpeedKmH.toStringAsFixed(1)} km/h', 'Speed'),
                            ],
                          ),
                          const Divider(height: 12),

                          // Simulator Controls (Keypad + Speed selector)
                          if (state.trackingMode == 'sim') ...[
                            // Helper Instructions
                            const Center(
                              child: Text(
                                'Move avatar with Keyboard Arrows or D-Pad buttons.',
                                style: TextStyle(fontSize: 10, color: Colors.blueGrey),
                              ),
                            ),
                            const SizedBox(height: 10),

                            // Keypad D-Pad Row 1
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                _buildDpadKey(Icons.keyboard_arrow_up, () => state.moveAvatar(0.00005, 0)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            // Keypad D-Pad Row 2
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                _buildDpadKey(Icons.keyboard_arrow_left, () => state.moveAvatar(0, -0.00006)),
                                const SizedBox(width: 4),
                                _buildDpadKey(
                                  Icons.location_searching_rounded,
                                  () {
                                    if (state.isTracking && state.simulatedPath.length > 2) {
                                      state.simulatedPath.add(state.simulatedPath.first);
                                      state.completeCapture();
                                      _showToast('Manual loop closed!');
                                    }
                                  },
                                  isPinButton: true,
                                ),
                                const SizedBox(width: 4),
                                _buildDpadKey(Icons.keyboard_arrow_right, () => state.moveAvatar(0, 0.00006)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            // Keypad D-Pad Row 3
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                _buildDpadKey(Icons.keyboard_arrow_down, () => state.moveAvatar(-0.00005, 0)),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Sim Speed controls
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text('Sim Speed:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                const SizedBox(width: 10),
                                ChoiceChip(
                                  label: const Text('🚶 Walk (5 km/h)', style: TextStyle(fontSize: 9)),
                                  selected: state.speedMode == 'walk',
                                  onSelected: (val) {
                                    if (val) {
                                      setState(() {
                                        state.speedMode = 'walk';
                                        state.sessionSpeedKmH = 5.0;
                                      });
                                    }
                                  },
                                ),
                                const SizedBox(width: 6),
                                ChoiceChip(
                                  label: const Text('🏃 Run (15 km/h)', style: TextStyle(fontSize: 9)),
                                  selected: state.speedMode == 'run',
                                  onSelected: (val) {
                                    if (val) {
                                      setState(() {
                                        state.speedMode = 'run';
                                        state.sessionSpeedKmH = 15.0;
                                      });
                                    }
                                  },
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 12),

                          // Primary Action Controls (Start / Stop)
                          Row(
                            children: [
                              if (state.isTracking) ...[
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () {
                                      state.stopSession();
                                      _showToast('Session cancelled.');
                                    },
                                    icon: const Icon(Icons.cancel_outlined, size: 16),
                                    label: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700)),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: FilledButton.icon(
                                    onPressed: () {
                                      state.completeCapture();
                                      _showToast('Session saved!');
                                    },
                                    icon: const Icon(Icons.stop_rounded, size: 16),
                                    label: const Text('Stop & Save', style: TextStyle(fontWeight: FontWeight.w700)),
                                    style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
                                  ),
                                ),
                              ] else ...[
                                Expanded(
                                  child: FilledButton.icon(
                                    onPressed: () {
                                      state.startSession();
                                      _focusNode.requestFocus(); // Grab keyboard arrows
                                      _showToast('Tracking session started!');
                                    },
                                    icon: const Icon(Icons.play_arrow_rounded, size: 16),
                                    label: const Text('Start Capture', style: TextStyle(fontWeight: FontWeight.w800)),
                                    style: FilledButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                                  ),
                                ),
                              ]
                            ],
                          )
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildLegendItem(Color color, String name) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
        ),
        const SizedBox(width: 6),
        Text(name, style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w800)),
      ],
    );
  }

  Widget _buildHudStat(String value, String label) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF10B981))),
        const SizedBox(height: 2),
        Text(label.toUpperCase(), style: const TextStyle(fontSize: 8, color: Colors.black45, fontWeight: FontWeight.w800)),
      ],
    );
  }

  Widget _buildDpadKey(IconData icon, VoidCallback onTap, {bool isPinButton = false}) {
    return GestureDetector(
      onTap: () {
        SystemSound.play(SystemSoundType.click);
        onTap();
      },
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: isPinButton ? Colors.blue.shade50 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isPinButton ? Colors.blue : Colors.grey.shade300),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4)],
        ),
        alignment: Alignment.center,
        child: Icon(icon, color: isPinButton ? Colors.blue : Colors.black87),
      ),
    );
  }
}