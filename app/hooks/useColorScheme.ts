import { useColorScheme as _useColorScheme } from 'react-native';

/**
 * Returns either 'light' or 'dark', depending on system theme.
 */
export function useColorScheme() {
  return _useColorScheme();
}
