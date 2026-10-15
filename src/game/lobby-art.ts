import { assetUrl } from './asset-url';

/** Display-sized portraits are shared by lobby cards and the canvas HUD. */
export const LOBBY_CHARACTER_PATHS: Readonly<Record<string, string>> = {
  raiden: 'lobby/raiden.webp', jean: 'lobby/jean.webp', eula: 'lobby/eula.webp',
  diluc: 'lobby/diluc.webp', xiao: 'lobby/xiao.webp',
  zhongli: 'lobby/zhongli.webp', furina: 'lobby/furina.webp',
  tharja: 'lobby/tharja.webp', corrin: 'lobby/corrin.webp',
};
export const LOBBY_BACKGROUND_PATH = 'lobby/liyue-dawn.webp';
export const LOBBY_CHARACTER_ART: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(LOBBY_CHARACTER_PATHS).map(([id, logical]) => [id, assetUrl(logical)]),
);
export const LOBBY_BACKGROUND_ART = assetUrl(LOBBY_BACKGROUND_PATH);
