// i18n Dictionary
const i18nDict = {
    en: {
        // Shared
        "title_hub": "QR Code Transfer Hub - Offline Browser File Transfer",
        "title_send": "QR Code Transfer Hub - File Sender",
        "title_recv": "QR Code Transfer Hub - File Receiver",
        "back_to_hub": "Back to Hub",
        "fullscreen": "Fullscreen Mode",
        
        // Hub (index.html)
        "hub_main_title": "QR Code Transfer Hub",
        "hub_subtitle": "Completely offline, cross-device file transfer in the browser using dynamic color barcodes (no network required)",
        "hub_sender": "File Sender",
        "hub_sender_desc": "Select a local file and encode it into a stream of dynamic color barcodes playing on the screen (fully offline).",
        "hub_btn_send": "Start Sending",
        "hub_receiver": "File Receiver",
        "hub_receiver_desc": "Use your device camera to scan the dynamic barcodes on the screen, decode in real-time, and instantly download the reconstructed file (fully offline).",
        "hub_btn_recv": "Start Receiving",

        // About Modal
        "about_btn": "About",
        "about_tagline": "Pure Client-Side Offline Transfer Tool",
        "about_desc": "A pure client-side offline file transfer tool powered by dynamic color barcodes and high-capacity static QR codes. Operates without Wi-Fi, Bluetooth, or cloud servers—data travels via screen light and camera capture across air-gapped devices.",
        "about_sec_features": "🌟 Key Features",
        "about_feat1_title": "100% Offline & Air-Gapped",
        "about_feat1_desc": "No network connection required. Zero data uploaded to cloud, fully protecting against remote sniffing and leaks.",
        "about_feat2_title": "Dual-Mode Transmission",
        "about_feat2_desc": "Supports Cimbar dynamic color barcodes (high-speed streaming for large files) and high-capacity static QR codes (up to 2,953 bytes for text/URLs).",
        "about_feat3_title": "Pure Client-Side Computation",
        "about_feat3_desc": "Accelerated with WebAssembly and HTML5 Canvas hardware rendering. Encodes and decodes locally in seconds.",
        "about_feat4_title": "Single-File Standalone Portable",
        "about_feat4_desc": "Available as a single standalone HTML file. Copy to USB or mobile devices for instant cross-platform use.",
        "about_sec_info": "ℹ️ Version & License",
        "about_lbl_version": "Version",
        "about_lbl_license": "License",
        "about_lbl_credits": "Credits",
        "about_close": "Close",

        // Send Page (send.html)
        "send_status_ready": "Ready",
        "send_dragdrop_title": "Drag & Drop or Select Local File",
        "send_drag_here": "Drag file here",
        "send_or_click": "Or click to select a local file",
        "send_no_file": "No file selected",
        "send_select_file": "Select Local File",
        "send_reset": "Reset / Send New File",
        "send_mode": "Encoding Mode",
        "send_fps": "Send Framerate (FPS)",
        "tab_file": "File Transfer",
        "tab_text": "Text / URL (QR)",
        "send_qr_title": "Text Input / Clipboard",
        "send_qr_desc": "Enter or paste text here, and a high-resolution static QR code will be generated in real-time on the right.",
        "send_qr_preview_title": "Real-Time Static QR Code",
        "send_qr_preview_desc": "Standard QR code, scannable by any mobile camera or WeChat.",
        "send_qr_placeholder": "Enter or paste text, URL, token, Wi-Fi password...",
        "send_btn_gen_qr": "Generate QR Code",
        "send_btn_paste": "Paste",
        "send_btn_clear": "Clear",
        "send_qr_chars": "Characters: {n}",
        "send_qr_download": "Download QR Image",
        "send_qr_fullscreen": "Fullscreen",
        "send_qr_edit": "Edit Content",
        "send_small_file_hint": "Small file detected ({size} bytes). Switch to static QR code?",
        "send_btn_switch_qr": "Switch to Static QR",
        "send_btn_switch_cimbar": "Switch to Cimbar Barcode",
        "send_qr_empty_hint": "Type or paste text to generate QR code instantly",
        "send_qr_chars_bytes": "{chars} chars · {bytes} bytes",
        "send_qr_overflow_warn": "⚠️ Content is too long ({chars} chars / {bytes} bytes), exceeding single static QR physical limit (2,953 bytes).",
        "send_btn_switch_cimbar_full": "🚀 Send via Cimbar Dynamic Barcode (Unlimited)",
        "send_btn_trim_qr": "✂️ Trim to QR Limit",
        "send_btn_convert_alphanumeric": "🔠 Convert to Alphanumeric",
        "send_qr_copy_img": "Copy Image",
        "send_qr_copied_img": "Image Copied!",
        "send_qr_fs_hint": "Click anywhere or press ESC to exit fullscreen",

        // Recv Page (recv.html)
        "recv_toggle_debug": "Toggle Debug Panel",
        "recv_status_no_error": "No error",
        "recv_worker_idle": "Worker {n} Idle",
        "recv_qr_detected": "Standard QR Code Detected",
        "recv_qr_open_url": "Open Link",
        "recv_qr_copy_url": "Copy Link",
        "recv_qr_copy_text": "Copy Content",
        "recv_qr_copied": "Copied to Clipboard!",
        "recv_qr_download_file": "Download File",
        "recv_qr_continue": "Continue Scanning",
        "recv_qr_auto_detect": "QR Code Auto-Detection"
    },
    zh: {
        // Shared
        "title_hub": "二维码传输中心 - 浏览器端无网文件传输工具",
        "title_send": "二维码传输中心 - 发送端",
        "title_recv": "二维码传输中心 - 接收端",
        "back_to_hub": "返回大厅",
        "fullscreen": "全屏展示模式",

        // Hub (index.html)
        "hub_main_title": "二维码传输中心",
        "hub_subtitle": "在浏览器中使用彩色条形码进行完全离线、跨设备的文件传输（无需任何网络连接）",
        "hub_sender": "文件发送端",
        "hub_sender_desc": "选择一个本地文件，将其编码为在屏幕上播放的动态彩色条形码流（完全离线）。",
        "hub_btn_send": "开始发送",
        "hub_receiver": "文件接收端",
        "hub_receiver_desc": "使用设备摄像头扫描屏幕上的动态条形码，实时解码并瞬间下载重组后的文件（完全离线）。",
        "hub_btn_recv": "开始接收",

        // About Modal
        "about_btn": "关于",
        "about_tagline": "纯前端无网跨设备传输工具",
        "about_desc": "基于动态彩色条形码与标准静态二维码构建的纯前端离线传输工具。无需 Wi-Fi、蓝牙或任何云端服务器，仅通过屏幕光线与摄像头扫描，即可在物理隔离设备间实现极速、安全的文件与文本互传。",
        "about_sec_features": "🌟 核心特性",
        "about_feat1_title": "完全离线与物理隔离 (Air-Gapped)",
        "about_feat1_desc": "不建立任何网络连接，零数据上云，彻底阻断远程抓包与监听风险。",
        "about_feat2_title": "双模式智能引擎",
        "about_feat2_desc": "支持 Cimbar 动态彩色条码（流式传输大文件）与高容量静态二维码（单张容纳最高 2,953 字节文本/链接）。",
        "about_feat3_title": "纯客户端高速运算",
        "about_feat3_desc": "基于 WebAssembly 与 HTML5 Canvas 硬件渲染，秒级编码解码，即开即用。",
        "about_feat4_title": "单文件离线便携运行",
        "about_feat4_desc": "提供单文件独立版 HTML，直接复制到 U 盘或手机即可跨平台使用。",
        "about_sec_info": "ℹ️ 版本与协议信息",
        "about_lbl_version": "当前版本",
        "about_lbl_license": "开源协议",
        "about_lbl_credits": "技术支持",
        "about_close": "关闭",

        // Send Page (send.html)
        "send_status_ready": "准备就绪",
        "send_dragdrop_title": "拖拽或选择本地文件",
        "send_drag_here": "拖拽文件到此处",
        "send_or_click": "或者点击选择本地文件",
        "send_no_file": "未选择任何文件",
        "send_select_file": "选择本地文件",
        "send_reset": "重置 / 发送新文件",
        "send_mode": "编码模式",
        "send_fps": "发送帧率 (FPS)",
        "tab_file": "文件传输",
        "tab_text": "文本 / 网址 (二维码)",
        "send_qr_title": "文本输入 / 剪贴板",
        "send_qr_desc": "在此输入或粘贴文本，右侧将实时生成高清晰度静态普通二维码。",
        "send_qr_preview_title": "实时普通静态二维码",
        "send_qr_preview_desc": "标准点阵二维码，任何手机相机、微信扫一扫均可直接识别。",
        "send_qr_placeholder": "在此输入或粘贴文本、网址、Token、Wi-Fi 密码等...",
        "send_btn_gen_qr": "生成普通二维码",
        "send_btn_paste": "从剪贴板粘贴",
        "send_btn_clear": "清空",
        "send_qr_chars": "字数: {n} 字符",
        "send_qr_download": "下载二维码图片",
        "send_qr_fullscreen": "全屏展示",
        "send_qr_edit": "修改内容",
        "send_small_file_hint": "检测到小文件 ({size} 字节)，可直接展示为普通静态二维码：",
        "send_btn_switch_qr": "切换为静态二维码",
        "send_btn_switch_cimbar": "切回 Cimbar 动态彩码",
        "send_qr_empty_hint": "输入或粘贴文本即可实时生成二维码",
        "send_qr_chars_bytes": "{chars} 字符 · {bytes} 字节",
        "send_qr_overflow_warn": "⚠️ 内容过长 ({chars} 字符 / {bytes} 字节)，已超出标准单张二维码物理上限 (2,953 字节)。",
        "send_btn_switch_cimbar_full": "🚀 一键转为 Cimbar 动态彩码传输 (无上限)",
        "send_btn_trim_qr": "✂️ 截断至二维码最大容量",
        "send_btn_convert_alphanumeric": "🔠 转为大写英数模式",
        "send_qr_copy_img": "复制图片",
        "send_qr_copied_img": "图片已复制！",
        "send_qr_fs_hint": "点击任意位置或按 ESC 退出全屏",

        // Recv Page (recv.html)
        "recv_toggle_debug": "切换调试面板",
        "recv_status_no_error": "暂无错误",
        "recv_worker_idle": "工作线程 {n} 空闲",
        "recv_qr_detected": "识别到普通静态二维码",
        "recv_qr_open_url": "打开链接",
        "recv_qr_copy_url": "复制链接",
        "recv_qr_copy_text": "复制内容",
        "recv_qr_copied": "已复制到剪贴板！",
        "recv_qr_download_file": "下载文件",
        "recv_qr_continue": "继续扫描",
        "recv_qr_auto_detect": "普通二维码自动识别"
    }
};

