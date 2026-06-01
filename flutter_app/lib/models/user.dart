class UserProfile {
  final String username;
  final String email;
  final String phone;
  final String avatar;
  final String avatarImage;
  final int level;
  final int xp;
  final int streak;
  final int totalCapturedArea;

  const UserProfile({
    required this.username,
    required this.email,
    required this.phone,
    required this.avatar,
    required this.avatarImage,
    required this.level,
    required this.xp,
    required this.streak,
    required this.totalCapturedArea,
  });

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      username: map['username'] as String? ?? 'Runner',
      email: map['email'] as String? ?? '',
      phone: map['phone'] as String? ?? '',
      avatar: map['avatar'] as String? ?? '🏃‍♂️',
      avatarImage: map['avatarImage'] as String? ?? '',
      level: map['level'] as int? ?? 1,
      xp: map['xp'] as int? ?? 0,
      streak: map['streak'] as int? ?? 0,
      totalCapturedArea: map['totalCapturedArea'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
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
  }
}
