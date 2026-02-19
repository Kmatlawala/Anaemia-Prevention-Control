import React, {useMemo, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography} from '../theme/theme';
import {useNavigation} from '@react-navigation/native';

const Header = ({
  title = 'Anaemia Shield',
  variant,
  onMenuPress,
  onBellPress,
  onBackPress,
  rightIconName = '',
  rightIconPress,
  rightIcon2Name = '',
  onRightIcon2Press,
  showNotificationBadge = false,
  role = '',
  showBeneficiaryIcon = false,
}) => {
  const navigation = useNavigation();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const mode = useMemo(() => {
    if (variant) return variant;
    if (onBackPress) return 'back';
    if (onMenuPress) return 'dashboard';
    return 'dashboard';
  }, [variant, onMenuPress, onBackPress]);

  const isPatientInfoIcon = useMemo(() => {
    return String(role || '').toLowerCase() === 'patient' && 
           rightIcon2Name === 'information-outline';
  }, [role, rightIcon2Name]);

  const isPatientLogoutIcon = useMemo(() => {
    return String(role || '').toLowerCase() === 'patient' && 
           rightIconName === 'logout';
  }, [role, rightIconName]);

  useEffect(() => {
    if (isPatientInfoIcon) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isPatientInfoIcon]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {mode === 'dashboard' ? (
        <View style={styles.containerDash}>
          {}
          {String(role || '').toLowerCase() !== 'patient' && onMenuPress && (
            <TouchableOpacity
              style={styles.side}
              onPress={onMenuPress}
              android_ripple={{color: '#dde7f6', borderless: true}}>
              <View style={styles.menuBtn}>
                <Icon name="menu" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
          {}
          {String(role || '').toLowerCase() === 'patient' && (
            <View style={styles.side} />
          )}

          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.titleCenter}>
            {title}
          </Text>

          <View style={styles.rightIconsContainer}>
            {rightIcon2Name && (
              <TouchableOpacity
                style={styles.side}
                onPress={onRightIcon2Press}
                android_ripple={{color: '#dde7f6', borderless: true}}>
                <View style={styles.infoBtn}>
                  <Icon name={rightIcon2Name} size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            )}

            {rightIconName &&
              String(role || '').toLowerCase() !== 'patient' && (
                <TouchableOpacity
                  style={styles.side}
                  onPress={
                    onBellPress || (() => navigation.navigate('Notifications'))
                  }
                  android_ripple={{color: '#dde7f6', borderless: true}}>
                  <View style={styles.bellBtn}>
                    <Icon name={rightIconName} size={20} color="#fff" />
                    {showNotificationBadge && <View style={styles.badge} />}
                  </View>
                </TouchableOpacity>
              )}
          </View>
        </View>
      ) : mode === 'back' ? (
        <View style={styles.containerBack}>
          {onBackPress && (
            <TouchableOpacity
              onPress={() => {
                if (onBackPress) {
                  return onBackPress();
                }
                if (navigation.canGoBack && navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('AdminLogin');
                }
              }}
              style={styles.backTouch}
              android_ripple={{color: '#dde7f6', borderless: true}}>
              <Icon name="arrow-left" size={28} color={colors.primary} />
            </TouchableOpacity>
          )}
          {!onBackPress && showBeneficiaryIcon && (
            <View style={styles.backTouch}>
              <View style={styles.beneficiaryIconContainer}>
                <Icon name="account-circle" size={32} color={colors.primary} />
              </View>
            </View>
          )}
          {!onBackPress && !showBeneficiaryIcon && <View style={styles.backTouch} />}

          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.backTitle}>
            {title}
          </Text>

          <View style={styles.rightIconsContainerBack}>
            {rightIcon2Name && (
              <TouchableOpacity
                style={[styles.side, {width: 44}]}
                onPress={onRightIcon2Press}
                android_ripple={{color: '#dde7f6', borderless: true}}
                activeOpacity={0.7}>
                <Animated.View
                  style={[
                    styles.rightIcon,
                    isPatientInfoIcon && styles.rightIconPatient,
                    {
                      transform: [
                        {scale: scaleAnim},
                      ],
                    },
                  ]}>
                  <Icon 
                    name={rightIcon2Name} 
                    size={24} 
                    color={isPatientInfoIcon ? colors.white : colors.primary} 
                  />
                  {isPatientInfoIcon && (
                    <Animated.View
                      style={[
                        styles.infoIconBadge,
                        {
                          transform: [{scale: pulseAnim}],
                        },
                      ]}
                    />
                  )}
                </Animated.View>
              </TouchableOpacity>
            )}

            {rightIconName && (
              <TouchableOpacity
                style={[styles.side, {width: 44}]}
                onPress={rightIconPress || onBellPress}
                android_ripple={{color: '#dde7f6', borderless: true}}
                activeOpacity={0.7}>
                <View style={[
                  styles.rightIcon,
                  isPatientLogoutIcon && styles.rightIconLogout,
                ]}>
                  <Icon 
                    name={rightIconName} 
                    size={24} 
                    color={isPatientLogoutIcon ? colors.white : colors.primary} 
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const HEADER_H_DASH = 88;
const HEADER_H_BACK = 56;

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EDF6',
  },

  containerDash: {
    height: HEADER_H_DASH,
    paddingHorizontal: spacing.horizontal, 
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {width: 56, alignItems: 'center', justifyContent: 'center'},
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  infoBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  titleCenter: {
    ...typography.title,
    color: colors.text,
    maxWidth: '100%',
    textAlign: 'center',
    flex: 1,
  },

  containerBack: {
    height: HEADER_H_BACK,
    paddingHorizontal: spacing.horizontal, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  backTouch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  beneficiaryIconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
  },
  backTitle: {
    ...typography.title,
    color: colors.text,
    flexShrink: 1,
    maxWidth: '80%',
    textAlign: 'left',
    flex: 1,
    marginLeft: spacing.xs,
  },
  rightIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  rightIconPatient: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary + '80',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  rightIconLogout: {
    backgroundColor: colors.error || '#FF4444',
    borderWidth: 2,
    borderColor: (colors.error || '#FF4444') + '80',
    shadowColor: colors.error || '#FF4444',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 22, 
  },
  infoIconBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error || '#FF4444',
    borderWidth: 2,
    borderColor: colors.white,
  },
  rightIconsContainerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export default Header;
