import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

export default function AppIndex() {
  // Redirect directly to login page
  return <Redirect href="/login" />;
}


