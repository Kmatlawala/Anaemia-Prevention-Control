
import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';
import {API} from '../utils/api';
import {PieChart as GiftedPieChart} from 'react-native-gifted-charts';

const DOTTracker = ({beneficiaryId, onUpdate}) => {
  const [todayTaken, setTodayTaken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [adherenceData, setAdherenceData] = useState(null);

  useEffect(() => {
    checkTodayAdherence();
    fetchAdherenceData();
  }, [beneficiaryId]);

  const checkTodayAdherence = async () => {
    try {
      const response = await API.getTodayAdherence(beneficiaryId);
      if (response.success) {
        setTodayTaken(response.takenToday);
      }
    } catch (error) {
      }
  };

  const fetchAdherenceData = async () => {
    try {
      const response = await API.getAdherenceData(beneficiaryId);
      if (response.success) {
        setAdherenceData(response.data);
      }
    } catch (error) {
      }
  };

  const markIFATaken = async () => {
    setLoading(true);
    try {
      const response = await API.markIFATaken(beneficiaryId);
      if (response.success) {
        setTodayTaken(true);
        Alert.alert(
          'Success',
          'IFA intake recorded successfully! Keep up the good work.',
        );
        onUpdate && onUpdate();
        fetchAdherenceData();
      } else {
        Alert.alert('Error', response.message || 'Failed to record IFA intake');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record IFA intake. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = () => {
    Alert.alert('Confirm IFA Intake', 'Have you taken your IFA tablet today?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Yes, I took it',
        onPress: markIFATaken,
        style: 'default',
      },
    ]);
  };

  const getAdherencePercentage = () => {
    if (!adherenceData) return 0;
    const {takenDays, totalDays} = adherenceData;
    return totalDays > 0 ? Math.round((takenDays / totalDays) * 100) : 0;
  };

  const getAdherenceColor = percentage => {
    if (percentage >= 90) return colors.success;
    if (percentage >= 70) return colors.warning;
    return colors.error;
  };

  const getAdherenceStatus = percentage => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 70) return 'Good';
    if (percentage >= 50) return 'Fair';
    return 'Needs Improvement';
  };

  const pieChartData = useMemo(() => {
    if (!adherenceData) return null;

    const {takenDays, missedDays, totalDays} = adherenceData;
    const takenPercentage = totalDays > 0 ? (takenDays / totalDays) * 100 : 0;
    const missedPercentage = totalDays > 0 ? (missedDays / totalDays) * 100 : 0;

    const data = [];
    
    if (takenDays > 0) {
      data.push({
        value: takenDays,
        color: colors.success || '#4CAF50',
        text: `${Math.round(takenPercentage)}%`,
        label: 'Taken',
      });
    }
    
    if (missedDays > 0) {
      data.push({
        value: missedDays,
        color: colors.error || '#F44336',
        text: `${Math.round(missedPercentage)}%`,
        label: 'Missed',
      });
    }

    if (data.length === 0) {
      data.push({
        value: 1,
        color: colors.textSecondary || '#999',
        text: '0%',
        label: 'No Data',
      });
    }

    return data;
  }, [adherenceData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="eye" size={24} color={colors.primary} />
        <Text style={styles.title}>Daily IFA Tracking</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.todayStatus}>
          <View style={styles.statusIcon}>
            <Icon
              name={todayTaken ? 'check-circle' : 'clock-outline'}
              size={32}
              color={todayTaken ? colors.success : colors.warning}
            />
          </View>
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>
              {todayTaken ? 'IFA Taken Today' : 'IFA Not Taken Today'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {todayTaken
                ? 'Great job! Keep up the consistency.'
                : 'Please take your IFA tablet as prescribed.'}
            </Text>
          </View>
        </View>

        {!todayTaken && (
          <TouchableOpacity
            style={styles.markButton}
            onPress={handleMarkTaken}
            disabled={loading}>
            <Icon name="check" size={20} color={colors.white} />
            <Text style={styles.markButtonText}>Mark as Taken</Text>
          </TouchableOpacity>
        )}
      </View>

      {adherenceData && (
        <View style={styles.adherenceCard}>
          <View style={styles.adherenceHeader}>
            <Text style={styles.adherenceTitle}>Adherence Summary</Text>
          </View>

          {}
          {pieChartData && pieChartData.length > 0 && (
            <View style={styles.pieChartContainer}>
              <GiftedPieChart
                data={pieChartData}
                radius={80}
                innerRadius={50}
                innerCircleColor={colors.background}
                innerCircleBorderWidth={2}
                innerCircleBorderColor={colors.borderLight}
                centerLabelComponent={() => {
                  const percentage = getAdherencePercentage();
                  return (
                    <View style={styles.centerLabel}>
                      <Text style={styles.centerPercentage}>{percentage}%</Text>
                      <Text style={styles.centerLabelText}>Adherence</Text>
                    </View>
                  );
                }}
                showText={false}
                showGradient={false}
                isThreeD={false}
              />
              
              {}
              <View style={styles.legendContainer}>
                {pieChartData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        {backgroundColor: item.color},
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {item.label}: {item.value} days
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.adherenceStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getAdherencePercentage()}%</Text>
              <Text style={styles.statLabel}>Adherence Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{adherenceData.takenDays}</Text>
              <Text style={styles.statLabel}>Days Taken</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{adherenceData.missedDays}</Text>
              <Text style={styles.statLabel}>Days Missed</Text>
            </View>
          </View>

          <View style={styles.adherenceStatus}>
            <View
              style={[
                styles.statusIndicator,
                {backgroundColor: getAdherenceColor(getAdherencePercentage())},
              ]}
            />
            <Text style={styles.adherenceStatusText}>
              {getAdherenceStatus(getAdherencePercentage())}
            </Text>
          </View>
        </View>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adherence Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Detailed adherence tracking will be available here.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  todayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusIcon: {
    marginRight: spacing.md,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  markButtonText: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  adherenceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  adherenceTitle: {
    fontSize: 16,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
  },
  adherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  adherenceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  adherenceStatusText: {
    fontSize: 14,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    margin: spacing.lg,
    maxHeight: '80%',
    width: '90%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pieChartContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPercentage: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  centerLabelText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
});

export default DOTTracker;
