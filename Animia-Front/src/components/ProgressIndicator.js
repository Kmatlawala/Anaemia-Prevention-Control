import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography, borderRadius} from '../theme/theme';

const ProgressIndicator = ({currentStep = 1, totalSteps = 3}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnimations = useRef(
    Array.from({length: totalSteps}, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: currentStep / totalSteps,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Animate individual steps - all steps should be visible
    stepAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1, // Always make all steps visible
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, [currentStep, totalSteps, progressAnim, stepAnimations]);

  const steps = [
    {key: 1, label: 'Registration'},
    {key: 2, label: 'Screening'},
    {key: 3, label: 'Intervention'},
  ];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Step Indicators with connecting lines */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = index + 1 < currentStep;
          const isCurrent = index + 1 === currentStep;
          const isPending = index + 1 > currentStep;

          const scale = stepAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          });

          const opacity = stepAnimations[index];

          return (
            <React.Fragment key={step.key}>
              <Animated.View
                style={[
                  styles.stepContainer,
                  {
                    transform: [{scale}],
                    opacity,
                  },
                ]}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent,
                    isPending && styles.stepCirclePending,
                  ]}>
                  {isCompleted ? (
                    <Icon name="check" size={14} color={colors.white} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isCurrent && styles.stepNumberCurrent,
                        isPending && styles.stepNumberPending,
                      ]}>
                      {step.key}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    isCompleted && styles.stepLabelCompleted,
                    isPending && styles.stepLabelPending,
                  ]}>
                  {step.label}
                </Text>
              </Animated.View>

              {/* Connecting line to next step */}
              {index < steps.length - 1 && (
                <View style={styles.connectingLine}>
                  <Animated.View
                    style={[
                      styles.connectingLineFill,
                      {
                        width: index + 1 < currentStep ? '100%' : '0%',
                      },
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.horizontal,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.horizontal,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCircleCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  stepCirclePending: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  stepNumber: {
    fontSize: 14,
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  stepNumberCurrent: {
    color: colors.white,
  },
  stepNumberPending: {
    color: colors.text,
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: typography.weights.medium,
    marginTop: spacing.sm,
    lineHeight: 14,
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  stepLabelCompleted: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  stepLabelPending: {
    color: colors.textSecondary,
  },
  connectingLine: {
    flex: 1,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    alignSelf: 'center',
    overflow: 'hidden',
    position: 'relative',
    top: 16, // Align with circle center
    borderRadius: 2,
  },
  connectingLineFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});

export default ProgressIndicator;
