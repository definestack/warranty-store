import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

const RADIUS_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
] as const;

interface GlassSurfaceProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

/** Frosted-glass surface: blurred backdrop + translucent tint + hairline highlight border. */
export default function GlassSurface({ style, children, ...props }: GlassSurfaceProps) {
  const theme = useAppTheme();
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const radiusStyle: Partial<ViewStyle> = {};
  for (const key of RADIUS_KEYS) {
    if (flatStyle[key] !== undefined) radiusStyle[key] = flatStyle[key];
  }

  return (
    <View style={[{ overflow: 'hidden' }, style]} {...props}>
      <BlurView
        intensity={theme.blurIntensity}
        tint={theme.blurTint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          radiusStyle,
          { backgroundColor: theme.glassOverlay, borderColor: theme.glassBorder, borderWidth: StyleSheet.hairlineWidth },
        ]}
      />
      {children}
    </View>
  );
}
