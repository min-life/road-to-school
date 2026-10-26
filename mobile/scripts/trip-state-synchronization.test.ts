import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRefreshLoop } from '../utils/refresh-loop.ts';
import { getTripMapSnapshot } from '../utils/trip-map-data.ts';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function clock() {
  const queue: { fn: () => void; cancelled: boolean; ms: number }[] = [];
  return {
    queue,
    timers: {
      set(fn: () => void, ms: number) { const item = { fn, cancelled: false, ms }; queue.push(item); return item as unknown as ReturnType<typeof setTimeout>; },
      clear(id: ReturnType<typeof setTimeout>) { (id as unknown as { cancelled: boolean }).cancelled = true; },
    },
    tick() { const item = queue.find(item => !item.cancelled); if (!item) throw Error('No scheduled request'); item.cancelled = true; item.fn(); },
    count() { return queue.filter(item => !item.cancelled).length; },
  };
}

describe('Active screen refresh coordinator', () => {
  it('keeps the map source unchanged for operation and assignment updates', () => {
    const trip = { polylineGeometry: 'geometry', status: 'SCHEDULED', driverId: 'first', stops: [
      { stopOrder: 1, latitude: 10, longitude: 106, stopType: 'PICKUP', attendanceStatus: 'UNMARKED' },
    ] };
    const initial = getTripMapSnapshot(trip);
    trip.status = 'IN_PROGRESS'; trip.driverId = 'replacement'; trip.stops[0].attendanceStatus = 'PRESENT';
    assert.equal(getTripMapSnapshot(trip), initial);
    trip.stops[0].latitude = 11;
    assert.notEqual(getTripMapSnapshot(trip), initial);
  });
  it('fetches immediately, polls at cadence and stops in background/unmount', async () => {
    const time = clock(); let calls = 0;
    const loop = createRefreshLoop(async () => { calls++; }, 5000, time.timers);
    loop.setActive(true); await flush();
    assert.equal(calls, 1); assert.equal(time.count(), 1);
    assert.equal(time.queue[0].ms, 5000);
    time.tick(); await flush(); assert.equal(calls, 2);
    loop.setActive(false); assert.equal(time.count(), 0);
    loop.setActive(true); await flush(); assert.equal(calls, 3);
    loop.stop(); assert.equal(time.count(), 0);
  });

  it('coalesces overlapping refreshes and prevents an old response overwriting new state', async () => {
    const time = clock(); let finish!: () => void; let calls = 0; const applied: number[] = [];
    const loop = createRefreshLoop(async context => {
      const call = ++calls;
      if (call === 1) await new Promise<void>(resolve => { finish = resolve; });
      if (context.isCurrent()) applied.push(call);
    }, 5000, time.timers);
    loop.setActive(true);
    loop.refresh(); loop.refresh();
    assert.equal(calls, 1);
    finish(); await flush();
    assert.deepEqual(applied, [2]); assert.equal(time.count(), 1);
    loop.stop();
  });

  it('invalidates reads around a mutation and immediately refetches when resumed', async () => {
    const time = clock(); let finish!: () => void; let calls = 0; const applied: number[] = [];
    const loop = createRefreshLoop(async context => {
      const call = ++calls;
      if (call === 1) await new Promise<void>(resolve => { finish = resolve; });
      if (context.isCurrent()) applied.push(call);
    }, 5000, time.timers);
    loop.setActive(true); loop.pause();
    finish(); await flush(); assert.deepEqual(applied, []); assert.equal(time.count(), 0);
    loop.resume(); await flush(); assert.deepEqual(applied, [2]);
    loop.stop();
  });

  it('ignores late results after scope disposal and never schedules another request', async () => {
    const time = clock(); let finish!: () => void; let applied = false;
    const loop = createRefreshLoop(async context => {
      await new Promise<void>(resolve => { finish = resolve; });
      if (context.isCurrent()) applied = true;
    }, 5000, time.timers);
    loop.setActive(true); loop.stop(); finish(); await flush();
    assert.equal(applied, false); assert.equal(time.count(), 0);
  });

  it('retries temporary failures but does not keep polling terminal or revoked data', async () => {
    const time = clock(); let calls = 0;
    const loop = createRefreshLoop(async () => { if (++calls === 1) throw Error('offline'); return false; }, 8000, time.timers);
    loop.setActive(true); await flush(); assert.equal(time.count(), 1);
    time.tick(); await flush(); assert.equal(calls, 2); assert.equal(time.count(), 0);
    loop.refresh(); await flush(); assert.equal(calls, 3); assert.equal(time.count(), 0);
    loop.stop();
  });

  it('keeps polling an empty list, preventing empty Home from hiding a new assignment', async () => {
    const time = clock(); let count = 0;
    const loop = createRefreshLoop(async () => { count++; }, 12000, time.timers);
    loop.setActive(true); await flush(); time.tick(); await flush();
    assert.equal(count, 2); assert.equal(time.count(), 1); loop.stop();
  });
});
