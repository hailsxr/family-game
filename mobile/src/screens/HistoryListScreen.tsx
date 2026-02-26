import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiService } from '../services/api.service';
import type { GameSummary } from '../types/api';
import type { HistoryListScreenProps } from '../types/navigation';
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryListScreen({ navigation }: HistoryListScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  const fetchGames = useCallback(async (fetchLimit: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await apiService.getGames(fetchLimit);
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGames(limit);
  }, [fetchGames, limit]);

  const handleRefresh = () => fetchGames(limit, true);

  const handleLoadMore = () => {
    if (games.length >= limit && limit < 50) {
      setLimit((prev) => Math.min(prev + 20, 50));
    }
  };

  const renderItem = ({ item }: { item: GameSummary }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('HistoryDetail', { gameId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.winner}>{item.winnerPlayerName}</Text>
        <Text style={styles.date}>{formatDate(item.endedAt)}</Text>
      </View>
      <View style={styles.cardStats}>
        <Text style={styles.stat}>{item.totalPlayers} players</Text>
        <Text style={styles.statDot}>&middot;</Text>
        <Text style={styles.stat}>{formatDuration(item.durationSeconds)}</Text>
        <Text style={styles.statDot}>&middot;</Text>
        <Text style={styles.stat}>{item.correctPercent}% correct</Text>
      </View>
      <Text style={styles.roomCode}>Room {item.roomCode}</Text>
    </TouchableOpacity>
  );

  if (loading && games.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  if (error && games.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchGames(limit)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (games.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No games played yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={games}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
    />
  );
}

const createStyles = (colors: Colors, shadows: Shadows) =>
  StyleSheet.create({
    list: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    listContent: {
      padding: 16,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.paper,
      padding: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 6,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.soft,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    winner: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.ink,
      fontFamily: fonts.serif,
    },
    date: {
      fontSize: 13,
      color: colors.faintInk,
      fontFamily: fonts.sans,
    },
    cardStats: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    stat: {
      fontSize: 14,
      color: colors.mutedInk,
      fontFamily: fonts.sans,
    },
    statDot: {
      fontSize: 14,
      color: colors.faintInk,
      marginHorizontal: 6,
    },
    roomCode: {
      fontSize: 12,
      color: colors.faintInk,
      fontFamily: fonts.mono,
      marginTop: 4,
    },
    errorText: {
      fontSize: 16,
      color: colors.danger,
      textAlign: 'center',
      marginBottom: 16,
      fontFamily: fonts.sans,
    },
    retryButton: {
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.ink,
      backgroundColor: colors.highlight,
      ...shadows.hard,
    },
    retryText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.buttonText,
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
    },
    emptyText: {
      fontSize: 18,
      color: colors.faintInk,
      fontFamily: fonts.serif,
    },
  });
