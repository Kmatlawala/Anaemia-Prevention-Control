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

          <TouchableOpacity
            style={styles.side}
            onPress={
              onBellPress || (() => navigation.navigate('Notifications'))
            }
            android_ripple={{color: '#dde7f6', borderless: true}}>
            <View style={styles.bellBtn}>
              <Icon name={rightIconName} size={20} color="#fff" />
            </View>
          </TouchableOpacity>
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
                navigation.navigate('RoleSelect');
              }
            }}
            style={styles.backTouch}
            android_ripple={{color: '#dde7f6', borderless: true}}>
            <Icon name="arrow-left" size={28} color={colors.primary} />
          </TouchableOpacity>

          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.backTitle}>
            {title}
          </Text>

          {rightIconName && (
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
    paddingHorizontal: spacing.md,
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
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: spacing.md,
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
