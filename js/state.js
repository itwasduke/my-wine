export const VERSION = '2.0.66';
export const OWNER_UID = 'ZJgo9XDaDyT4Xwrvpsrlp1M7rk33';

export const state = {
  inventory: {},
  currentUser: null,
  consumedLikedFilter: 'all',
  wineColorFilter: 'all',
  viewMode: localStorage.getItem('cellar_view_mode') || 'grid',
  immersiveMode: localStorage.getItem('cellar_immersive_mode') || 'gallery',
  galleryIndex: 0,
  showInventoryUnauth: false,
  lastUpdated: null,
  galleryNavigate: null,  // set by renderGallery, used by keyboard handler
};

export function isSpirit(item) {
  const name = (item.name || '').toLowerCase();
  return item.type === 'spirit' || item.status === 'spirits' || item.statusLabel === 'Spirits'
    || name.includes('piggyback') || name.includes('powers');
}

export const SECTIONS = [
  { status: 'ready',    label: 'Ready to Drink',          cls: 'ready' },
  { status: 'soon',     label: 'Drink Soon',               cls: 'soon' },
  { status: 'spirits',  label: 'Spirits',                  cls: 'spirits' },
  { status: 'consumed', label: 'Consumed',                 cls: 'consumed' },
];

