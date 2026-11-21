// Decorative dark-glass swirl behind the hero text.
export const heroBg = () => `<svg class="bg" viewBox="0 0 1290 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs><filter id="b40" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="40"/></filter><filter id="b14" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter><filter id="b3"><feGaussianBlur stdDeviation="2.2"/></filter>
 <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7d8c95" stop-opacity="0"/><stop offset=".3" stop-color="#cfd9de" stop-opacity=".55"/><stop offset=".62" stop-color="#4b5c66" stop-opacity=".5"/><stop offset="1" stop-color="#0b1014" stop-opacity="0"/></linearGradient>
 <radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#080808" stop-opacity="0"/><stop offset="1" stop-color="#080808" stop-opacity=".85"/></radialGradient></defs>
 <rect width="1290" height="760" fill="#080808"/>
 <ellipse cx="1090" cy="30" rx="330" ry="105" fill="#455e6b" opacity=".8" filter="url(#b40)"/>
 <ellipse cx="780" cy="0" rx="260" ry="70" fill="#283640" opacity=".8" filter="url(#b40)"/>
 <ellipse cx="1260" cy="170" rx="170" ry="80" fill="#283640" opacity=".9" filter="url(#b40)"/>
 <ellipse cx="1130" cy="720" rx="360" ry="150" fill="#04283a" opacity=".85" filter="url(#b40)"/>
 <path d="M860 70C980 120 1100 70 1290 130" fill="none" stroke="#9fb2bc" stroke-width="3" opacity=".4" filter="url(#b3)"/>
 <path d="M900 110C1010 150 1120 118 1290 175" fill="none" stroke="#6d808a" stroke-width="2" opacity=".35" filter="url(#b3)"/>
 <path d="M-40 330C140 300 330 410 480 730" fill="none" stroke="url(#rb)" stroke-width="80" stroke-linecap="round" filter="url(#b14)" opacity=".6"/>
 <path d="M-40 330C140 300 330 410 480 730" fill="none" stroke="url(#rb)" stroke-width="22" stroke-linecap="round" filter="url(#b3)"/>
 <path d="M-20 352C150 322 322 430 462 740" fill="none" stroke="#dfe8ec" stroke-width="2" opacity=".55" filter="url(#b3)"/>
 <path d="M80 300C250 290 420 420 540 700" fill="none" stroke="#9fb2bc" stroke-width="1.5" opacity=".35"/>
 <path d="M200 110C260 200 330 330 520 420" fill="none" stroke="#c4d1d8" stroke-width="2" opacity=".28" filter="url(#b3)"/>
 <rect width="1290" height="760" fill="url(#vg)"/></svg>`;
