var Report = function () {

  return {
    prevent_sleep: function () {
      setTimeout(Main.prevent_sleep, 0);
    },

    setAspectRatio: function (idealRatio) {
      Main.setAspectRatio(idealRatio);
    },

    setActive: function (active) {
      Main.setActive(active);
    },

    setHTML: function (id, msg) {
      Main.setHTML(id, msg);
    },

    setTitle: function (msg) {
      Main.setTitle(msg);
    },

    startWasm: function (result) {
      Main.on_ww_init(!result);
    },

    handleWorkerMessage: function (event) {
      if (event.error) {
        console.error('[report] error ' + event.message);
        return;
      }
      const { fun, args } = event.data;
      //console.log(event.data);
      if (typeof Report[fun] !== 'function') {
        console.warn('[report] Unknown worker message type: ' + fun);
        return;
      }
      Report[fun](...args);
    }
  };
}();


var Main = function () {

  // configurable
  var _interval = 66;
  var _colorBalance = false;

  // internal
  var _ww = undefined;

  var _showStats = false;
  var _wakeLock = undefined;
  var _activeTab = 'file';
  var _currentQRCode = null;
  var _lastFile = null;

  // cached
  var _idealRatio = 1;

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      return document.exitFullscreen();
    }
    else {
      return document.documentElement.requestFullscreen();
    }
  }

  // public interface
  return {
    reset: function () {
      Main.togglePause(true);
      document.body.classList.remove('transmitting');

      if (typeof Module !== 'undefined' && Module._cimbare_init_encode) {
        try {
          Module._cimbare_init_encode(0, 0, -1);
        } catch (e) {
          console.warn("cimbare_init_encode reset error:", e);
        }
      }

      var canvas = document.getElementById('canvas');
      if (canvas) {
        canvas.classList.remove('active');
        canvas.classList.remove('has-file');
        try {
          var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
          } else {
            var ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        } catch (e) { }
      }

      var dragdrop = document.getElementById('dragdrop');
      if (dragdrop) {
        dragdrop.classList.remove('hidden');
        dragdrop.classList.remove('active');
        dragdrop.style.border = '';
        dragdrop.style.background = '';
        dragdrop.style.padding = '';
        dragdrop.style.boxShadow = '';
      }

      var fileInput = document.getElementById('file_input');
      if (fileInput) fileInput.value = '';

      var defaultText = (typeof window.I18n !== 'undefined' && window.I18n.t)
        ? window.I18n.t('send_no_file')
        : '未选择任何文件';

      var curFile = document.getElementById('send-current-file') || document.getElementById('current-file');
      if (curFile) curFile.textContent = defaultText;

      var defaultTitle = (typeof window.I18n !== 'undefined' && window.I18n.t)
        ? window.I18n.t('title_send')
        : 'Cimbar 文件发送端';
      document.title = defaultTitle;

      // QR Reset
      _currentQRCode = null;
      _lastFile = null;
      var textarea = document.getElementById('qr-input-text');
      if (textarea) textarea.value = '';
      var qrTarget = document.getElementById('qrcode-render-target');
      if (qrTarget) qrTarget.innerHTML = '';
      var textCard = document.getElementById('text-card');
      if (textCard) textCard.classList.add('hidden');
      var qrDisplayCard = document.getElementById('qr-display-card');
      if (qrDisplayCard) {
        qrDisplayCard.dataset.editing = '';
        qrDisplayCard.classList.add('hidden');
      }
      var smallAlert = document.getElementById('small-file-alert');
      if (smallAlert) smallAlert.classList.add('hidden');
      var backBtn = document.getElementById('btn-back-to-cimbar');
      if (backBtn) backBtn.disabled = true;

      Main.switchTab('file');
    },

    switchTab: function (tab) {
      _activeTab = tab;
      var fileTabBtn = document.getElementById('tab-file-btn');
      var textTabBtn = document.getElementById('tab-text-btn');
      var dragdrop = document.getElementById('dragdrop');
      var canvas = document.getElementById('canvas');
      var textCard = document.getElementById('text-card');
      var qrDisplayCard = document.getElementById('qr-display-card');

      if (tab === 'file') {
        if (fileTabBtn) fileTabBtn.classList.add('active');
        if (textTabBtn) textTabBtn.classList.remove('active');
        if (textCard) textCard.classList.add('hidden');

        if (canvas && canvas.classList.contains('has-file')) {
          canvas.classList.add('active');
          if (dragdrop) dragdrop.classList.add('hidden');
          document.body.classList.add('transmitting');
          window.scrollTo(0, 0);
          Main.togglePause(false);
          Main.resize();
        } else {
          document.body.classList.remove('transmitting');
          if (dragdrop) dragdrop.classList.remove('hidden');
          if (canvas) canvas.classList.remove('active');
        }
      } else {
        document.body.classList.remove('transmitting');
        if (fileTabBtn) fileTabBtn.classList.remove('active');
        if (textTabBtn) textTabBtn.classList.add('active');
        if (dragdrop) dragdrop.classList.add('hidden');
        if (canvas) canvas.classList.remove('active');
        Main.togglePause(true);

        if (textCard) {
          textCard.classList.remove('hidden');
          var textarea = document.getElementById('qr-input-text');
          if (textarea) {
            textarea.focus();
            Main.onQRTextInput();
          }
        }
      }
    },

    onQRTextInput: function () {
      var textarea = document.getElementById('qr-input-text');
      var qrTarget = document.getElementById('qrcode-render-target');
      var countBadge = document.getElementById('qr-input-count');
      var alertBox = document.getElementById('qr-overflow-alert');
      var btnFs = document.getElementById('btn-qr-fs');
      var btnDl = document.getElementById('btn-qr-dl');
      var btnCopy = document.getElementById('btn-qr-copy');
      var btnCimbar = document.getElementById('btn-back-to-cimbar');

      if (!textarea || !qrTarget) return;
      var text = textarea.value;
      var charLen = text.length;
      var byteLen = (typeof TextEncoder !== "undefined") ? new TextEncoder().encode(text).length : charLen;

      if (countBadge) {
        var countStr = (window.I18n && window.I18n.t)
          ? window.I18n.t('send_qr_chars_bytes', { chars: charLen, bytes: byteLen })
          : (charLen + ' 字符 · ' + byteLen + ' 字节');
        countBadge.textContent = countStr;
      }

      if (!text.trim()) {
        _currentQRCode = null;
        if (alertBox) alertBox.classList.add('hidden');
        var emptyHint = (window.I18n && window.I18n.t) ? window.I18n.t('send_qr_empty_hint') : '输入或粘贴文本即可实时生成二维码';
        qrTarget.innerHTML = '<div class="qr-placeholder-state"><svg class="qr-placeholder-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg><span>' + emptyHint + '</span></div>';
        if (btnFs) btnFs.disabled = true;
        if (btnDl) btnDl.disabled = true;
        if (btnCopy) btnCopy.disabled = true;
        if (btnCimbar) btnCimbar.disabled = true;
        return;
      }

      if (byteLen > 2953) {
        _currentQRCode = null;
        if (alertBox) {
          alertBox.classList.remove('hidden');
          var overChars = document.getElementById('qr-over-chars');
          var overBytes = document.getElementById('qr-over-bytes');
          if (overChars) overChars.textContent = charLen;
          if (overBytes) overBytes.textContent = byteLen;
        }
        var warnMsg = (window.I18n && window.I18n.t) ? window.I18n.t('send_qr_overflow_warn', { chars: charLen, bytes: byteLen }) : '⚠️ 内容超出单张二维码物理上限';
        qrTarget.innerHTML = '<div class="qr-placeholder-state" style="color:#ef4444;"><span style="font-size:2rem;margin-bottom:0.2rem;">⚠️</span><span style="font-weight:600;font-size:0.85rem;">' + warnMsg + '</span></div>';
        if (btnFs) btnFs.disabled = true;
        if (btnDl) btnDl.disabled = true;
        if (btnCopy) btnCopy.disabled = true;
        if (btnCimbar) btnCimbar.disabled = false;
        return;
      }

      if (alertBox) alertBox.classList.add('hidden');

      try {
        var ecl = (typeof qrcodegen !== "undefined" && qrcodegen.QrCode) ? qrcodegen.QrCode.Ecc.LOW : 0;
        var qr = qrcodegen.QrCode.encodeText(text, ecl);
        _currentQRCode = qr;
        var svgStr = toSvgString(qr, 2, '#ffffff', '#000000');
        qrTarget.innerHTML = svgStr;
        if (btnFs) btnFs.disabled = false;
        if (btnDl) btnDl.disabled = false;
        if (btnCopy) btnCopy.disabled = false;
        if (btnCimbar) btnCimbar.disabled = false;
      } catch (err) {
        console.warn("QR generation error:", err);
        qrTarget.innerHTML = '<div class="qr-placeholder-state" style="color:#ef4444;"><span>生成失败: ' + err.message + '</span></div>';
        if (btnFs) btnFs.disabled = true;
        if (btnDl) btnDl.disabled = true;
        if (btnCopy) btnCopy.disabled = true;
      }
    },

    onQRTextPaste: function (e) {
      if (e && e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        var file = e.clipboardData.files[0];
        if (file) {
          e.preventDefault();
          var reader = new FileReader();
          reader.onload = function (evt) {
            var textarea = document.getElementById('qr-input-text');
            if (textarea) {
              textarea.value = evt.target.result || '';
              Main.onQRTextInput();
            }
          };
          reader.readAsText(file);
          return;
        }
      }
      setTimeout(function () {
        Main.onQRTextInput();
      }, 20);
    },

    clearQRText: function () {
      var textarea = document.getElementById('qr-input-text');
      if (textarea) {
        textarea.value = '';
        textarea.focus();
      }
      Main.onQRTextInput();
    },

    pasteFromClipboard: async function () {
      var textarea = document.getElementById('qr-input-text');
      if (!textarea) return;
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          var clipText = await navigator.clipboard.readText();
          if (clipText) {
            textarea.value = clipText;
            Main.onQRTextInput();
          }
        }
        textarea.focus();
      } catch (e) {
        textarea.focus();
      }
    },

    trimQRTextToFit: function () {
      var textarea = document.getElementById('qr-input-text');
      if (!textarea || !textarea.value) return;
      var trimmed = getMaxQrCodeString(textarea.value, (typeof qrcodegen !== "undefined" && qrcodegen.QrCode) ? qrcodegen.QrCode.Ecc.LOW : 0);
      textarea.value = trimmed;
      Main.onQRTextInput();
      textarea.focus();
    },

    convertToAlphanumeric: function () {
      var textarea = document.getElementById('qr-input-text');
      if (!textarea || !textarea.value) return;
      var converted = unicodeToAlphanumericOnly(textarea.value);
      textarea.value = converted;
      Main.onQRTextInput();
      textarea.focus();
    },

    sendTextViaCimbar: function (customText) {
      var textarea = document.getElementById('qr-input-text');
      var text = customText !== undefined ? customText : (textarea ? textarea.value : '');
      if (!text) return;
      var filename = 'text_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.txt';
      var blob = new File([text], filename, { type: 'text/plain;charset=utf-8' });
      Main.switchTab('file');
      Main.importFile(blob);
    },

    generateStaticQR: function (customText) {
      if (customText !== undefined) {
        var textarea = document.getElementById('qr-input-text');
        if (textarea) textarea.value = customText;
      }
      Main.switchTab('text');
      Main.onQRTextInput();
    },

    updateCharCount: function () {
      Main.onQRTextInput();
    },

    downloadQRImage: function () {
      if (!_currentQRCode) return;
      var canvas = document.createElement('canvas');
      drawCanvas(_currentQRCode, 8, 2, '#ffffff', '#000000', canvas);
      var dataUrl = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'qrcode_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png';
      a.click();
    },

    copyQRImage: function () {
      if (!_currentQRCode) return;
      var btn = document.getElementById('btn-qr-copy');
      var originalSpan = btn ? btn.querySelector('span') : null;
      var originalText = originalSpan ? originalSpan.textContent : '';
      var doneText = (window.I18n && window.I18n.t) ? window.I18n.t('send_qr_copied_img') : '图片已复制！';

      var canvas = document.createElement('canvas');
      drawCanvas(_currentQRCode, 8, 2, '#ffffff', '#000000', canvas);
      canvas.toBlob(function (blob) {
        if (blob && navigator.clipboard && navigator.clipboard.write) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(function () {
            if (originalSpan) originalSpan.textContent = doneText;
            setTimeout(function () {
              if (originalSpan) originalSpan.textContent = originalText;
            }, 2000);
          }).catch(function (e) {
            console.warn('Clipboard write error:', e);
          });
        }
      });
    },

    toggleQRFullscreen: function (show) {
      var modal = document.getElementById('qr-fullscreen-modal');
      var target = document.getElementById('qr-fullscreen-target');
      if (!modal) return;
      if (show === undefined) show = modal.classList.contains('hidden');
      if (show) {
        if (_currentQRCode && target) {
          target.innerHTML = toSvgString(_currentQRCode, 2, '#ffffff', '#000000');
        }
        modal.classList.remove('hidden');
      } else {
        modal.classList.add('hidden');
      }
    },

    handleSmallFileCheck: function (file) {
      _lastFile = file;
      var alertBox = document.getElementById('small-file-alert');
      if (alertBox) {
        if (file.size <= 2500) {
          alertBox.classList.remove('hidden');
          var sizeSpan = alertBox.querySelector('.small-file-size');
          if (sizeSpan) sizeSpan.textContent = file.size;
        } else {
          alertBox.classList.add('hidden');
        }
      }
    },

    convertFileToQR: function () {
      if (!_lastFile) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var res = e.target.result;
        var content = '';
        try {
          content = new TextDecoder('utf-8', { fatal: true }).decode(res);
        } catch (_) {
          var bytes = new Uint8Array(res);
          var binary = '';
          for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          content = 'data:application/octet-stream;name=' + encodeURIComponent(_lastFile.name) + ';base64,' + btoa(binary);
        }
        var textarea = document.getElementById('qr-input-text');
        if (textarea) textarea.value = content;
        Main.switchTab('text');
        Main.onQRTextInput();
        var backBtn = document.getElementById('btn-back-to-cimbar');
        if (backBtn) backBtn.classList.remove('hidden');
      };
      reader.readAsArrayBuffer(_lastFile);
    },

    switchToCimbar: function () {
      Main.switchTab('file');
      var backBtn = document.getElementById('btn-back-to-cimbar');
      if (backBtn) backBtn.classList.add('hidden');
    },

    init: function (canvas) {
      if (!_ww) { // no webworker, use main thread
        console.log("main thread impl");
        Send.init_window(canvas);
        Main.setMode('B');
        Send.nextFrame();
        return;
      }
    },

    init_ww: function (canvas) {
      const urlParams = new URLSearchParams(window.location.search);
      const use_ww = urlParams.get('ww') || window.location.hash == "#ww=1";
      if (!use_ww || typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined') {
        return false;
      }
      console.log("ww impl");
      var offscreen = canvas.transferControlToOffscreen();
      _ww = new Worker('send-worker.js');
      _ww.onmessage = Report.handleWorkerMessage;
      _ww.onerror = function (err) {
        console.error('[send] Worker error: ', err);
      };
      _ww.postMessage({ fun: 'init_window', args: [offscreen] }, [offscreen]);
      return true;
    },

    on_ww_init: function (force_local) {
      console.log('on ww init ' + force_local);

      if (force_local) {
        _ww = undefined;
        // force refresh in main thread mode
        const cleanURL = window.location.origin + window.location.pathname;
        window.location.replace(cleanURL);
        return;
      }

      Main.setMode('B');
      _ww.postMessage({ fun: 'nextFrame', args: [] });
    },

    check_GL_enabled: function () {
      var testCanvas = document.createElement('canvas');
      if (!testCanvas.getContext("webgl2") && !testCanvas.getContext("webgl")) {
        var elem = document.getElementById('dragdrop');
        elem.classList.add("error");
      }
    },

    resize: function () {
      var canvas = document.getElementById('canvas');
      if (!canvas) return;
      var width = Math.max(280, window.innerWidth - 40);
      var height = Math.max(280, window.innerHeight - 150);
      Main.scaleCanvas(canvas, width, height);
      Main.checkNavButtonOverlap();
    },

    toggleFullscreen: function () {
      toggleFullscreen().then(Main.resize);
      Main.togglePause(true);
    },

    togglePause: function (pause) {
      if (_ww) {
        _ww.postMessage({ fun: 'togglePause', args: [pause] });
      }
      else {
        Send.togglePause(pause);
      }
    },

    scaleCanvas: function (canvas, width, height) {
      // using ratio from current config,
      // determine optimal dimensions and rotation
      var needRotate = _idealRatio > 1 && height > width;
      if (_ww) {
        _ww.postMessage({ fun: 'rotate_window', args: [needRotate] });
      }
      else {
        Send.rotate_window(needRotate);
      }

      var ourRatio = needRotate ? height / width : width / height;

      var xdim = needRotate ? height : width;
      var ydim = needRotate ? width : height;
      if (ourRatio > _idealRatio) {
        xdim = Math.floor(xdim * _idealRatio / ourRatio);
      }
      else if (ourRatio < _idealRatio) {
        ydim = Math.floor(ydim * ourRatio / _idealRatio);
      }

      console.log(xdim + "x" + ydim);
      if (needRotate) {
        canvas.style.width = ydim + "px";
        canvas.style.height = xdim + "px";
      }
      else {
        canvas.style.width = xdim + "px";
        canvas.style.height = ydim + "px";
      }
    },

    prevent_sleep: async function () {
      if (_wakeLock) {
        return;
      }
      const requestWakeLock = async () => {
        try {
          _wakeLock = await navigator.wakeLock.request('screen');
          console.log('got wake lock!');
          _wakeLock.addEventListener('release', () => {
            _wakeLock = undefined;
          });
        } catch (err) { }
      };
      requestWakeLock();
    },

    importFile: function (fblob) {
      Main.handleSmallFileCheck(fblob);
      if (!_ww) {
        Send.importFile(fblob);
        return;
      }

      _ww.postMessage({ fun: 'importFile', args: [fblob] });
    },

    dragDrop: function (event) {
      console.log("drag drop?");
      console.log(event);
      const files = event.dataTransfer.files;
      if (files && files.length === 1) {
        Main.importFile(files[0]);
      }
    },

    checkNavButtonOverlap: function () {
      var nav = document.getElementById("nav-button");
      var navBounds = nav.getBoundingClientRect();
      var canvas = document.getElementById('canvas').getBoundingClientRect();
      if (navBounds.right > canvas.left && navBounds.bottom > canvas.top) {
        nav.classList.add("hide");
      }
      else {
        nav.classList.remove("hide");
      }
    },

    clickNav: function () {
      document.getElementById("nav-button").focus();
    },

    blurNav: function (pause) {
      if (pause === undefined) {
        pause = true;
      }
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      Main.togglePause(pause);
    },

    clickFileInput: function () {
      document.getElementById("file_input").click();
    },

    fileInput: function (ev) {
      console.log("file input: " + ev);
      var file = document.getElementById('file_input').files[0];
      if (file) {
        Main.importFile(file);
      }
      Main.blurNav(false);
    },

    setAspectRatio: function (idealRatio) {
      _idealRatio = idealRatio;
      Main.resize();
    },

    setActive: function (active) {
      // hide cursor when there's a barcode active
      var invisi = document.getElementById("dragdrop");
      if (invisi) {
        invisi.classList.add("active");
        invisi.classList.add("hidden");
      }
      var canvas = document.getElementById("canvas");
      if (canvas) {
        canvas.classList.add("has-file");
        canvas.classList.add("active");
        document.body.classList.add('transmitting');
        window.scrollTo(0, 0);
        Main.resize();
      }
    },

    setMode: function (mode_str) {
      let modeVal = 68;
      if (mode_str == "4C") {
        modeVal = 4;
      }
      else if (mode_str == "Bu") {
        modeVal = 66;
      }
      else if (mode_str == "Bm") {
        modeVal = 67;
      }

      // will trigger setAspectRatio callback
      if (_ww) {
        _ww.postMessage({ fun: 'setMode', args: [modeVal] });
      }
      else {
        Send.setMode(modeVal);
      }

      var nav = document.getElementById("nav-container");
      if (modeVal == 4) {
        nav.classList.remove("mode-b");
        nav.classList.add("mode-4c");
        nav.classList.remove("mode-b");
        nav.classList.remove("mode-bm");
        nav.classList.remove("mode-bu");
      } else if (modeVal == 66) {
        nav.classList.add("mode-bu");
        nav.classList.remove("mode-b");
        nav.classList.remove("mode-bm");
        nav.classList.remove("mode-4c");
      } else if (modeVal == 67) {
        nav.classList.add("mode-bm");
        nav.classList.remove("mode-b");
        nav.classList.remove("mode-bu");
        nav.classList.remove("mode-4c");
      } else if (modeVal == 68) {
        nav.classList.add("mode-b");
        nav.classList.remove("mode-bm");
        nav.classList.remove("mode-bu");
        nav.classList.remove("mode-4c");
      } else {
        nav.classList.remove("mode-b");
        nav.classList.remove("mode-bm");
        nav.classList.remove("mode-bu");
        nav.classList.remove("mode-4c");
      }
    },

    setFPS: function (val) {
      if (!val) {
        return;
      }
      if (_ww) {
        _ww.postMessage({ fun: 'setFPS', args: [val] });
      }
      else {
        Send.setFPS(val);
      }
    },

    setHTML: function (id, msg) {
      var elem = document.getElementById(id);
      if (elem) elem.innerHTML = msg;
    },

    setTitle: function (msg) {
      document.title = "Cimbar: " + msg;
    }
  };
}();

