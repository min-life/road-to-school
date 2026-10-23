import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { VietmapService } from './vietmap.service.ts';
import { VietmapApiError } from './types.ts';
import { debounce } from './debounce.ts';

describe('VietmapService', () => {
  let service: VietmapService;
  const mockApiKey = 'test_vietmap_services_api_key_123';

  beforeEach(() => {
    service = new VietmapService({
      servicesApiKey: mockApiKey,
      baseUrl: 'https://maps.vietmap.vn/api',
    });
  });

  describe('API Key Configuration', () => {
    it('ném lỗi MISSING_API_KEY nếu chưa cấu hình API key', async () => {
      const emptyService = new VietmapService({ servicesApiKey: '' });
      await assert.rejects(
        async () => {
          await emptyService.autocomplete('Trần Phú');
        },
        (err: VietmapApiError) => {
          assert.strictEqual(err.code, 'MISSING_API_KEY');
          assert.match(err.message, /NEXT_PUBLIC_VIETMAP_SERVICES_KEY/);
          return true;
        },
      );
    });

    it('cho phép cập nhật API key qua setApiKey', () => {
      const emptyService = new VietmapService({ servicesApiKey: '' });
      emptyService.setApiKey('new_key_456');
      assert.strictEqual(emptyService.getApiKey(), 'new_key_456');
    });
  });

  describe('Autocomplete v4 & Ref ID Preservation', () => {
    it('trả về mảng rỗng và không gọi API nếu độ dài text < 2 ký tự', async () => {
      let fetchCalled = false;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return new Response('[]');
      }) as any;

      try {
        const resultEmpty = await service.autocomplete('');
        const resultOneChar = await service.autocomplete('a');
        const resultSpaces = await service.autocomplete('   ');

        assert.deepStrictEqual(resultEmpty, []);
        assert.deepStrictEqual(resultOneChar, []);
        assert.deepStrictEqual(resultSpaces, []);
        assert.strictEqual(fetchCalled, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('bảo toàn nguyên vẹn ref_id kèm prefix (auto: hoặc geocode:) từ kết quả Autocomplete', async () => {
      const mockRawResponse = [
        {
          ref_id: 'auto:RAkPcicmZ3d-NQhac2kADHYlbFAkBiEeAQAkCV0EXwdF',
          name: '197 Trần Phú',
          address: 'Phường 4, Quận 5, TP.HCM',
          display: '197 Trần Phú, Phường 4, Quận 5, TP.HCM',
          distance: 120.5,
        },
        {
          ref_id: 'geocode:VN1234567890ABCDEF',
          name: 'Trường Tiểu học Lê Quý Đôn',
          address: 'Nam Từ Liêm, Hà Nội',
          display: 'Trường Tiểu học Lê Quý Đôn, Nam Từ Liêm, Hà Nội',
        },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (url: string) => {
        assert.match(url, /text=197%20Tr%E1%BA%A7n%20Ph%C3%BA/);
        assert.match(url, /display_type=5/);
        return new Response(JSON.stringify(mockRawResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      try {
        const results = await service.autocomplete('197 Trần Phú');
        assert.strictEqual(results.length, 2);

        // ref_id phải được bảo toàn nguyên vẹn 100% không cắt gọt
        assert.strictEqual(
          results[0].refId,
          'auto:RAkPcicmZ3d-NQhac2kADHYlbFAkBiEeAQAkCV0EXwdF',
        );
        assert.strictEqual(results[0].name, '197 Trần Phú');
        assert.strictEqual(results[0].display, '197 Trần Phú, Phường 4, Quận 5, TP.HCM');
        assert.strictEqual(results[0].distance, 120.5);

        assert.strictEqual(results[1].refId, 'geocode:VN1234567890ABCDEF');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('gửi đúng tham số focus tọa độ khi được cung cấp', async () => {
      const originalFetch = globalThis.fetch;
      let requestedUrl = '';
      globalThis.fetch = (async (url: string) => {
        requestedUrl = url;
        return new Response('[]', { status: 200 });
      }) as any;

      try {
        await service.autocomplete('Nguyễn Du', {
          focus: { lat: 10.776889, lng: 106.700806 },
        });
        assert.match(requestedUrl, /focus=10.776889,106.700806/);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('xử lý lỗi 401 Unauthorized với thông báo tiếng Việt', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        return new Response('Unauthorized', { status: 401 });
      }) as any;

      try {
        await assert.rejects(
          async () => {
            await service.autocomplete('Hà Nội');
          },
          (err: VietmapApiError) => {
            assert.strictEqual(err.code, 'UNAUTHORIZED');
            assert.strictEqual(err.statusCode, 401);
            assert.match(err.message, /Khóa truy cập VietMap không hợp lệ/);
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('xử lý lỗi 423 / 429 Rate Limit với thông báo tiếng Việt', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        return new Response('Rate limited', { status: 429 });
      }) as any;

      try {
        await assert.rejects(
          async () => {
            await service.autocomplete('Hà Nội');
          },
          (err: VietmapApiError) => {
            assert.strictEqual(err.code, 'RATE_LIMITED');
            assert.strictEqual(err.statusCode, 429);
            assert.match(err.message, /vượt quá giới hạn/);
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Place Details v4', () => {
    it('truyền đúng refid nguyên vẹn vào URL Place v4 và trả về tọa độ hợp lệ', async () => {
      const mockPlaceRaw = {
        display: '197 Đường Trần Phú, Phường 4, Quận 5, Thành Phố Hồ Chí Minh',
        name: '',
        hs_num: '197',
        street: 'Đường Trần Phú',
        address: '197 Đường Trần Phú',
        city_id: 12,
        city: 'Thành Phố Hồ Chí Minh',
        district_id: 1292,
        district: 'Quận 5',
        ward_id: 656652,
        ward: 'Phường 4',
        lat: 10.7592229,
        lng: 106.6759026,
      };

      const testRefId = 'auto:RAkPcicmZ3d-NQhac2kADHYlbFAkBiEeAQAkCV0EXwdF';
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (url: string) => {
        assert.match(url, new RegExp(`refid=${encodeURIComponent(testRefId)}`));
        return new Response(JSON.stringify(mockPlaceRaw), { status: 200 });
      }) as any;

      try {
        const detail = await service.getPlaceDetail(testRefId);
        assert.strictEqual(detail.latitude, 10.7592229);
        assert.strictEqual(detail.longitude, 106.6759026);
        assert.strictEqual(typeof detail.latitude, 'number');
        assert.strictEqual(typeof detail.longitude, 'number');
        assert.strictEqual(detail.addressText, mockPlaceRaw.display);
        assert.strictEqual(detail.city, 'Thành Phố Hồ Chí Minh');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ném lỗi INVALID_INPUT nếu refId rỗng', async () => {
      await assert.rejects(
        async () => {
          await service.getPlaceDetail('   ');
        },
        (err: VietmapApiError) => {
          assert.strictEqual(err.code, 'INVALID_INPUT');
          return true;
        },
      );
    });

    it('ném lỗi INVALID_RESPONSE nếu tọa độ trả về ngoài giới hạn WGS-84', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({ display: 'Out of range', lat: 100.5, lng: 200.0 }),
          { status: 200 },
        );
      }) as any;

      try {
        await assert.rejects(
          async () => {
            await service.getPlaceDetail('auto:invalid_coords');
          },
          (err: VietmapApiError) => {
            assert.strictEqual(err.code, 'INVALID_RESPONSE');
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Reverse Geocoding v4', () => {
    it('bảo toàn tọa độ gốc do người dùng chọn trên bản đồ (không ghi đè tọa độ)', async () => {
      const userLat = 21.028511;
      const userLng = 105.772341;

      const mockReverseRaw = [
        {
          name: 'Số 14 Lê Đức Thọ',
          address: 'Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
          display: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
          distance: 12.3,
          lat: 21.02855, // Tọa độ điểm gần nhất của VietMap
          lng: 105.77239,
        },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (url: string) => {
        assert.match(url, new RegExp(`lat=${userLat}`));
        assert.match(url, new RegExp(`lng=${userLng}`));
        return new Response(JSON.stringify(mockReverseRaw), { status: 200 });
      }) as any;

      try {
        const results = await service.reverseGeocode(userLat, userLng);
        assert.strictEqual(results.length, 1);

        // Quan trọng: Kết quả phải giữ nguyên tọa độ gốc của người dùng chọn
        assert.strictEqual(results[0].latitude, userLat);
        assert.strictEqual(results[0].longitude, userLng);
        assert.strictEqual(results[0].addressText, mockReverseRaw[0].display);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ném lỗi INVALID_INPUT nếu tọa độ không hợp lệ', async () => {
      await assert.rejects(
        async () => {
          await service.reverseGeocode(NaN, 105.0);
        },
        (err: VietmapApiError) => {
          assert.strictEqual(err.code, 'INVALID_INPUT');
          return true;
        },
      );
    });
  });

  describe('Debounce Helper', () => {
    it('trì hoãn thực thi và chỉ gọi hàm 1 lần sau khoảng thời gian wait', async () => {
      let callCount = 0;
      let lastArg = '';

      const fn = (arg: string) => {
        callCount++;
        lastArg = arg;
      };

      const debouncedFn = debounce(fn, 50);

      debouncedFn('a');
      debouncedFn('ab');
      debouncedFn('abc');

      assert.strictEqual(callCount, 0);

      await new Promise((resolve) => setTimeout(resolve, 80));

      assert.strictEqual(callCount, 1);
      assert.strictEqual(lastArg, 'abc');
    });

    it('cho phép hủy thực thi khi gọi cancel', async () => {
      let callCount = 0;
      const fn = () => {
        callCount++;
      };

      const debouncedFn = debounce(fn, 50);
      debouncedFn();
      debouncedFn.cancel();

      await new Promise((resolve) => setTimeout(resolve, 80));

      assert.strictEqual(callCount, 0);
    });
  });
});
