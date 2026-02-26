import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { socketService } from '../services/socket.service';
import { useGameStore } from '../store/game.store';
import {
  GameState,
  SerializedRoom,
  WordSubmittedPayload,
  ReadingWordsPayload,
  ErrorPayload,
} from '../types/game';
import type { WordEntryScreenProps } from '../types/navigation';
import { fonts, type Colors, type Shadows } from '../theme';
import { useColors, useShadows } from '../theme-context';

const MAX_WORD_LENGTH = 50;

export default function WordEntryScreen({ navigation }: WordEntryScreenProps) {
  const colors = useColors();
  const shadowStyles = useShadows();
  const styles = useMemo(() => createStyles(colors, shadowStyles), [colors, shadowStyles]);

  const [word, setWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const submittedWord = useGameStore((s) => s.submittedWord);
  const wordSubmittedCount = useGameStore((s) => s.wordSubmittedCount);
  const totalPlayers = useGameStore((s) => s.totalPlayers);
  const setRoom = useGameStore((s) => s.setRoom);
  const setSubmittedWord = useGameStore((s) => s.setSubmittedWord);
  const setWordSubmittedCount = useGameStore((s) => s.setWordSubmittedCount);
  const setShuffledWords = useGameStore((s) => s.setShuffledWords);

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Pulse animation when someone submits
  useEffect(() => {
    if (wordSubmittedCount > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [wordSubmittedCount, pulseAnim]);

  useEffect(() => {
    const handleWordSubmitted = (payload: unknown) => {
      const data = payload as WordSubmittedPayload;
      setWordSubmittedCount(data.wordCount, data.totalPlayers);
    };

    const handleReadingWords = (payload: unknown) => {
      const data = payload as ReadingWordsPayload;
      setShuffledWords(data.words);
    };

    const handleStateChanged = (updatedRoom: unknown) => {
      const room = updatedRoom as SerializedRoom;
      setRoom(room);
      if (room.state === GameState.READING) {
        navigation.replace('Reading');
      }
    };

    const handleError = (payload: unknown) => {
      setSubmitting(false);
      Alert.alert('Error', (payload as ErrorPayload).message);
    };

    socketService.on('word_submitted', handleWordSubmitted);
    socketService.on('reading_words', handleReadingWords);
    socketService.on('state_changed', handleStateChanged);
    socketService.on('error', handleError);

    return () => {
      socketService.off('word_submitted', handleWordSubmitted);
      socketService.off('reading_words', handleReadingWords);
      socketService.off('state_changed', handleStateChanged);
      socketService.off('error', handleError);
    };
  }, [navigation, setRoom, setWordSubmittedCount, setShuffledWords]);

  const handleSubmit = () => {
    const trimmed = word.trim();
    if (trimmed.length === 0) {
      Alert.alert('Invalid Word', 'Please enter a word or phrase.');
      return;
    }
    setSubmitting(true);
    setSubmittedWord(trimmed);
    socketService.emit('submit_word', { word: trimmed });
  };

  const hasSubmitted = submittedWord !== null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.container}>
      <Text style={styles.title}>Enter Your Word</Text>
      <Text style={styles.subtitle}>
        Choose a secret word or phrase that others will try to guess
      </Text>

      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={[styles.input, hasSubmitted && styles.inputDisabled]}
          placeholder="Your secret word..."
          placeholderTextColor={colors.faintInk}
          value={hasSubmitted ? submittedWord : word}
          onChangeText={setWord}
          maxLength={MAX_WORD_LENGTH}
          editable={!hasSubmitted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={hasSubmitted ? undefined : handleSubmit}
        />
        <Text style={styles.charCount}>
          {(hasSubmitted ? submittedWord.length : word.length)}/{MAX_WORD_LENGTH}
        </Text>
      </View>

      {!hasSubmitted ? (
        <TouchableOpacity
          style={[styles.button, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>Submit Word</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.waitingText}>Waiting for others...</Text>
          <Animated.Text
            style={[
              styles.progressText,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {wordSubmittedCount}/{totalPlayers} players submitted
          </Animated.Text>
        </View>
      )}
    </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors, shadows: Shadows) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.paper,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.ink,
      marginBottom: 8,
      fontFamily: fonts.serif,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedInk,
      textAlign: 'center',
      marginBottom: 32,
      paddingHorizontal: 16,
      fontFamily: fonts.sans,
    },
    inputWrapper: {
      width: '100%',
      marginBottom: 20,
    },
    input: {
      width: '100%',
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 6,
      padding: 14,
      fontSize: 18,
      backgroundColor: colors.card,
      fontFamily: fonts.sans,
      color: colors.ink,
      ...shadows.soft,
    },
    inputDisabled: {
      backgroundColor: colors.subtleBg,
      color: colors.faintInk,
    },
    charCount: {
      alignSelf: 'flex-end',
      marginTop: 4,
      fontSize: 12,
      color: colors.faintInk,
      fontFamily: fonts.sans,
    },
    button: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: 'center',
      backgroundColor: colors.highlight,
      borderWidth: 2,
      borderColor: colors.ink,
      ...shadows.hard,
    },
    disabledButton: {
      opacity: 0.5,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 18,
      fontWeight: '800',
      fontFamily: fonts.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    waitingContainer: {
      alignItems: 'center',
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.ink,
      paddingVertical: 18,
      paddingHorizontal: 16,
      width: '100%',
      ...shadows.soft,
    },
    waitingText: {
      fontSize: 18,
      color: colors.mutedInk,
      marginTop: 16,
      fontWeight: '700',
      fontFamily: fonts.sans,
    },
    progressText: {
      fontSize: 16,
      color: colors.accent,
      marginTop: 8,
      fontWeight: '800',
      fontFamily: fonts.sans,
    },
  });
