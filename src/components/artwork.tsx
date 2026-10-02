import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
// Local vector artwork: works offline and has no remote image requests.
function svgUri(svg: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let encoded = '';
  for (let i = 0; i < svg.length; i += 3) {
    const a = svg.charCodeAt(i), b = svg.charCodeAt(i + 1), c = svg.charCodeAt(i + 2);
    const bits = (a << 16) | ((b || 0) << 8) | (c || 0);
    encoded += chars[(bits >> 18) & 63] + chars[(bits >> 12) & 63] + (Number.isNaN(b) ? '=' : chars[(bits >> 6) & 63]) + (Number.isNaN(c) ? '=' : chars[bits & 63]);
  }
  return 'data:image/svg+xml;base64,' + encoded;
}
const paths = {
  home: '<path d="m3 11 9-8 9 8M5 10v11h5v-6h4v6h5V10"/>',
  tasks: '<rect x="4" y="4" width="16" height="17" rx="3"/><path d="m8 12 3 3 9-10"/>',
  habits: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  coach: '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6ZM20 2v4m-2-2h4"/>',
  settings: '<path d="m10 2 4 0 1 3 3 1 3 0 1 4-2 2 0 3 1 2-3 3-3-1-2 2-4-1-1-3-3-1-2-3 2-2 0-3 3-1Z"/><circle cx="12" cy="12" r="3"/>',
  leaf: '<path d="M20 3C7 2 1 8 5 15s15 3 15-12ZM3 22 15 10"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18"/>',
  flame: '<path d="M13 2c1 7-4 7-3 12-2-1-3-3-3-5-7 8-3 13 5 13 9 0 11-11 1-20Z"/>',
  bars: '<path d="M5 20v-5m7 5V5m7 15V9" stroke-width="4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M21 14A9 9 0 0 1 10 3a9 9 0 1 0 11 11Z"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  wave: '<path d="M2 8c7-14 13 14 20 0M2 16c7-14 13 14 20 0" stroke-width="4"/>',
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  return <Image accessible={false} source={{ uri: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`) }} style={{ width: size, height: size }} />;
}
export function ProgressRing({ percentage, color, size = 112 }: { percentage: number; color: string; size?: number }) {
  const { colors } = useAppTheme(); const progress = Math.max(0, Math.min(100, percentage));
  return <Image accessible={false} source={{ uri: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="51" fill="none" stroke="${colors.border}" stroke-width="10"/><circle cx="60" cy="60" r="51" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="${progress ? 'round' : 'butt'}" stroke-dasharray="${progress * 3.2044} 320.44" transform="rotate(-90 60 60)"/></svg>`) }} style={{ width: size, height: size }} />;
}
export function MountainScene({ style }: { style: StyleProp<ImageStyle> }) {
  const { mode, colors } = useAppTheme(); const dark = mode === 'dark';
  const trees = Array.from({ length: 38 }, (_, i) => {
    const x = 460 + i * 21, y = 285 + Math.sin(i * 1.7) * 18, h = 24 + (i % 5) * 9;
    return `<path d="M${x} ${y-h}l-${h/3} ${h*.6}h${h/6}l-${h/3} ${h*.5}h${h}l-${h/3}-${h*.5}h${h/6}Z" fill="${dark ? '#0c2033' : '#497890'}" opacity=".7"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 380"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${dark ? '#183866' : '#c8e1fc'}"/><stop offset=".62" stop-color="${dark ? '#995c89' : '#fbcfc0'}"/><stop offset="1" stop-color="${colors.bg}"/></linearGradient><linearGradient id="fade"><stop stop-color="${colors.bg}"/><stop offset=".58" stop-color="${colors.bg}" stop-opacity=".08"/><stop offset="1" stop-color="${colors.bg}" stop-opacity="0"/></linearGradient><linearGradient id="bottom" x2="0" y2="1"><stop stop-color="${colors.bg}" stop-opacity="0"/><stop offset="1" stop-color="${colors.bg}"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h1200v380H0z"/><circle cx="945" cy="144" r="49" fill="#FFDCAC"/><path d="M0 253 120 194 180 218 270 130 315 169 390 89 440 122 488 77 529 142 574 153 634 227 734 166 800 185 849 220 900 200 1017 157 1070 178 1160 74 1200 111V380H0" fill="${dark ? '#2b3764' : '#9db9db'}"/><path d="m355 141 35-52 50 33 48-45 41 65-45-29-24 26-23-10-40 13Z" fill="${dark ? '#536185' : '#d9e9fb'}"/><path d="M0 330 143 235 203 265 354 177 441 230 480 186 623 298 749 251 855 291 951 236 1040 253 1145 148 1200 187V380H0" fill="${dark ? '#192b4b' : '#769ab9'}"/><path d="m0 336 161-33 163 30 155-61 147 69 172-28 210-83 192-23v173H0" fill="${dark ? '#102238' : '#5a869e'}"/>${trees}<path fill="url(#fade)" d="M0 0h1200v380H0z"/><path fill="url(#bottom)" d="M0 230h1200v150H0z"/></svg>`;
  return <Image accessible={false} contentFit="cover" contentPosition="right center" source={{ uri: svgUri(svg) }} style={style} />;
}
export function CoachMascot() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 185"><defs><linearGradient id="body" x2="1" y2="1"><stop stop-color="#f6fbff"/><stop offset=".5" stop-color="#97c9fa"/><stop offset="1" stop-color="#5e75cd"/></linearGradient><linearGradient id="leaf"><stop stop-color="#6affd9"/><stop offset="1" stop-color="#03afb1"/></linearGradient></defs><ellipse cx="96" cy="173" rx="57" ry="9" fill="#47dadd" opacity=".1"/><path d="M73 142q-18 20-13 32h75q4-27-15-33" fill="url(#body)"/><ellipse cx="44" cy="104" rx="12" ry="24" fill="url(#body)"/><ellipse cx="147" cy="104" rx="12" ry="24" fill="url(#body)"/><rect x="42" y="58" width="108" height="91" rx="43" fill="url(#body)"/><rect x="53" y="72" width="85" height="62" rx="29" fill="#07192e"/><path d="M68 101q7-13 14 0m28 0q7-13 14 0m-33 14q6 5 12 0" fill="none" stroke="#50efff" stroke-width="5" stroke-linecap="round"/><path d="M97 59V33" stroke="#5df6d3" stroke-width="4"/><path d="M97 41Q66 45 69 18q28 0 28 23Zm0 3q0-29 31-26-3 25-31 26Z" fill="url(#leaf)"/><path d="M18 68v12m-6-6h12m130-38v10m-5-5h10M24 132v8m-4-4h8" stroke="#59e9f6" stroke-width="2" stroke-linecap="round"/></svg>`;
  return <Image accessible={false} source={{ uri: svgUri(svg) }} style={{ width: 142, height: 150 }} />;
}
