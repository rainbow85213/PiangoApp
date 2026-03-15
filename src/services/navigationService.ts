/**
 * 외부 지도 앱 길 안내 연동 서비스
 *
 * ── iOS 설정 필요 ──────────────────────────────────────────────
 * ios/PlangoApp/Info.plist 에 아래 항목 추가:
 *
 *   <key>LSApplicationQueriesSchemes</key>
 *   <array>
 *     <string>kakaomap</string>
 *     <string>tmap</string>
 *   </array>
 *
 * ── Android 설정 필요 ─────────────────────────────────────────
 * android/app/src/main/AndroidManifest.xml <manifest> 바로 아래에 추가:
 *   <queries>
 *     <package android:name="net.daum.android.map" />
 *     <package android:name="com.skt.tmap.ku" />
 *   </queries>
 */

import {Alert, Linking, Platform} from 'react-native';

const STORE_URLS = {
  kakaomap: {
    ios: 'https://apps.apple.com/kr/app/id304608425',
    android: 'market://details?id=net.daum.android.map',
  },
  tmap: {
    ios: 'https://apps.apple.com/kr/app/id431589174',
    android: 'market://details?id=com.skt.tmap.ku',
  },
};

const openStore = (app: 'kakaomap' | 'tmap') => {
  const url =
    Platform.OS === 'ios' ? STORE_URLS[app].ios : STORE_URLS[app].android;
  Linking.openURL(url).catch(() => {
    Alert.alert('오류', '스토어를 열 수 없습니다.');
  });
};

/**
 * 카카오맵 앱으로 목적지 길 안내
 * URL Scheme: kakaomap://route?ep={lat},{lng}&n={name}
 */
export const openKakaoNavi = async (
  lat: number,
  lng: number,
  name: string,
): Promise<void> => {
  const url = `kakaomap://route?ep=${lat},${lng}&n=${encodeURIComponent(name)}`;
  const canOpen = await Linking.canOpenURL(url).catch(() => false);

  if (canOpen) {
    await Linking.openURL(url);
  } else {
    Alert.alert(
      '카카오맵 미설치',
      '카카오맵 앱이 설치되어 있지 않습니다.\n스토어로 이동하시겠습니까?',
      [
        {text: '취소', style: 'cancel'},
        {text: '설치하기', onPress: () => openStore('kakaomap')},
      ],
    );
  }
};

/**
 * T맵 앱으로 목적지 길 안내
 * URL Scheme: tmap://route?goalx={lng}&goaly={lat}&goalname={name}
 */
export const openTmapNavi = async (
  lat: number,
  lng: number,
  name: string,
): Promise<void> => {
  const url = `tmap://route?goalx=${lng}&goaly=${lat}&goalname=${encodeURIComponent(name)}`;
  const canOpen = await Linking.canOpenURL(url).catch(() => false);

  if (canOpen) {
    await Linking.openURL(url);
  } else {
    Alert.alert(
      'T맵 미설치',
      'T맵 앱이 설치되어 있지 않습니다.\n스토어로 이동하시겠습니까?',
      [
        {text: '취소', style: 'cancel'},
        {text: '설치하기', onPress: () => openStore('tmap')},
      ],
    );
  }
};

export type NaviApp = 'kakaomap' | 'tmap';

/**
 * 지정한 앱으로 길 안내 분기
 */
export const openNavi = (
  app: NaviApp,
  lat: number,
  lng: number,
  name: string,
): Promise<void> => {
  if (app === 'kakaomap') {
    return openKakaoNavi(lat, lng, name);
  }
  return openTmapNavi(lat, lng, name);
};
