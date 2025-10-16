// src/screens/Reports.js
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
  memo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';
import dayjs from 'dayjs';
import LinearGradient from 'react-native-linear-gradient';
// Import chart components with proper error handling
import {
  PieChart as PieChartComponent,
  LineChart as LineChartComponent,
} from 'react-native-chart-kit';
import {
  BarChart as GiftedBarChart,
  LineChart as GiftedLineChart,
  PieChart as GiftedPieChart,
} from 'react-native-gifted-charts';

// Create safe wrapper components
const PieChart = ({data, ...props}) => {
  console.log('[PieChart] Received data:', JSON.stringify(data, null, 2));

  let pieChartData;

  // Check if data is already in PieChart format (array of objects)
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('[PieChart] No data available (empty array)');
      return (
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            padding: spacing.md,
          }}>
          No data available
        </Text>
      );
    }

    // Data is already in correct format, use it directly
    console.log('[PieChart] Data is already in correct format, using directly');
    pieChartData = data;
  } else if (data && data.labels && data.labels.length > 0) {
    // Data is in chart-kit format, convert it
    console.log('[PieChart] Converting data from chart-kit format');

    // Validate data structure for PieChart compatibility
    if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      return (
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            padding: spacing.md,
          }}>
          Invalid data format
        </Text>
      );
    }

    // Convert data format for PieChart compatibility
    pieChartData = data.labels.map((label, index) => ({
      name: label,
      population: data.datasets[0].data[index],
      color: data.datasets[0].colors
        ? data.datasets[0].colors[index]
        : colors.primary,
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
  } else {
    console.log('[PieChart] No data or labels available');
    return (
      <Text
        style={{
          textAlign: 'center',
          color: colors.textSecondary,
          padding: spacing.md,
        }}>
        No data available
      </Text>
    );
  }

  console.log(
    '[PieChart] Final data for rendering:',
    JSON.stringify(pieChartData, null, 2),
  );

  try {
    // Convert data format for GiftedPieChart - ensure we have valid numbers
    const giftedPieData = pieChartData.map(item => {
      const value = Number(item.population || item.value || 0);
      return {
        value: isNaN(value) ? 0 : value,
        color: item.color || '#2563EB',
        text: item.name || item.text || 'Unknown',
      };
    });

    console.log(
      '[PieChart] Converted data:',
      JSON.stringify(giftedPieData, null, 2),
    );

    return (
      <View style={{alignItems: 'center'}}>
        <GiftedPieChart
          data={giftedPieData}
          radius={90}
          innerRadius={50}
          showText={false}
          innerCircleColor={colors.background}
          innerCircleBorderWidth={0}
          isThreeD={false}
          showGradient={false}
          centerLabelComponent={() => {
            // Find the largest category
            const largestCategory = giftedPieData.reduce(
              (max, item) => (item.value > max.value ? item : max),
              giftedPieData[0],
            );
            const total = giftedPieData.reduce(
              (sum, item) => sum + (item.value || 0),
              0,
            );
            const percentage =
              total > 0 ? Math.round((largestCategory.value / total) * 100) : 0;

            return (
              <View style={{alignItems: 'center', justifyContent: 'center'}}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: largestCategory.color,
                    textAlign: 'center',
                  }}>
                  {percentage}%
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    textAlign: 'center',
                    marginTop: 4,
                  }}>
                  {largestCategory.text}
                </Text>
              </View>
            );
          }}
          {...props}
        />

        {/* Custom Legend */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: spacing.lg,
            paddingHorizontal: spacing.sm,
          }}>
          {giftedPieData.map((item, index) => {
            const total = giftedPieData.reduce(
              (sum, cat) => sum + (cat.value || 0),
              0,
            );
            const percentage =
              total > 0 ? Math.round((item.value / total) * 100) : 0;

            return (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginHorizontal: spacing.sm,
                  marginVertical: spacing.xs,
                }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: item.color,
                    marginRight: spacing.xs,
                  }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: colors.text,
                  }}>
                  {item.text}: {percentage}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  } catch (error) {
    console.error('[PieChart] Error rendering chart:', error);
    return (
      <View
        style={{
          height: 220,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          margin: spacing.sm,
        }}>
        <Icon name="chart-pie" size={48} color={colors.textSecondary} />
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            padding: spacing.md,
            fontSize: 16,
            fontWeight: '600',
          }}>
          Pie Chart
        </Text>
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            paddingHorizontal: spacing.md,
            fontSize: 14,
          }}>
          Unable to render
        </Text>
      </View>
    );
  }
};

