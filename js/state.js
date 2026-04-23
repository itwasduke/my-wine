export const state = {
  inventory: {},
  currentUser: null,
  consumedLikedFilter: 'all',
  wineColorFilter: 'all',
  viewMode: localStorage.getItem('cellar_view_mode') || 'grid',
  galleryIndex: 0,
  showInventoryUnauth: false,
  lastUpdated: null,
  galleryNavigate: null,  // set by renderGallery, used by keyboard handler
};

export const SECTIONS = [
  { status: 'ready',    label: 'Ready to Drink',          cls: 'ready' },
  { status: 'soon',     label: 'Drink Soon',               cls: 'soon' },
  { status: 'spirits',  label: 'Spirits',                  cls: 'spirits' },
  { status: 'consumed', label: 'Consumed',                 cls: 'consumed' },
];

