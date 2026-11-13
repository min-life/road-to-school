"""Pure validation tests for binary packing; no API fixtures, USB or business records."""
import unittest
from build_firmware import validate_merged


class BundleValidationTests(unittest.TestCase):
    def test_empty_image_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_merged(b"")

    def test_app_only_image_cannot_be_flashed_at_zero(self):
        data = bytearray(0x11000)
        data[0] = 0xE9
        with self.assertRaises(ValueError):
            validate_merged(bytes(data))

    def test_image_larger_than_board_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_merged(bytes(4 * 1024 * 1024 + 1))

    def test_partition_table_is_required_even_with_image_headers(self):
        data = bytearray(0x11000)
        data[0x1000] = data[0x10000] = 0xE9
        with self.assertRaisesRegex(ValueError, "partition table"):
            validate_merged(bytes(data))

    def test_wrong_chip_is_rejected_before_publication(self):
        data = bytearray(0x11000)
        data[0x1000] = data[0x10000] = 0xE9
        data[0x1000 + 12] = 9
        with self.assertRaisesRegex(ValueError, "chip ID"):
            validate_merged(bytes(data))


if __name__ == "__main__":
    unittest.main()