const BarChart = ({data, ...props}) => {
  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <Text
        style={{
          textAlign: 'center',
          color: colors.textSecondary,
          padding: spacing.md,
        }}>
        No data available
      </Text>
    );
  }

  // Validate data structure for BarChart compatibility
  if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
    return (
      <Text
        style={{
          textAlign: 'center',
          color: colors.textSecondary,
          padding: spacing.md,
        }}>
        Invalid data format
      </Text>
    );
  }

  try {
    // Convert data to accurate line format
    const lineData = data.labels.map((label, index) => {
      let color;
      switch (label.toLowerCase()) {
        case 'normal':
          color = '#10B981'; // Green
          break;
        case 'mild':
          color = '#F59E0B'; // Orange/Yellow
          break;
        case 'moderate':
          color = '#EF4444'; // Red
          break;
        case 'severe':
          color = '#DC2626'; // Dark Red
          break;
        case 'unknown':
          color = '#6B7280'; // Grey
          break;
        default:
          color = '#2563EB'; // Blue
      }

      // Add emojis based on health status
      let emoji;
      switch (label.toLowerCase()) {
        case 'normal':
          emoji = '😊'; // Happy face
          break;
        case 'mild':
          emoji = '😐'; // Neutral face
          break;
        case 'moderate':
          emoji = '😟'; // Worried face
          break;
        case 'severe':
          emoji = '😰'; // Anxious face
          break;
        case 'unknown':
          emoji = '?'; // Simple question mark
          break;
        default:
          emoji = '📊'; // Chart emoji
      }

      return {
        value: data.datasets[0].data[index],
        label: label,
        frontColor: color,
        topLabelComponent: () => (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 5,
              marginLeft: -15,
              width: 50,
            }}>
            <Text
              style={{
                fontSize: 18,
                color: color,
                textAlign: 'center',
                lineHeight: 20,
                width: 20,
              }}>
              {emoji}
            </Text>
            <Text
              style={{
                color: color,
                fontSize: 11,
                fontWeight: '600',
                marginTop: 1,
                textAlign: 'center',
                lineHeight: 12,
                width: 20,
              }}>
              {data.datasets[0].data[index]}
            </Text>
          </View>
        ),
      };
    });

    return (
      <GiftedBarChart
        data={lineData}
        width={screenWidth - 120}
        height={280}
        hideRules={false}
        hideAxesAndRules={false}
        xAxisThickness={1}
        yAxisThickness={1}
        xAxisColor={colors.border}
        yAxisColor={colors.border}
        yAxisTextStyle={{color: colors.primary, fontSize: 12}}
        xAxisLabelTextStyle={{color: colors.text, fontSize: 12}}
        noOfSections={5}
        maxValue={Math.max(...data.datasets[0].data) + 3}
        minValue={0}
        stepValue={3}
        barWidth={40}
        spacing={25}
        roundedTop
        roundedBottom
        showValuesOnTopOfBars={true}
        isThreeD={true}
        isAnimated={true}
        animationDuration={1000}
        showGradient={true}
        gradientColor={colors.primary}
        {...props}
      />
    );
  } catch (error) {
    console.error('[BarChart] Error rendering chart:', error);
    return (
      <View
        style={{
          height: 200,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          margin: spacing.sm,
        }}>
        <Icon name="chart-area" size={48} color={colors.textSecondary} />
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            padding: spacing.md,
            fontSize: 16,
            fontWeight: '600',
          }}>
          Area Chart
        </Text>
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            paddingHorizontal: spacing.md,
            fontSize: 14,
          }}>
          Unable to render
        </Text>
      </View>
    );
  }
};

// Area Chart wrapper for health status analysis
const AreaChart = ({data, ...props}) => {
  console.log('[AreaChart] Received data:', JSON.stringify(data, null, 2));

  if (!data || !data.labels || data.labels.length === 0) {
    console.log('[AreaChart] No data or labels available');
    return (
      <Text
        style={{
          textAlign: 'center',
          color: colors.textSecondary,
          padding: spacing.md,
        }}>
        No data available
      </Text>
    );
  }

  // Validate data structure for AreaChart compatibility
  if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
    console.log('[AreaChart] Invalid data structure');
    return (
      <Text
        style={{
          textAlign: 'center',
          color: colors.textSecondary,
          padding: spacing.md,
        }}>
        Invalid data format
      </Text>
    );
  }

  try {
    return <LineChartComponent data={data} {...props} />;
  } catch (error) {
    console.error('[AreaChart] Error rendering chart:', error);
    return (
      <View
        style={{
          height: 200,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          margin: spacing.sm,
        }}>
        <Icon name="chart-area" size={48} color={colors.textSecondary} />
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            padding: spacing.md,
            fontSize: 16,
            fontWeight: '600',
          }}>
          Area Chart
        </Text>
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            paddingHorizontal: spacing.md,
            fontSize: 14,
          }}>
          Unable to render
        </Text>
      </View>
    );
  }
};
import {
  setFilters,
  resetFilters,
  setCurrentReport,
  setLoading as setReportLoading,
  setError as setReportError,
  selectReportFilters,
  selectCurrentReport,
  selectReportLoading,
  selectReportError,
  fetchReports,
} from '../store/reportSlice';
import {
  fetchBeneficiaries,
  selectBeneficiaries,
  selectBeneficiaryLoading,
  selectBeneficiaryError,
} from '../store/beneficiarySlice';
import {debugCacheStatus} from '../utils/asyncCache';
import {
  exportJsonToXlsx,
  exportJsonToCSV,
  exportJsonToText,
} from '../utils/export';
import {API} from '../utils/api';
import Header from '../components/Header';
import NetworkStatus from '../components/NetworkStatus';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {BackHandler} from 'react-native';
import {getRole} from '../utils/role';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width: screenWidth} = Dimensions.get('window');

