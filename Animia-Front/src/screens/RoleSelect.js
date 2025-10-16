// src/screens/RoleSelect.js - COMMENTED OUT
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Image,
//   Alert,
//   Dimensions,
//   ScrollView,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import {
//   colors,
//   spacing,
//   typography,
//   borderRadius,
//   shadows,
//   platform,
// } from '../theme/theme';
// import {setRole, clearRole, getRole} from '../utils/role';
// import {useDispatch} from 'react-redux';
// import {loginSuccess} from '../store/authSlice';
// import {API} from '../utils/api';

// const RoleCard = ({icon, label, color, description, onPress}) => (
//   <TouchableOpacity
//     style={styles.card}
//     onPress={onPress}
//     accessibilityRole="button"
//     activeOpacity={0.8}>
//     <LinearGradient
//       colors={[color, color + 'CC']}
//       start={{x: 0, y: 0}}
//       end={{x: 1, y: 1}}
//       style={styles.cardGradient}>
//       <View style={styles.cardContent}>
//         <View style={styles.iconContainer}>
//           <Icon name={icon} size={36} color="#fff" />
//         </View>
//         <Text style={styles.cardTitle}>{label}</Text>
//         <Text style={styles.cardDescription}>{description}</Text>
//         <View style={styles.arrowContainer}>
//           <Icon name="arrow-right" size={20} color="#fff" />
//         </View>
//       </View>
//     </LinearGradient>
//   </TouchableOpacity>
// );

// const RoleSelect = ({navigation}) => {
//   const dispatch = useDispatch();
//   const choose = async role => {
//     try {
//       await clearRole();

//       const setRoleResult = await setRole(role);

//       const verifyRole = await getRole();

//       await new Promise(resolve => setTimeout(resolve, 200));

//       if (String(role).toLowerCase() === 'admin') {
//         navigation.replace('AdminLogin');
//       } else {
//         try {
//           const response = await API.patientLogin(role);

//           if (response && response.token) {
//             dispatch(
//               loginSuccess({
//                 user: {role: role},
//                 role: role,
//                 token: response.token, // Real JWT token from backend
//               }),
//             );
//           } else {
//             throw new Error('No token received from backend');
//           }
//           navigation.replace('Dashboard');
//         } catch (error) {
//           console.error('Patient login error:', error);
//           dispatch(
//             loginSuccess({
//               user: {role: role},
//               role: role,
//               token: 'patient_token_' + Date.now(),
//             }),
//           );
//           navigation.replace('Dashboard');
//         }
//       }
//     } catch (error) {
//       console.error('Error in role selection:', error);
//       Alert.alert('Error', 'Failed to set role. Please try again.');
//     }
//   };

//   return (
//     <ScrollView
//       style={styles.screen}
//       contentContainerStyle={styles.scrollContent}>
//       <View style={styles.headerSection}>
//         <View style={styles.brandWrap}>
//           <View style={styles.iconWrapper}>
//             <Image
//               source={require('../../assets/animiaIcon.png')}
//               style={styles.brandIcon}
//             />
//           </View>
//           <Text style={styles.appTitle}>Anaemia Health</Text>
//           <Text style={styles.appSubtitle}>
//             Anaemia Prevention & Control System
//           </Text>
//         </View>
//       </View>

//       <View style={styles.roleSection}>
//         <View style={styles.sectionHeader}>
//           <Icon name="account-group" size={24} color={colors.primary} />
//           <Text style={styles.sectionTitle}>Choose Your Role</Text>
//         </View>
//         <Text style={styles.sectionSubtitle}>
//           Select how you'll be using the application
//         </Text>

//         <View style={styles.roleCards}>
//           <RoleCard
//             icon="account"
//             label="Patient"
//             description="Access your health records and information"
//             color="#7aa2e3"
//             onPress={() => {
//               choose('Patient');
//             }}
//           />
//           <RoleCard
//             icon="shield-account"
//             label="Administrator"
//             description="Manage system and patient data"
//             color={colors.primary}
//             onPress={() => choose('Admin')}
//           />
//         </View>
//       </View>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   screen: {
//     flex: 1,
//     backgroundColor: colors.background,
//   },
//   scrollContent: {
//     paddingBottom: spacing.xl,
//   },

//   headerSection: {
//     paddingTop: spacing.xl,
//     paddingBottom: spacing.lg,
//     alignItems: 'center',
//   },
//   brandWrap: {
//     alignItems: 'center',
//   },
//   iconWrapper: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     backgroundColor: colors.primary + '20',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: spacing.md,
//     ...shadows.md,
//   },
//   brandIcon: {
//     width: 80,
//     height: 80,
//     borderRadius: 16,
//   },
//   appTitle: {
//     ...typography.title,
//     color: colors.text,
//     fontWeight: typography.weights.bold,
//     marginBottom: spacing.xs,
//   },
//   appSubtitle: {
//     color: colors.textSecondary,
//     ...typography.body,
//     textAlign: 'center',
//     lineHeight: 22,
//   },

//   roleSection: {
//     paddingHorizontal: spacing.horizontal,
//     paddingBottom: spacing.lg,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: spacing.sm,
//   },
//   sectionTitle: {
//     ...typography.subtitle,
//     color: colors.text,
//     fontWeight: typography.weights.semibold,
//     marginLeft: spacing.sm,
//   },
//   sectionSubtitle: {
//     ...typography.body,
//     color: colors.textSecondary,
//     marginBottom: spacing.lg,
//     textAlign: 'center',
//   },
//   roleCards: {
//     gap: spacing.md,
//   },

//   card: {
//     marginBottom: spacing.md,
//     borderRadius: borderRadius.lg,
//     ...shadows.md,
//   },
//   cardGradient: {
//     borderRadius: borderRadius.lg,
//     paddingHorizontal: spacing.horizontal,
//     paddingVertical: spacing.lg,
//   },
//   cardContent: {
//     alignItems: 'center',
//   },
//   iconContainer: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: spacing.md,
//   },
//   cardTitle: {
//     ...typography.subtitle,
//     color: '#fff',
//     fontWeight: typography.weights.bold,
//     marginBottom: spacing.xs,
//   },
//   cardDescription: {
//     ...typography.body,
//     color: '#fff',
//     opacity: 0.9,
//     textAlign: 'center',
//     marginBottom: spacing.md,
//     lineHeight: 20,
//   },
//   arrowContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   debugContainer: {
//     paddingHorizontal: spacing.horizontal,
//     gap: spacing.sm,
//   },
//   debugButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: spacing.horizontal,
//     paddingVertical: spacing.sm,
//     backgroundColor: '#ff6b6b',
//     borderRadius: borderRadius.md,
//     ...shadows.sm,
//   },
//   debugButtonText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//     marginLeft: spacing.xs,
//   },
// });

// export default RoleSelect;

// COMMENTED OUT - This file is no longer used
// App now goes directly to AdminLogin
export default null;
