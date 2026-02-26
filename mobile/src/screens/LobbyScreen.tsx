import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { socketService } from '../services/socket.service';
import { useGameStore, selectIsHost } from '../store/game.store';
import {
  GameState,
  SerializedRoom,
  PlayerLeftPayload,
  ErrorPayload,
} from '../types/game';
import type { LobbyScreenProps } from '../types/navigation';
import { fonts, type Colors, type Shadows } from '../theme';
import { useColors, useShadows } from '../theme-context';

export default function LobbyScreen({ navigation }: LobbyScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const room = useGameStore((s) => s.room);
  const mySocketId = useGameStore((s) => s.mySocketId);
  const isHost = useGameStore(selectIsHost);
  const setRoom = useGameStore((s) => s.setRoom);
  const clearRoom = useGameStore((s) => s.clearRoom);

  useEffect(() => {
    const handlePlayerJoined = (updatedRoom: unknown) => {
      setRoom(updatedRoom as SerializedRoom);
    };

    const handlePlayerLeft = (payload: unknown) => {
      setRoom((payload as PlayerLeftPayload).room);
    };

    const handleStateChanged = (updatedRoom: unknown) => {
      const room = updatedRoom as SerializedRoom;
      setRoom(room);
      if (room.state === GameState.WORD_ENTRY) {
        navigation.replace('WordEntry');
      }
    };

    const handleError = (payload: unknown) => {
      Alert.alert('Error', (payload as ErrorPayload).message);
    };

    socketService.on('player_joined', handlePlayerJoined);
    socketService.on('player_left', handlePlayerLeft);
    socketService.on('state_changed', handleStateChanged);
    socketService.on('error', handleError);

    return () => {
      socketService.off('player_joined', handlePlayerJoined);
      socketService.off('player_left', handlePlayerLeft);
      socketService.off('state_changed', handleStateChanged);
      socketService.off('error', handleError);
    };
  }, [setRoom]);

  const handleStartGame = () => {
    socketService.emit('start_game');
  };

  const handleLeave = () => {
    socketService.disconnect();
    clearRoom();
    navigation.navigate('Home');
  };

  if (!room) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No room data. Returning...</Text>
      </View>
    );
  }

  const playerCount = room.players.length;

  return (
    <View style={styles.container}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Room Code</Text>
        <Text style={styles.code}>{room.code}</Text>
      </View>

      <Text style={styles.playersLabel}>
        Players ({playerCount})
      </Text>

      <FlatList
        data={room.players}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Text style={styles.playerName}>
              {item.name}
              {item.id === mySocketId ? ' (you)' : ''}
            </Text>
            {item.isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>HOST</Text>
              </View>
            )}
          </View>
        )}
      />

      {isHost && (
        <TouchableOpacity
          style={[
            styles.button,
            styles.startButton,
            playerCount < 2 && styles.disabledButton,
          ]}
          onPress={handleStartGame}
          disabled={playerCount < 2}
        >
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, styles.leaveButton]}
        onPress={handleLeave}
      >
        <Text style={styles.buttonText}>Leave Room</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: Colors, shadows: Shadows) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.paper,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.mutedInk,
      fontFamily: fonts.sans,
    },
    codeCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 6,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 24,
      ...shadows.hard,
    },
    codeLabel: {
      fontSize: 12,
      color: colors.mutedInk,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: fonts.sans,
    },
    code: {
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: 6,
      color: colors.ink,
      fontFamily: fonts.mono,
    },
    playersLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      alignSelf: 'flex-start',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontFamily: fonts.sans,
    },
    list: {
      width: '100%',
      flexGrow: 0,
      marginBottom: 24,
    },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 6,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.soft,
    },
    playerName: {
      fontSize: 16,
      color: colors.ink,
      fontFamily: fonts.sans,
      fontWeight: '600',
    },
    hostBadge: {
      backgroundColor: colors.highlight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.ink,
    },
    hostBadgeText: {
      color: colors.buttonText,
      fontSize: 12,
      fontWeight: '800',
      fontFamily: fonts.sans,
      letterSpacing: 0.6,
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
    startButton: {
      backgroundColor: colors.highlight,
    },
    leaveButton: {
      backgroundColor: colors.danger,
    },
    disabledButton: {
      opacity: 0.5,
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
