import React from 'react';
import { Text, FlexView, Image } from 'react-native-android-widget';

interface WidgetProps {
  imageUrl?: string;
}

export function PartnerPhotoWidget({ imageUrl }: WidgetProps) {
  return (
    <FlexView
      style={{
        flex: 1,
        backgroundColor: '#0f172a',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: 'match_parent',
            height: 'match_parent',
          }}
        />
      ) : (
        <FlexView style={{ padding: 16, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 'bold',
            }}
          >
            Our Space 🤍
          </Text>
          <Text
            style={{
              color: '#94a3b8',
              fontSize: 12,
              marginTop: 4,
            }}
          >
            Belum ada foto terbaru
          </Text>
        </FlexView>
      )}
    </FlexView>
  );
}
