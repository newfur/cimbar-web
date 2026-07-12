# Cimbar-Web 🌈

*[Read this in Simplified Chinese (简体中文)](#cimbar-web--%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87)*

Cimbar-Web is a **fully offline, cross-device** web-based file transfer tool. By playing high-density dynamic color barcodes on a screen, it allows you to instantly transfer files to any device with a camera—without requiring any network connection (no Wi-Fi, LAN, or Bluetooth needed).

This project is an independent Web port and UI enhancement based on the excellent [libcimbar](https://github.com/sz3/libcimbar) core library.

## ✨ Core Features

*   **⚡️ 100% Offline Transfer**: True physical air-gap transfer. All you need is a display screen and a camera.
*   **🎨 Modern Responsive UI**: Completely redesigned minimalist Glassmorphism UI, providing an intuitive dual-window experience for "Sender" and "Receiver".
*   **🚀 Extreme Performance**: Deeply optimized WebWorker multi-threaded decoding engine. Utilizes native `fetch` and zero-copy `WebAssembly` technologies to achieve instant page loads and lightning-fast scanning.
*   **📱 Cross-Platform Compatibility**: Any device (PC, phone, tablet) supporting a modern web browser and camera can act as a sender or receiver.
*   **📦 Single Portable File**: Provides a one-click build script to generate a `cimbar_portable.html` standalone file. Just carry this single ~2MB file to use it anytime, anywhere on offline devices.

## 🛠️ Project Structure & Dependencies

Cimbar-Web is an independent UI and browser project. The underlying image extraction, computer vision, and core encoding/decoding algorithms (C++) are depended upon as a Git Submodule from the upstream repository:

*   **[libcimbar](https://github.com/sz3/libcimbar)**: Provides the core encoding/decoding logic compiled to WebAssembly (`.wasm`).

Our frontend project deeply encapsulates the upstream engine, including asynchronous stream decoding, optimized single-file bundling scripts, and a complete UI/UX overhaul.

## 🚀 Quick Start

### Online Deployment
The project is purely static. Simply mount the `web/` directory to any Web Server (such as Nginx, Vercel, or GitHub Pages) to start using it.

### Generate Portable Offline File
If you need a purely offline standalone tool (double-click to run without an HTTP Server), please use the provided Python build script:
```bash
python3 build_portable.py
```
After execution, the generated `cimbar_portable.html` in the root directory is a complete standalone file. You can copy it via a USB drive to any completely disconnected device for use.

## 🙏 Acknowledgements

Special thanks to [**@sz3**](https://github.com/sz3) and their open-source [**libcimbar**](https://github.com/sz3/libcimbar) repository!
Without libcimbar's powerful computer vision and color space encoding algorithms, this Web tool would not exist. All the core "magic" is credited to the original author's outstanding work.

Also thanks to other open-source components that support this project:
*   **[Zstandard (zstd)](https://facebook.github.io/zstd/)**: Provides extremely fast file compression and decompression capabilities.

## 📄 License

This project is released under the same open-source license as the upstream project. For details, please refer to the upstream `libcimbar` repository.

---

# Cimbar-Web 🌈 (简体中文)

Cimbar-Web 是一款**完全离线、跨设备**的网页端文件传输工具。通过在屏幕上播放高密度的动态彩色条形码，它能够让你在没有任何网络连接（无需 Wi-Fi、局域网或蓝牙）的情况下，利用设备的摄像头瞬间传输文件。

这个项目是基于出色的 [libcimbar](https://github.com/sz3/libcimbar) 核心库的独立 Web 移植与 UI 增强版本。

## ✨ 核心功能

*   **⚡️ 完全离线传输**：真正的物理隔离传输（Air-gap），只需一个显示屏幕和一个摄像头。
*   **🎨 现代响应式 UI**：全新设计的极简玻璃态（Glassmorphism）UI，提供直观的“发送端”和“接收端”双视窗体验。
*   **🚀 极致性能**：深度优化的 WebWorker 多线程解码引擎；采用底层 `fetch` 与 `WebAssembly` 零拷贝技术，实现静态网页“秒开”与极速扫码。
*   **📱 跨平台兼容**：任何支持现代浏览器和摄像头的设备（PC、手机、平板）均可作为发送或接收端。
*   **📦 单文件便携版 (Portable)**：提供一键生成的 `cimbar_portable.html` 单文件。只需携带这一个仅 2MB 大小的文件，即可随时随地在离线设备上双击打开使用。

## 🛠️ 项目结构与依赖

Cimbar-Web 是一个独立的 UI 与浏览器工程。底层的图像提取、计算机视觉与核心编解码算法（C++）均作为 Git Submodule 依赖上游仓库：

*   **[libcimbar](https://github.com/sz3/libcimbar)**: 提供核心的编解码逻辑并输出为 WebAssembly (`.wasm`)。

我们的前端项目对上游引擎进行了深度的二次封装，包括但不限于：异步流式解码、单文件打包脚本优化、UI/UX 的完全重构。

## 🚀 快速开始

### 线上部署
项目纯静态，直接将 `web/` 目录挂载到任意 Web 服务器（如 Nginx、Vercel 或 GitHub Pages）即可使用。

### 生成单文件离线版 (Portable)
如果你需要一个纯离线的单文件工具（无需开启 HTTP Server 即可双击运行），请使用提供的 Python 打包脚本：
```bash
python3 build_portable.py
```
执行完毕后，根目录下生成的 `cimbar_portable.html` 即为完整的单文件。你可以把它通过 U 盘拷贝到任何完全断网的设备上使用。

## 🙏 鸣谢

特别感谢 [**@sz3**](https://github.com/sz3) 及其开源的 [**libcimbar**](https://github.com/sz3/libcimbar) 仓库！
没有 libcimbar 强大的计算机视觉与色彩空间编码算法，就不会有这个 Web 版工具的诞生。所有的核心“黑科技”魔法都归功于原作者的出色工作。

同时感谢其他支撑本项目的开源组件：
*   **[Zstandard (zstd)](https://facebook.github.io/zstd/)**: 提供极速的文件压缩与解压能力。

## 📄 许可证

本项目基于与上游一致的开源协议发布。详情请参考上游 `libcimbar` 仓库。
