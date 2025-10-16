import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, RefreshControl} from 'react-native';
import Header from '../components/Header';
import {colors, spacing, typography, platform} from '../theme/theme';
import {API} from '../utils/api';

const PushNotification = ({navigation}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await API.request('/api/notifications/list');
      setRows(Array.isArray(data) ? data : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.root}>
      <Header
        title="Notifications"
        variant="back"
        onBackPress={() => navigation.goBack()}
      />
      <FlatList
        data={rows}
        keyExtractor={i => String(i.id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={{paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md}}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>
              {new Date(item.sent_at).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {...typography.subtitle, color: colors.text},
  body: {color: colors.text, marginTop: 4},
  meta: {color: colors.textMuted, marginTop: 6, fontSize: 12},
});

export default PushNotification;
