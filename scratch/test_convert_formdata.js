const path = require('path');

// Simulate convertFormDataAsync logic from mobile/node_modules/expo/src/winter/fetch/convertFormData.ts
function encodeFilename(filename) {
  return encodeURIComponent(filename.replace(/\//g, '_'));
}

function getFormDataPartHeaders(part, name) {
  const contentDisposition = 'form-data; name="' + name + '"';
  const headers = {
    'content-disposition': contentDisposition,
    'content-type': undefined,
  };

  if (typeof part === 'object') {
    if ('name' in part && typeof part.name === 'string') {
      headers['content-disposition'] += `; filename="${encodeFilename(part.name)}"`;
    }
    if ('type' in part && typeof part.type === 'string') {
      headers['content-type'] = part.type;
    }
  }
  return headers;
}

async function convertFormDataSim(entries, boundary = '----ExpoFetchFormBoundaryTest') {
  const results = [];
  for (const [name, entry] of entries) {
    results.push(`--${boundary}\r\n`);
    for (const [headerKey, headerValue] of Object.entries(getFormDataPartHeaders(entry, name))) {
      if (headerValue) {
        results.push(`${headerKey}: ${headerValue}\r\n`);
      }
    }
    results.push(`\r\n`);
    if (typeof entry === 'string') {
      results.push(entry);
    } else if (typeof entry === 'object' && 'bytes' in entry) {
      results.push(await entry.bytes());
    } else {
      throw new Error('Unsupported FormDataPart implementation');
    }
    results.push(`\r\n`);
  }
  results.push(`--${boundary}--\r\n`);
  return { results, boundary };
}

async function run() {
  console.log('Testing old RN object { uri, type, name }...');
  try {
    await convertFormDataSim([
      ['avatar', { uri: 'file:///path/to/IMG_1818.JPG', type: 'image/jpeg', name: 'IMG_1818.JPG' }]
    ]);
    console.log('UNEXPECTED: old object passed');
  } catch (err) {
    console.log('CONFIRMED OLD ERROR:', err.message);
  }

  console.log('\nTesting new File-compatible object with bytes(), name, type...');
  const fakeFileBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const newPart = {
    name: 'IMG_1818.JPG',
    type: 'image/jpeg',
    bytes: async () => fakeFileBytes,
  };
  const res = await convertFormDataSim([
    ['avatar', newPart]
  ]);
  console.log('SUCCESS! Headers and parts generated:');
  for (const item of res.results) {
    if (typeof item === 'string') {
      process.stdout.write(item);
    } else {
      console.log(`[Binary data: ${item.length} bytes]`);
    }
  }
}

run().catch(console.error);
