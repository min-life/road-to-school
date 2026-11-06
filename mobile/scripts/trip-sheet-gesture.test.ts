import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as ts from 'typescript';

// Exercise the actual screen callbacks with layout/control primitives, never Trip/API fixtures.
const source = ts.createSourceFile('screen.tsx', readFileSync(resolve('app/trip/[id].tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean) {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) result = node; ts.forEachChild(node, visit); }
  visit(source);
  assert.ok(result);
  return result;
}
const declaration = (name: string) => find(n => ts.isVariableDeclaration(n) && n.name.getText(source) === name) as ts.VariableDeclaration;
const callback = (node: ts.Node, context: object) => runInNewContext(
  ts.transpileModule('const callback = ' + node.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + '; callback', context,
);
function setup() {
  const values: number[] = [], targets: number[] = [];
  const currentHeight = { current: 90 };
  const state = { expanded: false, stopped: 0, complete: (_: { finished: boolean }) => {} };
  const context = {
    collapsedHeight: 80, collapsedHeightRef: { current: 80 }, EXPANDED_HEIGHT: 600,
    isSheetDragging: { current: false }, isExpandedRef: { current: false }, currentHeight,
    dragStartHeight: { current: 80 },
    sheetHeightAnim: { setValue: (n: number) => { values.push(n); currentHeight.current = n; }, stopAnimation: () => { state.stopped++; } },
    animateTo: (n: number) => targets.push(n), setIsExpanded: (v: boolean) => { state.expanded = v; },
    PanResponder: { create: (handlers: unknown) => handlers },
    Animated: { spring: () => ({ start: (complete: typeof state.complete) => { state.complete = complete; } }) },
  };
  return { context, values, targets, state };
}

describe('Trip sheet gesture ownership', () => {
  it('does not recreate the active responder when header measurement changes', () => {
    const { context } = setup();
    const memo = declaration('panResponder').initializer as ts.CallExpression;
    const factory = callback(memo.arguments[0], context);
    let previous: unknown[] = [], responder: unknown;
    const render = () => {
      const deps = runInNewContext(memo.arguments[1].getText(source), context) as unknown[];
      if (!responder || deps.some((value, i) => value !== previous[i])) responder = factory();
      previous = deps;
      return responder;
    };
    const first = render();
    context.collapsedHeight = 81; context.collapsedHeightRef.current = 81;
    assert.equal(render(), first);
  });
  it('does not apply automatic collapsed sizing during a drag', () => {
    const { context, values } = setup();
    context.isSheetDragging.current = true;
    const effect = find(n => ts.isCallExpression(n) && n.expression.getText(source) === 'useEffect'
      && n.arguments[1]?.getText(source) === '[collapsedHeight, sheetHeightAnim]') as ts.CallExpression;
    const resize = callback(effect.arguments[0], context);
    resize(); assert.equal(values.length, 0);
    context.isSheetDragging.current = false;
    resize(); assert.equal(values.at(-1), 80);
  });
  it('stops an in-flight spring before starting a drag', () => {
    const { context, state } = setup();
    const memo = declaration('panResponder').initializer as ts.CallExpression;
    const handlers = callback(memo.arguments[0], context)();
    handlers.onPanResponderGrant();
    assert.equal(handlers.onPanResponderTerminationRequest(), false);
    assert.equal(handlers.onShouldBlockNativeResponder(), true);
    assert.equal(state.stopped, 1);
    assert.equal(context.isSheetDragging.current, true);
    assert.equal(context.dragStartHeight.current, 90);
  });
  it('ignores completion of an interrupted closing spring', () => {
    const { context, state } = setup();
    state.expanded = true; context.isExpandedRef.current = true;
    const animate = declaration('animateTo').initializer as ts.CallExpression;
    callback(animate.arguments[0], context)(80);
    state.complete({ finished: false });
    assert.equal(state.expanded, true);
  });
  it('keeps dragging across renders and releases using the latest collapsed height', () => {
    const { context, targets } = setup();
    const memo = declaration('panResponder').initializer as ts.CallExpression;
    const handlers = callback(memo.arguments[0], context)();
    handlers.onPanResponderGrant();
    handlers.onPanResponderMove(null, { dy: -80 });
    assert.equal(context.isExpandedRef.current, true);
    context.collapsedHeightRef.current = 95;
    handlers.onPanResponderRelease(null, { dy: 80, dx: 0, vy: 1 });
    assert.equal(targets.at(-1), 95);
    assert.equal(context.isSheetDragging.current, false);
    handlers.onPanResponderGrant();
    context.currentHeight.current = 500;
    handlers.onPanResponderTerminate();
    assert.equal(targets.at(-1), 600);
    assert.equal(context.isSheetDragging.current, false);
  });
  it('does not feed header measurement changes back into an active gesture', () => {
    const { context } = setup();
    const measurements: number[] = [];
    const layout = find(n => ts.isJsxAttribute(n) && n.name.getText(source) === 'onLayout'
      && n.initializer?.getText(source).includes('setStaffHeaderHeight')) as ts.JsxAttribute;
    const expression = (layout.initializer as ts.JsxExpression).expression!;
    const measure = callback(expression, { ...context, isDriverOrAttendant: true, setStaffHeaderHeight: (n: number) => measurements.push(n) });
    context.isSheetDragging.current = true;
    measure({ nativeEvent: { layout: { height: 70.2 } } });
    assert.equal(measurements.length, 0);
    context.isSheetDragging.current = false;
    measure({ nativeEvent: { layout: { height: 70.2 } } });
    assert.equal(measurements[0], 71);
  });
});
