export const busMapIcon = {
  className: '',
  iconSize: [48, 26],
  iconAnchor: [24, 13],
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="6 20 222 118" fill="none" style="display:block" role="img" aria-label="Xe đưa đón học sinh">
    <g transform="translate(234 0) scale(-1 1)">
      <path d="M41 25 H199 Q222 25 222 48 V103 Q222 118 207 118 H25 Q10 118 10 103 V79 Q10 64 22 59 L32 55 V38 Q32 25 41 25Z" fill="#FFCE55"/>
      <path d="M41 25H199Q222 25 222 48V56H32V38Q32 25 41 25Z" fill="#FFB92F"/>
      <path d="M22 60L32 56V68H16Q18 63 22 60Z" fill="#FFB92F"/>
      <path d="M14 78H22Q30 78 30 87T22 96H10V83Q10 78 14 78Z" fill="white"/>
      <path d="M34 81H221V87H34Z" fill="#F8B62F"/>
      <path d="M27 113H213Q211 118 206 118H26Q19 118 15 113Z" fill="#F6A91D"/>
      <rect x="43" y="39" width="38" height="35" rx="8" fill="#9E833F"/>
      <rect x="46" y="42" width="32" height="29" rx="6" fill="#B2D0D2"/>
      <path d="M47 66 L76 58 V70 H47Z" fill="#D8C18B" opacity=".35"/>
      <rect x="87" y="39" width="38" height="35" rx="8" fill="#173451"/>
      <rect x="90" y="42" width="32" height="29" rx="6" fill="#8EC8F6"/>
      <rect x="131" y="39" width="38" height="35" rx="8" fill="#9E833F"/>
      <rect x="134" y="42" width="32" height="29" rx="6" fill="#B2D0D2"/>
      <path d="M135 66 L164 58 V70 H135Z" fill="#D8C18B" opacity=".35"/>
      <rect x="175" y="39" width="38" height="35" rx="8" fill="#173451"/>
      <rect x="178" y="42" width="32" height="29" rx="6" fill="#8EC8F6"/>
      <circle cx="65" cy="115" r="19" fill="#173451"/>
      <circle cx="65" cy="115" r="8.4" fill="#FFFFFF"/>
      <circle cx="187" cy="115" r="19" fill="#173451"/>
      <circle cx="187" cy="115" r="8.4" fill="#FFFFFF"/>
    </g>
  </svg>`,
};

// The WebView embeds the same artwork as web/public/map-markers at 30 × 36.
// Anchor to the visible pin tip inside the SVG, above its transparent edge.
export const depotMapIcon = {
  className: '',
  iconSize: [30, 36],
  iconAnchor: [15, 35],
  popupAnchor: [0, -33],
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" style="display:block" viewBox="0 0 40 48" role="img" aria-label="Bãi xe trung tâm"><title>Bãi xe trung tâm</title><path d="M20 2C10.06 2 2 10.06 2 20c0 11.15 10.47 16.37 16.2 24.45a2.2 2.2 0 0 0 3.6 0C27.53 36.37 38 31.15 38 20 38 10.06 29.94 2 20 2Z" fill="#193652" stroke="white" stroke-width="3"/><path d="M20 2C10.06 2 2 10.06 2 20c0 11.15 10.47 16.37 16.2 24.45a2.2 2.2 0 0 0 3.6 0C27.53 36.37 38 31.15 38 20 38 10.06 29.94 2 20 2Z" fill="none" stroke="#193652" stroke-opacity=".42" stroke-width=".7"/><path d="M16 25V12.5h4.9a4.2 4.2 0 0 1 0 8.4H16" fill="none" stroke="white" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/><path d="m13 23.5-2 5.5h18l-2-5.5" fill="none" stroke="white" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

export const schoolMapIcon = {
  className: '',
  iconSize: [30, 36],
  iconAnchor: [15, 35],
  popupAnchor: [0, -33],
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" style="display:block" viewBox="0 0 40 48" role="img" aria-label="Trường học"><title>Trường học</title><path d="M20 2C10.06 2 2 10.06 2 20c0 11.15 10.47 16.37 16.2 24.45a2.2 2.2 0 0 0 3.6 0C27.53 36.37 38 31.15 38 20 38 10.06 29.94 2 20 2Z" fill="#FFCB56" stroke="white" stroke-width="3"/><path d="M20 2C10.06 2 2 10.06 2 20c0 11.15 10.47 16.37 16.2 24.45a2.2 2.2 0 0 0 3.6 0C27.53 36.37 38 31.15 38 20 38 10.06 29.94 2 20 2Z" fill="none" stroke="#193652" stroke-opacity=".42" stroke-width=".7"/><g fill="none" stroke="#193652" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">
 <path d="M10.5 28V18h5l4.5-5 4.5 5h5v10M9 28h22M20 13V9.5l4.8 1.4L20 12M18 28v-5h4v5"/>
 <path d="M13 20.5h2v2h-2zm12 0h2v2h-2z" fill="#193652" stroke="none"/>
 <circle cx="20" cy="17.7" r="1.15" fill="#193652" stroke="none"/>
 </g></svg>`,
};

export const studentMapIcon = {
  className: 'rts-student-map-marker',
  iconSize: [30, 36],
  iconAnchor: [15, 35],
  popupAnchor: [0, -33],
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" style="display:block" viewBox="0 0 40 48" role="img" aria-label="Học sinh"><title>Học sinh</title><path d="M20 2C10.06 2 2 10.06 2 20c0 11.15 10.47 16.37 16.2 24.45a2.2 2.2 0 0 0 3.6 0C27.53 36.37 38 31.15 38 20 38 10.06 29.94 2 20 2Z" fill="#176B80" stroke="white" stroke-width="3"/><path d="M20 2C10.06 2 2 10.06 2 20c0 11.15 10.47 16.37 16.2 24.45a2.2 2.2 0 0 0 3.6 0C27.53 36.37 38 31.15 38 20 38 10.06 29.94 2 20 2Z" fill="none" stroke="#193652" stroke-opacity=".42" stroke-width=".7"/><circle cx="20" cy="15.3" r="3.6" fill="white"/><path d="M13.2 27v-1.6a6.8 6.8 0 0 1 13.6 0V27Z" fill="white"/></svg>`,
};

export const studentMapIconCss = `
  .rts-student-map-marker { position: absolute; }
  .rts-student-map-order { position: absolute; top: -2px; right: -6px; box-sizing: border-box; min-width: 16px;
    height: 16px; padding: 0 3px; border: 1px solid white; border-radius: 9px;
    display: grid; place-items: center; background: #193652; color: white;
    font: 750 10px/1 system-ui, sans-serif; }
`;
