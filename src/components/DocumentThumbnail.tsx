import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageStyle, StyleSheet, Text, View, type StyleProp } from 'react-native';

import { useTranslation } from '../i18n/LocaleContext';
import { useAppTheme } from '../theme/ThemeContext';
import { isPdfUri } from '../utils/documentType';

interface DocumentThumbnailProps {
  uri: string;
  fileName?: string;
  /** Sizes the thumbnail; it fills whatever box the caller gives it. */
  style: StyleProp<ImageStyle>;
}

/** Shows an attached document: its picture for an image, a labelled PDF tile otherwise. */
export default function DocumentThumbnail({ uri, fileName, style }: DocumentThumbnailProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (!isPdfUri(uri)) {
    return <Image source={{ uri }} style={style} />;
  }

  return (
    <View style={[style, styles.pdfTile, { backgroundColor: theme.surfaceAlt }]}>
      <Ionicons name="document-text-outline" size={22} color={theme.primary} />
      <Text style={[styles.pdfLabel, { color: theme.text }]}>{t('itemDetail.pdfLabel')}</Text>
      {fileName ? (
        <Text style={[styles.fileName, { color: theme.subtleText }]} numberOfLines={2}>
          {fileName}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pdfTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 4,
  },
  pdfLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  fileName: {
    marginTop: 1,
    fontSize: 8,
    textAlign: 'center',
  },
});
