import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const ThankYouPopup = ({visible, onClose, onComplete}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        Animated.timing(checkmarkAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 300);
    } else {
      
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      checkmarkAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim, checkmarkAnim]);

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const checkmarkScale = checkmarkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  const checkmarkOpacity = checkmarkAnim;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Animated.View
          style={[
            styles.popupContainer,
            {
              transform: [{scale: scaleAnim}],
            },
          ]}>
          {}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.checkmarkContainer,
                {
                  transform: [{scale: checkmarkScale}],
                  opacity: checkmarkOpacity,
                },
              ]}>
              <Icon name="check" size={48} color={colors.white} />
            </Animated.View>
          </View>

          {}
          <View style={styles.content}>
            <Text style={styles.title}>Thank You!</Text>
            <Text style={styles.subtitle}>
              Beneficiary registration and screening process completed
              successfully.
            </Text>
            <Text style={styles.description}>
              All data has been saved and the beneficiary has been registered in
              the system. You can now proceed with follow-up activities.
            </Text>
          </View>

          {}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleComplete}
              activeOpacity={0.8}>
              <Icon name="home" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.8}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.horizontal,
  },
  popupContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.horizontal,
    width: screenWidth * 0.9,
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  content: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.horizontal,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.horizontal,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
});

export default ThankYouPopup;