class I18nManager {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.listeners = [];
    }

    detectLanguage() {
        const storedLang = localStorage.getItem('cimbar_lang');
        if (storedLang && i18nDict[storedLang]) {
            return storedLang;
        }
        const sysLang = navigator.language || navigator.userLanguage;
        if (sysLang.toLowerCase().startsWith('zh')) {
            return 'zh';
        }
        return 'en';
    }

    setLanguage(lang) {
        if (!i18nDict[lang]) return;
        this.currentLang = lang;
        localStorage.setItem('cimbar_lang', lang);
        this.applyTranslations();
        this.notifyListeners();
        this.updateToggleButton();
    }

    toggleLanguage() {
        const newLang = this.currentLang === 'en' ? 'zh' : 'en';
        this.setLanguage(newLang);
    }

    t(key, params = {}) {
        let str = i18nDict[this.currentLang][key];
        if (!str) return key;
        
        // Simple template replacement for {n}
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(`{${k}}`, v);
        }
        return str;
    }

    applyTranslations() {
        // Document title
        const titleKey = document.title ? document.documentElement.getAttribute('data-i18n-title') : null;
        if (titleKey) {
            document.title = this.t(titleKey);
        }

        // All elements with data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Check if we translate a specific attribute or innerHTML
            const targetAttr = el.getAttribute('data-i18n-target');
            if (targetAttr) {
                el.setAttribute(targetAttr, translation);
            } else {
                el.innerHTML = translation;
            }
        });
    }

    updateToggleButton() {
        const btn = document.getElementById('i18n-toggle');
        if (btn) {
            btn.innerHTML = this.currentLang === 'en' ? '🌐 简' : '🌐 En';
            btn.title = this.currentLang === 'en' ? 'Switch to Chinese' : '切换为英文';
        }
    }

    onChange(cb) {
        this.listeners.push(cb);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.currentLang));
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            // Find title data attribute if we put it on html/head
            this.applyTranslations();
            
            // Try to bind toggle button if it exists
            const btn = document.getElementById('i18n-toggle');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleLanguage();
                });
                this.updateToggleButton();
            }
        });
    }
}

window.I18n = new I18nManager();
window.I18n.init();

// Global About Modal helpers
window.openAboutModal = function() {
    var modal = document.getElementById('about-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeAboutModal = function() {
    var modal = document.getElementById('about-modal');
    if (modal) modal.classList.add('hidden');
};

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        window.closeAboutModal();
    }
});
