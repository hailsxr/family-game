import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { apiService } from '../services/api.service';
import type { GameDetail } from '../types/api';
import type { HistoryDetailScreenProps } from '../types/navigation';
import { fonts, type Colors, type Shadows } from '../theme';
import { useColors, useShadows } from '../theme-context';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function HistoryDetailScreen({ route, navigation }: HistoryDetailScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const { gameId } = route.params;
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiService.getGameDetail(gameId);
        setGame(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  if (error || !game) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Game not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Group players by family leader
  const familyMap = new Map<string, typeof game.players>();
  for (const p of game.players) {
    const key = p.finalFamilyLeaderName;
    if (!familyMap.has(key)) familyMap.set(key, []);
    familyMap.get(key)!.push(p);
  }

  const biggestFamily = Math.max(...Array.from(familyMap.values()).map((f) => f.length));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backArrow}>
          <Text style={styles.backArrowText}>&larr;</Text>
        </TouchableOpacity>
        <Text style={styles.trophy}>&#127942;</Text>
        <Text style={styles.winnerName}>{game.winnerPlayerName}</Text>
        <Text style={styles.subtitle}>Room {game.roomCode}</Text>
        <Text style={styles.date}>{formatDate(game.endedAt)}</Text>
        <Text style={styles.duration}>{formatDuration(game.durationSeconds)}</Text>
      </View>

      {/* Players grouped by family */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Families</Text>
        {Array.from(familyMap.entries()).map(([leader, members]) => (
          <View key={leader} style={styles.familyCard}>
            <Text style={styles.familyLeader}>
              {leader}'s Family ({members.length})
            </Text>
            {members.map((p, i) => (
              <View key={i} style={styles.playerRow}>
                <Text style={styles.playerName}>
                  {p.playerName}
                  {p.wasWinner ? ' \u2605' : ''}
                </Text>
                <Text style={styles.playerWord}>{p.submittedWord}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Stats card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{game.totalGuesses}</Text>
            <Text style={styles.statLabel}>Guesses</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{game.correctPercent}%</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(game.durationSeconds)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{biggestFamily}</Text>
            <Text style={styles.statLabel}>Biggest Family</Text>
          </View>
        </View>
      </View>

      {/* Guess timeline */}
      {game.guesses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guess Timeline</Text>
          {game.guesses.map((g, i) => (
            <View key={i} style={styles.guessRow}>
              <Text style={[styles.guessIcon, g.wasCorrect ? styles.correct : styles.incorrect]}>
                {g.wasCorrect ? '\u2713' : '\u2717'}
              </Text>
              <View style={styles.guessInfo}>
                <Text style={styles.guessText}>
                  <Text style={styles.bold}>{g.guesserPlayerName}</Text>
                  {' guessed '}
                  <Text style={styles.bold}>{g.guessedPlayerName}</Text>
                  {' wrote "'}
                  <Text style={styles.italic}>{g.guessedWord}</Text>
                  {'"'}
                </Text>
                <Text style={styles.guessTime}>{formatTime(g.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Share button */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => Alert.alert('Coming Soon', 'Sharing will be available in a future update.')}
      >
        <Text style={styles.shareButtonText}>Share Results</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: Colors, shadows: Shadows) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    content: {
      padding: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.paper,
      padding: 24,
    },
    header: {
      alignItems: 'center',
      marginBottom: 28,
    },
    backArrow: {
      position: 'absolute',
      left: 0,
      top: -8,
      padding: 8,
    },
    backArrowText: {
      fontSize: 28,
      color: colors.ink,
    },
    trophy: {
      fontSize: 48,
      marginBottom: 8,
    },
    winnerName: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.highlight,
      fontFamily: fonts.serif,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedInk,
      fontFamily: fonts.mono,
      marginTop: 4,
    },
    date: {
      fontSize: 14,
      color: colors.faintInk,
      fontFamily: fonts.sans,
      marginTop: 4,
    },
    duration: {
      fontSize: 14,
      color: colors.faintInk,
      fontFamily: fonts.sans,
      marginTop: 2,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.highlight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
      fontFamily: fonts.sans,
    },
    familyCard: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.faintInk,
    },
    familyLeader: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 8,
      fontFamily: fonts.serif,
    },
    playerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    playerName: {
      fontSize: 15,
      color: colors.ink,
      fontFamily: fonts.sans,
    },
    playerWord: {
      fontSize: 15,
      color: colors.faintInk,
      fontFamily: fonts.mono,
      fontStyle: 'italic',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statBox: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 14,
      flex: 1,
      minWidth: '45%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.faintInk,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.ink,
      fontFamily: fonts.sans,
    },
    statLabel: {
      fontSize: 12,
      color: colors.faintInk,
      marginTop: 4,
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
    },
    guessRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.subtleBg,
    },
    guessIcon: {
      fontSize: 18,
      fontWeight: '700',
      width: 28,
      textAlign: 'center',
      marginTop: 2,
    },
    correct: {
      color: colors.success,
    },
    incorrect: {
      color: colors.danger,
    },
    guessInfo: {
      flex: 1,
    },
    guessText: {
      fontSize: 14,
      color: colors.mutedInk,
      fontFamily: fonts.sans,
      lineHeight: 20,
    },
    bold: {
      fontWeight: '700',
      color: colors.ink,
    },
    italic: {
      fontStyle: 'italic',
      color: colors.faintInk,
    },
    guessTime: {
      fontSize: 11,
      color: colors.faintInk,
      fontFamily: fonts.mono,
      marginTop: 2,
    },
    shareButton: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.ink,
      marginTop: 8,
      ...shadows.soft,
    },
    shareButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    errorText: {
      fontSize: 16,
      color: colors.danger,
      textAlign: 'center',
      marginBottom: 16,
      fontFamily: fonts.sans,
    },
    backButton: {
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.soft,
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      fontFamily: fonts.sans,
    },
  });
