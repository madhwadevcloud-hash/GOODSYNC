import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePermissions } from '@/src/hooks/usePermissions';

interface PermissionRefreshIndicatorProps {
  visible?: boolean;
}

export default function PermissionRefreshIndicator({ visible = true }: PermissionRefreshIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);
  const { loading } = usePermissions();
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (loading && visible) {
      setShowIndicator(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (!loading) {
          setShowIndicator(false);
        }
      });
    }
  }, [loading, visible, fadeAnim]);

  if (!showIndicator) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.indicator}>
        <View style={styles.dot} />
        <Text style={styles.text}>Syncing permissions...</Text>
      </View>
    </Animated.View>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 50,
      left: 20,
      right: 20,
      zIndex: 1000,
      alignItems: 'center',
    },
    indicator: {
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#E5E7EB',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#3B82F6',
      marginRight: 8,
    },
    text: {
      fontSize: 12,
      color: isDark ? '#E5E7EB' : '#1F2937',
      fontWeight: '500',
    },
  });
}
