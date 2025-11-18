import React, {useEffect} from 'react';
import {View, ActivityIndicator} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {colors} from '../theme/theme';

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
import PatientLogin from '../screens/PatientLogin';
import OTPVerification from '../screens/OTPVerification';
import MobileLogin from '../screens/MobileLogin';
import UniqueIdLogin from '../screens/UniqueIdLogin';
import FirstAdminSetup from '../screens/FirstAdminSetup';
import AdminRegistration from '../screens/AdminRegistration';
import Information from '../screens/Information';
import PatientBeneficiarySelection from '../screens/PatientBeneficiarySelection';
import PatientList from '../screens/PatientList';
import PatientDashboard from '../screens/PatientDashboard';
import IFATracker from '../screens/IFATracker';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const dispatch = useDispatch();

  const authState = useSelector(state => state.auth);
  const isAuthenticated = authState?.isAuthenticated || false;
  const isLoading = authState?.isLoading || false;
  const role = authState?.role || null;
  const selectedBeneficiary = authState?.selectedBeneficiary || null;
  const loginMethod = authState?.loginMethod || null;
  const loginValue = authState?.loginValue || null;

  const getInitialAuthRoute = () => {
    if (role === 'Patient' && selectedBeneficiary) {
      
      return 'PatientDashboard';
    }
    
    return 'Dashboard';
  };

  if (isLoading) {
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
      <Stack.Navigator
        screenOptions={{headerShown: false}}
        initialRouteName={
          isAuthenticated ? getInitialAuthRoute() : 'RoleSelect'
        }>
        {}
        {!isAuthenticated && (
          <>
            <Stack.Screen name="RoleSelect" component={RoleSelect} />
            <Stack.Screen name="PatientLogin" component={PatientLogin} />
            <Stack.Screen name="OTPVerification" component={OTPVerification} />
            <Stack.Screen name="MobileLogin" component={MobileLogin} />
            <Stack.Screen name="UniqueIdLogin" component={UniqueIdLogin} />
            <Stack.Screen name="AdminLogin" component={AdminLogin} />
            <Stack.Screen name="FirstAdminSetup" component={FirstAdminSetup} />
            <Stack.Screen
              name="AdminRegistration"
              component={AdminRegistration}
            />
            <Stack.Screen name="PatientList" component={PatientList} />
            <Stack.Screen
              name="PatientDashboard"
              component={PatientDashboard}
            />
            <Stack.Screen name="IFATracker" component={IFATracker} />
            <Stack.Screen
              name="BeneficiaryDetail"
              component={BeneficiaryDetail}
            />
            <Stack.Screen
              name="PatientBeneficiarySelection"
              component={PatientBeneficiarySelection}
            />
            <Stack.Screen name="Information" component={Information} />
          </>
        )}

        {}
        {isAuthenticated && (
          <>
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
            <Stack.Screen
              name="PatientDashboard"
              component={PatientDashboard}
            />
            <Stack.Screen name="IFATracker" component={IFATracker} />
            <Stack.Screen
              name="BeneficiaryDetail"
              component={BeneficiaryDetail}
              initialParams={{
                record: selectedBeneficiary,
                readOnly: role === 'Patient',
                fromPatientList: true,
                loginMethod: loginMethod,
                loginValue: loginValue,
              }}
            />
            <Stack.Screen name="PatientList" component={PatientList} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AuthNavigator;
