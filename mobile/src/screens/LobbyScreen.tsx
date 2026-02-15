import React, { useEffect } from 'react';
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
  SerializedRoom,
  PlayerLeftPayload,
  ErrorPayload,
} from '../types/game';
import type { LobbyScreenProps } from '../types/navigation';

export default function LobbyScreen({ navigation }: LobbyScreenProps) {
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
      setRoom(updatedRoom as SerializedRoom);
      Alert.alert('Game Started', 'The game state has changed. Future screens coming soon!');
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
        <Text>No room data. Returning...</Text>
      </View>
    );
  }

  const playerCount = room.players.length;

  return (
    <View style={styles.container}>
      <Text style={styles.codeLabel}>Room Code</Text>
      <Text style={styles.code}>{room.code}</Text>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  code: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 6,
    color: '#333',
    marginBottom: 32,
  },
  playersLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: 8,
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
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    color: '#333',
  },
  hostBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hostBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  leaveButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
