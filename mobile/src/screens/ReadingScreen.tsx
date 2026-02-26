import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { socketService } from '../services/socket.service';
import { useGameStore, selectIsHost } from '../store/game.store';
import { GameState, SerializedRoom } from '../types/game';
import type { ReadingScreenProps } from '../types/navigation';
import { fonts, type Colors, type Shadows } from '../theme';
import { useColors, useShadows } from '../theme-context';

const WORD_DISPLAY_MS = 3000;
const TOTAL_ROUNDS = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;

const STACK_OFFSETS = [
  { x: 0, y: 0, scale: 1 },
  { x: 6, y: 6, scale: 0.97 },
  { x: 12, y: 12, scale: 0.94 },
];

export default function ReadingScreen({ navigation }: ReadingScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const shuffledWords = useGameStore((s) => s.shuffledWords);
  const room = useGameStore((s) => s.room);
  const isHost = useGameStore(selectIsHost);
  const setRoom = useGameStore((s) => s.setRoom);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const swipeAnim = useRef(new Animated.Value(0)).current;

  const words = shuffledWords.length > 0 ? shuffledWords : room?.shuffledWords ?? [];
  const totalWords = words.length;

  // Word cycling with swipe animation
  useEffect(() => {
    if (totalWords === 0 || finished) return;

    const isLastWord = currentWordIndex >= totalWords - 1;

    const advance = () => {
      const nextIndex = currentWordIndex + 1;
      if (nextIndex >= totalWords) {
        if (currentRound < TOTAL_ROUNDS) {
          setCurrentRound((r) => r + 1);
          setCurrentWordIndex(0);
        } else {
          setFinished(true);
        }
      } else {
        setCurrentWordIndex(nextIndex);
      }
    };

    let rafId: number;
    const timer = setTimeout(() => {
      if (isLastWord) {
        advance();
      } else {
        Animated.timing(swipeAnim, {
          toValue: -SCREEN_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          swipeAnim.setValue(0);
          rafId = requestAnimationFrame(() => {
            advance();
          });
        });
      }
    }, WORD_DISPLAY_MS);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [currentWordIndex, currentRound, totalWords, finished, swipeAnim]);

  // When reading is finished, host advances the game
  useEffect(() => {
    if (!finished) return;

    if (isHost) {
      socketService.emit('advance_reading');
    }
  }, [finished, isHost]);

  // Listen for state_changed to PLAYING
  useEffect(() => {
    const handleStateChanged = (updatedRoom: unknown) => {
      const r = updatedRoom as SerializedRoom;
      setRoom(r);
      if (r.state === GameState.PLAYING) {
        navigation.replace('Playing');
      }
    };

    socketService.on('state_changed', handleStateChanged);
    return () => {
      socketService.off('state_changed', handleStateChanged);
    };
  }, [navigation, setRoom]);

  if (totalWords === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>Loading words...</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.container}>
        <View style={styles.finishedCard}>
          <Text style={styles.finishedText}>Reading complete!</Text>
          <Text style={styles.waitingText}>Preparing game...</Text>
        </View>
      </View>
    );
  }

  // Build the visible stack: up to 3 cards starting from currentWordIndex
  const stackCards = [];
  for (let i = Math.min(2, totalWords - currentWordIndex - 1); i >= 0; i--) {
    const wordIdx = currentWordIndex + i;
    if (wordIdx >= totalWords) continue;

    const offset = STACK_OFFSETS[i];
    const isTop = i === 0;

    const cardStyle = isTop
      ? {
          transform: [
            { translateX: swipeAnim },
            {
              rotate: swipeAnim.interpolate({
                inputRange: [-SCREEN_WIDTH, 0],
                outputRange: ['-8deg', '0deg'],
              }),
            },
            { scale: offset.scale },
          ],
          zIndex: 3,
        }
      : {
          transform: [
            { translateX: offset.x },
            { translateY: offset.y },
            { scale: offset.scale },
          ],
          zIndex: 3 - i,
        };

    stackCards.push(
      <Animated.View
        key={`stack-${i}`}
        style={[styles.card, cardStyle, { position: 'absolute' }]}
      >
        <Text style={styles.word}>{words[wordIdx]}</Text>
      </Animated.View>,
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roundLabel}>Round {currentRound} of {TOTAL_ROUNDS}</Text>
        <Text style={styles.progressLabel}>
          Word {currentWordIndex + 1} of {totalWords}
        </Text>
      </View>

      <View style={styles.stackWrapper}>
        {stackCards}
      </View>

      <View style={styles.dotsContainer}>
        {words.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentWordIndex && styles.dotActive,
              i < currentWordIndex && styles.dotDone,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: Colors, shadows: Shadows) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    header: {
      position: 'absolute',
      top: 60,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      ...shadows.soft,
    },
    roundLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontFamily: fonts.sans,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.mutedInk,
      fontFamily: fonts.sans,
    },
    stackWrapper: {
      width: '85%',
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    card: {
      width: '100%',
      height: 220,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 6,
      ...shadows.hard,
    },
    word: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.ink,
      textAlign: 'center',
      fontFamily: fonts.serif,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    dotsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      paddingBottom: 40,
      marginTop: 24,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.faintInk,
      borderWidth: 1,
      borderColor: colors.ink,
    },
    dotActive: {
      backgroundColor: colors.highlight,
    },
    dotDone: {
      backgroundColor: colors.accent,
    },
    waitingText: {
      fontSize: 16,
      color: colors.mutedInk,
      marginTop: 12,
      fontFamily: fonts.sans,
    },
    finishedText: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontFamily: fonts.serif,
    },
    finishedCard: {
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 6,
      paddingVertical: 18,
      paddingHorizontal: 18,
      alignItems: 'center',
      ...shadows.hard,
    },
  });
