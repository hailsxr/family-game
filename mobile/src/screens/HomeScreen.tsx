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
import type { HomeScreenProps } from '../types/navigation';

export default function HomeScreen({ navigation }: HomeScreenProps) {
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
    <View style={styles.container}>
      <Text style={styles.title}>Family Game</Text>

      <TextInput
        style={styles.input}
        placeholder="Your name"
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
          <ActivityIndicator color="#fff" />
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 48,
    color: '#333',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  joinButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
