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
        "send_mode": "Encoding Mode",
        "send_fps": "Send Framerate (FPS)",

        // Recv Page (recv.html)
        "recv_toggle_debug": "Toggle Debug Panel",
        "recv_status_no_error": "No error",
        "recv_worker_idle": "Worker {n} Idle"
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
        "send_mode": "编码模式",
        "send_fps": "发送帧率 (FPS)",

        // Recv Page (recv.html)
        "recv_toggle_debug": "切换调试面板",
        "recv_status_no_error": "暂无错误",
        "recv_worker_idle": "工作线程 {n} 空闲"
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
