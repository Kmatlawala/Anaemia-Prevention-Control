import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography} from '../theme/theme';
import {useNavigation} from '@react-navigation/native';

const Header = ({
  title = 'Anaemia Prevention & Control',
  variant,
  onMenuPress,
  onBellPress,
  onBackPress,
  rightIconName = '',
  rightIcon2Name = '',
  onRightIcon2Press,
  showNotificationBadge = false,
  role = '',
}) => {
  const navigation = useNavigation();
  const mode = useMemo(() => {
    if (variant) return variant;
    if (onBackPress) return 'back';
    if (onMenuPress) return 'dashboard';
    return 'dashboard';
  }, [variant, onMenuPress, onBackPress]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {mode === 'dashboard' ? (
        <View style={styles.containerDash}>
          <TouchableOpacity
            style={styles.side}
            onPress={onMenuPress}
            android_ripple={{color: '#dde7f6', borderless: true}}>
            <View style={styles.menuBtn}>
              <Icon name="menu" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

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
      ) : (
        <View style={styles.containerBack}>
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

          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.backTitle}>
            {title}
          </Text>

          {rightIconName && String(role || '').toLowerCase() !== 'patient' && (
            <TouchableOpacity
              style={[styles.side, {width: 44}]}
              onPress={onBellPress}
              android_ripple={{color: '#dde7f6', borderless: true}}>
              <View style={styles.rightIcon}>
                <Icon name={rightIconName} size={24} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}
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

  // DASHBOARD
  containerDash: {
    height: HEADER_H_DASH,
    paddingHorizontal: spacing.horizontal, // 16px left/right
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

  // BACK (flex-start)
  containerBack: {
    height: HEADER_H_BACK,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  backTouch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  backTitle: {
    ...typography.title,
    color: colors.text,
    flexShrink: 1,
    maxWidth: '80%',
    textAlign: 'left',
    flex: 1,
  },
  rightIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});

export default Header;
