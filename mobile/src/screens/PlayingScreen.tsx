import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { socketService } from '../services/socket.service';
import { useGameStore } from '../store/game.store';
import {
  Family,
  GameState,
  GuessResult,
  SerializedPlayer,
  SerializedRoom,
  ErrorPayload,
} from '../types/game';
import type { PlayingScreenProps } from '../types/navigation';
import { fonts, type Colors, type Shadows } from '../theme';
import { useColors, useShadows } from '../theme-context';

const FAMILY_COLORS = [
  '#1B6EFF', '#E4572E', '#F9D423', '#1F7A4C', '#7F3FBF',
  '#E84855', '#00B8A9', '#FF8C42', '#2B59C3', '#B80C09',
  '#1B998B', '#F46036', '#0B132B', '#3C91E6', '#9E2B25',
  '#F0A202', '#8F2D56', '#4F5D75', '#0E7C7B', '#E09F3E',
];

function getFamilyColor(familyIndex: number): string {
  return FAMILY_COLORS[familyIndex % FAMILY_COLORS.length];
}

function findPlayerFamily(families: Family[], playerId: string): Family | undefined {
  return families.find((f) => f.memberIds.includes(playerId));
}

interface GuessLogEntry {
  guesserName: string;
  targetName: string;
  word: string;
  correct: boolean;
  timestamp: Date;
}

const SHEET_WIDTH = Dimensions.get('window').width * 0.75;

