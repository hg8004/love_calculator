/**
 * 출생지 좌표 · 시간대 데이터
 * 좌표: GeoNames(cities 데이터셋) 및 각 시청 소재지 기준 근사값(소수 4자리).
 * 경도 0.01° 오차는 태양시 보정에서 약 2.4초 차이에 불과하다.
 * 목록에 없는 지역은 '직접 입력'으로 위도·경도·IANA 시간대를 지정할 수 있다.
 */
export interface City {
  id: string;
  country: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

const KR = "대한민국";
export const CITIES: City[] = [
  { id: "kr-seoul", country: KR, name: "서울", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
  { id: "kr-busan", country: KR, name: "부산", latitude: 35.1796, longitude: 129.0756, timezone: "Asia/Seoul" },
  { id: "kr-daegu", country: KR, name: "대구", latitude: 35.8714, longitude: 128.6014, timezone: "Asia/Seoul" },
  { id: "kr-incheon", country: KR, name: "인천", latitude: 37.4563, longitude: 126.7052, timezone: "Asia/Seoul" },
  { id: "kr-gwangju", country: KR, name: "광주", latitude: 35.1595, longitude: 126.8526, timezone: "Asia/Seoul" },
  { id: "kr-daejeon", country: KR, name: "대전", latitude: 36.3504, longitude: 127.3845, timezone: "Asia/Seoul" },
  { id: "kr-ulsan", country: KR, name: "울산", latitude: 35.5384, longitude: 129.3114, timezone: "Asia/Seoul" },
  { id: "kr-sejong", country: KR, name: "세종", latitude: 36.48, longitude: 127.289, timezone: "Asia/Seoul" },
  { id: "kr-suwon", country: KR, name: "수원", latitude: 37.2636, longitude: 127.0286, timezone: "Asia/Seoul" },
  { id: "kr-seongnam", country: KR, name: "성남", latitude: 37.42, longitude: 127.1265, timezone: "Asia/Seoul" },
  { id: "kr-goyang", country: KR, name: "고양", latitude: 37.6584, longitude: 126.832, timezone: "Asia/Seoul" },
  { id: "kr-yongin", country: KR, name: "용인", latitude: 37.2411, longitude: 127.1776, timezone: "Asia/Seoul" },
  { id: "kr-bucheon", country: KR, name: "부천", latitude: 37.5034, longitude: 126.766, timezone: "Asia/Seoul" },
  { id: "kr-ansan", country: KR, name: "안산", latitude: 37.3219, longitude: 126.8309, timezone: "Asia/Seoul" },
  { id: "kr-anyang", country: KR, name: "안양", latitude: 37.3943, longitude: 126.9568, timezone: "Asia/Seoul" },
  { id: "kr-namyangju", country: KR, name: "남양주", latitude: 37.636, longitude: 127.2165, timezone: "Asia/Seoul" },
  { id: "kr-hwaseong", country: KR, name: "화성", latitude: 37.1995, longitude: 126.8312, timezone: "Asia/Seoul" },
  { id: "kr-pyeongtaek", country: KR, name: "평택", latitude: 36.9921, longitude: 127.1129, timezone: "Asia/Seoul" },
  { id: "kr-uijeongbu", country: KR, name: "의정부", latitude: 37.7381, longitude: 127.0337, timezone: "Asia/Seoul" },
  { id: "kr-paju", country: KR, name: "파주", latitude: 37.76, longitude: 126.78, timezone: "Asia/Seoul" },
  { id: "kr-gimpo", country: KR, name: "김포", latitude: 37.6153, longitude: 126.7156, timezone: "Asia/Seoul" },
  { id: "kr-chuncheon", country: KR, name: "춘천", latitude: 37.8813, longitude: 127.7298, timezone: "Asia/Seoul" },
  { id: "kr-wonju", country: KR, name: "원주", latitude: 37.3422, longitude: 127.9202, timezone: "Asia/Seoul" },
  { id: "kr-gangneung", country: KR, name: "강릉", latitude: 37.7519, longitude: 128.8761, timezone: "Asia/Seoul" },
  { id: "kr-cheongju", country: KR, name: "청주", latitude: 36.6424, longitude: 127.489, timezone: "Asia/Seoul" },
  { id: "kr-chungju", country: KR, name: "충주", latitude: 36.991, longitude: 127.9259, timezone: "Asia/Seoul" },
  { id: "kr-cheonan", country: KR, name: "천안", latitude: 36.8151, longitude: 127.1139, timezone: "Asia/Seoul" },
  { id: "kr-jeonju", country: KR, name: "전주", latitude: 35.8242, longitude: 127.148, timezone: "Asia/Seoul" },
  { id: "kr-iksan", country: KR, name: "익산", latitude: 35.9483, longitude: 126.9577, timezone: "Asia/Seoul" },
  { id: "kr-gunsan", country: KR, name: "군산", latitude: 35.9676, longitude: 126.7367, timezone: "Asia/Seoul" },
  { id: "kr-mokpo", country: KR, name: "목포", latitude: 34.8118, longitude: 126.3922, timezone: "Asia/Seoul" },
  { id: "kr-yeosu", country: KR, name: "여수", latitude: 34.7604, longitude: 127.6622, timezone: "Asia/Seoul" },
  { id: "kr-suncheon", country: KR, name: "순천", latitude: 34.9507, longitude: 127.4872, timezone: "Asia/Seoul" },
  { id: "kr-pohang", country: KR, name: "포항", latitude: 36.019, longitude: 129.3435, timezone: "Asia/Seoul" },
  { id: "kr-gyeongju", country: KR, name: "경주", latitude: 35.8562, longitude: 129.2247, timezone: "Asia/Seoul" },
  { id: "kr-gumi", country: KR, name: "구미", latitude: 36.1195, longitude: 128.3446, timezone: "Asia/Seoul" },
  { id: "kr-andong", country: KR, name: "안동", latitude: 36.5684, longitude: 128.7294, timezone: "Asia/Seoul" },
  { id: "kr-changwon", country: KR, name: "창원", latitude: 35.228, longitude: 128.6811, timezone: "Asia/Seoul" },
  { id: "kr-jinju", country: KR, name: "진주", latitude: 35.18, longitude: 128.1076, timezone: "Asia/Seoul" },
  { id: "kr-gimhae", country: KR, name: "김해", latitude: 35.2285, longitude: 128.8894, timezone: "Asia/Seoul" },
  { id: "kr-jeju", country: KR, name: "제주", latitude: 33.4996, longitude: 126.5312, timezone: "Asia/Seoul" },
  { id: "kr-seogwipo", country: KR, name: "서귀포", latitude: 33.2541, longitude: 126.56, timezone: "Asia/Seoul" },
  { id: "kp-pyongyang", country: "북한", name: "평양", latitude: 39.0392, longitude: 125.7625, timezone: "Asia/Pyongyang" },
  { id: "jp-tokyo", country: "일본", name: "도쿄", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { id: "jp-osaka", country: "일본", name: "오사카", latitude: 34.6937, longitude: 135.5023, timezone: "Asia/Tokyo" },
  { id: "cn-beijing", country: "중국", name: "베이징", latitude: 39.9042, longitude: 116.4074, timezone: "Asia/Shanghai" },
  { id: "cn-shanghai", country: "중국", name: "상하이", latitude: 31.2304, longitude: 121.4737, timezone: "Asia/Shanghai" },
  { id: "hk-hongkong", country: "홍콩", name: "홍콩", latitude: 22.3193, longitude: 114.1694, timezone: "Asia/Hong_Kong" },
  { id: "tw-taipei", country: "대만", name: "타이베이", latitude: 25.033, longitude: 121.5654, timezone: "Asia/Taipei" },
  { id: "sg-singapore", country: "싱가포르", name: "싱가포르", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { id: "th-bangkok", country: "태국", name: "방콕", latitude: 13.7563, longitude: 100.5018, timezone: "Asia/Bangkok" },
  { id: "vn-hcmc", country: "베트남", name: "호찌민", latitude: 10.8231, longitude: 106.6297, timezone: "Asia/Ho_Chi_Minh" },
  { id: "ph-manila", country: "필리핀", name: "마닐라", latitude: 14.5995, longitude: 120.9842, timezone: "Asia/Manila" },
  { id: "au-sydney", country: "호주", name: "시드니", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
  { id: "us-newyork", country: "미국", name: "뉴욕", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { id: "us-la", country: "미국", name: "로스앤젤레스", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { id: "us-chicago", country: "미국", name: "시카고", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" },
  { id: "us-seattle", country: "미국", name: "시애틀", latitude: 47.6062, longitude: -122.3321, timezone: "America/Los_Angeles" },
  { id: "us-honolulu", country: "미국", name: "호놀룰루", latitude: 21.3069, longitude: -157.8583, timezone: "Pacific/Honolulu" },
  { id: "ca-toronto", country: "캐나다", name: "토론토", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto" },
  { id: "ca-vancouver", country: "캐나다", name: "밴쿠버", latitude: 49.2827, longitude: -123.1207, timezone: "America/Vancouver" },
  { id: "gb-london", country: "영국", name: "런던", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London" },
  { id: "fr-paris", country: "프랑스", name: "파리", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { id: "de-berlin", country: "독일", name: "베를린", latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin" },
  { id: "ru-moscow", country: "러시아", name: "모스크바", latitude: 55.7558, longitude: 37.6173, timezone: "Europe/Moscow" },
  { id: "br-saopaulo", country: "브라질", name: "상파울루", latitude: -23.5505, longitude: -46.6333, timezone: "America/Sao_Paulo" },
];

export function findCity(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

export const COUNTRIES = Array.from(new Set(CITIES.map((c) => c.country)));
