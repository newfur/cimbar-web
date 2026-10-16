var Sink = function () {

  var _fountainBuff = undefined;
  var _errBuff = undefined;
  var _errBuffSize = 1024;

  function fountain_buff() {
    if (_fountainBuff.buffer !== Module.HEAPU8.buffer) {
      _fountainBuff = new Uint8Array(Module.HEAPU8.buffer, _fountainBuff.byteOffset, _fountainBuff.byteLength);
    }
    return _fountainBuff;
  }

  // public interface
  return {
    allocate: function () {
      const size = Module._cimbard_get_bufsize(); // max length of buff. We could also resize as we go...
      if (_fountainBuff && size > _fountainBuff.length) {
        Module._free(_fountainBuff.byteOffset);
        _fountainBuff = undefined;
      }
      if (_fountainBuff === undefined) {
        const dataPtr = Module._malloc(size);
        _fountainBuff = new Uint8Array(Module.HEAPU8.buffer, dataPtr, size);
      }
    },

    on_decode: function (buff) {
      if (buff.length == 0) { // sanity check
        return;
      }
      const fountBuff = fountain_buff();
      fountBuff.set(buff);

      console.log('sink decode ' + fountBuff); //TODO: base64?
      var res = Module._cimbard_fountain_decode(fountBuff.byteOffset, buff.length);
      console.log("on decode got res " + res);

      const report = Sink.get_report();
      if (Array.isArray(report)) {
        Recv.render_progress(report);
      }
      else {
        Recv.set_HTML("tdec", "decode " + res + ". " + report);
      }

      if (res > 0) {
        const res32t = Number(res & 0xFFFFFFFFn);; // truncate BigInt res (int64_t) to a uint32_t
        Sink.reassemble_file(res32t);
      }
    },

    get_report: function () {
      if (_errBuff === undefined) {
        _errBuff = Module._malloc(_errBuffSize);
      }
      const errlen = Module._cimbard_get_report(_errBuff, _errBuffSize);
      if (errlen > 0) {
        const errview = new Uint8Array(Module.HEAPU8.buffer, _errBuff, errlen);
        const td = new TextDecoder();
        const text = td.decode(errview);
        try {
          return JSON.parse(text);
        } catch (error) {
          return text;
        }
      }
    },

    reassemble_file: function (id) {
      const size = Module._cimbard_get_filesize(id);
      //alert("we did it!?! " + size);
      try {
        var name = id + "." + size;
        if (_errBuff === undefined) {
          _errBuff = Module._malloc(_errBuffSize);
        }
        const fnsize = Module._cimbard_get_filename(id, _errBuff, _errBuffSize);
        if (fnsize < 0) {
          alert("reassemble_file failed :(" + fnsize);
          console.log("we biffed it. :( " + fnsize);
          Recv.set_HTML("errorbox", "reassemble_file failed :( " + fnsize);
        }
        else if (fnsize > 0) {
          const temparr = new Uint8Array(Module.HEAPU8.buffer, _errBuff, fnsize);
          name = new TextDecoder("utf-8").decode(temparr);
        }
        Zstd.decompress(name, id);
      } catch (error) {
        console.log("failed finish copy or download?? " + error);
      }
    }
  };
}();


