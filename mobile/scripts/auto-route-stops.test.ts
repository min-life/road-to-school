import assert from 'node:assert/strict';
import { it } from 'node:test';
import { cumulativeDistances, nextStopEstimate, orderedStopProgress, type Coordinate } from '../utils/trip-navigation.ts';

const coords: Coordinate[] = [[10, 106], [10.001, 106], [10.002, 106], [10.003, 106]];
const cumulative = cumulativeDistances(coords);
const stops = ['pickup', 'dropoff', 'end'].map((id, index) => ({
  id, latitude: coords[index + 1][0], longitude: coords[index + 1][1],
}));

it('keeps each stop in order and estimates the next one after passing a pickup', () => {
  const instructions = [1, 2].map(index => ({
    interval: [index, index] as [number, number], sign: 5, text: '', streetName: '', distance: 0,
  }));
  const marks = orderedStopProgress(coords, cumulative, instructions, stops);
  assert.deepEqual([...marks.values()], cumulative.slice(1));
  const afterPickup = cumulative[1] + 10;
  const estimate = nextStopEstimate(instructions, cumulative, afterPickup, 0.12, false, marks.get('dropoff'));
  assert.equal(estimate?.metres, cumulative[2] - afterPickup);
});

it('projects stops in route order when VietMap omits via-point instructions', () => {
  const marks = orderedStopProgress(coords, cumulative, [], stops);
  assert.deepEqual([...marks.values()], cumulative.slice(1));
});
