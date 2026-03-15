import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Callout, Marker} from 'react-native-maps';
import type {ScheduleItem} from '../types/schedule';

const STATUS_COLORS: Record<ScheduleItem['status'], string> = {
  completed: '#22c55e',
  in_progress: '#3b82f6',
  pending: '#f97316',
  cancelled: '#ef4444',
};

const CATEGORY_LABELS: Record<ScheduleItem['category'], string> = {
  restaurant: '식당',
  attraction: '관광',
  accommodation: '숙박',
  transport: '교통',
  other: '기타',
};

interface Props {
  item: ScheduleItem;
}

const ScheduleMarker: React.FC<Props> = ({item}) => {
  const color = STATUS_COLORS[item.status];

  return (
    <Marker
      coordinate={{latitude: item.latitude, longitude: item.longitude}}
      tracksViewChanges={false}>
      <View style={[styles.marker, {backgroundColor: color}]}>
        <Text style={styles.markerText}>{item.order}</Text>
      </View>
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{item.title}</Text>
          <Text style={styles.calloutMeta}>
            {item.time} · {CATEGORY_LABELS[item.category]}
          </Text>
          {item.description ? (
            <Text style={styles.calloutDescription}>{item.description}</Text>
          ) : null}
        </View>
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  callout: {
    padding: 10,
    minWidth: 160,
    maxWidth: 220,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  calloutMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});

export default ScheduleMarker;
