export const state = {
  inventory: {},
  currentUser: null,
  consumedLikedFilter: 'all',
  wineColorFilter: 'all',
  lastUpdated: null
};

export const SECTIONS = [
  { status: 'ready',    label: 'Ready to Drink',          cls: 'ready' },
  { status: 'soon',     label: 'Drink Soon',               cls: 'soon' },
  { status: 'spirits',  label: 'Spirits',                  cls: 'spirits' },
  { status: 'consumed', label: 'Consumed',                 cls: 'consumed' },
];
