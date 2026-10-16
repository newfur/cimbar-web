// i18n Dictionary
const i18nDict = {
    en: {
        // Shared
        "title_hub": "CIMBAR - Offline Browser File Transfer",
        "title_send": "Cimbar File Sender",
        "title_recv": "Cimbar File Receiver",
        "back_to_hub": "Back to Hub",
        "fullscreen": "Fullscreen Mode",
        
        // Hub (index.html)
        "hub_main_title": "Cimbar Transfer Hub",
        "hub_subtitle": "Completely offline, cross-device file transfer in the browser using dynamic color barcodes (no network required)",
        "hub_sender": "File Sender",
        "hub_sender_desc": "Select a local file and encode it into a stream of dynamic color barcodes playing on the screen (fully offline).",
        "hub_btn_send": "Start Sending",
        "hub_receiver": "File Receiver",
        "hub_receiver_desc": "Use your device camera to scan the dynamic barcodes on the screen, decode in real-time, and instantly download the reconstructed file (fully offline).",
        "hub_btn_recv": "Start Receiving",

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
        "title_hub": "CIMBAR 浏览器端无网文件传输工具",
        "title_send": "Cimbar 文件发送端",
        "title_recv": "Cimbar 文件接收端",
        "back_to_hub": "返回大厅",
        "fullscreen": "全屏展示模式",

        // Hub (index.html)
        "hub_main_title": "Cimbar 传输中心",
        "hub_subtitle": "在浏览器中使用彩色条形码进行完全离线、跨设备的文件传输（无需任何网络连接）",
        "hub_sender": "文件发送端",
        "hub_sender_desc": "选择一个本地文件，将其编码为在屏幕上播放的动态彩色条形码流（完全离线）。",
        "hub_btn_send": "开始发送",
        "hub_receiver": "文件接收端",
        "hub_receiver_desc": "使用设备摄像头扫描屏幕上的动态条形码，实时解码并瞬间下载重组后的文件（完全离线）。",
        "hub_btn_recv": "开始接收",

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
