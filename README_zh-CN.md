# 二维码传输中心 (Cimbar-Web) 🌈

*[Read this in English (英文) 🇺🇸](./README.md)*

Cimbar-Web 是一款**完全离线、跨设备**的网页端文件传输工具。通过在屏幕上播放高密度的动态彩色条形码，它能够让你在没有任何网络连接（无需 Wi-Fi、局域网或蓝牙）的情况下，利用设备的摄像头瞬间传输文件。

这个项目是基于出色的 [libcimbar](https://github.com/sz3/libcimbar) 核心库的独立 Web 移植与 UI 增强版本。

## ✨ 核心功能

*   **⚡️ 完全离线传输**：真正的物理隔离传输（Air-gap），只需一个显示屏幕和一个摄像头。
*   **🎨 现代响应式 UI**：全新设计的极简玻璃态（Glassmorphism）UI，提供直观的“发送端”和“接收端”双视窗体验。
*   **🚀 极致性能**：深度优化的 WebWorker 多线程解码引擎；采用底层 `fetch` 与 `WebAssembly` 零拷贝技术，实现静态网页“秒开”与极速扫码。
*   **📱 跨平台兼容**：任何支持现代浏览器和摄像头的设备（PC、手机、平板）均可作为发送或接收端。
*   **📦 单文件便携版 (Portable)**：提供一键生成的 `cimbar_portable.html` 单文件。只需携带这一个仅 2MB 大小的文件，即可随时随地在离线设备上双击打开使用。

## 🌐 浏览器兼容性说明

| 功能模式 | 运行环境依赖 | 推荐浏览器版本 | 说明 |
| :--- | :--- | :--- | :--- |
| **动态彩色二维码**<br>(Cimbar 码流模式) | • WebAssembly (BigInt/i64)<br>• WebGL 2 / Canvas 硬件加速 | • **Chrome / Edge** ≥ 85<br>• **Firefox** ≥ 78<br>• **Safari** ≥ 15.0 | 依赖 WebAssembly JS-BigInt 互操作规范。低于 Chrome 85 的早期浏览器（如 Chrome 83）因内核缺少 WASM i64 映射支持，将无法加载动态彩码引擎。 |
| **静态普通二维码**<br>(文本 / 网址传输) | • 纯客户端 JavaScript (ES5/ES6) | • 全浏览器通用兼容<br>(支持 Chrome 83、老旧内网专网机等) | 单张最高容纳 2,953 字节（约 1,000~2,000 汉字或长文本配置），任何手机相机或微信扫一扫均可直接识别，适合离线交换密码、Token、命令或小文本。 |

## 🛠️ 项目结构与依赖

Cimbar-Web 是一个独立的 UI 与浏览器工程。底层的图像提取、计算机视觉与核心编解码算法（C++）均作为 Git Submodule 依赖上游仓库：

*   **[libcimbar](https://github.com/sz3/libcimbar)**: 提供核心的编解码逻辑并输出为 WebAssembly (`.wasm`)。

我们的前端项目对上游引擎进行了深度的二次封装，包括但不限于：异步流式解码、单文件打包脚本优化、UI/UX 的完全重构。

## 🚀 快速开始

### 线上部署
项目纯静态，直接将 `web/` 目录挂载到任意 Web 服务器（如 Nginx、Vercel 或 GitHub Pages）即可使用。

### 单文件离线版 (Portable)
你也可以直接从 GitHub 下载我们预编译好的完整单文件，无需克隆代码库：
👉 [**点击下载 cimbar_portable.html**](https://raw.githubusercontent.com/newfur/cimbar-web/main/cimbar_portable.html) *(建议右键 -> 链接另存为...)*

或者，如果你克隆了本代码库，也可以使用提供的 Python 打包脚本自行生成：
```bash
python3 build_portable.py
```
执行完毕后，根目录下生成的 `cimbar_portable.html` 即为完整的单文件。你可以把它通过 U 盘拷贝到任何完全断网的设备上使用。

### 📱 Android 客户端 (APK)
本项目已封装为独立的 Android 原生客户端，内置离线全量 WebAssembly 运行时与摄像头扫码支持：
* **自动编译与下载**：仓库配置了 GitHub Actions 自动化工作流。每次推送到 `main` 分支或在 Actions 页面点击手动触发时，会自动编译生成 APK。前往 GitHub 仓库的 **Actions** 标签页，点击最新构建任务即可在 **Artifacts** 中下载 `Cimbar-Transfer-APK`。
* **版本发布**：给仓库推送版本标签（例如 `git tag v1.1.0 && git push origin v1.1.0`）时，GitHub Actions 会自动创建 GitHub Release 并附加 APK 文件供用户直接下载。
* **本地编译**：
  ```bash
  cd android
  ./gradlew assembleRelease
  ```
  生成的安装包位于 `android/app/build/outputs/apk/release/`。

## 🙏 鸣谢

特别感谢 [**@sz3**](https://github.com/sz3) 及其开源的 [**libcimbar**](https://github.com/sz3/libcimbar) 仓库！
没有 libcimbar 强大的计算机视觉与色彩空间编码算法，就不会有这个 Web 版工具的诞生。所有的核心“黑科技”魔法都归功于原作者的出色工作。

同时感谢其他支撑本项目的开源组件：
*   **[Zstandard (zstd)](https://facebook.github.io/zstd/)**: 提供极速的文件压缩与解压能力。

## 📄 许可证

本项目基于与上游一致的开源协议发布。详情请参考上游 `libcimbar` 仓库。
