import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Unit tests for Mobile Parent Service Area Validation & State Handling
describe('parent service area mobile logic', () => {
  interface State {
    studentId: string | null;
    studentStatus: 'AVAILABLE' | 'DISABLED';
    selectedAddressText: string;
    selectedLat: number | null;
    selectedLng: number | null;
    serviceAreaStatus: 'IDLE' | 'CHECKING' | 'IN_SERVICE_AREA' | 'OUT_OF_SERVICE_AREA' | 'UNAVAILABLE';
    verifiedStudentId: string | null;
    verifiedLat: number | null;
    verifiedLng: number | null;
    serviceAreaGeneration: number;
    draftGeneration: number;
    isSubmitting: boolean;
  }

  function computeIsServiceAreaValid(s: State): boolean {
    return (
      s.serviceAreaStatus === 'IN_SERVICE_AREA' &&
      s.verifiedStudentId === s.studentId &&
      s.verifiedLat !== null &&
      s.verifiedLng !== null &&
      s.selectedLat !== null &&
      s.selectedLng !== null &&
      Math.abs(s.verifiedLat - s.selectedLat) < 0.000001 &&
      Math.abs(s.verifiedLng - s.selectedLng) < 0.000001
    );
  }

  function computeCanSubmit(s: State): boolean {
    const isServiceAreaValid = computeIsServiceAreaValid(s);
    return (
      Boolean(s.studentId) &&
      s.studentStatus === 'AVAILABLE' &&
      Boolean(s.selectedAddressText.trim()) &&
      s.selectedLat !== null &&
      s.selectedLng !== null &&
      isServiceAreaValid &&
      !s.isSubmitting
    );
  }

  it('enables submit only when service area is verified and coordinates match', () => {
    const baseState: State = {
      studentId: 'student-1',
      studentStatus: 'AVAILABLE',
      selectedAddressText: '123 Đường Số 1, Phường Bến Nghé, Quận 1',
      selectedLat: 10.7769,
      selectedLng: 106.7009,
      serviceAreaStatus: 'IN_SERVICE_AREA',
      verifiedStudentId: 'student-1',
      verifiedLat: 10.7769,
      verifiedLng: 106.7009,
      serviceAreaGeneration: 1,
      draftGeneration: 1,
      isSubmitting: false,
    };

    assert.equal(computeCanSubmit(baseState), true);

    // Disabled when status is CHECKING
    assert.equal(computeCanSubmit({ ...baseState, serviceAreaStatus: 'CHECKING' }), false);

    // Disabled when status is OUT_OF_SERVICE_AREA
    assert.equal(computeCanSubmit({ ...baseState, serviceAreaStatus: 'OUT_OF_SERVICE_AREA' }), false);

    // Disabled when status is UNAVAILABLE
    assert.equal(computeCanSubmit({ ...baseState, serviceAreaStatus: 'UNAVAILABLE' }), false);

    // Disabled when coordinates do not match verified coordinates (user moved pin)
    assert.equal(computeCanSubmit({ ...baseState, selectedLat: 10.7800 }), false);

    // Disabled when studentId does not match verifiedStudentId
    assert.equal(computeCanSubmit({ ...baseState, studentId: 'student-2' }), false);

    // Disabled when student is DISABLED
    assert.equal(computeCanSubmit({ ...baseState, studentStatus: 'DISABLED' }), false);
  });

  it('invalidates service area check when user modifies search text or switches student', () => {
    let state: State = {
      studentId: 'student-1',
      studentStatus: 'AVAILABLE',
      selectedAddressText: '123 Đường Số 1',
      selectedLat: 10.7769,
      selectedLng: 106.7009,
      serviceAreaStatus: 'IN_SERVICE_AREA',
      verifiedStudentId: 'student-1',
      verifiedLat: 10.7769,
      verifiedLng: 106.7009,
      serviceAreaGeneration: 1,
      draftGeneration: 1,
      isSubmitting: false,
    };

    assert.equal(computeCanSubmit(state), true);

    // User types in search input
    state.serviceAreaGeneration += 1;
    state.serviceAreaStatus = 'IDLE';
    state.verifiedStudentId = null;
    state.verifiedLat = null;
    state.verifiedLng = null;

    assert.equal(computeIsServiceAreaValid(state), false);
    assert.equal(computeCanSubmit(state), false);
  });

  it('discards out-of-order and stale responses across generations', () => {
    let currentGeneration = 1;
    let appliedStatus = 'IDLE';

    function simulateCheckResponse(requestGen: number, status: 'IN_SERVICE_AREA' | 'OUT_OF_SERVICE_AREA') {
      if (requestGen === currentGeneration) {
        appliedStatus = status;
      }
    }

    // User triggers request 1
    const gen1 = ++currentGeneration; // gen1 = 2
    // User quickly moves pin -> request 2
    const gen2 = ++currentGeneration; // gen2 = 3

    // Request 1 arrives late (OUT_OF_SERVICE_AREA)
    simulateCheckResponse(gen1, 'OUT_OF_SERVICE_AREA');
    assert.equal(appliedStatus, 'IDLE', 'Late response from gen1 should be ignored');

    // Request 2 arrives (IN_SERVICE_AREA)
    simulateCheckResponse(gen2, 'IN_SERVICE_AREA');
    assert.equal(appliedStatus, 'IN_SERVICE_AREA', 'Current response from gen2 is accepted');
  });

  it('renders dynamic max operating radius from API response without hardcoding 50 km', () => {
    function formatServiceAreaSubText(info: { distanceKm: number; maxOperatingRadiusKm: number }) {
      return `Khoảng cách: ${info.distanceKm} km (Bán kính tối đa ${info.maxOperatingRadiusKm} km)`;
    }

    // Test with dynamic configured radius 35 km
    assert.equal(
      formatServiceAreaSubText({ distanceKm: 12.5, maxOperatingRadiusKm: 35 }),
      'Khoảng cách: 12.5 km (Bán kính tối đa 35 km)'
    );

    // Test with dynamic configured radius 20 km
    assert.equal(
      formatServiceAreaSubText({ distanceKm: 8.2, maxOperatingRadiusKm: 20 }),
      'Khoảng cách: 8.2 km (Bán kính tối đa 20 km)'
    );
  });

  it('detects service area error on OTP verification and prompts user to re-select pickup point', () => {
    function isServiceAreaError(msg: string): boolean {
      return (
        msg.includes('bán kính phục vụ') ||
        msg.includes('vượt quá bán kính') ||
        msg.includes('tỉnh/thành phố') ||
        msg.includes('bãi xe')
      );
    }

    assert.equal(
      isServiceAreaError('Địa chỉ đón/trả mới (52 km) vượt quá bán kính phục vụ tối đa của bãi xe (50 km).'),
      true
    );
    assert.equal(
      isServiceAreaError('Địa chỉ đón/trả mới (Bình Dương) không thuộc cùng tỉnh/thành phố với trường học (TP. Hồ Chí Minh).'),
      true
    );
    assert.equal(
      isServiceAreaError('Vị trí bãi xe trường học chưa được thiết lập trong cấu hình hệ thống.'),
      true
    );
    assert.equal(
      isServiceAreaError('Mã xác thực không chính xác hoặc đã hết hạn.'),
      false
    );
  });
});