export default function PlayingScreen({ navigation }: PlayingScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const room = useGameStore((s) => s.room);
  const mySocketId = useGameStore((s) => s.mySocketId);
  const lastGuessResult = useGameStore((s) => s.lastGuessResult);
  const setRoom = useGameStore((s) => s.setRoom);
  const setLastGuessResult = useGameStore((s) => s.setLastGuessResult);
  const setGameId = useGameStore((s) => s.setGameId);

  const [selectedPlayer, setSelectedPlayer] = useState<SerializedPlayer | null>(null);
  const [guessWord, setGuessWord] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [guessLog, setGuessLog] = useState<GuessLogEntry[]>([]);
  const [logVisible, setLogVisible] = useState(false);
  const [resultBanner, setResultBanner] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  const turnPulse = useRef(new Animated.Value(1)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SHEET_WIDTH)).current;
  const logScrollRef = useRef<ScrollView>(null);
  const navigatingToGameOver = useRef(false);

  const families = room?.families ?? [];
  const players = room?.players ?? [];
  const currentTurnId = room?.currentTurnId ?? null;
  const isMyTurn = currentTurnId === mySocketId;

  const myFamily = mySocketId ? findPlayerFamily(families, mySocketId) : undefined;

  // Pulse animation for turn indicator
  useEffect(() => {
    if (!isMyTurn) {
      turnPulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(turnPulse, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(turnPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isMyTurn, turnPulse]);

  // Show result banner
  const showBanner = useCallback(
    (correct: boolean, message: string) => {
      setResultBanner({ correct, message });
      bannerOpacity.setValue(1);
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 500,
        delay: 2000,
        useNativeDriver: true,
      }).start(() => setResultBanner(null));
    },
    [bannerOpacity],
  );

  const toggleLog = useCallback(
    (show: boolean) => {
      setLogVisible(show);
      Animated.timing(slideAnim, {
        toValue: show ? 0 : SHEET_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        if (show) {
          logScrollRef.current?.scrollToEnd({ animated: false });
        }
      });
    },
    [slideAnim],
  );

  // Socket listeners
  useEffect(() => {
    const handleGuessResult = (result: unknown) => {
      const data = result as GuessResult;
      setLastGuessResult(data);
      if (data.gameOver && data.gameId) {
        setGameId(data.gameId);
      }

      if (room) {
        const updated: SerializedRoom = {
          ...room,
          families: data.families,
          currentTurnId: data.currentTurnId,
          state: data.gameOver ? GameState.ENDED : room.state,
        };
        setRoom(updated);
      }

      const guesserName =
        players.find((p) => p.id === data.guesserId)?.name ?? 'Someone';
      const targetName =
        players.find((p) => p.id === data.targetPlayerId)?.name ?? 'someone';

      setGuessLog((prev) => [
        ...prev,
        {
          guesserName,
          targetName,
          word: data.word,
          correct: data.correct,
          timestamp: new Date(),
        },
      ]);

      if (data.correct) {
        showBanner(true, `${guesserName} guessed ${targetName}'s word!`);
      } else {
        showBanner(false, `${guesserName} guessed wrong`);
      }

      if (data.gameOver && !navigatingToGameOver.current) {
        navigatingToGameOver.current = true;
        setTimeout(() => navigation.replace('GameOver'), 2500);
      }
    };

    const handleStateChanged = (updatedRoom: unknown) => {
      const r = updatedRoom as SerializedRoom;
      setRoom(r);
      if (r.state === GameState.ENDED && !navigatingToGameOver.current) {
        navigatingToGameOver.current = true;
        setTimeout(() => navigation.replace('GameOver'), 1500);
      }
    };

    const handleError = (payload: unknown) => {
      Alert.alert('Error', (payload as ErrorPayload).message);
    };

    socketService.on('guess_result', handleGuessResult);
    socketService.on('state_changed', handleStateChanged);
    socketService.on('error', handleError);

    return () => {
      socketService.off('guess_result', handleGuessResult);
      socketService.off('state_changed', handleStateChanged);
      socketService.off('error', handleError);
    };
  }, [room, players, navigation, setRoom, setLastGuessResult, setGameId, showBanner]);

  const handlePlayerTap = (player: SerializedPlayer) => {
    if (!isMyTurn) return;
    if (myFamily?.memberIds.includes(player.id)) return;
    setSelectedPlayer(player);
    setGuessWord('');
    setModalVisible(true);
  };

  const handleConfirmGuess = () => {
    const trimmed = guessWord.trim();
    if (!selectedPlayer || !trimmed) return;
    setModalVisible(false);
    socketService.emit('make_guess', {
      targetPlayerId: selectedPlayer.id,
      word: trimmed,
    });
    setSelectedPlayer(null);
    setGuessWord('');
  };

  const currentGuesserName =
    players.find((p) => p.id === currentTurnId)?.name ?? '...';

  if (!room) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.ink }}>No game data.</Text>
      </View>
    );
  }

  const familyGroups = families.map((family, familyIdx) => {
    const color = getFamilyColor(familyIdx);
    const members = family.memberIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean) as SerializedPlayer[];
    return { family, color, members, familyIdx };
  });

  return (
    <View style={styles.container}>
      {/* Turn indicator */}
      <Animated.View
        style={[
          styles.turnBanner,
          isMyTurn ? styles.turnBannerActive : styles.turnBannerWaiting,
          { transform: [{ scale: turnPulse }] },
        ]}
      >
        <Text style={[styles.turnText, isMyTurn && styles.turnTextActive]}>
          {isMyTurn ? "Your turn! Tap a player to guess" : `${currentGuesserName}'s turn`}
        </Text>
      </Animated.View>

      {/* Result banner */}
      {resultBanner && (
        <Animated.View
          style={[
            styles.resultBanner,
            resultBanner.correct
              ? styles.resultBannerCorrect
              : styles.resultBannerWrong,
            { opacity: bannerOpacity },
          ]}
        >
          <Text style={styles.resultBannerText}>
            {resultBanner.correct ? '  ' : '  '}
            {resultBanner.message}
          </Text>
        </Animated.View>
      )}

      {/* Player cards grouped by family */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {familyGroups.map(({ family, color, members }) => (
          <View key={family.leaderId} style={styles.familyGroup}>
            <View style={[styles.familyHeader, { backgroundColor: color }]}>
              <Text style={styles.familyHeaderText}>
                {members.find((m) => m.id === family.leaderId)?.name ?? 'Unknown'}'s Family ({members.length})
              </Text>
            </View>
            <View style={styles.cardsRow}>
              {members.map((player) => {
                const isLeader = player.id === family.leaderId;
                const isMe = player.id === mySocketId;
                const isInMyFamily = myFamily?.memberIds.includes(player.id) ?? false;
                const isCurrentGuesser = player.id === currentTurnId;
                const canTap = isMyTurn && !isInMyFamily;

                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerCard,
                      { borderColor: color, borderWidth: 2 },
                      isCurrentGuesser && styles.playerCardGuesser,
                      isMe && styles.playerCardMe,
                    ]}
                    onPress={() => handlePlayerTap(player)}
                    disabled={!canTap}
                    activeOpacity={canTap ? 0.6 : 1}
                  >
                    {isLeader && <Text style={styles.leaderIcon}>&#9733;</Text>}
                    <Text
                      style={[
                        styles.playerCardName,
                        !canTap && !isInMyFamily && styles.playerCardNameDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                    {isMe && <Text style={styles.youLabel}>(you)</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating log toggle button */}
      {guessLog.length > 0 && (
        <TouchableOpacity
          style={styles.logFab}
          onPress={() => toggleLog(!logVisible)}
          activeOpacity={0.7}
        >
          <Text style={styles.logFabText}>{guessLog.length}</Text>
        </TouchableOpacity>
      )}

      {/* Guess log slide-out sheet */}
      {logVisible && (
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => toggleLog(false)}
        />
      )}
      <Animated.View
        style={[
          styles.sheetContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Guess Log</Text>
          <TouchableOpacity onPress={() => toggleLog(false)}>
            <Text style={styles.sheetClose}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView ref={logScrollRef} style={styles.sheetScroll}>
          {guessLog.map((entry, i) => (
            <View key={i} style={styles.logRow}>
              <Text
                style={[
                  styles.logIcon,
                  entry.correct ? styles.logCorrect : styles.logIncorrect,
                ]}
              >
                {entry.correct ? '\u2713' : '\u2717'}
              </Text>
              <View style={styles.logInfo}>
                <Text style={styles.logText}>
                  <Text style={styles.logBold}>{entry.guesserName}</Text>
                  {' guessed '}
                  <Text style={styles.logBold}>{entry.targetName}</Text>
                  {"'s word \""}
                  <Text style={styles.logItalic}>{entry.word}</Text>
                  {'"'}
                </Text>
                <Text style={styles.logTime}>
                  {entry.timestamp.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Word picker modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Guess {selectedPlayer?.name}'s word
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Type your guess..."
              placeholderTextColor={colors.faintInk}
              value={guessWord}
              onChangeText={setGuessWord}
              autoFocus
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  !guessWord.trim() && styles.disabledButton,
                ]}
                onPress={() => {
                  const trimmed = guessWord.trim();
                  if (!selectedPlayer || !trimmed) return;
                  Alert.alert(
                    'Confirm Guess',
                    `Guess that ${selectedPlayer.name} wrote "${trimmed}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Guess!', onPress: handleConfirmGuess },
                    ],
                  );
                }}
                disabled={!guessWord.trim()}
              >
                <Text style={styles.modalConfirmText}>Confirm Guess</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: Colors, shadows: Shadows) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    turnBanner: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.hard,
    },
    turnBannerActive: {
      backgroundColor: colors.highlight,
    },
    turnBannerWaiting: {
      backgroundColor: colors.card,
    },
    turnText: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: '800',
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    turnTextActive: {
      color: colors.buttonText,
    },
    resultBanner: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 6,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.soft,
    },
    resultBannerCorrect: {
      backgroundColor: colors.successBg,
    },
    resultBannerWrong: {
      backgroundColor: colors.dangerBg,
    },
    resultBannerText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.ink,
      fontFamily: fonts.sans,
    },
    scrollArea: {
      flex: 1,
      marginTop: 12,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    familyGroup: {
      marginBottom: 16,
    },
    familyHeader: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: 8,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.soft,
    },
    familyHeaderText: {
      color: colors.buttonText,
      fontSize: 12,
      fontWeight: '800',
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    cardsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    playerCard: {
      backgroundColor: colors.card,
      borderRadius: 6,
      paddingVertical: 12,
      paddingHorizontal: 12,
      minWidth: 100,
      alignItems: 'center',
      ...shadows.soft,
    },
    playerCardGuesser: {
      transform: [{ translateY: -2 }],
    },
    playerCardMe: {
      backgroundColor: colors.warningBg,
    },
    playerCardName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.ink,
      fontFamily: fonts.sans,
    },
    playerCardNameDisabled: {
      color: colors.faintInk,
    },
    leaderIcon: {
      fontSize: 16,
      color: colors.accentAlt,
      marginBottom: 2,
    },
    youLabel: {
      fontSize: 11,
      color: colors.mutedInk,
      marginTop: 2,
      fontFamily: fonts.sans,
    },
    logFab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.highlight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.ink,
      zIndex: 10,
      ...shadows.hard,
    },
    logFabText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.buttonText,
      fontFamily: fonts.sans,
    },
    sheetOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      zIndex: 20,
    },
    sheetContainer: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: SHEET_WIDTH,
      backgroundColor: colors.card,
      borderLeftWidth: 2,
      borderLeftColor: colors.ink,
      zIndex: 30,
      ...shadows.hard,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: colors.ink,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.ink,
      fontFamily: fonts.serif,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    sheetClose: {
      fontSize: 20,
      color: colors.ink,
      fontWeight: '700',
      padding: 4,
    },
    sheetScroll: {
      flex: 1,
      paddingHorizontal: 12,
    },
    logRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.subtleBg,
    },
    logIcon: {
      fontSize: 18,
      fontWeight: '700',
      width: 28,
      textAlign: 'center',
      marginTop: 2,
    },
    logCorrect: {
      color: colors.success,
    },
    logIncorrect: {
      color: colors.danger,
    },
    logInfo: {
      flex: 1,
    },
    logText: {
      fontSize: 14,
      color: colors.mutedInk,
      fontFamily: fonts.sans,
      lineHeight: 20,
    },
    logBold: {
      fontWeight: '700',
      color: colors.ink,
    },
    logItalic: {
      fontStyle: 'italic',
      color: colors.faintInk,
    },
    logTime: {
      fontSize: 11,
      color: colors.faintInk,
      fontFamily: fonts.mono,
      marginTop: 2,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20,
      maxHeight: '70%',
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.hard,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.ink,
      textAlign: 'center',
      marginBottom: 16,
      fontFamily: fonts.serif,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    modalInput: {
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 18,
      color: colors.ink,
      backgroundColor: colors.paper,
      fontFamily: fonts.sans,
    },
    modalActions: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 12,
    },
    modalCancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.soft,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    modalConfirm: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 6,
      backgroundColor: colors.highlight,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.hard,
    },
    modalConfirmText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.buttonText,
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    disabledButton: {
      opacity: 0.4,
    },
  });
