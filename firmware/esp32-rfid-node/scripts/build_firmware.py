"""Build/merge ESP32 firmware without opening serial ports or contacting business APIs."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import venv

PLATFORMIO_VERSION = "6.1.19"
PROJECT = Path(__file__).resolve().parents[1]


def validate_merged(data: bytes) -> None:
    if not 0x10018 < len(data) <= 4 * 1024 * 1024:
        raise ValueError("Merged image size is outside the ESP32 POC bounds")
    for offset in (0x1000, 0x10000):
        if data[offset] != 0xE9 or data[offset + 12:offset + 14] != b"\0\0":
            raise ValueError("Missing ESP32 image header or wrong chip ID")
    if data[0x8000:0x8002] != b"\xaa\x50":
        raise ValueError("Missing partition table at 0x8000")
    # Parse the real partition table, not just its magic: an app must start at 0x10000.
    application_found = False
    for pos in range(0x8000, 0x8C00, 32):
        if data[pos:pos + 2] != b"\xaa\x50":
            break
        kind = data[pos + 2]
        offset = int.from_bytes(data[pos + 4:pos + 8], "little")
        size = int.from_bytes(data[pos + 8:pos + 12], "little")
        if offset + size > 4 * 1024 * 1024:
            raise ValueError("Partition exceeds flash capacity")
        if kind == 0 and offset == 0x10000:
            if len(data) > offset + size:
                raise ValueError("Application exceeds its partition")
            application_found = True
    if not application_found:
        raise ValueError("No application partition at 0x10000")


def run(args, env):
    subprocess.run([str(arg) for arg in args], cwd=PROJECT, env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir", type=Path, default=Path(os.environ.get(
        "RTS_IOT_WORK_DIR", "E:/ChatGPT/road-to-school-iot")))
    parser.add_argument("--bootstrap", action="store_true", help="Install pinned PlatformIO into an isolated venv")
    args = parser.parse_args()
    work = args.work_dir.resolve()
    (work / "toolchain/tmp").mkdir(parents=True, exist_ok=True)
    python = work / "toolchain/venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1",
               PIP_CACHE_DIR=str(work / "toolchain/pip-cache"),
               TEMP=str(work / "toolchain/tmp"), TMP=str(work / "toolchain/tmp"),
               PLATFORMIO_CORE_DIR=str(work / "platformio"),
               PLATFORMIO_SETTING_ENABLE_TELEMETRY="No",
               PLATFORMIO_SETTING_CHECK_PLATFORMIO_INTERVAL="0",
               RTS_IOT_BUILD_DIR=str(work / "build"), RTS_IOT_LIBDEPS_DIR=str(work / "libdeps"))
    if args.bootstrap:
        if not python.exists():
            venv.EnvBuilder(with_pip=True).create(work / "toolchain/venv")
        run([python, "-m", "pip", "install", "--cache-dir", work / "toolchain/pip-cache",
             f"platformio=={PLATFORMIO_VERSION}"], env)
    if not python.exists():
        parser.error("Toolchain not installed. Run once with --bootstrap (no system Python installation).")
    run([python, "-m", "platformio", "run", "-e", "esp32-rfid"], env)
    build = work / "build/esp32-rfid"
    framework = work / "platformio/packages/framework-arduinoespressif32"
    segments = [(0x1000, build / "bootloader.bin"), (0x8000, build / "partitions.bin"),
                (0xE000, framework / "tools/partitions/boot_app0.bin"),
                (0x10000, build / "firmware.bin")]
    artifacts = work / "artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    staged = artifacts / "firmware-building.bin"
    esptool = work / "platformio/packages/tool-esptoolpy/esptool.py"
    command = [python, esptool, "--chip", "esp32", "merge_bin", "-o", staged,
               "--flash_mode", "dio", "--flash_freq", "40m", "--flash_size", "4MB"]
    for address, file in segments:
        if not file.is_file():
            raise FileNotFoundError(f"Required build output missing: {file.name}")
        command.extend([hex(address), file])
    run(command, env)
    data = staged.read_bytes()
    validate_merged(data)
    version_header = (PROJECT / "include/config.h").read_text(encoding="utf-8")
    import re
    version = re.search(r'kVersion\[\] = "([^"]+)"', version_header).group(1)
    manifest = {"version": version, "protocolVersion": 1, "chip": "ESP32", "board": "esp32doit-devkit-v1",
                "flashOffset": 0, "size": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                "segments": [{"offset": address, "file": file.name,
                              "sha256": hashlib.sha256(file.read_bytes()).hexdigest()} for address, file in segments]}
    manifest["sourceHashes"] = {str(file.relative_to(PROJECT)).replace("\\", "/"): hashlib.sha256(file.read_bytes()).hexdigest()
                                for file in sorted([PROJECT / "platformio.ini", *PROJECT.glob("src/*.cpp"), *PROJECT.glob("include/*.h")])}
    final = artifacts / "firmware.bin"
    staged.replace(final)
    (artifacts / "firmware-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Verified merged firmware: {final}")
    print(f"SHA-256: {manifest['sha256']}")
    print("No upload, USB access, Wi-Fi connection or database/API writes performed.")


if __name__ == "__main__":
    main()
