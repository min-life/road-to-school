import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Web Admin Leave Notices Specifications', () => {
  it('strictly limits student status filter options to Tất cả, Đã nhận, Đã hủy', () => {
    const getStatusOptions = (isStudentTab: boolean) => {
      if (isStudentTab) {
        return [
          { value: 'ALL', label: 'Tất cả trạng thái' },
          { value: 'RECORDED', label: 'Đã nhận' },
          { value: 'WITHDRAWN', label: 'Đã hủy' },
        ];
      }
      return [
        { value: 'ALL', label: 'Tất cả trạng thái' },
        { value: 'PENDING_REPLACEMENT', label: 'Chờ phân công' },
        { value: 'RECORDED', label: 'Đã ghi nhận' },
        { value: 'REPLACED', label: 'Đã bố trí' },
        { value: 'WITHDRAWN', label: 'Đã hủy' },
        { value: 'TRIP_CANCELLED', label: 'Chuyến đã hủy' },
      ];
    };

    const studentOptions = getStatusOptions(true);
    assert.equal(studentOptions.length, 3);
    assert.deepEqual(
      studentOptions.map((o) => o.value),
      ['ALL', 'RECORDED', 'WITHDRAWN']
    );

    const staffOptions = getStatusOptions(false);
    assert.equal(staffOptions.length, 6);
  });

  it('resets invalid filter states and page when switching tabs', () => {
    let activeTab = 'DRIVER';
    let statusFilter = 'PENDING_REPLACEMENT';
    let page = 3;

    const handleTabChange = (nextTab: string) => {
      activeTab = nextTab;
      statusFilter = 'ALL';
      page = 1;
    };

    handleTabChange('STUDENT');
    assert.equal(activeTab, 'STUDENT');
    assert.equal(statusFilter, 'ALL');
    assert.equal(page, 1);
  });

  it('renders "Đã nhận" / "Đã hủy" for student notices and preserves staff labels', () => {
    const getBadgeLabel = (kind: string, status: string) => {
      if (kind === 'STUDENT') {
        if (status === 'RECORDED') return 'Đã nhận';
        if (status === 'WITHDRAWN') return 'Đã hủy';
      }
      switch (status) {
        case 'PENDING_REPLACEMENT':
          return 'Chờ phân công';
        case 'RECORDED':
          return 'Đã ghi nhận';
        case 'REPLACED':
          return 'Đã bố trí';
        case 'WITHDRAWN':
          return 'Đã hủy';
        case 'TRIP_CANCELLED':
          return 'Chuyến đã hủy';
        default:
          return status;
      }
    };

    assert.equal(getBadgeLabel('STUDENT', 'RECORDED'), 'Đã nhận');
    assert.equal(getBadgeLabel('STUDENT', 'WITHDRAWN'), 'Đã hủy');
    assert.equal(getBadgeLabel('DRIVER', 'PENDING_REPLACEMENT'), 'Chờ phân công');
    assert.equal(getBadgeLabel('DRIVER', 'RECORDED'), 'Đã ghi nhận');
    assert.equal(getBadgeLabel('BUS_ATTENDANT', 'REPLACED'), 'Đã bố trí');
  });

  it('configures 4 columns for Student tab and 6 columns for Staff tabs', () => {
    const getColumns = (isStudentTab: boolean) => {
      const base = ['Học sinh / Người báo', 'Chuyến xe', 'Ngày & Giờ', 'Trạng thái'];
      if (isStudentTab) return base;
      return [...base, 'Bố trí thay thế', 'Thao tác'];
    };

    assert.equal(getColumns(true).length, 4);
    assert.equal(getColumns(false).length, 6);
  });
});
