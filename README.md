# QR Code Transfer Hub (Cimbar-Web) 🌈

*[Read this in Simplified Chinese (简体中文) 🇨🇳](./README_zh-CN.md)*

Cimbar-Web is a **fully offline, cross-device** web-based file transfer tool. By playing high-density dynamic color barcodes on a screen, it allows you to instantly transfer files to any device with a camera—without requiring any network connection (no Wi-Fi, LAN, or Bluetooth needed).

This project is an independent Web port and UI enhancement based on the excellent [libcimbar](https://github.com/sz3/libcimbar) core library.

## ✨ Core Features

*   **⚡️ 100% Offline Transfer**: True physical air-gap transfer. All you need is a display screen and a camera.
*   **🎨 Modern Responsive UI**: Completely redesigned minimalist Glassmorphism UI, providing an intuitive dual-window experience for "Sender" and "Receiver".
*   **🚀 Extreme Performance**: Deeply optimized WebWorker multi-threaded decoding engine. Utilizes native `fetch` and zero-copy `WebAssembly` technologies to achieve instant page loads and lightning-fast scanning.
*   **📱 Cross-Platform Compatibility**: Any device (PC, phone, tablet) supporting a modern web browser and camera can act as a sender or receiver.
*   **📦 Single Portable File**: Provides a one-click build script to generate a `cimbar_portable.html` standalone file. Just carry this single ~2MB file to use it anytime, anywhere on offline devices.

## 🌐 Browser Compatibility

| Mode | Runtime Requirements | Recommended Browsers | Notes |
| :--- | :--- | :--- | :--- |
| **Dynamic Color Barcode**<br>(Cimbar Stream) | • WebAssembly (BigInt/i64)<br>• WebGL 2 / Canvas Acceleration | • **Chrome / Edge** ≥ 85<br>• **Firefox** ≥ 78<br>• **Safari** ≥ 15.0 | Relies on WebAssembly JS-BigInt integration. Older browsers (such as Chrome 83) lack kernel support for WASM i64 parameter mapping and cannot initialize the streaming engine. |
| **Static Standard QR Code**<br>(Text / URL Transfer) | • Pure Client-Side JavaScript (ES5/ES6) | • Universal Compatibility<br>(Supports Chrome 83, legacy enterprise intranet browsers, etc.) | Holds up to 2,953 bytes per QR code (~1,000–2,000 chars), scannable by any mobile camera or WeChat scanner. Ideal for passwords, tokens, configs, and commands. |

## 🛠️ Project Structure & Dependencies

Cimbar-Web is an independent UI and browser project. The underlying image extraction, computer vision, and core encoding/decoding algorithms (C++) are depended upon as a Git Submodule from the upstream repository:

*   **[libcimbar](https://github.com/sz3/libcimbar)**: Provides the core encoding/decoding logic compiled to WebAssembly (`.wasm`).

Our frontend project deeply encapsulates the upstream engine, including asynchronous stream decoding, optimized single-file bundling scripts, and a complete UI/UX overhaul.

## 🚀 Quick Start

### Online Deployment
The project is purely static. Simply mount the `web/` directory to any Web Server (such as Nginx, Vercel, or GitHub Pages) to start using it.

### Portable Offline Version
You can directly download the pre-built standalone file without cloning the repository:
👉 [**Download cimbar_portable.html**](https://raw.githubusercontent.com/newfur/cimbar-web/main/cimbar_portable.html) *(Right-click -> Save Link As...)*

Alternatively, if you clone the repository, you can generate it yourself using the provided Python script:
```bash
python3 build_portable.py
```
After execution, the generated `cimbar_portable.html` in the root directory is a complete standalone file. You can copy it via a USB drive to any completely disconnected device for use.

### 📱 Android Client (APK)
This project is packaged as an Android application with offline WebAssembly runtime, camera scanning, and file transfer capabilities:
* **Automated CI/CD**: Configured with GitHub Actions. Every push to the `main` branch or manual workflow dispatch automatically builds the APK. You can download the latest `Cimbar-Transfer-APK` directly from the **Artifacts** section on GitHub's **Actions** page.
* **Releases**: Pushing a version tag (e.g., `v1.1.0`) automatically publishes a GitHub Release with the APK attached.
* **Local Build**:
  ```bash
  cd android
  ./gradlew assembleRelease
  ```
  The resulting APK will be located at `android/app/build/outputs/apk/release/`.

## 🙏 Acknowledgements

Special thanks to [**@sz3**](https://github.com/sz3) and their open-source [**libcimbar**](https://github.com/sz3/libcimbar) repository!
Without libcimbar's powerful computer vision and color space encoding algorithms, this Web tool would not exist. All the core "magic" is credited to the original author's outstanding work.

Also thanks to other open-source components that support this project:
*   **[Zstandard (zstd)](https://facebook.github.io/zstd/)**: Provides extremely fast file compression and decompression capabilities.

## 📄 License

This project is released under the same open-source license as the upstream project. For details, please refer to the upstream `libcimbar` repository.
