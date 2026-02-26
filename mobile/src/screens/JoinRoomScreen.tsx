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
import type { JoinRoomScreenProps } from '../types/navigation';
import { fonts, type Colors, type Shadows } from '../theme';
import { useColors, useShadows } from '../theme-context';

export default function JoinRoomScreen({ navigation, route }: JoinRoomScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const { playerName } = route.params;
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { setMySocketId, setMyName, setRoom } = useGameStore();

  useEffect(() => {
    const handlePlayerJoined = (room: unknown) => {
      const serializedRoom = room as SerializedRoom;
      const myId = socketService.id;

      const isMe = serializedRoom.players.some((p) => p.id === myId);
      if (!isMe) return;

      setLoading(false);
      setMySocketId(myId!);
      setMyName(playerName);
      setRoom(serializedRoom);
      navigation.navigate('Lobby');
    };

    const handleError = (payload: unknown) => {
      setLoading(false);
      Alert.alert('Error', (payload as ErrorPayload).message);
    };

    socketService.on('player_joined', handlePlayerJoined);
    socketService.on('error', handleError);

    return () => {
      socketService.off('player_joined', handlePlayerJoined);
      socketService.off('error', handleError);
    };
  }, [navigation, playerName, setMySocketId, setMyName, setRoom]);

  const handleJoin = () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Room code must be 6 characters.');
      return;
    }
    setLoading(true);
    socketService.emit('join_room', { roomCode: code, playerName });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.container}>
      <Text style={styles.title}>Join Room</Text>
      <Text style={styles.subtitle}>Enter the 6-letter code</Text>

      <TextInput
        style={styles.codeInput}
        placeholder="ROOM CODE"
        placeholderTextColor={colors.faintInk}
        value={roomCode}
        onChangeText={(text) => setRoomCode(text.toUpperCase())}
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleJoin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={styles.buttonText}>Join</Text>
        )}
      </TouchableOpacity>
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
      fontSize: 30,
      fontWeight: '800',
      marginBottom: 6,
      color: colors.ink,
      fontFamily: fonts.serif,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedInk,
      marginBottom: 24,
      fontFamily: fonts.sans,
      letterSpacing: 0.4,
    },
    codeInput: {
      width: '100%',
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 6,
      paddingVertical: 16,
      paddingHorizontal: 14,
      fontSize: 26,
      backgroundColor: colors.card,
      marginBottom: 18,
      textAlign: 'center',
      letterSpacing: 8,
      fontWeight: '800',
      fontFamily: fonts.sans,
      color: colors.ink,
      ...shadows.soft,
    },
    button: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: 'center',
      backgroundColor: colors.accentAlt,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.hard,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 18,
      fontWeight: '800',
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
  });