var Recv = function () {

  var _counter = 0;
  var _recentDecode = -1;
  var _recentExtract = -1;
  var _renderTime = 0;
  var _captureNextFrame = 0;

  var _watchmanEnabled = 0;
  var _watchmanLastSeen = 1; // start at 1, can't restart if we never started

  var _video = 0;
  var _workers = [];
  var _nextWorker = 0;
  var _workerReady;
  var _framesInFlight = 0;
  var _supportedFormats = ["NV12", "I420"]; // have cimbard_* return this somehow?

  var _mode = 0;
  var _userMode = 0;

  var _qrScanningEnabled = true;
  var _lastQRScanTime = 0;
  var _qrCooldownUntil = 0;
  var _qrModalOpen = false;
  var _qrScanningBusy = false;
  var _lastScannedQRText = null;
  var _barcodeDetector = null;
  var _qrCanvas = null;
  var _qrCtx = null;

  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      _barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch (e) {
      console.warn("BarcodeDetector init failed:", e);
    }
  }

  function _toggleFullscreen() {
    if (document.fullscreenElement) {
      return document.exitFullscreen();
    }
    else {
      return document.documentElement.requestFullscreen();
    }
  }

  function isIOS() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAppleDevice = navigator.userAgent.includes('Macintosh');
    const isTouchScreen = navigator.maxTouchPoints >= 1;
    return isIOS || (isAppleDevice && isTouchScreen);
  }

  function _getModeAspectRatio(mode) {
    // (image_size_x + 16) / (image_size_y + 16)
    switch (mode) {
      case 66: return 1.1516; // Bu
      case 67: return 1.413;  // Bm
      default: return 1.0;    // B, 4C, auto
    }
  }

  function _updateCrosshairPositions() {
    if (!_video || !_video.videoWidth || !_video.videoHeight)
      return;

    var modeAspect = _getModeAspectRatio(_mode);

    var container = document.getElementById("container");
    var windowW = container ? container.clientWidth : window.innerWidth;
    var windowH = container ? container.clientHeight : window.innerHeight;
    var camAspect = _video.videoWidth / _video.videoHeight;
    var windowAspect = windowW / windowH;

    var vidW = windowW;
    var vidH = windowH;
    if (camAspect > windowAspect)  // black bars top/bottom
      vidH = vidW / camAspect;
    else  // black bars left/right
      vidW = vidH * camAspect;

    var offsetY;
    var offsetX;
    if (windowH > windowW) {
      // portrait
      offsetY = (windowH - (vidW * modeAspect)) / 2;
      offsetX = (windowW - vidW) / 2;
    }
    else {
      offsetY = (windowH - vidH) / 2;
      offsetX = (windowW - (vidH * modeAspect)) / 2;
    }

    var logme = "crosshair offsets now " + offsetX + ", " + offsetY;
    //Recv.set_error(logme);
    console.log(logme);

    var xh1 = document.getElementById("crosshair1");
    var xh2 = document.getElementById("crosshair2");
    xh1.style.top = offsetY + "px";
    xh1.style.right = offsetX + "px";
    xh2.style.bottom = offsetY + "px";
    xh2.style.left = offsetX + "px";
  }

  // public interface
  return {
    init: function (video, num_workers) {
      Recv.init_ww(num_workers);
      Recv.init_video(video);
    },

    set_error: function (msg) {
      Recv.set_HTML('errorbox', msg);
      return false;
    },

    ww_ready: new Promise(resolve => {
      _workerReady = resolve;
    }),

    frames_in_flight_incr: function () {
      _framesInFlight += 1;
      document.getElementById('framesInFlight').innerHTML = _framesInFlight;
    },

    frames_in_flight_decr: function () {
      _framesInFlight -= 1;
      document.getElementById('framesInFlight').innerHTML = _framesInFlight;
    },

    init_ww: function (num_workers) {
      // clean up _workers if exists?
      _workers = [];
      for (let i = 0; i < num_workers; i++) {
        _workers.push(new Worker('recv-worker.js'));

        _workers[i].onmessage = (event) => {
          Recv.on_decode(i, event.data);
        };

        _workers[i].onerror = (error) => {
          console.error('Worker' + i + ' error:', error);
        };
      }
    },

    init_video: function (video) {
      _video = video;
      window.addEventListener('resize', _updateCrosshairPositions);

      // Optimal HD constraints requiring at least 720p resolution
      var constraints = {
        audio: false,
        video: {
          width: { min: 720, ideal: 1920 },
          height: { min: 720, ideal: 1080 },
          facingMode: 'environment',
          frameRate: { ideal: 15 }
        }
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return Recv.set_error('mediaDevices not supported? :(');
      }

      function handleStreamSuccess(localMediaStream) {
        //console.log(localMediaStream);
        //console.dir(video);
        if ('srcObject' in video) {
          video.srcObject = localMediaStream;
        } else {
          video.src = URL.createObjectURL(localMediaStream); //deprecated
        }
        video.play();
        video.requestVideoFrameCallback(Recv.on_frame);

        // Optimize focus constraints on active stream track
        const track = localMediaStream.getVideoTracks()[0];
        if (track) {
          setTimeout(() => {
            const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
            const advancedConstraints = {};
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              advancedConstraints.focusMode = 'continuous';
            }
            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
              advancedConstraints.exposureMode = 'continuous';
            }
            if (Object.keys(advancedConstraints).length > 0) {
              track.applyConstraints({ advanced: [advancedConstraints] })
                .then(() => console.log("Applied continuous camera constraints:", advancedConstraints))
                .catch(err => console.warn("Failed to apply continuous constraints:", err));
            }
          }, 500);

          // Manual Tap-to-Focus with visual feedback ring
          const container = document.getElementById('container');
          if (container) {
            if (container._focusListener) {
              container.removeEventListener('click', container._focusListener);
            }
            container._focusListener = function(event) {
              // Ignore clicks inside the settings nav panel to avoid unwanted focus rings
              const navContainer = document.getElementById('recv-nav-container') || document.getElementById('nav-container');
              if (navContainer && navContainer.contains(event.target)) {
                return;
              }

              const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};

              // 1. Create and animate focus feedback ring
              const ring = document.createElement('div');
              ring.className = 'focus-ring';
              ring.style.left = event.clientX + 'px';
              ring.style.top = event.clientY + 'px';
              container.appendChild(ring);
              setTimeout(() => ring.remove(), 800);

              // 2. Apply focus adjustment constraints
              const rect = video.getBoundingClientRect();
              const x = (event.clientX - rect.left) / rect.width;
              const y = (event.clientY - rect.top) / rect.height;

              if (capabilities.pointsOfInterest) {
                track.applyConstraints({
                  advanced: [{
                    pointsOfInterest: [{ x: x, y: y }],
                    focusMode: 'single-shot'
                  }]
                }).catch(err => console.warn("Point focus failed:", err));
              } else if (capabilities.focusMode && capabilities.focusMode.includes('single-shot')) {
                track.applyConstraints({
                  advanced: [{ focusMode: 'single-shot' }]
                }).then(() => {
                  setTimeout(() => {
                    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                      track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
                        .catch(err => console.warn("Failed to restore continuous focus:", err));
                    }
                  }, 2000);
                }).catch(err => console.warn("Focus sweep failed:", err));
              }
            };
            container.addEventListener('click', container._focusListener);
          }
        }
      }

      navigator.mediaDevices.getUserMedia(constraints)
        .then(handleStreamSuccess)
        .catch(err => {
          console.warn("First getUserMedia request failed, retrying with fallback constraints...", err);
          var fallbackConstraints = {
            audio: false,
            video: {
              facingMode: 'environment',
              frameRate: { ideal: 15 }
            }
          };
          return navigator.mediaDevices.getUserMedia(fallbackConstraints)
            .then(handleStreamSuccess)
            .catch(fallbackErr => {
              console.error(`OH NO!!!!`, fallbackErr);
              Recv.set_error("Failed to initialize camera. " + fallbackErr);
              Recv.set_HTML("crosshair1", "Failed to initialize camera. " + fallbackErr);
            });
        });
    },

    watch_for_camera_pause: function () {
      // only call this after our first success
      if (_watchmanEnabled) {
        return;
      }
      _watchmanEnabled = true;

      // ios only for now, since desktop behavior is weird
      if (!isIOS()) {
        return;
      }

      // periodically make sure the camera capture is running
      setInterval(Recv.restart_paused_camera, 1000);
    },

    restart_paused_camera: function () {
      if (!_video) {
        return;
      }

      // if we're still incrementing, do nothing
      if (_counter > _watchmanLastSeen) {
        _watchmanLastSeen = _counter;
        return;
      }

      // if not, we're stuck?
      Recv.init_video(_video);
    },

    download_bytes: function (buff, name) {
      var blob = new Blob([buff], { type: 'application/octet-stream' });
      Zstd.download_blob(name, blob);
    },

    on_decode: function (wid, data) {
      //console.log('Main thread received message from worker' + wid + ':', data);
      Recv.frames_in_flight_decr();
      // if extract but no bytes, log extract counte
      if (data.nodata) {
        _recentExtract = _counter;
        return;
      }
      if (data.failed_extract) { // very common, nothing to do
        return;
      }
      if (data.res) {
        Recv.set_HTML("t" + wid, "msg is " + data.res);
        return;
      }
      if (data.ready) {
        if (_workerReady)
          _workerReady();
        return;
      }

      // should be a decode with some bytes, so set decodecounter
      _recentDecode = _counter;

      const buff = data.buff;
      if (buff.length > 0) {
        Recv.setMode(data.mode); // call *before* we send it to the sink. This is our autodetect confirm.
      }
      Recv.set_HTML("t" + wid, "mode is " + _mode + ", len() is " + buff.length + ", buff: " + buff);
      Sink.on_decode(buff);
    },

    on_frame: function (now, metadata) {
      //console.log("on frame");
      // https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame

      _counter += 1;
      if (_workers.length == 0)
        return;
      if (_nextWorker >= _workers.length)
        _nextWorker = 0;

      // piggyback off this call to make sure our visual state is correct
      Recv.update_visual_state();
      // make sure the camera feed stays up
      Recv.watch_for_camera_pause();
      // Check for static QR codes
      Recv.check_qr_frame(now);

      const modeVals = [66, 68, 67, 4];

      var vf = undefined;
      if (_framesInFlight > 20) {
        console.log("stalling, worker queues are full");
      }
      else {
        Recv.frames_in_flight_incr();
        try {
          vf = new VideoFrame(_video, { timestamp: now });
          const width = vf.displayWidth;
          const height = vf.displayHeight;
          Recv.set_HTML("errorbox", vf.format, true);

          // try to use the default format, but only if we can decode it...
          let vfparams = {};
          if (!_supportedFormats.includes(vf.format)) {
            vfparams.format = "RGBA";
          }
          const size = vf.allocationSize(vfparams);
          const buff = new Uint8Array(size);
          vf.copyTo(buff, vfparams);

          let format = vfparams.format || vf.format;
          if (format == "RGBA" && size != width * height * 4) {
            format = vf.format; //fallback
          }
          if (_captureNextFrame == 1) {
            _captureNextFrame = 0;
            Recv.download_bytes(buff, width + "x" + height + "x" + _counter + "." + format);
          }

          let mode = _mode || modeVals[_counter % modeVals.length];
          _workers[_nextWorker].postMessage({ type: 'proc', pixels: buff, format: format, width: width, height: height, mode: mode }, [buff.buffer]);
        } catch (e) {
          console.log(e);
        }
        _nextWorker += 1;
      }
      if (vf)
        vf.close();

      // schedule the next one
      _video.requestVideoFrameCallback(Recv.on_frame);
    },

    captureFrame: function () {
      _captureNextFrame = 1;
      alert("about to capture!");
    },

    download_bytes: function (buff, name) {
      var blob = new Blob([buff], { type: 'application/octet-stream' });
      Zstd.download_blob(name, blob);
    },

    update_visual_state: function () {
      _updateCrosshairPositions();

      // check counters
      var xh1 = document.getElementById("crosshair1");
      var xh2 = document.getElementById("crosshair2");
      if (_recentDecode > 0 && _recentDecode + 30 > _counter) {
        xh1.classList.add("active_xhairs");
        xh1.classList.remove("scanning_xhairs");
        xh2.classList.add("active_xhairs");
        xh1.classList.remove("scanning_xhairs");
      }
      else if (_recentExtract > 0 && _recentExtract + 30 > _counter) {
        xh1.classList.add("scanning_xhairs");
        xh1.classList.remove("active_xhairs");
        xh2.classList.add("scanning_xhairs");
        xh2.classList.remove("active_xhairs");
      }
      else { // inactive
        xh1.classList.remove("active_xhairs");
        xh1.classList.remove("scanning_xhairs");
        xh2.classList.remove("active_xhairs");
        xh2.classList.remove("scanning_xhairs");
      }
    },

    render_progress: function (report) {
      console.log("progress!!!!" + report);
      Recv.set_HTML("tdec", "progress " + report);
      const progress_container = document.getElementById('progress_bars');
      const query = '#progress_bars > div[class="progress"]';
      const prev = document.querySelectorAll(query);

      if (!prev || prev.length < report.length) {
        for (var i = (prev ? prev.length : 0); i < report.length; i++) {
          var aaa = document.createElement('div');
          aaa.classList.add("progress");
          progress_container.appendChild(aaa);
        }
      }
      else if (report.length < prev.length) {
        for (var i = report.length; i < prev.length; i++) {
          prev[i].remove();
        }
      }

      const current = document.querySelectorAll(query);
      if (current) {
        console.log(current.length);
      }
      for (var i = 0; i < report.length; i++) {
        console.log(report[i] * 100 + "%");
        current[i].style.width = report[i] * 100 + "%";
      }
    },

    toggleFullscreen: function () {
      _toggleFullscreen();
    },

    showDebug: function () {
      document.getElementById("debug-button").focus();
    },

    clickNav: function () {
      document.getElementById("nav-button").focus();
    },

    blurNav: function (pause) {
      if (pause === undefined) {
        pause = true;
      }
      document.getElementById("nav-button").blur();
      document.getElementById("nav-content").blur();
    },

    setMode: function (modeVal, isUserClick) {
      // these should be moved elsewhere...
      const modeToString = {
        4: "4C",
        8: "8C",
        66: "Bu",
        67: "Bm",
        68: "B"
      };
      let modeStringToVal = {
        "Auto": 0
      };
      for (const val in modeToString) {
        modeStringToVal[modeToString[val]] = val;
      }

      if (modeVal in modeStringToVal) {
        modeVal = modeStringToVal[modeVal];
      }

      if (isUserClick) {
        _userMode = modeVal;
        _mode = modeVal;
        if (_mode > 0) {
          Module._cimbard_configure_decode(_mode);
          Sink.allocate();
        }

        var nav = document.getElementById("nav-container");
        var recvNav = document.getElementById("recv-nav-container");
        var container = recvNav || nav;
        if (container) {
          if (_mode == 0) {
            container.classList.add("mode-auto");
            container.classList.remove("mode-b");
            var modeValEl = document.getElementById("mode-val");
            if (modeValEl) modeValEl.innerHTML = "Auto";
          } else {
            container.classList.add("mode-b");
            container.classList.remove("mode-auto");
            var modeValEl = document.getElementById("mode-val");
            if (modeValEl) modeValEl.innerHTML = modeToString[_mode];
          }
        }
      } else {
        // Worker auto-detected a mode
        if (_userMode == 0) {
          // Lock to the detected mode for the duration of this file transfer
          _mode = modeVal;
          if (_mode > 0) {
            Module._cimbard_configure_decode(_mode);
            Sink.allocate();
            var modeValEl = document.getElementById("mode-val");
            if (modeValEl) modeValEl.innerHTML = modeToString[_mode] || _mode;
          }
        }
      }
    },

    check_qr_frame: function (now) {
      if (!_qrScanningEnabled || _qrModalOpen || !_video || _video.readyState < 2) {
        return;
      }
      if (now - _lastQRScanTime < 250 || now < _qrCooldownUntil) {
        return;
      }
      _lastQRScanTime = now;
      Recv.scan_qr_code();
    },

    scan_qr_code: async function () {
      if (!_video || _video.readyState < 2 || _qrScanningBusy) return;
      _qrScanningBusy = true;

      try {
        let resultText = null;

        if (_barcodeDetector) {
          try {
            const barcodes = await _barcodeDetector.detect(_video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              resultText = barcodes[0].rawValue;
            }
          } catch (e) { }
        }

        if (!resultText && typeof jsQR !== 'undefined') {
          if (!_qrCanvas) {
            _qrCanvas = document.createElement('canvas');
            _qrCtx = _qrCanvas.getContext('2d', { willReadFrequently: true });
          }
          const vw = _video.videoWidth || 640;
          const vh = _video.videoHeight || 480;
          const targetW = Math.min(vw, 480);
          const targetH = Math.round(targetW * (vh / vw));

          if (_qrCanvas.width !== targetW || _qrCanvas.height !== targetH) {
            _qrCanvas.width = targetW;
            _qrCanvas.height = targetH;
          }

          _qrCtx.drawImage(_video, 0, 0, targetW, targetH);
          const imgData = _qrCtx.getImageData(0, 0, targetW, targetH);
          const code = jsQR(imgData.data, targetW, targetH, {
            inversionAttempts: "dontInvert"
          });
          if (code && code.data) {
            resultText = code.data;
          }
        }

        if (resultText && resultText.trim().length > 0) {
          Recv.on_qr_detected(resultText);
        }
      } catch (err) {
        console.warn("QR scan error:", err);
      } finally {
        _qrScanningBusy = false;
      }
    },

    on_qr_detected: function (text) {
      if (_qrModalOpen) return;
      _qrModalOpen = true;
      _lastScannedQRText = text;

      try {
        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      } catch (_) { }

      var xh1 = document.getElementById("crosshair1");
      var xh2 = document.getElementById("crosshair2");
      if (xh1 && xh2) {
        xh1.classList.add("active_xhairs");
        xh2.classList.add("active_xhairs");
      }

      var modal = document.getElementById('qr-result-modal');
      var contentBox = document.getElementById('qr-result-text');
      var typeBadge = document.getElementById('qr-result-type');
      var openBtn = document.getElementById('qr-btn-open');
      var downloadBtn = document.getElementById('qr-btn-download');
      var copySpan = document.getElementById('qr-copy-text-span');

      if (contentBox) {
        contentBox.textContent = text;
        contentBox.scrollTop = 0;
      }
      if (copySpan) {
        var copyDefault = (window.I18n && window.I18n.t) ? window.I18n.t('recv_qr_copy_text') : '复制内容';
        copySpan.textContent = copyDefault;
      }

      var isUrl = /^https?:\/\//i.test(text.trim());
      var isDataUrl = /^data:[^;]+;base64,/i.test(text.trim());

      if (isUrl) {
        if (typeBadge) typeBadge.textContent = 'URL / 网址';
        if (openBtn) openBtn.classList.remove('hidden');
        if (downloadBtn) downloadBtn.classList.add('hidden');
      } else if (isDataUrl) {
        if (typeBadge) typeBadge.textContent = '文件 / 数据';
        if (openBtn) openBtn.classList.add('hidden');
        if (downloadBtn) downloadBtn.classList.remove('hidden');
      } else {
        if (typeBadge) typeBadge.textContent = '文本 (' + text.length + ' 字符)';
        if (openBtn) openBtn.classList.add('hidden');
        if (downloadBtn) downloadBtn.classList.add('hidden');
      }

      if (modal) modal.classList.remove('hidden');
    },

    closeQRModal: function () {
      _qrModalOpen = false;
      _qrCooldownUntil = performance.now() + 1500;
      var modal = document.getElementById('qr-result-modal');
      if (modal) modal.classList.add('hidden');
    },

    openQRUrl: function () {
      if (!_lastScannedQRText) return;
      var url = _lastScannedQRText.trim();
      if (/^https?:\/\//i.test(url)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },

    copyQRText: function () {
      if (!_lastScannedQRText) return;
      var text = _lastScannedQRText;
      var copySpan = document.getElementById('qr-copy-text-span');
      var doneMsg = (window.I18n && window.I18n.t) ? window.I18n.t('recv_qr_copied') : '已复制！';
      var defaultMsg = (window.I18n && window.I18n.t) ? window.I18n.t('recv_qr_copy_text') : '复制内容';

      function showSuccess() {
        if (copySpan) {
          copySpan.textContent = doneMsg;
          clearTimeout(Recv._copyFeedbackTimer);
          Recv._copyFeedbackTimer = setTimeout(function () {
            if (copySpan) copySpan.textContent = defaultMsg;
          }, 2500);
        }
      }

      function execCommandFallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '-9999px';
        ta.style.width = '2em';
        ta.style.height = '2em';
        ta.style.padding = '0';
        ta.style.border = 'none';
        ta.style.outline = 'none';
        ta.style.boxShadow = 'none';
        ta.style.background = 'transparent';
        ta.style.fontSize = '16px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);

        var isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isIOS) {
          ta.focus();
          ta.setSelectionRange(0, text.length);
          try {
            var range = document.createRange();
            range.selectNodeContents(ta);
            var sel = window.getSelection();
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(range);
            }
            ta.setSelectionRange(0, 999999);
          } catch (_) { }
        } else {
          ta.select();
        }

        var copied = false;
        try {
          copied = document.execCommand('copy');
        } catch (err) {
          console.warn("execCommand copy error:", err);
        }

        if (isIOS) {
          try {
            var sel2 = window.getSelection();
            if (sel2) sel2.removeAllRanges();
          } catch (_) { }
        }
        document.body.removeChild(ta);

        // Tertiary fallback: Select directly from visible modal text container
        if (!copied) {
          var contentEl = document.getElementById('qr-result-text');
          if (contentEl) {
            try {
              var r = document.createRange();
              r.selectNodeContents(contentEl);
              var s = window.getSelection();
              if (s) {
                s.removeAllRanges();
                s.addRange(r);
                copied = document.execCommand('copy');
                s.removeAllRanges();
              }
            } catch (_) { }
          }
        }

        if (copied) {
          showSuccess();
        }
      }

      // Try Clipboard API first if in secure context
      if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showSuccess();
        }).catch(function () {
          execCommandFallback();
        });
      } else {
        execCommandFallback();
      }
    },

    downloadQRFile: function () {
      if (!_lastScannedQRText) return;
      var text = _lastScannedQRText.trim();
      if (/^data:[^;]+;base64,/i.test(text)) {
        var a = document.createElement('a');
        a.href = text;
        var nameMatch = text.match(/name=([^;]+)/);
        var filename = nameMatch ? decodeURIComponent(nameMatch[1]) : 'scanned_file.bin';
        a.download = filename;
        a.click();
      }
    },

    toggleQRScanning: function (enabled) {
      if (enabled === undefined) _qrScanningEnabled = !_qrScanningEnabled;
      else _qrScanningEnabled = !!enabled;
      return _qrScanningEnabled;
    },

    set_HTML: function (id, msg, only_if_unset) {
      const elem = document.getElementById(id);
      if (only_if_unset && elem.innerHTML) {
        return;
      }
      elem.innerHTML = msg;
    },

    set_title: function (msg) {
      document.title = "Cimbar: " + msg;
    }
  };
}();
