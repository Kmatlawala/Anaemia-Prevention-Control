// src/components/Chart.js
import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const isSmallScreen = screenWidth < 360;
const isMediumScreen = screenWidth >= 360 && screenWidth < 414;

const Chart = ({
  type = 'bar',
  data,
  title,
  height = isSmallScreen ? 100 : isMediumScreen ? 120 : 140,
  showLegend = true,
  showValues = true,
  style = {},
}) => {
  const renderBarChart = () => {
    if (
      !data ||
      !data.datasets ||
      !data.datasets[0] ||
      !data.datasets[0].data
    ) {
      return <Text style={styles.noDataText}>No data available</Text>;
    }

    const values = data.datasets[0].data;
    const labels = data.labels || [];
    const colors = data.datasets[0].colors || [];
    const maxValue = Math.max(...values);

    return (
      <View style={styles.barChartContainer}>
        <View style={styles.barChart}>
          {values.map((value, index) => {
            const barHeight = (value / maxValue) * (height - 60);
            const barColor =
              colors[index] ||
              colors.chartColors[index % colors.chartColors.length];

            return (
              <View key={index} style={styles.barItem}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={2}>
                  {labels[index] || `Item ${index + 1}`}
                </Text>
                {showValues && <Text style={styles.barValue}>{value}</Text>}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPieChart = () => {
    if (
      !data ||
      !data.datasets ||
      !data.datasets[0] ||
      !data.datasets[0].data
    ) {
      return <Text style={styles.noDataText}>No data available</Text>;
    }

    const values = data.datasets[0].data;
    const labels = data.labels || [];
    const colors = data.datasets[0].colors || [];
    const total = values.reduce((sum, value) => sum + value, 0);

    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChart}>
          {values.map((value, index) => {
            const percentage = (value / total) * 100;
            const color =
              colors[index] ||
              colors.chartColors[index % colors.chartColors.length];

            return (
              <View key={index} style={styles.pieItem}>
                <View style={[styles.pieColor, {backgroundColor: color}]} />
                <View style={styles.pieTextContainer}>
                  <Text style={styles.pieLabel}>
                    {labels[index] || `Item ${index + 1}`}
                  </Text>
                  <Text style={styles.pieValue}>
                    {value} ({percentage.toFixed(1)}%)
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'pie':
        return renderPieChart();
      case 'bar':
      default:
        return renderBarChart();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartContainer}>{renderChart()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginVertical: 1,
    ...shadows.sm,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  // Bar Chart Styles
  barChartContainer: {
    width: '100%',
    alignItems: 'center',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: isSmallScreen ? 80 : isMediumScreen ? 100 : 120,
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 1,
  },
  barContainer: {
    height: isSmallScreen ? 60 : isMediumScreen ? 80 : 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 2,
  },
  bar: {
    width: isSmallScreen ? 24 : isMediumScreen ? 27 : 30,
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 10,
  },
  barValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  // Pie Chart Styles
  pieChartContainer: {
    width: '100%',
  },
  pieChart: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  pieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
    width: '45%',
  },
  pieColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.xs,
  },
  pieTextContainer: {
    flex: 1,
  },
  pieLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  pieValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
});

export default Chart;
