import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/types/navigation';
import HomeScreen from './src/screens/HomeScreen';
import JoinRoomScreen from './src/screens/JoinRoomScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import WordEntryScreen from './src/screens/WordEntryScreen';
import ReadingScreen from './src/screens/ReadingScreen';
import PlayingScreen from './src/screens/PlayingScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import HistoryListScreen from './src/screens/HistoryListScreen';
import HistoryDetailScreen from './src/screens/HistoryDetailScreen';
import { fonts } from './src/theme';
import { ThemeProvider, useColors } from './src/theme-context';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const colors = useColors();

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: {
          fontFamily: fonts.serif,
          fontWeight: '800',
          color: colors.ink,
        },
        headerTintColor: colors.ink,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Family Game' }} />
      <Stack.Screen name="JoinRoom" component={JoinRoomScreen} options={{ title: 'Join Room' }} />
      <Stack.Screen
        name="Lobby"
        component={LobbyScreen}
        options={{ title: 'Lobby', headerBackVisible: false }}
      />
      <Stack.Screen
        name="WordEntry"
        component={WordEntryScreen}
        options={{ title: 'Word Entry', headerBackVisible: false }}
      />
      <Stack.Screen
        name="Reading"
        component={ReadingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Playing"
        component={PlayingScreen}
        options={{ title: 'Playing', headerBackVisible: false }}
      />
      <Stack.Screen
        name="GameOver"
        component={GameOverScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HistoryList"
        component={HistoryListScreen}
        options={{ title: 'Game History' }}
      />
      <Stack.Screen
        name="HistoryDetail"
        component={HistoryDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}
