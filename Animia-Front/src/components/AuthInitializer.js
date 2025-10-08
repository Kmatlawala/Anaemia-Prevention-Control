import React, {useEffect} from 'react';
import {View, ActivityIndicator, Text} from 'react-native';
import {useDispatch} from 'react-redux';
import {colors} from '../theme/theme';
import {initializeAuth} from '../store/authSlice';

const AuthInitializer = ({children}) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadingText, setLoadingText] = React.useState('Initializing...');

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoadingText('Loading authentication...');
        await dispatch(initializeAuth());
        setLoadingText('Ready...');
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setLoadingText('Initialization failed');
      } finally {
        // Add small delay to prevent flash
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }
    };

    initAuth();
  }, [dispatch]);

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
        <Text
          style={{
            marginTop: 16,
            color: colors.text,
            fontSize: 16,
          }}>
          {loadingText}
        </Text>
      </View>
    );
  }

  return children;
};

export default AuthInitializer;
