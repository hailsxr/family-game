import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { socketService } from '../services/socket.service';
import { useGameStore } from '../store/game.store';
import { SerializedRoom, ErrorPayload } from '../types/game';
import type { HomeScreenProps } from '../types/navigation';
import { fonts, type Colors, type Shadows } from '../theme';
import { useColors, useShadows, useThemePreference, type ThemePreference } from '../theme-context';

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: 'Auto', value: 'auto' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const { preference, setPreference } = useThemePreference();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const { setMyName, setMySocketId, setRoom, setConnectionStatus } =
    useGameStore();

  useEffect(() => {
    const socket = socketService.connect();

    const handleConnect = () => {
      setConnectionStatus('connected');
      setMySocketId(socket.id!);
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      setConnectionStatus('connected');
      setMySocketId(socket.id!);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [setConnectionStatus, setMySocketId]);

  useEffect(() => {
    const handleRoomCreated = (room: unknown) => {
      setLoading(false);
      setMySocketId(socketService.id!);
      setRoom(room as SerializedRoom);
      navigation.navigate('Lobby');
    };

    const handleError = (payload: unknown) => {
      setLoading(false);
      Alert.alert('Error', (payload as ErrorPayload).message);
    };

    socketService.on('room_created', handleRoomCreated);
    socketService.on('error', handleError);

    return () => {
      socketService.off('room_created', handleRoomCreated);
      socketService.off('error', handleError);
    };
  }, [navigation, setMySocketId, setRoom]);

  const validateName = (): boolean => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return false;
    }
    return true;
  };

  const handleCreateRoom = () => {
    if (!validateName()) return;
    const trimmed = name.trim();
    setMyName(trimmed);
    setLoading(true);
    socketService.emit('create_room', { playerName: trimmed });
  };

  const handleJoinRoom = () => {
    if (!validateName()) return;
    const trimmed = name.trim();
    setMyName(trimmed);
    navigation.navigate('JoinRoom', { playerName: trimmed });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.container}>
      <Text style={styles.title}>Family Game</Text>
      <Text style={styles.subtitle}>A social word game for the living room</Text>

      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor={colors.faintInk}
        value={name}
        onChangeText={setName}
        maxLength={20}
        autoCapitalize="words"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={[styles.button, styles.createButton]}
        onPress={handleCreateRoom}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={styles.buttonText}>Create Room</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.joinButton]}
        onPress={handleJoinRoom}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Join Room</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.historyButton]}
        onPress={() => navigation.navigate('HistoryList')}
      >
        <Text style={[styles.buttonText, { color: colors.ink }]}>Game History</Text>
      </TouchableOpacity>

      {/* Theme toggle */}
      <View style={styles.themeToggle}>
        {THEME_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.themeOption,
              preference === opt.value && styles.themeOptionActive,
            ]}
            onPress={() => setPreference(opt.value)}
          >
            <Text
              style={[
                styles.themeOptionText,
                preference === opt.value && styles.themeOptionTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors, shadows: Shadows) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: colors.paper,
    },
    title: {
      fontSize: 36,
      fontWeight: '800',
      marginBottom: 8,
      color: colors.ink,
      fontFamily: fonts.serif,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedInk,
      marginBottom: 36,
      fontFamily: fonts.sans,
      letterSpacing: 0.4,
    },
    input: {
      width: '100%',
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 6,
      padding: 14,
      fontSize: 18,
      backgroundColor: colors.card,
      marginBottom: 20,
      fontFamily: fonts.sans,
      color: colors.ink,
    },
    button: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.hard,
    },
    createButton: {
      backgroundColor: colors.highlight,
    },
    joinButton: {
      backgroundColor: colors.accent,
    },
    historyButton: {
      backgroundColor: colors.card,
      marginTop: 8,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 18,
      fontWeight: '800',
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    themeToggle: {
      flexDirection: 'row',
      marginTop: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.ink,
      overflow: 'hidden',
    },
    themeOption: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
    },
    themeOptionActive: {
      backgroundColor: colors.highlight,
    },
    themeOptionText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.mutedInk,
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    themeOptionTextActive: {
      color: colors.buttonText,
      fontWeight: '800',
    },
  });
