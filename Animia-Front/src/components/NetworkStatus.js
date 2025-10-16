// src/components/NetworkStatus.js
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {isOnline, addNetworkListener} from '../utils/asyncCache';
import {colors, spacing, typography} from '../theme/theme';

const NetworkStatus = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Check initial network status
    const checkNetwork = async () => {
      const status = await isOnline();
      setOnline(status);
    };
    checkNetwork();

    // Listen for network changes
    const unsubscribe = addNetworkListener(state => {
      setOnline(state.isConnected && state.isInternetReachable);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (online) {
    return null; // Don't show anything when online
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Offline Mode - Data will sync when online</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning || '#FFA500',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  text: {
    color: colors.white || '#FFFFFF',
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
});

export default NetworkStatus;
