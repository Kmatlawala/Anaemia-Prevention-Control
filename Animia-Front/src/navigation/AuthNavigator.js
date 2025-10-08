import React, {useEffect} from 'react';
import {View, ActivityIndicator} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {colors} from '../theme/theme';
import {
  selectIsAuthenticated,
  selectAuthLoading,
  selectIsInitialized,
} from '../store/reducers/authReducer';

// Import your screens
import Dashboard from '../screens/Dashboard';
import Registration from '../screens/Registration';
import Search from '../screens/Search';
import Screening from '../screens/Screening';
import FollowUp from '../screens/FollowUp';
import Interventions from '../screens/Interventions';
import Reports from '../screens/Reports';
import ReportFilters from '../screens/ReportFilters';
import Settings from '../screens/Settings';
import Notifications from '../screens/Notifications';
import BeneficiaryDetail from '../molecules/BeneficiaryDetail';
import AdminLogin from '../screens/AdminLogin';
import RoleSelect from '../screens/RoleSelect';
import Information from '../screens/Information';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const isInitialized = useSelector(selectIsInitialized);

  // Only show loader for auth state changes, not initial loading
  if (isLoading && isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {/* Always include RoleSelect and AdminLogin */}
        <Stack.Screen name="RoleSelect" component={RoleSelect} />
        <Stack.Screen name="AdminLogin" component={AdminLogin} />

        {/* Dashboard and other screens - available for both authenticated and patient users */}
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Registration" component={Registration} />
        <Stack.Screen name="Search" component={Search} />
        <Stack.Screen name="Screening" component={Screening} />
        <Stack.Screen name="FollowUp" component={FollowUp} />
        <Stack.Screen name="Interventions" component={Interventions} />
        <Stack.Screen name="Information" component={Information} />
        <Stack.Screen name="Reports" component={Reports} />
        <Stack.Screen name="ReportFilters" component={ReportFilters} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="BeneficiaryDetail" component={BeneficiaryDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AuthNavigator;
