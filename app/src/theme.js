// Same palette as the Milestone 02 prototype (teal and turmeric) so the build matches what users tested.
export const C = {
  brand: '#0d5c63', brand2: '#0a454b', onBrand: '#ffffff', accent: '#e9a23b', accentInk: '#3d2700',
  bg: '#f3f6f5', card: '#ffffff', line: '#d9e2e0', text: '#14201f', muted: '#5d6b69',
  good: '#17693a', goodBg: '#e2f3e9', warn: '#8a5206', warnBg: '#fcefd6', bad: '#aa3029', badBg: '#fae5e2', info: '#0d5c63', infoBg: '#dfeeee',
  star: '#c9830a', ph1: '#cfe4e2', ph2: '#f3dcb4', ph3: '#d9d6ee'
};
export const F = { ui: 'Figtree_500Medium', uiB: 'Figtree_700Bold', uiSB: 'Figtree_600SemiBold', head: 'BricolageGrotesque_700Bold' };
export const R = { m: 12, s: 8 };
export const shadow = { shadowColor: '#14201f', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 };
export const AVATAR = ['#0d5c63', '#a5502a', '#4b4a9a', '#2c7a4b', '#8a3b63', '#6a5a1c'];
export const lkr = (n) => 'LKR ' + Number(n || 0).toLocaleString('en-US');
export const initials = (n = '') => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const TRADES = { plumbing: { n: 'Plumbing', i: 'droplet' }, electrical: { n: 'Electrical', i: 'zap' }, cleaning: { n: 'Cleaning', i: 'wind' } };