const Reports = ({navigation, route}) => {
  const dispatch = useDispatch();
  const filters = useSelector(selectReportFilters);
  const currentReport = useSelector(selectCurrentReport);
  const loading = useSelector(selectReportLoading);
  const error = useSelector(selectReportError);

  // Get beneficiaries from Redux store (with offline caching)
  const beneficiaries = useSelector(selectBeneficiaries);
  const beneficiaryLoading = useSelector(selectBeneficiaryLoading);
  const beneficiaryError = useSelector(selectBeneficiaryError);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Track if we've already processed data to prevent infinite loops
  const hasProcessedData = useRef(false);

  const [agg, setAgg] = useState({
    total: 0,
    normal: 0,
    mild: 0,
    moderate: 0,
    severe: 0,
    unknown: 0,
  });
  const [catAgg, setCatAgg] = useState({
    Pregnant: 0,
    Adolescent: 0,
    Under5: 0,
    WoRA: 0,
  });
  const [rows, setRows] = useState([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [severityChartData, setSeverityChartData] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({
    total: 0,
    normal: 0,
    mild: 0,
    moderate: 0,
    severe: 0,
    unknown: 0,
  });

  // Removed unused progress bar animation values for better performance
  const DateTimePicker = useMemo(() => {
    try {
      const mod = require('@react-native-community/datetimepicker');
      return mod.default || mod.DateTimePicker || null;
    } catch (_) {
      return null;
    }
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        navigation.navigate('Dashboard');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  // Load beneficiaries and run animations on component mount
  useEffect(() => {
    // Only fetch beneficiaries if we don't have any data
    if (!beneficiaries || beneficiaries.length === 0) {
      console.log('[Reports] Initial load - fetching beneficiaries...');
      dispatch(fetchBeneficiaries());
    } else {
      console.log(
        '[Reports] Initial load - using existing beneficiaries:',
        beneficiaries.length,
      );
    }

    // Start with visible content, then add subtle animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dispatch]); // Only run once on mount

  // Process data when beneficiaries are loaded
  useEffect(() => {
    if (
      beneficiaries &&
      beneficiaries.length > 0 &&
      !hasProcessedData.current
    ) {
      console.log('[Reports] Beneficiaries loaded, processing data...');
      hasProcessedData.current = true;
      load(true); // Skip fetching since we already have data
    }
  }, [beneficiaries]); // Run when beneficiaries change

  // Removed unused progress bar animations for better performance

  // Update dashboard and list immediately when filters change
  useEffect(() => {
    hasProcessedData.current = false; // Reset flag when filters change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
  useEffect(() => {
    (async () => {
      const r = await getRole();
      if (String(r || '').toLowerCase() === 'patient') {
        // patients should not view reports, send back
        navigation.navigate('Dashboard');
      }
    })();
  }, [navigation]);

  // Simplified counter animation for better performance
  const animateCounters = targetValues => {
    // Use direct state update instead of complex animation
    setAnimatedValues(targetValues);
  };

  const computeSeverity = (hb, anemiaCategory) => {
    if (anemiaCategory && anemiaCategory !== null && anemiaCategory !== '') {
      const category = anemiaCategory.toLowerCase().trim();
      if (category === 'no anemia' || category === 'normal') return 'normal';
      if (category === 'mild') return 'mild';
      if (category === 'moderate') return 'moderate';
      if (category === 'severe') return 'severe';
    }

    if (hb == null || hb === '') return 'unknown';
    const v = Number(hb);
    if (Number.isNaN(v)) return 'unknown';

    if (v >= 12) return 'normal';
    if (v >= 11) return 'mild';
    if (v >= 8) return 'moderate';
    return 'severe';
  };

  const load = async (skipFetch = false) => {
    dispatch(setReportLoading(true));
    dispatch(setReportError(null)); // Clear any previous errors
    try {
      await debugCacheStatus();

      // Use beneficiaries from Redux store (don't fetch again if we already have data)
      let data = beneficiaries;

      // Only fetch if we don't have data and we're not skipping the fetch
      if ((!data || data.length === 0) && !skipFetch) {
        console.log('[Reports] No beneficiaries in Redux, fetching...');
        const fetchResult = await dispatch(fetchBeneficiaries());
        data = fetchResult.payload || beneficiaries;
      } else {
        console.log(
          '[Reports] Using existing beneficiaries from Redux:',
          data.length,
        );
      }

      if (!Array.isArray(data) || data.length === 0) {
        console.warn('[Reports] No beneficiaries data available');
        // Don't set error immediately, check if we're still loading
        if (!beneficiaryLoading) {
          // Try to get cached data as fallback
          try {
            const {getCachedBeneficiaries} = await import(
              '../utils/asyncCache'
            );
            const cachedData = await getCachedBeneficiaries();
            if (cachedData && cachedData.length > 0) {
              console.log('[Reports] Using cached data as fallback');
              // Process cached data instead of showing error
              const enriched = cachedData.map(r => {
                const anemiaCategory =
                  r.latest_anemia_category || r.anemia_category || null;
                const hbValue = r.latest_hemoglobin || r.hb;
                const severity = computeSeverity(hbValue, anemiaCategory);
                return {...r, _severity: severity};
              });
              setRows(enriched);
              setAgg({
                total: enriched.length,
                normal: 0,
                mild: 0,
                moderate: 0,
                severe: 0,
                unknown: 0,
              });
              dispatch(setCurrentReport(enriched));
              return;
            }
          } catch (cacheError) {
            console.warn('[Reports] Failed to get cached data:', cacheError);
          }
          dispatch(setReportError('No data available'));
        }
        return;
      }

      // Optimize data processing with batch operations
      const enriched = data.map(r => {
        // Simplified field checking
        const anemiaCategory =
          r.latest_anemia_category || r.anemia_category || null;
        const hbValue = r.latest_hemoglobin || r.hb;
        const severity = computeSeverity(hbValue, anemiaCategory);

        return {
          ...r,
          _severity: severity,
        };
      });

      // Apply filters from Redux state
      const fromDay = filters.dateRange.startDate
        ? dayjs(filters.dateRange.startDate).startOf('day')
        : null;
      const toDay = filters.dateRange.endDate
        ? dayjs(filters.dateRange.endDate).endOf('day')
        : null;

      const filtered = enriched.filter(r => {
        // Date filtering
        const dateSrc = r.follow_up_due || r.registration_date || null;
        const d = dateSrc ? dayjs(dateSrc) : null;
        if (fromDay && d && d.isBefore(fromDay)) return false;
        if (toDay && d && d.isAfter(toDay)) return false;

        // Category filtering
        if (
          filters.beneficiaryType !== 'all' &&
          r.category !== filters.beneficiaryType
        )
          return false;

        // Severity filtering
        if (
          filters.interventionStatus !== 'all' &&
          r._severity !== filters.interventionStatus
        )
          return false;

        // Location filtering
        if (
          filters.location &&
          filters.location !== 'all' &&
          r.location !== filters.location
        )
          return false;

        return true;
      });

      setRows(filtered);

      // Optimize statistics calculation
      let counts = {
        total: filtered.length,
        normal: 0,
        mild: 0,
        moderate: 0,
        severe: 0,
        unknown: 0,
      };
      let catCounts = {Pregnant: 0, Adolescent: 0, Under5: 0, WoRA: 0};

      // Single pass through data for better performance
      filtered.forEach(r => {
        const s = r._severity || 'unknown';

        // Count severity
        counts[s] = (counts[s] || 0) + 1;

        // Count categories
        if (r.category && catCounts.hasOwnProperty(r.category)) {
          catCounts[r.category]++;
        }
      });

      setAgg(counts);
      setCatAgg(catCounts);
      dispatch(setCurrentReport(filtered));

      // Animate the counter values
      animateCounters(counts);

      // Prepare chart data
      const categoryChartData = {
        labels: Object.keys(catCounts).filter(key => catCounts[key] > 0),
        datasets: [
          {
            data: Object.keys(catCounts)
              .filter(key => catCounts[key] > 0)
              .map(key => catCounts[key]),
            colors: Object.keys(catCounts)
              .filter(key => catCounts[key] > 0)
              .map(
                (_, index) =>
                  colors.chartColors[index % colors.chartColors.length],
              ),
          },
        ],
      };

      const severityChartData = {
        labels: Object.keys(counts).filter(
          key => key !== 'total' && counts[key] > 0,
        ),
        datasets: [
          {
            data: Object.keys(counts)
              .filter(key => key !== 'total' && counts[key] > 0)
              .map(key => counts[key]),
            colors: Object.keys(counts)
              .filter(key => key !== 'total' && counts[key] > 0)
              .map(key => {
                switch (key) {
                  case 'normal':
                    return colors.normal;
                  case 'mild':
                    return colors.mild;
                  case 'moderate':
                    return colors.moderate;
                  case 'severe':
                    return colors.severe;
                  default:
                    return colors.unknown;
                }
              }),
          },
        ],
      };

      console.log(
        '[Reports] Setting chartData:',
        JSON.stringify(categoryChartData, null, 2),
      );
      setChartData(categoryChartData);
      setSeverityChartData(severityChartData);
    } catch (e) {
      console.warn('Error loading reports:', e);
      dispatch(setReportError(e.message));
    } finally {
      dispatch(setReportLoading(false));
    }
  };

  const exportReport = async () => {
    if (rows.length === 0) {
      Alert.alert('No Data', 'No data available to export');
      return;
    }

    try {
      const exportData = [];
      const safeString = value => {
        if (value === null || value === undefined) return '';
        return String(value);
      };

      // Simplified export with only essential fields
      rows.forEach(row => {
        const exportRow = {
          Name: safeString(row.name),
          Category: safeString(row.category),
          'Hb Level': safeString(row.latest_hemoglobin || row.hb),
          Severity: safeString(row._severity),
          'Registration Date': safeString(row.registration_date),
          'Follow-up Due': safeString(row.follow_up_due),
        };
        exportData.push(exportRow);
      });

      // Simplified summary data
      const summaryRows = [
        {
          Name: '=== DASHBOARD SUMMARY ===',
          Category: '',
          'Hb Level': '',
          Severity: '',
          'Registration Date': '',
          'Follow-up Due': '',
        },
        {
          Name: 'Category Statistics',
          Category: `Pregnant: ${catAgg.Pregnant}, Adolescent: ${catAgg.Adolescent}, Under5: ${catAgg.Under5}, WoRA: ${catAgg.WoRA}`,
          'Hb Level': '',
          Severity: '',
          'Registration Date': '',
          'Follow-up Due': '',
        },
        {
          Name: 'Severity Statistics',
          Category: `Normal: ${agg.normal}, Mild: ${agg.mild}, Moderate: ${agg.moderate}, Severe: ${agg.severe}, Unknown: ${agg.unknown}`,
          'Hb Level': '',
          Severity: '',
          'Registration Date': '',
          'Follow-up Due': '',
        },
        {
          Name: 'Total Beneficiaries',
          Category: agg.total.toString(),
          'Hb Level': '',
          Severity: '',
          'Registration Date': '',
          'Follow-up Due': '',
        },
      ];

      // Export both data and summary
      const finalExportData = [...exportData, ...summaryRows];
      try {
        // Try CSV export first (most reliable)
        await exportJsonToCSV(finalExportData, 'Animia_Report');
      } catch (csvError) {
        console.warn('[Reports] CSV export failed, trying text:', csvError);
        try {
          // Fallback to text export
          await exportJsonToText(finalExportData, 'Animia_Report');
        } catch (textError) {
          console.error('[Reports] All export methods failed:', textError);
          Alert.alert(
            'Export Failed',
            'All export methods failed. Please try again.',
          );
        }
      }
    } catch (error) {
      console.error('[Reports] Export error:', error);
      Alert.alert('Export Failed', `Error exporting report: ${error.message}`);
    }
  };

  // Removed unused progress bar component for better performance

  // Proper Pie Chart using react-native-chart-kit
  const renderPieChart = useCallback((data, title) => {
    if (!data || !data.labels || data.labels.length === 0) return null;

    // Ensure data.datasets exists and has data
    if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      return null;
    }

    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    if (total === 0) return null;

    // Prepare data for react-native-chart-kit
    const chartData = data.labels.map((label, index) => ({
      name: label,
      population: data.datasets[0].data[index],
      color: data.datasets[0].colors[index],
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));

    const chartConfig = {
      backgroundColor: colors.white,
      backgroundGradientFrom: colors.white,
      backgroundGradientTo: colors.white,
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: colors.primary,
      },
    };

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Icon name="chart-pie" size={20} color={colors.primary} />
          <Text style={styles.chartTitle}>{title}</Text>
        </View>

        <View style={styles.chartContainer}>
          <PieChart
            data={chartData}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 10]}
            absolute
          />
        </View>
      </View>
    );
  }, []);

  // Proper Bar Chart using react-native-chart-kit
  const renderBarChart = useCallback((data, title) => {
    console.log(
      '[renderBarChart] Received data:',
      JSON.stringify(data, null, 2),
    );

    if (!data || !data.labels || data.labels.length === 0) {
      console.log('[renderBarChart] No data or labels available');
      return null;
    }

    // Ensure data.datasets exists and has data
    if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      console.log('[renderBarChart] Invalid data structure');
      return null;
    }

    const maxValue = Math.max(...data.datasets[0].data);
    if (maxValue === 0) {
      console.log('[renderBarChart] Max value is 0');
      return null;
    }

    // Simple data structure for GiftedBarChart
    const chartData = {
      labels: data.labels,
      datasets: [
        {
          data: data.datasets[0].data,
        },
      ],
    };

    console.log(
      '[renderBarChart] Final chartData:',
      JSON.stringify(chartData, null, 2),
    );
    console.log('[renderBarChart] Colors array:', chartData.datasets[0].colors);

    // GiftedBarChart doesn't need chartConfig

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Icon name="chart-area" size={20} color={colors.primary} />
          <Text style={styles.chartTitle}>{title}</Text>
        </View>

        <View style={styles.chartContainer}>
          <BarChart
            data={chartData}
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />

          {/* Custom Legend for BarChart */}
          <View style={styles.legendContainer}>
            {data.labels.map((label, index) => {
              const color = data.datasets[0].colors
                ? data.datasets[0].colors[index]
                : colors.primary;
              return (
                <View key={index} style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, {backgroundColor: color}]}
                  />
                  <Text style={styles.legendText}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}:{' '}
                    {data.datasets[0].data[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }, []);

  // Area Chart for Health Status Analysis with different colors
  const renderAreaChart = useCallback((data, title) => {
    console.log(
      '[renderAreaChart] Received data:',
      JSON.stringify(data, null, 2),
    );

    if (!data || !data.labels || data.labels.length === 0) {
      console.log('[renderAreaChart] No data or labels available');
      return null;
    }

    // Ensure data.datasets exists and has data
    if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      console.log('[renderAreaChart] Invalid data structure');
      return null;
    }

    const maxValue = Math.max(...data.datasets[0].data);
    if (maxValue === 0) {
      console.log('[renderAreaChart] Max value is 0');
      return null;
    }

    // Create a single dataset with all values for better line chart visualization
    const chartData = {
      labels: data.labels,
      datasets: [
        {
          data: data.datasets[0].data,
          color: (opacity = 1) => colors.primary,
          strokeWidth: 3,
        },
      ],
    };

    console.log(
      '[renderAreaChart] Final chartData:',
      JSON.stringify(chartData, null, 2),
    );

    const chartConfig = {
      backgroundColor: colors.white,
      backgroundGradientFrom: colors.white,
      backgroundGradientTo: colors.white,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '8',
        strokeWidth: '3',
        stroke: colors.primary,
      },
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: colors.border,
        strokeWidth: 1,
      },
    };

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Icon name="chart-area" size={20} color={colors.primary} />
          <Text style={styles.chartTitle}>{title}</Text>
        </View>

        <View style={styles.chartContainer}>
          <AreaChart
            data={chartData}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
            withDots={true}
            withShadow={true}
          />

          {/* Custom Legend */}
          <View style={styles.legendContainer}>
            {data.labels.map((label, index) => {
              let color;
              switch (label.toLowerCase()) {
                case 'normal':
                  color = '#10B981';
                  break;
                case 'mild':
                  color = '#F59E0B';
                  break;
                case 'moderate':
                  color = '#EF4444';
                  break;
                case 'severe':
                  color = '#DC2626';
                  break;
                case 'unknown':
                  color = '#6B7280';
                  break;
                default:
                  color = '#2563EB';
              }

              return (
                <View key={index} style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, {backgroundColor: color}]}
                  />
                  <Text style={styles.legendText}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}:{' '}
                    {data.datasets[0].data[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }, []);

  const renderModernDashboard = useCallback(
    () => (
      <View style={styles.modernDashboard}>
        {/* Proper Date Display */}
        <View style={styles.dateSection}>
          <View style={styles.dateDisplayContainer}>
            <View style={styles.dateInfo}>
              <Icon name="calendar" size={18} color={colors.primary} />
              <Text style={styles.dateDisplayText}>
                {filters.dateRange.startDate === filters.dateRange.endDate
                  ? dayjs(filters.dateRange.startDate).format('MMMM DD, YYYY')
                  : `${dayjs(filters.dateRange.startDate).format(
                      'MMM DD',
                    )} - ${dayjs(filters.dateRange.endDate).format(
                      'MMM DD, YYYY',
                    )}`}
              </Text>
            </View>
            {filters.dateRange.startDate !== dayjs().format('YYYY-MM-DD') && (
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const today = dayjs().format('YYYY-MM-DD');
                  dispatch(
                    setFilters({
                      dateRange: {
                        startDate: today,
                        endDate: today,
                      },
                    }),
                  );
                }}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Enhanced Key Metrics Row with Gradients */}
        <View style={styles.keyMetricsRow}>
          <LinearGradient
            colors={[colors.primary, colors.primary + 'CC']}
            style={styles.keyMetricCard}>
            <View style={styles.metricIconContainer}>
              <Icon name="account-group" size={24} color={colors.white} />
            </View>
            <Text style={[styles.metricNumber, {color: colors.white}]}>
              {animatedValues.total}
            </Text>
            <Text style={[styles.metricLabel, {color: colors.white}]}>
              Total Beneficiaries
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={[colors.success, colors.success + 'CC']}
            style={styles.keyMetricCard}>
            <View
              style={[
                styles.metricIconContainer,
                {backgroundColor: colors.white + '20'},
              ]}>
              <Icon name="check-circle" size={24} color={colors.white} />
            </View>
            <Text style={[styles.metricNumber, {color: colors.white}]}>
              {animatedValues.normal + animatedValues.mild}
            </Text>
            <Text style={[styles.metricLabel, {color: colors.white}]}>
              Under Control
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={[colors.warning, colors.warning + 'CC']}
            style={styles.keyMetricCard}>
            <View
              style={[
                styles.metricIconContainer,
                {backgroundColor: colors.white + '20'},
              ]}>
              <Icon name="alert-circle" size={24} color={colors.white} />
            </View>
            <Text style={[styles.metricNumber, {color: colors.white}]}>
              {animatedValues.severe + animatedValues.moderate}
            </Text>
            <Text style={[styles.metricLabel, {color: colors.white}]}>
              High Priority
            </Text>
          </LinearGradient>
        </View>

        {/* Enhanced Category Distribution with Cards */}
        <View style={styles.progressSection}>
          <View style={styles.sectionHeader}>
            <Icon name="account-group" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Population Distribution</Text>
          </View>
          <View style={styles.categoryGrid}>
            <View
              style={[styles.categoryCard, {borderLeftColor: colors.pregnant}]}>
              <View
                style={[
                  styles.categoryIcon,
                  {backgroundColor: colors.pregnant + '20'},
                ]}>
                <Icon name="human-pregnant" size={20} color={colors.pregnant} />
              </View>
              <Text style={styles.categoryNumber}>{catAgg.Pregnant}</Text>
              <Text style={styles.categoryLabel}>Pregnant</Text>
              <Text style={styles.categoryPercentage}>
                {agg.total > 0
                  ? ((catAgg.Pregnant / agg.total) * 100).toFixed(1)
                  : '0.0'}
                %
              </Text>
            </View>

            <View
              style={[
                styles.categoryCard,
                {borderLeftColor: colors.adolescent},
              ]}>
              <View
                style={[
                  styles.categoryIcon,
                  {backgroundColor: colors.adolescent + '20'},
                ]}>
                <Icon
                  name="account-child"
                  size={20}
                  color={colors.adolescent}
                />
              </View>
              <Text style={styles.categoryNumber}>{catAgg.Adolescent}</Text>
              <Text style={styles.categoryLabel}>Adolescent</Text>
              <Text style={styles.categoryPercentage}>
                {agg.total > 0
                  ? ((catAgg.Adolescent / agg.total) * 100).toFixed(1)
                  : '0.0'}
                %
              </Text>
            </View>

            <View
              style={[styles.categoryCard, {borderLeftColor: colors.under5}]}>
              <View
                style={[
                  styles.categoryIcon,
                  {backgroundColor: colors.under5 + '20'},
                ]}>
                <Icon name="baby-face" size={20} color={colors.under5} />
              </View>
              <Text style={styles.categoryNumber}>{catAgg.Under5}</Text>
              <Text style={styles.categoryLabel}>Under 5</Text>
              <Text style={styles.categoryPercentage}>
                {agg.total > 0
                  ? ((catAgg.Under5 / agg.total) * 100).toFixed(1)
                  : '0.0'}
                %
              </Text>
            </View>

            <View style={[styles.categoryCard, {borderLeftColor: colors.wora}]}>
              <View
                style={[
                  styles.categoryIcon,
                  {backgroundColor: colors.wora + '20'},
                ]}>
                <Icon name="gender-female" size={20} color={colors.wora} />
              </View>
              <Text style={styles.categoryNumber}>{catAgg.WoRA}</Text>
              <Text style={styles.categoryLabel}>WoRA</Text>
              <Text style={styles.categoryPercentage}>
                {agg.total > 0
                  ? ((catAgg.WoRA / agg.total) * 100).toFixed(1)
                  : '0.0'}
                %
              </Text>
            </View>
          </View>
        </View>

        {/* Removed duplicate Health Status Overview section - keeping only the enhanced version below */}
      </View>
    ),
    [animatedValues, catAgg, filters.dateRange, dispatch],
  );

  return (
    <View style={styles.screen}>
      <NetworkStatus />
      <Header
        title="Reports & Analytics"
        variant="back"
        onBackPress={() => navigation.goBack()}
        onBellPress={() => navigation.navigate('ReportFilters', {filters})}
        rightIconName="chart-line"
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        {loading || beneficiaryLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{marginTop: spacing.sm, color: colors.text}}>
              {beneficiaryLoading
                ? 'Loading beneficiary data...'
                : 'Loading reports...'}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon
              name="alert-circle"
              size={48}
              color={colors.error}
              style={{marginBottom: spacing.md}}
            />
            <Text
              style={{
                color: colors.error,
                textAlign: 'center',
                marginBottom: spacing.sm,
                fontSize: 16,
                fontWeight: '600',
              }}>
              {error}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: spacing.lg,
                fontSize: 14,
              }}>
              {error === 'No data available'
                ? 'No beneficiary data found. Please check your connection or add some beneficiaries first.'
                : 'Unable to load reports. Please check your connection and try again.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Icon
                name="refresh"
                size={16}
                color="#fff"
                style={{marginRight: spacing.xs}}
              />
              <Text style={{color: '#fff', fontWeight: '600'}}>Retry</Text>
            </TouchableOpacity>

            {/* Debug button for troubleshooting */}
            <TouchableOpacity
              style={[
                styles.retryBtn,
                {backgroundColor: colors.textSecondary, marginTop: spacing.sm},
              ]}
              onPress={async () => {
                try {
                  const {getCachedBeneficiaries} = await import(
                    '../utils/asyncCache'
                  );
                  const cached = await getCachedBeneficiaries();
                  Alert.alert(
                    'Debug Info',
                    `Beneficiaries in Redux: ${
                      beneficiaries.length
                    }\nCached beneficiaries: ${
                      cached ? cached.length : 'null'
                    }\nLoading: ${loading}\nBeneficiary Loading: ${beneficiaryLoading}\nError: ${error}`,
                  );
                } catch (e) {
                  Alert.alert('Debug Error', e.message);
                }
              }}>
              <Icon
                name="bug"
                size={16}
                color="#fff"
                style={{marginRight: spacing.xs}}
              />
              <Text style={{color: '#fff', fontWeight: '600'}}>Debug Info</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderModernDashboard()}

            {/* Comprehensive Charts Section - Replacing 3 redundant sections with 2 effective charts */}
            <View style={styles.chartsSection}>
              {chartData ? (
                renderPieChart(chartData, 'Population Distribution by Category')
              ) : (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>
                    Population Distribution by Category
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: colors.textSecondary,
                      padding: spacing.md,
                    }}>
                    Loading chart data...
                  </Text>
                </View>
              )}
              {severityChartData ? (
                renderBarChart(severityChartData, 'Health Status Analysis')
              ) : (
                <View style={styles.chartCard}>
                  <Icon name="bar-chart" size={20} color={colors.primary} />
                  <Text style={styles.chartTitle}>Health Status Analysis</Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: colors.textSecondary,
                      padding: spacing.md,
                    }}>
                    Loading chart data...
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.exportBtn} onPress={exportReport}>
              <LinearGradient
                colors={[colors.primary, colors.primary + 'CC']}
                style={styles.exportGradient}>
                <Icon name="file-export" size={16} color={colors.white} />
                <Text style={styles.exportBtnText}>Export ({rows.length})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  scrollContainer: {flex: 1},
  container: {
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
  },
  pageTitle: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    color: colors.text,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  chartContainer: {
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.lg,
    paddingVertical: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...shadows.sm,
  },
  exportBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    ...shadows.sm,
  },
  exportBtnText: {
    color: colors.white,
    ...typography.caption,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  chartSection: {
    flex: 1,
  },
  dataTableSection: {
    marginBottom: spacing.sm,
  },
  dataTable: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  tableValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  visualStatsContainer: {
    marginBottom: spacing.sm,
  },
  progressSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  // Removed unused progress bar styles for better performance
  chartsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    ...shadows.sm,
    minHeight: 70,
  },
  metricHeader: {
    marginBottom: spacing.xs,
  },
  metricTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
    fontSize: 12,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  riskText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  metricVisual: {
    alignItems: 'center',
  },
  coverageText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 12,
  },
  reachText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.sm,
    height: 120,
    justifyContent: 'center',
    ...shadows.sm,
  },
  summaryTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontSize: 13,
  },
  summaryStats: {
    flex: 1,
    justifyContent: 'space-around',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  summaryValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  comprehensiveMetricsSection: {
    marginBottom: spacing.sm,
  },
  metricNumber: {
    ...typography.title,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
  },
  metricSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  qualityText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
    fontSize: 12,
  },

  // Modern Dashboard Styles
  modernDashboard: {
    marginBottom: spacing.md,
  },

  keyMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },

  keyMetricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },

  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  dashboardCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },

  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  categoryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  categoryItem: {
    alignItems: 'center',
    flex: 1,
  },

  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  categoryNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },

  categoryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },

  categoryPercentage: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },

  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statusItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  statusCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    borderRadius: borderRadius.md,
    minWidth: 70,
  },

  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },

  statusNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },

  statusLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  chartsSection: {
    flexDirection: 'column',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },

  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 250,
    width: '100%',
    marginBottom: spacing.md,
  },

  dateSection: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.horizontal,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateDisplayText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: typography.weights.semibold,
    fontSize: 16,
  },
  todayButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  todayButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: typography.weights.semibold,
    fontSize: 12,
  },

  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  chartTitle: {
    ...typography.subtitle,
    marginLeft: spacing.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },

  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },

  progressSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    ...typography.subtitle,
    marginLeft: spacing.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },

  exportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  exportBtnText: {
    color: colors.white,
    ...typography.caption,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
    fontSize: 14,
  },

  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
});

export default Reports;
