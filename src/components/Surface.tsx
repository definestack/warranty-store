import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

interface SurfaceProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

/** Flat card/sheet surface: solid theme background + hairline border. */
export default function Surface({ style, children, ...props }: SurfaceProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        { backgroundColor: theme.card, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
