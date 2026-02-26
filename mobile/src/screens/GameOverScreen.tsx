import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { socketService } from '../services/socket.service';
import { apiService } from '../services/api.service';
import { useGameStore } from '../store/game.store';
import type { GameDetail } from '../types/api';
import type { GameOverScreenProps } from '../types/navigation';
import { fonts, type Colors, type Shadows } from '../theme';
import { useColors, useShadows } from '../theme-context';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function GameOverScreen({ navigation }: GameOverScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const room = useGameStore((s) => s.room);
  const lastGuessResult = useGameStore((s) => s.lastGuessResult);
  const mySocketId = useGameStore((s) => s.mySocketId);
  const gameId = useGameStore((s) => s.gameId);
  const clearRoom = useGameStore((s) => s.clearRoom);
  const resetGamePhase = useGameStore((s) => s.resetGamePhase);

  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const players = room?.players ?? [];
  const winner = lastGuessResult?.winner;
  const winnerLeader = players.find((p) => p.id === winner?.leaderId);
  const winnerMembers = (winner?.memberIds ?? [])
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  const isWinner = winner?.memberIds.includes(mySocketId ?? '') ?? false;

  useEffect(() => {
    if (!gameId) return;
    setLoadingDetail(true);
    apiService
      .getGameDetail(gameId)
      .then(setGameDetail)
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [gameId]);

  const handleViewDetails = () => {
    if (gameId) {
      navigation.navigate('HistoryDetail', { gameId });
    }
  };

  const handlePlayAgain = () => {
    resetGamePhase();
    navigation.navigate('Home');
  };

  const handleReturnHome = () => {
    socketService.disconnect();
    clearRoom();
    navigation.navigate('Home');
  };

  const totalGuesses = gameDetail?.totalGuesses ?? null;
  const correctPercent = gameDetail?.correctPercent ?? null;
  const durationSeconds = gameDetail?.durationSeconds ?? null;
  const biggestFamily = gameDetail
    ? (() => {
        const familyMap = new Map<string, number>();
        for (const p of gameDetail.players) {
          const count = (familyMap.get(p.finalFamilyLeaderName) ?? 0) + 1;
          familyMap.set(p.finalFamilyLeaderName, count);
        }
        return Math.max(...Array.from(familyMap.values()), 0);
      })()
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.trophy}>&#127942;</Text>
      <Text style={styles.title}>Game Over!</Text>

      {winnerLeader ? (
        <>
          <Text style={styles.winnerLabel}>
            {isWinner ? 'Your family wins!' : `${winnerLeader.name}'s family wins!`}
          </Text>
          <View style={styles.familyCard}>
            <Text style={styles.familyTitle}>Winning Family</Text>
            {winnerMembers.map((p) => (
              <Text key={p!.id} style={styles.memberName}>
                {p!.name}
                {p!.id === mySocketId ? ' (you)' : ''}
                {p!.id === winner?.leaderId ? ' \u2605' : ''}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.winnerLabel}>The game has ended</Text>
      )}

      {/* Enhanced stats card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Game Stats</Text>
        {loadingDetail ? (
          <ActivityIndicator color={colors.ink} style={{ marginVertical: 8 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {totalGuesses ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Guesses</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {correctPercent != null ? `${correctPercent}%` : '—'}
              </Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {durationSeconds != null ? formatDuration(durationSeconds) : '—'}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {biggestFamily ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Biggest Family</Text>
            </View>
          </View>
        )}
        <Text style={styles.statLine}>
          Players: {gameDetail?.totalPlayers ?? players.length}
        </Text>
        <Text style={styles.statLine}>
          Room: {room?.code ?? '—'}
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonGroup}>
        {gameId && (
          <TouchableOpacity
            style={[styles.button, styles.detailsButton]}
            onPress={handleViewDetails}
          >
            <Text style={styles.buttonText}>View Full Details</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.playAgainButton]}
          onPress={handlePlayAgain}
        >
          <Text style={styles.buttonText}>Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.homeButton]}
          onPress={handleReturnHome}
        >
          <Text style={[styles.buttonText, { color: colors.ink }]}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Colors, shadows: Shadows) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    contentContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      paddingTop: 60,
      paddingBottom: 40,
    },
    trophy: {
      fontSize: 64,
      marginBottom: 8,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.ink,
      marginBottom: 8,
      fontFamily: fonts.serif,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    winnerLabel: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.accentAlt,
      marginBottom: 24,
      textAlign: 'center',
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    familyCard: {
      backgroundColor: colors.card,
      borderRadius: 6,
      padding: 16,
      width: '100%',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.hard,
    },
    familyTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: fonts.sans,
    },
    memberName: {
      fontSize: 17,
      color: colors.ink,
      paddingVertical: 4,
      fontFamily: fonts.sans,
      fontWeight: '600',
    },
    statsCard: {
      backgroundColor: colors.card,
      borderRadius: 6,
      padding: 16,
      width: '100%',
      marginBottom: 24,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.soft,
    },
    statsTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.mutedInk,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: fonts.sans,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    statBox: {
      backgroundColor: colors.paper,
      borderRadius: 6,
      padding: 12,
      flex: 1,
      minWidth: '45%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.ink,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.ink,
      fontFamily: fonts.sans,
    },
    statLabel: {
      fontSize: 11,
      color: colors.mutedInk,
      marginTop: 2,
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
    },
    statLine: {
      fontSize: 15,
      color: colors.ink,
      paddingVertical: 2,
      fontFamily: fonts.sans,
    },
    buttonGroup: {
      width: '100%',
      gap: 10,
    },
    button: {
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.hard,
    },
    detailsButton: {
      backgroundColor: colors.accent,
    },
    playAgainButton: {
      backgroundColor: colors.highlight,
    },
    homeButton: {
      backgroundColor: colors.card,
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
