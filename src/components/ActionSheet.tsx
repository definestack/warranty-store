import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Button, Text, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme/ThemeContext';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ActionSheetAction {
  value: string;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  titleKey: string;
  subtitleKey?: string;
  actions: ActionSheetAction[];
  onSelect: (value: string) => void;
  onClose: () => void;
  t: (scope: string, options?: Record<string, unknown>) => string;
}

const DRAG_CLOSE_THRESHOLD = 80;
const DRAG_VELOCITY_THRESHOLD = 0.5;

/**
 * A bottom sheet of icon/title/description rows, sized to its content (no scrolling)
 * and dismissible by swipe-down, backdrop tap, Cancel, or the hardware back button.
 */
export default function ActionSheet({
  visible,
  titleKey,
  subtitleKey,
  actions,
  onSelect,
  onClose,
  t,
}: ActionSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => gesture.dy > 4,
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > DRAG_CLOSE_THRESHOLD || gesture.vy > DRAG_VELOCITY_THRESHOLD) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              marginBottom: 12 + insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: theme.mutedText }]} />
            <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
              {t(titleKey)}
            </Text>
            {subtitleKey ? (
              <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.subtleText }]}>
                {t(subtitleKey)}
              </Text>
            ) : null}
          </View>

          {actions.map((action) => (
            <TouchableRipple
              key={action.value}
              style={[styles.row, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              onPress={() => {
                onSelect(action.value);
                onClose();
              }}
              borderless
            >
              <>
                <View
                  style={[styles.iconTile, { backgroundColor: theme.paper.colors.surfaceVariant }]}
                >
                  <Ionicons
                    name={action.icon as IoniconName}
                    size={22}
                    color={action.destructive ? theme.danger : theme.primary}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text
                    variant="titleMedium"
                    style={{ color: action.destructive ? theme.danger : theme.text }}
                  >
                    {t(action.labelKey)}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.subtleText }}>
                    {t(action.descriptionKey)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.subtleText} />
              </>
            </TouchableRipple>
          ))}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Button mode="text" theme={theme.paper} onPress={onClose}>
            {t('common.cancel')}
          </Button>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    marginHorizontal: 16,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    opacity: 0.4,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    gap: 12,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
});
