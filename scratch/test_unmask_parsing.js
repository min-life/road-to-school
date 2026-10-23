const fs = require('fs');

async function testUnmask() {
  const env = fs.readFileSync('web/.env.local', 'utf8');
  const keyMatch = env.match(/NEXT_PUBLIC_VIETMAP_TILEMAP_KEY=([^\r\n]+)/);
  const key = keyMatch ? keyMatch[1].trim() : '';

  const tmTileUrl = `https://maps.vietmap.vn/maps/tiles/vlc-20261015/12/3262/1924.pbf?apikey=${key}`;
  console.log('Fetching TM tile from:', tmTileUrl);
  const res = await fetch(tmTileUrl);
  const rawBuf = await res.arrayBuffer();
  console.log('Raw buffer length:', rawBuf.byteLength);

  const u = new Uint8Array(rawBuf);
  console.log('Raw first 5 bytes:', [...u.slice(0, 5)]);

  const XOR_KEY = [
    1, 2, 3, 5, 7, 9, 15, 60, 45, 95, 45, 69, 78, 42, 66, 54, 99, 57, 54, 33, 22, 11, 66, 99, 99,
    77, 55, 23, 45, 65, 72, 35,
  ];

  if (u.length >= 3 && u[0] === 1 && u[1] === 1 && u[2] === 1) {
    const out = new Uint8Array(rawBuf.byteLength - 3);
    for (let i = 3; i < u.length; i++) {
      out[i - 3] = u[i] ^ XOR_KEY[(i - 3) % 32];
    }
    console.log('Unmasked first 10 bytes:', [...out.slice(0, 10)]);

    // Check if protobuf tag 3 wire 2 (0x1a)
    console.log('First byte is 0x1a (26):', out[0] === 26);

    // Let's check with @mapbox/vector-tile from web/node_modules
    try {
      const path = require('path');
      const { VectorTile } = require(path.resolve('web/node_modules/@mapbox/vector-tile'));
      const PbfModule = require(path.resolve('web/node_modules/pbf'));
      const Pbf = PbfModule.default || PbfModule;
      const pbf = new Pbf(out);
      const vt = new VectorTile(pbf);
      console.log('VectorTile layers decoded successfully:', Object.keys(vt.layers));
      for (const [name, l] of Object.entries(vt.layers)) {
        console.log(`  Layer [${name}]: ${l.length} features`);
      }
    } catch (err) {
      console.error('VectorTile parse error:', err.message);
    }
  } else {
    console.log('Tile was NOT masked with [1, 1, 1]');
  }
}

testUnmask();