window.addEventListener('keydown', function (e) {
  e = e || event;
  var target = e.target;
  var tag = (target && target.tagName ? target.tagName.toUpperCase() : '');
  if (tag === 'TEXTAREA' || tag === 'INPUT' || (target && target.isContentEditable)) {
    return;
  }
  if (e.target instanceof HTMLBodyElement) {
    if (e.key == 'Enter' || e.keyCode == 13 ||
      e.key == 'Tab' || e.keyCode == 9 ||
      e.key == 'Space' || e.keyCode == 32
    ) {
      Main.clickNav();
      e.preventDefault();
    }
    else if (e.key == 'Backspace' || e.keyCode == 8) {
      Main.togglePause(true);
      e.preventDefault();
    }
  }
  else {
    var navContainer = document.getElementById('nav-container') || document.getElementById('send-nav-container');
    var isNavOpen = navContainer && navContainer.classList.contains('open');

    if (e.key == 'Escape' || e.keyCode == 27 ||
      e.key == 'Backspace' || e.keyCode == 8 ||
      e.key == 'End' || e.keyCode == 35 ||
      e.key == 'Home' || e.keyCode == 36
    ) {
      Main.blurNav();
    }
    else if (e.key == 'Tab' || e.keyCode == 9 ||
      e.key == 'ArrowDown' || e.keyCode == 40
    ) {
      if (!isNavOpen) return;
      var nav = document.getElementById('nav-button') || document.getElementById('send-nav-button');
      var content = document.getElementById('nav-content') || document.getElementById('send-nav-content');
      var links = content ? content.getElementsByTagName('a') : [];
      if (nav && nav.classList.contains('attention')) {
        nav.classList.remove('attention');
        if (links[0]) links[0].classList.add('attention');
        return;
      }
      for (var i = 0; i < links.length; i++) {
        if (links[i].classList.contains('attention')) {
          var next = i + 1 == links.length ? nav : links[i + 1];
          links[i].classList.remove('attention');
          if (next) next.classList.add('attention');
          break;
        }
      }
    }
    else if (e.key == 'ArrowUp' || e.keyCode == 38) {
      if (!isNavOpen) return;
      var nav = document.getElementById('nav-button') || document.getElementById('send-nav-button');
      var content = document.getElementById('nav-content') || document.getElementById('send-nav-content');
      var links = content ? content.getElementsByTagName('a') : [];
      if (nav && nav.classList.contains('attention')) {
        nav.classList.remove('attention');
        if (links[links.length - 1]) links[links.length - 1].classList.add('attention');
        return;
      }

      for (var i = 0; i < links.length; i++) {
        if (links[i].classList.contains('attention')) {
          var next = i == 0 ? nav : links[i - 1];
          links[i].classList.remove('attention');
          if (next) next.classList.add('attention');
          break;
        }
      }
    }
    else if (e.key == 'Enter' || e.keyCode == 13 ||
      e.key == ' ' || e.keyCode == 32
    ) {
      if (!isNavOpen) return;
      var nav = document.getElementById('nav-button') || document.getElementById('send-nav-button');
      if (nav && nav.classList.contains('attention')) {
        Main.blurNav();
        return;
      }
      var content = document.getElementById('nav-content') || document.getElementById('send-nav-content');
      var links = content ? content.getElementsByTagName('a') : [];
      for (var i = 0; i < links.length; i++) {
        if (links[i].classList.contains('attention')) {
          links[i].click();
        }
      }
    }
  }
}, true);

window.addEventListener("touchstart", function (e) {
  e = e || event;
  Main.togglePause(true);
}, false);

window.addEventListener("touchend", function (e) {
  e = e || event;
  Main.togglePause(false);
}, false);

window.addEventListener("touchcancel", function (e) {
  e = e || event;
  Main.togglePause(false);
}, false);

window.addEventListener("dragover", function (e) {
  e = e || event;
  e.preventDefault();

  document.body.style["opacity"] = 0.5;
}, false);

window.addEventListener("dragleave", function (e) {
  e = e || event;
  e.preventDefault();

  document.body.style["opacity"] = 1.0;
}, false);

window.addEventListener("drop", function (e) {
  e = e || event;
  e.preventDefault();
  e.stopPropagation();
  Main.dragDrop(e);
  document.body.style["opacity"] = 1.0;
}, false);

window.addEventListener('resize', () => {
  Main.resize();
});
