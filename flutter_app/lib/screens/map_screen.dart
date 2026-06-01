import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../data/sample_data.dart';

class MapScreen extends StatelessWidget {
  const MapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final polygons = territories.map((territory) {
      return Polygon(
        points: territory['points'] as List<LatLng>,
        color: (territory['color'] as Color).withOpacity(0.28),
        borderStrokeWidth: 4,
        borderColor: territory['color'] as Color,
      );
    }).toList();

    final markers = territories.map((territory) {
      return Marker(
        point: territory['center'] as LatLng,
        width: 48,
        height: 48,
        builder: (context) {
          return Container(
            decoration: BoxDecoration(
              color: (territory['color'] as Color).withOpacity(0.95),
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 9)],
            ),
            child: const Icon(Icons.location_on, color: Colors.white, size: 28),
          );
        },
      );
    }).toList();

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
              decoration: const BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Territory Map', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                  SizedBox(height: 6),
                  Text('Explore territory boundaries and capture zones in real time.', style: TextStyle(color: Colors.black54)),
                ],
              ),
            ),
            Expanded(
              child: FlutterMap(
                options: MapOptions(
                  center: territories.first['center'] as LatLng,
                  zoom: 15,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.myterritory.app',
                  ),
                  PolygonLayer(polygons: polygons),
                  MarkerLayer(markers: markers),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
