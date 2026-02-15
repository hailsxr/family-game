import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { socketService } from '../services/socket.service';
import { useGameStore } from '../store/game.store';
import { SerializedRoom, ErrorPayload } from '../types/game';
import type { JoinRoomScreenProps } from '../types/navigation';

export default function JoinRoomScreen({ navigation, route }: JoinRoomScreenProps) {
  const { playerName } = route.params;
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { setMySocketId, setMyName, setRoom } = useGameStore();

  useEffect(() => {
    const handlePlayerJoined = (room: unknown) => {
      const serializedRoom = room as SerializedRoom;
      const myId = socketService.id;

      // Only navigate if we are in the room (since player_joined broadcasts to all)
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
    <View style={styles.container}>
      <Text style={styles.title}>Join Room</Text>

      <TextInput
        style={styles.codeInput}
        placeholder="ROOM CODE"
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
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Join</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#333',
  },
  codeInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 24,
    backgroundColor: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
