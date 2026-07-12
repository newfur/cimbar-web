import os
import base64
import re
import json

WEB_DIR = 'web'
OUTPUT_FILE = 'cimbar_portable.html'

def read_file(filename):
    filepath = os.path.join(WEB_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def read_binary(filename):
    filepath = os.path.join(WEB_DIR, filename)
    with open(filepath, 'rb') as f:
        return f.read()

def main():
    print("Starting standalone single-file HTML packaging...")

    # 1. Read and base64-encode WebAssembly (embedded ONCE in the output)
    wasm_bytes = read_binary('cimbar_js.2026-05-09T0146.wasm')
    wasm_base64 = base64.b64encode(wasm_bytes).decode('utf-8')
    print(f"Loaded WASM binary, encoded size: {len(wasm_base64) / 1024 / 1024:.2f} MB")

    # 2. Read Core JS libraries
    qrcode_js = read_file('qrcode.min.js')
    zstd_js = read_file('zstd.2026-05-09T0146.js')
    cimbar_wrapper_js = read_file('cimbar_js.2026-05-09T0146.js')
    i18n_js = read_file('i18n.js')

    # 3. Compile Web Worker code (WITHOUT embedded WASM)
    worker_js_raw = read_file('recv-worker.2026-05-09T0146.js')
    # Strip the importScripts line
    worker_js_raw = re.sub(r"importScripts\(['\"].*?['\"]\);", "", worker_js_raw)
    
    # Strip the header block (let _wasmInitialized, let _buffs, and var Module) from worker_js_raw
    # to declare them properly at the top of the compiled file
    header_pattern = r"let _wasmInitialized\s*=\s*false;.*?let _buffs\s*=\s*\{\};.*?var Module\s*=\s*\{.*?onRuntimeInitialized:.*?\}\s*;"
    worker_js_raw = re.sub(header_pattern, "", worker_js_raw, flags=re.DOTALL)
    
    cimbar_wrapper_json = json.dumps(cimbar_wrapper_js)
    
    # Worker receives WASM binary + Emscripten code via postMessage (NO large blobs embedded)
    worker_js_compiled = f"""
    var _wasmInitialized = false;
    var _buffs = {{}};
    var Module;
    
    // Save the real frame-processing onmessage handler (set later by worker_js_raw)
    var _frameHandler = null;
    
    {worker_js_raw}
    
    // Capture the onmessage handler that worker_js_raw just set
    _frameHandler = self.onmessage;
    
    // Override with our init handler that waits for WASM binary + wrapper code
    self.onmessage = function(e) {{
      if (e.data && e.data.type === 'initWasm') {{
        // Set up Module with received WASM binary
        Module = {{
          preRun: [],
          onRuntimeInitialized: function() {{
            console.info("Worker WASM initialized via shared binary");
            _wasmInitialized = true;
            self.postMessage({{ type: 'startWasm', ready: "ready!" }});
            // Now install the real frame handler
            self.onmessage = _frameHandler;
          }},
          wasmBinary: new Uint8Array(e.data.buffer)
        }};
        // Execute the Emscripten wrapper code received from main thread
        (0, eval)(e.data.wrapperCode);
        return;
      }}
    }};
    """
    
    # Escape backticks inside the worker code for safe template literal inclusion
    worker_code_escaped = worker_js_compiled.replace('\\', '\\\\').replace('`', '\\`').replace('$', '\\$')

    # 4. Read main/recv JS files and rename conflicting drawer IDs
    main_js = read_file('main.2026-05-09T0146.js')
    main_js = main_js.replace('"nav-container"', '"send-nav-container"')
    main_js = main_js.replace('"nav-button"', '"send-nav-button"')
    main_js = main_js.replace('"nav-content"', '"send-nav-content"')
    main_js = main_js.replace('"current-file"', '"send-current-file"')
    main_js = main_js.replace('"nav-find-file-link"', '"send-nav-find-file-link"')

    recv_js = read_file('recv.2026-05-09T0146.js')
    recv_js = recv_js.replace('"nav-container"', '"recv-nav-container"')
    recv_js = recv_js.replace('"nav-button"', '"recv-nav-button"')
    recv_js = recv_js.replace('"nav-content"', '"recv-nav-content"')
    # Redirect worker creation to a Blob URL
    recv_js = recv_js.replace("new Worker('recv-worker.2026-05-09T0146.js')", "new Worker(window.CIMBAR_WORKER_URL)")

    # Inject postMessage to send WASM binary to each worker after creation
    # Replace the worker creation loop to send WASM binary + wrapper code to each worker
    recv_js = recv_js.replace(
        "_workers.push(new Worker(window.CIMBAR_WORKER_URL));",
        """var w = new Worker(window.CIMBAR_WORKER_URL);
        w.postMessage({ type: 'initWasm', buffer: window.CIMBAR_WASM_BINARY.buffer, wrapperCode: window.CIMBAR_WRAPPER_CODE }, [window.CIMBAR_WASM_BINARY.buffer.slice(0)]);
        _workers.push(w);"""
    )

    # Add continuous scanning and reset logic to Sink inside recv_js
    reset_js = """    resetDecoder: function () {
      _mode = _userMode;
      const currentMode = _mode || 68;
      const tempMode = currentMode === 4 ? 68 : 4;
      Module._cimbard_configure_decode(tempMode);
      Module._cimbard_configure_decode(currentMode);
      Sink.allocate();
      Recv.render_progress([]);
      
      // Reset Mode UI label to Auto / user selection
      var navContainer = document.getElementById("nav-container");
      var recvNavContainer = document.getElementById("recv-nav-container");
      var container = recvNavContainer || navContainer;
      if (container) {
        if (_userMode == 0) {
          container.classList.add("mode-auto");
          container.classList.remove("mode-b");
          var modeValEl = document.getElementById("mode-val");
          if (modeValEl) modeValEl.innerHTML = "Auto";
        }
      }
    },
    reassemble_file: function (id) {"""
    recv_js = recv_js.replace("reassemble_file: function (id) {", reset_js)

    decompress_reset_js = """Zstd.decompress(name, id);
        setTimeout(() => {
          Sink.resetDecoder();
          console.log("Decoder reset for continuous scanning.");
        }, 1500);"""
    recv_js = recv_js.replace("Zstd.decompress(name, id);", decompress_reset_js)

    # 5. Extract HTML templates and styles from index.html, send.html, recv.html
    index_html = read_file('index.html')
    send_html = read_file('send.html')
    recv_html = read_file('recv.html')

    # Extract CSS from style tags
    def extract_style(html_content):
        match = re.search(r'<style>(.*?)</style>', html_content, re.DOTALL)
        return match.group(1) if match else ""

    index_css = extract_style(index_html)
    send_css = extract_style(send_html)
    send_css = send_css.replace('#nav-container', '#send-nav-container')
    send_css = send_css.replace('#nav-button', '#send-nav-button')
    send_css = send_css.replace('#nav-content', '#send-nav-content')
    send_css = send_css.replace('#current-file', '#send-current-file')
    send_css = send_css.replace('#nav-find-file-link', '#send-nav-find-file-link')
    
    recv_css = extract_style(recv_html)
    recv_css = recv_css.replace('#nav-container', '#recv-nav-container')
    recv_css = recv_css.replace('#nav-button', '#recv-nav-button')
    recv_css = recv_css.replace('#nav-content', '#recv-nav-content')

    # Extract body content (excluding scripts)
    def extract_body_elements(html_content):
        match = re.search(r'<body>(.*?)</body>', html_content, re.DOTALL)
        if match:
            content = match.group(1).strip()
            # Strip out any script blocks
            content = re.sub(r'<script.*?>.*?</script>', '', content, flags=re.DOTALL)
            return content
        return ""

    index_body = extract_body_elements(index_html)
    
    send_body = extract_body_elements(send_html)
    send_body = send_body.replace('id="nav-container"', 'id="send-nav-container"')
    send_body = send_body.replace('id="nav-button"', 'id="send-nav-button"')
    send_body = send_body.replace('id="nav-content"', 'id="send-nav-content"')
    send_body = send_body.replace('id="current-file"', 'id="send-current-file"')
    send_body = send_body.replace('id="nav-find-file-link"', 'id="send-nav-find-file-link"')
    send_body = send_body.replace('Main.blurNav()', 'Main.blurNav()')
    send_body = send_body.replace('Main.clickNav()', 'Main.clickNav()')
    send_body = send_body.replace('Main.clickFileInput()', 'Main.clickFileInput()')
    send_body = send_body.replace('Main.fileInput(this)', 'Main.fileInput(this)')
    
    recv_body = extract_body_elements(recv_html)
    recv_body = recv_body.replace('id="nav-container"', 'id="recv-nav-container"')
    recv_body = recv_body.replace('id="nav-button"', 'id="recv-nav-button"')
    recv_body = recv_body.replace('id="nav-content"', 'id="recv-nav-content"')
    recv_body = recv_body.replace('Recv.blurNav()', 'Recv.blurNav()')
    recv_body = recv_body.replace('Recv.clickNav()', 'Recv.clickNav()')
    recv_body = recv_body.replace("Recv.setMode('Auto')", "Recv.setMode('Auto', true)")
    recv_body = recv_body.replace("Recv.setMode(this.textContent)", "Recv.setMode(this.textContent, true)")


    # 6. Generate the unified template HTML
    standalone_html = f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>CIMBAR 浏览器端无网文件传输工具 (单文件版)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <!-- Async font loading: non-blocking, uses system fonts as fallback until loaded -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet"></noscript>
  
  <style>
    /* Global view switcher styling */
    .view-container {{
      display: none;
      width: 100%;
      min-height: 100dvh;
    }}
    .view-container.active {{
      display: block;
    }}
    #view-send.active {{
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    #view-hub.active {{
      display: flex !important;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: max(2rem, env(safe-area-inset-top)) 1rem max(3rem, env(safe-area-inset-bottom)) 1rem;
    }}
    @media (min-width: 769px) {{
      #view-hub.active {{
        justify-content: center;
      }}
    }}
    
    /* Unified index/send/recv CSS sheets */
    {index_css}
    {send_css}
    {recv_css}
  </style>
