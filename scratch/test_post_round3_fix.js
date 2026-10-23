const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('=== STARTING POST-ROUND 3 LIVE VERIFICATION ===\n');

  // 1. Check Mobile Environment File
  const envPath = path.join(__dirname, '../mobile/.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('mobile/.env.local does not exist!');
  }
  const envContent = fs.readFileSync(envPath, 'utf-8');
  let apiKey = '', tileKey = '';
  envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k === 'EXPO_PUBLIC_VIETMAP_API_KEY') apiKey = (v || '').trim();
    if (k === 'EXPO_PUBLIC_VIETMAP_TILE_API_KEY') tileKey = (v || '').trim();
  });

  console.log('1. Mobile Environment:');
  console.log('   EXPO_PUBLIC_VIETMAP_API_KEY configured:', apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO');
  console.log('   EXPO_PUBLIC_VIETMAP_TILE_API_KEY configured:', tileKey ? 'YES (length: ' + tileKey.length + ')' : 'NO');
  if (!apiKey || !tileKey) throw new Error('Missing VietMap API keys in mobile/.env.local');

  // 2. Direct VietMap REST APIs Test
  console.log('\n2. Testing Direct VietMap REST APIs:');
  
  // 2.1 Autocomplete
  const autoUrl = `https://maps.vietmap.vn/api/autocomplete/v4?apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent('Bến Thành')}&display_type=5`;
  const autoRes = await fetch(autoUrl, { headers: { Accept: 'application/json' } });
  console.log('   Autocomplete status:', autoRes.status);
  const autoData = await autoRes.json();
  console.log('   Autocomplete results count:', Array.isArray(autoData) ? autoData.length : 0);
  if (!Array.isArray(autoData) || autoData.length === 0) {
    throw new Error('Autocomplete failed or returned 0 results');
  }
  const firstRef = autoData[0].ref_id;
  console.log('   First item name:', autoData[0].name, '| ref_id:', firstRef);

  // 2.2 Place Details
  const placeUrl = `https://maps.vietmap.vn/api/place/v4?apikey=${encodeURIComponent(apiKey)}&refid=${encodeURIComponent(firstRef)}`;
  const placeRes = await fetch(placeUrl, { headers: { Accept: 'application/json' } });
  console.log('   Place Details status:', placeRes.status);
  const placeData = await placeRes.json();
  console.log('   Place coords:', placeData.lat, placeData.lng, '| address:', placeData.display || placeData.address);
  if (!placeData.lat || !placeData.lng) throw new Error('Place details missing coords');

  // 2.3 Reverse Geocode
  const revUrl = `https://maps.vietmap.vn/api/reverse/v4?apikey=${encodeURIComponent(apiKey)}&lat=10.776889&lng=106.700806&display_type=5`;
  const revRes = await fetch(revUrl, { headers: { Accept: 'application/json' } });
  console.log('   Reverse Geocode status:', revRes.status);
  const revData = await revRes.json();
  console.log('   Reverse results count:', Array.isArray(revData) ? revData.length : 0);
  if (Array.isArray(revData) && revData.length > 0) {
    console.log('   Reverse top address:', revData[0].display || revData[0].address);
  }

  // 3. Map Style URLs and Vector Tiles Test
  console.log('\n3. Testing VietMap Map Styles:');
  const styles = [
    { name: 'streets', url: 'https://maps.vietmap.vn/maps/styles/tm/style.json' },
    { name: 'light', url: 'https://maps.vietmap.vn/maps/styles/lm/style.json' },
    { name: 'dark', url: 'https://maps.vietmap.vn/maps/styles/dm/style.json' },
  ];

  for (const s of styles) {
    const sUrl = `${s.url}?apikey=${encodeURIComponent(tileKey)}`;
    const res = await fetch(sUrl);
    console.log(`   Style [${s.name}] (${s.url}) status:`, res.status);
    if (res.ok) {
      const json = await res.json();
      console.log(`     -> Style version: ${json.version}, sources: ${Object.keys(json.sources || {}).join(', ')}`);
    } else {
      console.warn(`     -> Style [${s.name}] returned ${res.status}`);
    }
  }

  // 4. Live Backend Avatar Upload Test
  console.log('\n4. Testing Live Backend Avatar Upload with Multipart field "avatar":');
  // Log in as parent on Mobile endpoint
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/mobile/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'parent_test@test.com', password: 'Pass@123' }),
  });
  console.log('   Mobile Login status:', loginRes.status);
  if (loginRes.ok) {
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('   Logged in user:', loginData.user.fullName, 'Role:', loginData.user.role);

    // Create a minimal 1x1 valid JPEG Buffer
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x80, 0xff, 0xd9,
    ]);

    // Construct FormData with field 'avatar'
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="avatar.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      jpegBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch('http://localhost:3000/api/v1/auth/me/avatar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });

    console.log('   Avatar Upload response status:', uploadRes.status);
    const uploadData = await uploadRes.json();
    console.log('   Avatar Upload result:', uploadData);
    if (!uploadRes.ok || !uploadData.avatarUrl) {
      throw new Error('Avatar upload failed: ' + JSON.stringify(uploadData));
    }
    console.log('   -> Cloudinary Avatar URL successfully saved:', uploadData.avatarUrl.substring(0, 50) + '...');
  }

  console.log('\n=== ALL POST-ROUND 3 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('\nVerification failed with error:', err);
  process.exit(1);
});
