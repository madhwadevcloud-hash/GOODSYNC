import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme, ColorSchemeName } from 'react-native';

/**
 * Cross-platform useColorScheme hook that works on all platforms
 */
export function useColorScheme(): ColorSchemeName {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
