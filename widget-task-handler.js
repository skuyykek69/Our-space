import React from 'react';
import { PartnerPhotoWidget } from './index.widget';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_DELETED':
    default:
      try {
        const savedImageUrl = await AsyncStorage.getItem('latest_photo_url');
        props.render(<PartnerPhotoWidget imageUrl={savedImageUrl} />);
      } catch (e) {
        props.render(<PartnerPhotoWidget imageUrl={null} />);
      }
      break;
  }
}