</head>
<body>

  <!-- VIEW 1: Portal Hub Landing Page -->
  <div id="view-hub" class="view-container active">
    {index_body}
  </div>

  <!-- VIEW 2: File Transmitter (Sender) -->
  <div id="view-send" class="view-container">
    {send_body}
  </div>

  <!-- VIEW 3: File Receiver (Camera) -->
  <div id="view-recv" class="view-container">
    {recv_body}
  </div>

  <!-- Inlined qrcode.min.js -->
  <script type="text/javascript">
    {qrcode_js}
  </script>

  <!-- Inlined zstd.js -->
  <script type="text/javascript">
    {zstd_js}
  </script>

  <!-- WASM binary decoded ONCE and shared (main thread + workers) -->
  <script type="text/javascript">
    // Store the Emscripten wrapper code for sharing with workers
    window.CIMBAR_WRAPPER_CODE = {cimbar_wrapper_json};

    // Fast async base64 decode using browser-native fetch() data URL
    // ~5-10x faster than JS atob() + charCodeAt loop
    window.CIMBAR_WASM_READY = (async function() {{
      var response = await fetch('data:application/octet-stream;base64,{wasm_base64}');
      var buffer = await response.arrayBuffer();
      window.CIMBAR_WASM_BINARY = new Uint8Array(buffer);
      console.log("WASM binary decoded: " + (buffer.byteLength / 1024 / 1024).toFixed(2) + " MB");
      return window.CIMBAR_WASM_BINARY;
    }})();

    // Web Worker Blob URL (worker code does NOT contain WASM binary or Emscripten wrapper)
    const workerCode = `{worker_code_escaped}`;
    const workerBlob = new Blob([workerCode], {{ type: 'application/javascript' }});
    window.CIMBAR_WORKER_URL = URL.createObjectURL(workerBlob);
    console.log("Web Worker Blob URL initialized (lightweight, no embedded WASM).");
  </script>

  <!-- Main thread WASM initialization (async, non-blocking) -->
  <script type="text/javascript">
    var canvas = document.getElementById('canvas');
    var Module;
    
    // Wait for WASM binary to be decoded, then initialize main thread Module
    window.CIMBAR_WASM_READY.then(function(wasmBinary) {{
      Module = {{
        canvas: canvas,
        wasmBinary: wasmBinary.buffer,
        onRuntimeInitialized: () => {{
          console.log("Main thread WASM loaded.");
          Main.init(canvas);
          Main.nextFrame();
          Main.togglePause(true); // Start paused until entered
        }}
      }};
      
      // Dynamically execute the Emscripten wrapper (triggers WASM compilation)
      (0, eval)(window.CIMBAR_WRAPPER_CODE);
    }});
  </script>

  <!-- Inlined i18n Dictionary and Logic JS -->
  <script type="text/javascript">
    {i18n_js}
  </script>

  <!-- Inlined Main (Send) JS -->
  <script type="text/javascript">
    {main_js}
  </script>

  <!-- Inlined Recv JS -->
  <script type="text/javascript">
    {recv_js}
  </script>

  <!-- Router logic and event overrides -->
  <script type="text/javascript">
    // View routing controller
    function showView(viewId) {{
      console.log("Routing to view: " + viewId);
      
      // Control scrollability and height behavior dynamically to prevent browser chrome/notch overlaps
      if (viewId === 'hub') {{
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.documentElement.style.height = 'auto';
      }} else {{
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.height = '100dvh';
        document.documentElement.style.height = '100dvh';
      }}

      // Toggle view container visibility
      document.getElementById('view-hub').classList.remove('active');
      document.getElementById('view-send').classList.remove('active');
      document.getElementById('view-recv').classList.remove('active');
      
      document.getElementById('view-hub').style.display = 'none';
      document.getElementById('view-send').style.display = 'none';
      document.getElementById('view-recv').style.display = 'none';

      const targetView = document.getElementById('view-' + viewId);
      targetView.classList.add('active');
      
      if (viewId === 'send') {{
        targetView.style.display = 'flex';
      }} else {{
        targetView.style.display = 'block';
      }}

      // Pause or resume transmitter logic to save CPU
      if (viewId === 'send') {{
        if (typeof Main !== 'undefined') Main.togglePause(false);
      }} else {{
        if (typeof Main !== 'undefined') Main.togglePause(true);
      }}

      // Start/stop camera stream to free resources
      if (viewId === 'recv') {{
        var video = document.getElementById('video');
        if (typeof Recv !== 'undefined') {{
          if (!window.CIMBAR_WORKERS_INITIALIZED) {{
            Recv.init_ww(4);
            window.CIMBAR_WORKERS_INITIALIZED = true;
          }}
          Recv.init_video(video);
        }}
      }} else {{
        stopCamera();
      }}
    }}

    // Safe camera teardown helper
    function stopCamera() {{
      var video = document.getElementById('video');
      if (video && video.srcObject) {{
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
        console.log("Camera stream stopped.");
      }}
    }}


    // Override the buttons/links in Hub Portal to perform SPA routing
    document.addEventListener("DOMContentLoaded", () => {{
      const startSendBtn = document.querySelector('.card-send .btn');
      startSendBtn.href = "javascript:void(0)";
      startSendBtn.onclick = () => showView('send');

      const startRecvBtn = document.querySelector('.card-recv .btn');
      startRecvBtn.href = "javascript:void(0)";
      startRecvBtn.onclick = () => showView('recv');

      // Home/Hub buttons on sub-views
      const sendHomeBtn = document.querySelector('#view-send .btn-home');
      sendHomeBtn.href = "javascript:void(0)";
      sendHomeBtn.onclick = () => showView('hub');

      const recvHomeBtn = document.querySelector('#view-recv .btn-home');
      recvHomeBtn.href = "javascript:void(0)";
      recvHomeBtn.onclick = () => showView('hub');

      // Overwrite checkNavButtonOverlap to a no-op
      if (typeof Main !== 'undefined') {{
        Main.checkNavButtonOverlap = function() {{}};
      }}

      // Configure drag-drop overlays to work in SPA view
      const sendDragDrop = document.getElementById('dragdrop');
      const sendCurrentFile = document.getElementById('send-current-file');
      
      sendDragDrop.addEventListener('click', (e) => {{
        if (canvas.classList.contains('active')) return;
        Main.clickFileInput();
      }});

      // Observer to detect when file is loaded and transition views smoothly
      const observer = new MutationObserver(() => {{
        const fileName = sendCurrentFile.textContent;
        if (fileName && fileName !== 'No file selected' && fileName !== '未选择任何文件') {{
          document.querySelector('.dragdrop-content').classList.add('hidden');
          canvas.classList.add('active');
          
          sendDragDrop.style.border = 'none';
          sendDragDrop.style.background = 'transparent';
          sendDragDrop.style.padding = '0';
          sendDragDrop.style.boxShadow = 'none';
        }}
      }});
      observer.observe(sendCurrentFile, {{ childList: true, characterData: true, subtree: true }});

      // Override Main/Recv clickNav and blurNav to use .open class toggle
      if (typeof Main !== 'undefined') {{
        Main.blurNav = function(pause) {{
          document.getElementById("send-nav-container").classList.remove("open");
        }};
        Main.clickNav = function() {{
          document.getElementById("send-nav-container").classList.toggle("open");
        }};
      }}
      if (typeof Recv !== 'undefined') {{
        Recv.blurNav = function(pause) {{
          document.getElementById("recv-nav-container").classList.remove("open");
        }};
        Recv.clickNav = function() {{
          document.getElementById("recv-nav-container").classList.toggle("open");
        }};
        Recv.toggleDebugPanel = function() {{
          const debugPanel = document.getElementById('debug_menu');
          if (debugPanel) {{
            debugPanel.classList.toggle('visible');
          }}
          Recv.blurNav();
        }};
      }}

      // Auto-close drawer when setting option is clicked
      const sendLinks = document.getElementById('send-nav-content').getElementsByTagName('a');
      for (let link of sendLinks) {{
        if (link.id !== 'send-nav-find-file-link') {{
          link.addEventListener('click', () => {{
            setTimeout(() => Main.blurNav(), 100);
          }});
        }}
      }}
      const recvLinks = document.getElementById('recv-nav-content').getElementsByTagName('a');
      for (let link of recvLinks) {{
        link.addEventListener('click', () => {{
          setTimeout(() => Recv.blurNav(), 100);
        }});
      }}

      // Initialize view and overflow states on load
      showView('hub');
    }});
  </script>

</body>
</html>
"""

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(standalone_html)
    print(f"Stand-alone file successfully compiled to: {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
