import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  JoinRoom: { playerName: string };
  Lobby: undefined;
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type JoinRoomScreenProps = NativeStackScreenProps<RootStackParamList, 'JoinRoom'>;
export type LobbyScreenProps = NativeStackScreenProps<RootStackParamList, 'Lobby'>;
