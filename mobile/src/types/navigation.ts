import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  JoinRoom: { playerName: string };
  Lobby: undefined;
  WordEntry: undefined;
  Reading: undefined;
  Playing: undefined;
  GameOver: undefined;
  HistoryList: undefined;
  HistoryDetail: { gameId: string };
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type JoinRoomScreenProps = NativeStackScreenProps<RootStackParamList, 'JoinRoom'>;
export type LobbyScreenProps = NativeStackScreenProps<RootStackParamList, 'Lobby'>;
export type WordEntryScreenProps = NativeStackScreenProps<RootStackParamList, 'WordEntry'>;
export type ReadingScreenProps = NativeStackScreenProps<RootStackParamList, 'Reading'>;
export type PlayingScreenProps = NativeStackScreenProps<RootStackParamList, 'Playing'>;
export type GameOverScreenProps = NativeStackScreenProps<RootStackParamList, 'GameOver'>;
export type HistoryListScreenProps = NativeStackScreenProps<RootStackParamList, 'HistoryList'>;
export type HistoryDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;
