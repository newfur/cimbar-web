var Sink = function () {

  var _fountainBuff = undefined;
  var _errBuff = undefined;
  var _errBuffSize = 1024;
  var _isReassembling = false;
  var _lastReassembledId = null;

  function fountain_buff() {
    if (!_fountainBuff) {
      Sink.allocate();
    } else if (_fountainBuff.buffer !== Module.HEAPU8.buffer) {
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

      //console.log('sink decode ' + fountBuff); //TODO: base64?
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
        // truncate BigInt res (int64_t) to a uint32_t safely
        const res32t = (typeof res === 'bigint') ? Number(res & BigInt(0xFFFFFFFF)) : (res >>> 0);
        if (!_isReassembling && _lastReassembledId !== res32t) {
          _isReassembling = true;
          _lastReassembledId = res32t;
          Sink.reassemble_file(res32t);
        }
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
          console.log("reassemble_file failed. :( " + fnsize);
          Recv.set_HTML("errorbox", "reassemble_file failed :( " + fnsize);
        }
        else if (fnsize > 0) {
          const temparr = new Uint8Array(Module.HEAPU8.buffer, _errBuff, fnsize);
          name = new TextDecoder("utf-8").decode(temparr);
        }
        Zstd.decompress(name, id);
      } catch (error) {
        _isReassembling = false;
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

  var _watchmanTimer = undefined;
  var _watchmanLastSeen = 1; // start at 1, can't restart if we never started
  var _vfcId = undefined;

  var _video = undefined;
  var _cameraAcquiring = false;
  var _availableCameras = [];
  var _currentCameraIndex = 0;
  var _currentDeviceId = undefined;
  var _workers = [];
  var _nextWorker = 0;
  var _workerReady;
  var _framesInFlight = 0;
  var _useVideoFrame = true;
  var _supportedFormats = ["NV12", "I420"]; // have cimbard_* return this somehow?

  var _currentZoom = 1.0;
  var _hasHardwareZoom = false;
  var _currentExposure = 0; // 0, -1, -2
  var _hasHardwareExposure = false;

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

  // Initialize BarcodeDetector for native fast QR decoding if supported
  if ('BarcodeDetector' in window) {
    try {
      _barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch (e) {
      _barcodeDetector = null;
    }
  }

  function _requestVideoFrame(callback) {
    if (_video && 'requestVideoFrameCallback' in _video) {
      _vfcId = _video.requestVideoFrameCallback(callback);
    }
  }

  function _cancelVideoFrameCallback() {
    if (_vfcId && _video && 'cancelVideoFrameCallback' in _video) {
      try {
        _video.cancelVideoFrameCallback(_vfcId);
      } catch (e) {}
      _vfcId = undefined;
    }
  }

  function isIOS() {
    return [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
      // iPad on iOS 13 detection
      || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  }

  function _toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function _updateCrosshairPositions() {
    // try to make the crosshairs square
    const rect = _video.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dim = Math.min(w, h);
    const offsetX = (w - dim) / 2;
    const offsetY = (h - dim) / 2;

    var xh1 = document.getElementById("crosshair1");
    var xh2 = document.getElementById("crosshair2");
    if (xh1 && xh2) {
      xh1.style.top = offsetY + "px";
      xh1.style.right = offsetX + "px";
      xh2.style.bottom = offsetY + "px";
      xh2.style.left = offsetX + "px";
    }
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
      if (!num_workers) {
        const hcon = (typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number')
          ? navigator.hardwareConcurrency : 0;
        const desiredWorkers = (hcon / 2) + 1;
        num_workers = Math.max(3, Math.min(desiredWorkers, 6)); // clamp[3,6]
      }

      // clean up _workers if exists
      for (const wkr of _workers) {
        try {
          wkr.terminate();
        } catch (e) { }
      }
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
      if (video) {
        video.addEventListener('loadedmetadata', _updateCrosshairPositions);
      }

      // If camera is already actively running on this video element, do not re-request!
      if (_video && _video.srcObject && _video.srcObject.active) {
        console.log("Camera is already active, reusing existing stream.");
        return;
      }

      // If a camera permission/acquisition request is currently in flight, do NOT send a duplicate request!
      if (_cameraAcquiring) {
        console.log("Camera acquisition already in flight, ignoring duplicate request.");
        return;
      }
      _cameraAcquiring = true;

      // Clean up previous stream and frame callbacks
      Recv.stop_video();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        _cameraAcquiring = false;
        return Recv.set_error('mediaDevices not supported? :(');
      }

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // On desktop, target maximum resolution (up to 4K: 3840x2160) so the browser automatically negotiates
      // the highest resolution mode supported by the hardware without overconstraining.
      // On mobile, clamp to 1080p @ 15-30fps to avoid excessive GPU/thermal load.
      const videoConstraints = isMobile ? {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: { ideal: 'environment' },
        frameRate: { ideal: 15 }
      } : {
        width: { ideal: 3840 },
        height: { ideal: 2160 },
        frameRate: { ideal: 30 }
      };

      if (_currentDeviceId) {
        videoConstraints.deviceId = { exact: _currentDeviceId };
      }

      var constraints = {
        audio: false,
        video: videoConstraints
      };

      function handleStreamSuccess(localMediaStream) {
        _cameraAcquiring = false;
        if ('srcObject' in video) {
          video.srcObject = localMediaStream;
        } else {
          video.src = URL.createObjectURL(localMediaStream); //deprecated
        }
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.play().catch(e => console.warn('video.play() rejected:', e));
        setTimeout(_updateCrosshairPositions, 100);
        _requestVideoFrame(Recv.on_frame);

        // Optimize focus and sharpness constraints on active stream track
        const track = localMediaStream.getVideoTracks()[0];
        if (track) {
          const settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
          const w = settings.width || video.videoWidth;
          const h = settings.height || video.videoHeight;
          const fps = Math.round(settings.frameRate || 30);
          const camLabel = track.label || "Camera";
          console.log(`Camera stream acquired: ${w}x${h} @ ${fps}fps (${camLabel})`);
          Recv.set_HTML("tdec", `${w}x${h} (${fps}fps)`);

          if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
              _availableCameras = devices.filter(d => d.kind === 'videoinput');
              const switchEl = document.getElementById('cam-switch-item') || document.getElementById('recv-cam-switch-item');
              if (switchEl) {
                if (_availableCameras.length > 1) {
                  switchEl.classList.remove('hidden');
                } else {
                  switchEl.classList.add('hidden');
                }
              }
            }).catch(e => console.warn('enumerateDevices error:', e));
          }

          setTimeout(() => {
            const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
            _hasHardwareZoom = Boolean(capabilities.zoom);
            _hasHardwareExposure = Boolean(capabilities.exposureCompensation);
            console.log(`Camera capabilities: hardwareZoom=${_hasHardwareZoom}, hardwareExposure=${_hasHardwareExposure}`);

            const advancedConstraints = {};
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              advancedConstraints.focusMode = 'continuous';
            }
            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
              advancedConstraints.exposureMode = 'continuous';
            }
            if (capabilities.sharpness && capabilities.sharpness.max) {
              advancedConstraints.sharpness = capabilities.sharpness.max;
            }
            if (_hasHardwareZoom && _currentZoom > 1.0 && capabilities.zoom) {
              advancedConstraints.zoom = Math.min(capabilities.zoom.max, Math.max(capabilities.zoom.min, _currentZoom));
            }
            if (_hasHardwareExposure && _currentExposure !== 0 && capabilities.exposureCompensation) {
              advancedConstraints.exposureCompensation = Math.max(
                capabilities.exposureCompensation.min,
                Math.min(capabilities.exposureCompensation.max, _currentExposure)
              );
            }
            if (Object.keys(advancedConstraints).length > 0) {
              track.applyConstraints({ advanced: [advancedConstraints] })
                .then(() => console.log("Applied continuous camera constraints:", advancedConstraints))
                .catch(err => console.warn("Failed to apply continuous constraints:", err));
            }

            Recv.update_hud_ui();
          }, 500);

          // Manual Tap-to-Focus with visual feedback ring
          const container = document.getElementById('container');
          if (container) {
            if (container._focusListener) {
              container.removeEventListener('click', container._focusListener);
            }
            container._focusListener = function(event) {
              const navContainer = document.getElementById('recv-nav-container') || document.getElementById('nav-container');
              if (navContainer && navContainer.contains(event.target)) {
                return;
              }

              const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};

              const ring = document.createElement('div');
              ring.className = 'focus-ring';
              ring.style.left = event.clientX + 'px';
              ring.style.top = event.clientY + 'px';
              container.appendChild(ring);
              setTimeout(() => ring.remove(), 800);

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
          _cameraAcquiring = false;
          console.warn("getUserMedia failed:", err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            Recv.set_error("Camera permission denied. Please allow camera access in browser settings.");
            Recv.set_HTML("crosshair1", "Camera permission denied.");
          } else {
            Recv.set_error("Failed to initialize camera: " + (err.message || err.name));
            Recv.set_HTML("crosshair1", "Failed to initialize camera: " + (err.name || err));
          }
        });
    },

    stop_video: function () {
      _cameraAcquiring = false;
      _cancelVideoFrameCallback();
      if (_video && _video.srcObject) {
        try {
          _video.srcObject.getTracks().forEach(track => track.stop());
        } catch (e) {}
        _video.srcObject = null;
      }
      if (_video && _video.src) {
        try {
          URL.revokeObjectURL(_video.src);
        } catch (e) {}
        _video.src = "";
      }
      if (_watchmanTimer > 0) {
        clearInterval(_watchmanTimer);
        _watchmanTimer = 0;
      }
    },

    watch_for_camera_pause: function () {
      if (_watchmanTimer) {
        return;
      }
      if (!isIOS()) {
        return;
      }
      _watchmanTimer = setInterval(Recv.restart_paused_camera, 1500);
    },

    restart_paused_camera: function () {
      if (!_video) {
        return;
      }

      if (_counter > _watchmanLastSeen) {
        _watchmanLastSeen = _counter;
        return;
      }

      Recv.init_video(_video);
    },

    download_bytes: function (buff, name) {
      var blob = new Blob([buff], { type: 'application/octet-stream' });
      Zstd.download_blob(name, blob);
    },

    on_decode: function (wid, data) {
      if (data.type == 'startWasm') {
        if (data.ready && _workerReady) {
          _workerReady();
        }
        return;
      }

      Recv.frames_in_flight_decr();
      if (data.nodata) {
        _recentExtract = _counter;
        return;
      }
      if (data.failed_extract) {
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
      if (data.error) {
        console.log("on_decode error: " + data.error);
        return;
      }

      _recentDecode = _counter;

      const buff = data.buff;
      if (buff && buff.length > 0) {
        Recv.setMode(data.mode);
        Recv.set_HTML("t" + wid, "mode is " + _mode + ", len() is " + buff.length + ", buff: " + buff);
        Sink.on_decode(buff);
      }
    },

    on_frame_vf: async function (now) {
      let vf = undefined;
      try {
        let vfOptions = { timestamp: now };
        // If no hardware zoom and software zoom > 1.0, crop center region via visibleRect
        if (!_hasHardwareZoom && _currentZoom > 1.0 && _video.videoWidth > 0) {
          const vw = _video.videoWidth;
          const vh = _video.videoHeight;
          const cropW = Math.round(vw / _currentZoom);
          const cropH = Math.round(vh / _currentZoom);
          const cropX = Math.round((vw - cropW) / 2);
          const cropY = Math.round((vh - cropH) / 2);
          vfOptions.visibleRect = { x: cropX, y: cropY, width: cropW, height: cropH };
        }
        try {
          vf = new VideoFrame(_video, vfOptions);
        } catch (_) {
          vf = new VideoFrame(_video, { timestamp: now });
        }
      } catch (e) {
        console.log("no VideoFrame support, falling back to ImageBitmap");
        return undefined;
      }

      try {
        const width = vf.displayWidth;
        const height = vf.displayHeight;
        Recv.set_HTML("errorbox", vf.format, true);

        let vfparams = {};
        if (!_supportedFormats.includes(vf.format)) {
          vfparams.format = "RGBA";
        }
        const size = vf.allocationSize(vfparams);
        const buff = new Uint8Array(size);
        await vf.copyTo(buff, vfparams);

        let format = vfparams.format || vf.format;
        if (format == "RGBA" && size != width * height * 4) {
          format = vf.format;
        }

        if (_captureNextFrame == 1) {
          _captureNextFrame = 0;
          Recv.download_bytes(buff, width + "x" + height + "x" + _counter + "." + format);
        }

        return {
          type: 'proc',
          pixels: buff,
          format: format,
          width: width,
          height: height,
          exposure: _currentExposure,
          softwareExposure: !_hasHardwareExposure
        };
      } catch (e) {
        console.error("on_frame_vf error:", e);
        return { type: 'fail' };
      } finally {
        vf.close();
      }
    },

    on_frame: async function (now, metadata) {
      _counter += 1;
      if (_workers.length == 0)
        return;
      if (_nextWorker >= _workers.length)
        _nextWorker = 0;

      Recv.update_visual_state();
      Recv.watch_for_camera_pause();
      Recv.check_qr_frame(now);

      const modeVals = [67, 68, 66, 129, 4];

      if (_framesInFlight > 30) {
        _requestVideoFrame(Recv.on_frame);
        return;
      }

      let mode = _mode || modeVals[_counter % modeVals.length];
      let bitmap = undefined;
      let workerMsg = undefined;

      if (_useVideoFrame) {
        workerMsg = await Recv.on_frame_vf(now);
        if (!workerMsg) {
          _useVideoFrame = false;
        } else if (workerMsg.type == "fail") {
          workerMsg = undefined;
        } else {
          workerMsg.mode = mode;
        }
      }

      if (!_useVideoFrame && _video && _video.videoWidth > 0 && _video.videoHeight > 0) {
        try {
          let width = _video.videoWidth;
          let height = _video.videoHeight;
          if (!_hasHardwareZoom && _currentZoom > 1.0) {
            const cropW = Math.round(width / _currentZoom);
            const cropH = Math.round(height / _currentZoom);
            const cropX = Math.round((width - cropW) / 2);
            const cropY = Math.round((height - cropH) / 2);
            bitmap = await createImageBitmap(_video, cropX, cropY, cropW, cropH);
            width = cropW;
            height = cropH;
          } else {
            bitmap = await createImageBitmap(_video);
          }
          workerMsg = {
            type: 'proc',
            bitmap: bitmap,
            format: "RGBA",
            width: width,
            height: height,
            mode: mode,
            exposure: _currentExposure,
            softwareExposure: !_hasHardwareExposure
          };
        } catch (e) {
          console.warn("createImageBitmap fallback error:", e);
        }
      }

      if (!workerMsg) {
        _requestVideoFrame(Recv.on_frame);
        return;
      }

      Recv.frames_in_flight_incr();
      try {
        if (workerMsg.pixels) {
          _workers[_nextWorker].postMessage(workerMsg, [workerMsg.pixels.buffer]);
        } else if (bitmap) {
          _workers[_nextWorker].postMessage(workerMsg, [bitmap]);
        }
        _nextWorker += 1;
      } catch (e) {
        Recv.frames_in_flight_decr();
        if (bitmap) {
          try { bitmap.close(); } catch (_) {}
        }
        console.error("postMessage to worker failed:", e);
      }

      _requestVideoFrame(Recv.on_frame);
    },

    captureFrame: function () {
      _captureNextFrame = 1;
      alert("about to capture!");
    },

    update_visual_state: function () {
      var xh1 = document.getElementById("crosshair1");
      var xh2 = document.getElementById("crosshair2");
      if (_recentDecode > 0 && _recentDecode + 30 > _counter) {
        xh1.classList.add("active_xhairs");
        xh1.classList.remove("scanning_xhairs");
        xh2.classList.add("active_xhairs");
        xh2.classList.remove("scanning_xhairs");
      }
      else if (_recentExtract > 0 && _recentExtract + 30 > _counter) {
        xh1.classList.add("scanning_xhairs");
        xh1.classList.remove("active_xhairs");
        xh2.classList.add("scanning_xhairs");
        xh2.classList.remove("active_xhairs");
      }
      else {
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
      const modeToString = {
        0: "Auto",
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
        modeStringToVal[modeToString[val]] = parseInt(val, 10);
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
        Recv.update_mode_ui(_userMode == 0 ? "Auto" : (modeToString[_mode] || "Auto"));
      } else {
        if (_userMode == 0) {
          _mode = modeVal;
          if (_mode > 0) {
            Module._cimbard_configure_decode(_mode);
            Sink.allocate();
            var modeValEl = document.getElementById("mode-val");
            if (modeValEl) modeValEl.innerHTML = modeToString[_mode] || _mode;
            Recv.update_mode_ui(modeToString[_mode] || "Auto");
          }
        }
      }
    },

    update_mode_ui: function (modeStr) {
      const summaryEl = document.getElementById('hud-summary-mode');
      if (summaryEl) {
        summaryEl.textContent = modeStr;
      }
      const hudButtons = document.querySelectorAll('#hud-mode-capsules .hud-btn');
      hudButtons.forEach(btn => {
        if (btn.getAttribute('data-mode') === modeStr) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      const drawerButtons = document.querySelectorAll('#drawer-mode-grid a');
      drawerButtons.forEach(btn => {
        if (btn.getAttribute('data-mode') === modeStr) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    },

    toggleMobilePill: function (group, event) {
      if (event) {
        event.stopPropagation();
      }
      const pop = document.getElementById('hud-popover-' + group);
      const btn = document.getElementById('hud-summary-btn-' + group);
      if (!pop) return;
      const wasOpen = pop.classList.contains('open');
      Recv.closeMobilePills();
      if (!wasOpen) {
        pop.classList.add('open');
        if (btn) btn.classList.add('active');
      }
    },

    closeMobilePills: function () {
      document.querySelectorAll('.hud-popover.open').forEach(el => el.classList.remove('open'));
      document.querySelectorAll('.hud-summary-btn.active').forEach(el => el.classList.remove('active'));
    },

    check_qr_frame: function (now) {
      if (!_qrScanningEnabled || _qrModalOpen || !_video || _video.readyState < 2) {
        return;
      }
      // If user explicitly selected a Cimbar dynamic mode (Bu, Bm, B, 4C), do not check static QR
      if (_userMode !== 0) {
        return;
      }
      // If Cimbar is currently decoding dynamic barcodes or receiving packets, suppress QR scanning
      if (_recentDecode > 0 && (_counter - _recentDecode < 90)) {
        return;
      }
      // If file reassembly or fountain decode is in progress, suppress QR scanning
      if (typeof _isReassembling !== 'undefined' && _isReassembling) {
        return;
      }
      // Throttle QR checking to 750ms (avoid frequent GPU texture locks / interruptions)
      if (now - _lastQRScanTime < 750 || now < _qrCooldownUntil) {
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

        // Use native hardware BarcodeDetector if available
        if (_barcodeDetector) {
          try {
            const barcodes = await _barcodeDetector.detect(_video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              resultText = barcodes[0].rawValue;
            }
          } catch (e) {
            _barcodeDetector = null; // fallback to jsQR if BarcodeDetector fails
          }
        } else if (typeof jsQR !== 'undefined') {
          // Fallback to jsQR ONLY when BarcodeDetector is not available
          if (!_qrCanvas) {
            _qrCanvas = document.createElement('canvas');
            _qrCtx = _qrCanvas.getContext('2d', { willReadFrequently: true });
          }
          const vw = _video.videoWidth || 640;
          const vh = _video.videoHeight || 480;
          const targetW = Math.min(vw, 400);
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

    toggleQRMode: function () {
      _qrScanningEnabled = !_qrScanningEnabled;
      const icon = document.getElementById('menu-qr-toggle-icon');
      if (icon) {
        icon.textContent = _qrScanningEnabled ? '✅' : '⬜';
      }
      return _qrScanningEnabled;
    },

    switchCamera: function () {
      if (_availableCameras.length <= 1) {
        return;
      }
      _currentCameraIndex = (_currentCameraIndex + 1) % _availableCameras.length;
      _currentDeviceId = _availableCameras[_currentCameraIndex].deviceId;
      console.log("Switching camera to:", _availableCameras[_currentCameraIndex].label || _currentDeviceId);
      Recv.stop_video();
      Recv.init_video(_video);
      Recv.blurNav();
    },

    setZoom: function (level) {
      _currentZoom = parseFloat(level) || 1.0;
      Recv.update_hud_ui();

      const track = (_video && _video.srcObject) ? _video.srcObject.getVideoTracks()[0] : null;
      if (track && _hasHardwareZoom) {
        const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
        if (capabilities.zoom) {
          const target = Math.min(capabilities.zoom.max, Math.max(capabilities.zoom.min, _currentZoom));
          track.applyConstraints({ advanced: [{ zoom: target }] })
            .catch(e => console.warn("apply zoom failed:", e));
        }
      }

      if (_video) {
        _video.style.transform = (!_hasHardwareZoom && _currentZoom > 1.0) ? `scale(${_currentZoom})` : 'none';
      }
    },

    setExposure: function (ev) {
      _currentExposure = parseInt(ev, 10) || 0;
      Recv.update_hud_ui();

      const track = (_video && _video.srcObject) ? _video.srcObject.getVideoTracks()[0] : null;
      if (track && _hasHardwareExposure) {
        const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
        if (capabilities.exposureCompensation) {
          const minExp = capabilities.exposureCompensation.min;
          const maxExp = capabilities.exposureCompensation.max;
          const target = Math.max(minExp, Math.min(maxExp, _currentExposure));
          track.applyConstraints({ advanced: [{ exposureCompensation: target }] })
            .catch(e => console.warn("apply exposureCompensation failed:", e));
        }
      }

      if (_video) {
        if (_currentExposure === -1) {
          _video.style.filter = "brightness(0.8) contrast(1.15)";
        } else if (_currentExposure === -2) {
          _video.style.filter = "brightness(0.65) contrast(1.3)";
        } else {
          _video.style.filter = "none";
        }
      }
    },

    update_hud_ui: function () {
      const summaryZoom = document.getElementById('hud-summary-zoom');
      if (summaryZoom) {
        summaryZoom.textContent = _currentZoom + 'x';
      }
      const summaryExp = document.getElementById('hud-summary-exp');
      if (summaryExp) {
        summaryExp.textContent = (_currentExposure === 0) ? '0.0' : (_currentExposure === -1 ? '-1.0' : '-2.0');
      }
      document.querySelectorAll('[data-zoom]').forEach(el => {
        const z = parseFloat(el.getAttribute('data-zoom'));
        if (Math.abs(z - _currentZoom) < 0.05) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      document.querySelectorAll('[data-exp]').forEach(el => {
        const exp = parseInt(el.getAttribute('data-exp'), 10);
        if (exp === _currentExposure) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
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
