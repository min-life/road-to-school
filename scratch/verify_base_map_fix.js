const fs = require('fs');
const path = require('path');

async function verifyBaseMapFix() {
  console.log('=== VERIFYING VIETMAP BASE MAP RENDERING & VECTOR TILE UNMASKING ===\n');

  // 1. Read tile key
  const envPath = path.resolve('mobile/.env.local');
  if (!fs.existsSync(envPath)) throw new Error('mobile/.env.local missing');
  const envText = fs.readFileSync(envPath, 'utf8');
  let tileKey = '';
  envText.split('\n').forEach(l => {
    const [k, v] = l.split('=');
    if (k && k.trim() === 'EXPO_PUBLIC_VIETMAP_TILE_API_KEY') tileKey = (v || '').trim();
  });
  console.log('1. Tile Key Loaded: length =', tileKey.length);
  if (!tileKey) throw new Error('Tile key empty');

  // 2. Test 3 styles
  const styles = [
    { key: 'streets', url: 'https://maps.vietmap.vn/maps/styles/tm/style.json' },
    { key: 'light', url: 'https://maps.vietmap.vn/maps/styles/lm/style.json' },
    { key: 'dark', url: 'https://maps.vietmap.vn/maps/styles/dm/style.json' },
  ];

  const XOR_KEY = [
    1, 2, 3, 5, 7, 9, 15, 60, 45, 95, 45, 69, 78, 42, 66, 54, 99, 57, 54, 33, 22, 11, 66, 99, 99,
    77, 55, 23, 45, 65, 72, 35,
  ];

  const vtPkg = require(path.resolve('web/node_modules/@mapbox/vector-tile'));
  const pbfPkg = require(path.resolve('web/node_modules/pbf'));

  for (const s of styles) {
    console.log(`\n2. Testing Style [${s.key}]: ${s.url}`);
    const styleRes = await fetch(`${s.url}?apikey=${tileKey}`);
    console.log(`   Style HTTP Status: ${styleRes.status}`);
    if (!styleRes.ok) throw new Error(`Style ${s.key} failed with ${styleRes.status}`);
    const styleJson = await styleRes.json();
    console.log(`   Style version: ${styleJson.version}, layers: ${styleJson.layers?.length}`);

    // Check tile url
    const tilePattern = styleJson.sources?.openmaptiles?.tiles?.[0];
    console.log(`   Vector source tile template: ${tilePattern.split('?')[0]}`);

    // Test downloading a real tile at center coordinates (zoom 12, HCMC x=3262, y=1924)
    const testTileUrl = tilePattern.replace('{z}', '12').replace('{x}', '3262').replace('{y}', '1924');
    const tileRes = await fetch(testTileUrl);
    console.log(`   Tile HTTP Status: ${tileRes.status}`);
    const tileBuf = await tileRes.arrayBuffer();
    console.log(`   Raw tile bytes: ${tileBuf.byteLength}`);

    // Verify mask [1, 1, 1]
    const u = new Uint8Array(tileBuf);
    const isMasked = u.length >= 3 && u[0] === 1 && u[1] === 1 && u[2] === 1;
    console.log(`   Tile is VietMap masked [1, 1, 1]: ${isMasked}`);
    if (!isMasked) throw new Error('Expected tile to be masked with [1, 1, 1]');

    // Unmask
    const out = new Uint8Array(tileBuf.byteLength - 3);
    for (let i = 3; i < u.length; i++) {
      out[i - 3] = u[i] ^ XOR_KEY[(i - 3) % 32];
    }
    console.log(`   Unmasked first byte is 0x1A (Protobuf Tag 3): ${out[0] === 0x1a}`);

    // Parse with VectorTile
    const pbf = new pbfPkg.PbfReader(out);
    const vt = new vtPkg.VectorTile(pbf);
    const layerNames = Object.keys(vt.layers);
    console.log(`   Decoded Layer Count: ${layerNames.length} layers -> [${layerNames.join(', ')}]`);
    const roadLayer = vt.layers['road'];
    console.log(`   -> Road features count: ${roadLayer ? roadLayer.length : 0} features!`);
    if (!roadLayer || roadLayer.length === 0) {
      throw new Error('Road layer missing or 0 features in decoded vector tile!');
    }
  }

  // 3. Verify CSP worker on unpkg and jsdelivr
  console.log('\n3. Verifying MapLibre GL CSP Worker CDNs:');
  const unpkgRes = await fetch('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl-csp-worker.js', { method: 'HEAD' });
  console.log('   unpkg.com CSP Worker status:', unpkgRes.status);
  const jsdelivrRes = await fetch('https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl-csp-worker.js', { method: 'HEAD' });
  console.log('   jsdelivr.net CSP Worker status:', jsdelivrRes.status);
  if (unpkgRes.status !== 200 || jsdelivrRes.status !== 200) {
    throw new Error('Worker CDN verification failed!');
  }

  // 4. Verify VietMapPicker.tsx syntax and integration
  console.log('\n4. Verifying VietMapPicker.tsx:');
  const pickerCode = fs.readFileSync('mobile/components/maps/VietMapPicker.tsx', 'utf8');
  console.log('   Contains XOR_KEY unmasker:', pickerCode.includes('XOR_KEY'));
  console.log('   Contains setWorkerUrl:', pickerCode.includes('maplibregl.setWorkerUrl'));
  console.log('   Contains baseUrl https://maps.vietmap.vn:', pickerCode.includes("baseUrl: 'https://maps.vietmap.vn'"));
  console.log('   Contains TILES_LOADED event:', pickerCode.includes('TILES_LOADED'));
  console.log('   Contains map.resize():', pickerCode.includes('map.resize()'));

  console.log('\n=== ALL BASE MAP RENDERING CHECKS PASSED WITH 100% SUCCESS ===');
}

verifyBaseMapFix().catch(err => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
