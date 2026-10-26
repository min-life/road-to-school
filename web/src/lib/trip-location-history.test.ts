import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitRecordedHistory } from './trip-location-history.ts';

const point = (sequence: number, runId: string, seconds: number) => ({ sequence, runId, latitude: 10, longitude: 106, recordedAt: new Date(seconds * 1000).toISOString() });
describe('Web recorded-history rendering boundaries', () => {
  it('keeps zero history distinct from an isolated recorded point', () => {
    assert.deepEqual(splitRecordedHistory([]), []);
    assert.deepEqual(splitRecordedHistory([point(1, 'a', 0)]), [[{ latitude: 10, longitude: 106 }]]);
  });
  it('does not bridge run changes or long time gaps', () => {
    assert.deepEqual(splitRecordedHistory([point(1, 'a', 0), point(2, 'a', 5), point(3, 'b', 10), point(4, 'b', 40)]).map(p => p.length), [2, 1, 1]);
  });
  it('keeps cadence-boundary points together but splits missing sequence ranges', () => {
    assert.deepEqual(splitRecordedHistory([point(1, 'a', 0), point(2, 'a', 15), point(4, 'a', 20)]).map(p => p.length), [2, 1]);
  });
});
