const { File } = require('../mobile/node_modules/expo-file-system');

try {
  const f = new File('file:///tmp/test.jpg');
  console.log('File created:', f);
  console.log('f.uri:', f.uri);
  console.log('f.name:', f.name);
  console.log('has bytes:', 'bytes' in f);
  console.log('has name:', 'name' in f);
  console.log('has type before:', 'type' in f);
  f.type = 'image/jpeg';
  console.log('has type after:', 'type' in f, f.type);
} catch (e) {
  console.log('Error creating File:', e.message);
}
