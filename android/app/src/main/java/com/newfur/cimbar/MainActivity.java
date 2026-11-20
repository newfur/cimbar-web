package com.newfur.cimbar;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "CimbarApp";
    private static final int CAMERA_PERMISSION_CODE = 1001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1002;

    private WebView webView;
    private ValueCallback<Uri[]> fileUploadCallback;
    private PermissionRequest pendingCameraPermissionRequest;
    private long lastBackPressTime = 0;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen awake while transmitting or scanning codes
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        webView = new WebView(this);
        setContentView(webView);

        WebView.setWebContentsDebuggingEnabled(true);

        setupWebView();
        checkAndRequestCameraPermission();
    }

    private void checkAndRequestCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA},
                    CAMERA_PERMISSION_CODE);
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Append custom app identifier to user agent
        String customUa = settings.getUserAgentString() + " CimbarApp/1.1.1";
        settings.setUserAgentString(customUa);

        // Setup WebViewAssetLoader for secure origin (https://appassets.androidplatform.net/)
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClientCompat() {
            @Nullable
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String path = url.getPath();

                // Explicitly provide correct MIME type for WebAssembly files
                if (path != null && path.endsWith(".wasm")) {
                    try {
                        String assetPath = path.startsWith("/assets/") ? path.substring(8) : path;
                        InputStream is = getAssets().open(assetPath);
                        return new WebResourceResponse("application/wasm", "UTF-8", is);
                    } catch (IOException e) {
                        Log.e(TAG, "Failed to load wasm asset: " + path, e);
                    }
                }

                return assetLoader.shouldInterceptRequest(url);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                Log.d(TAG, "[Console] " + consoleMessage.message() + " (" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + ")");
                return true;
            }

            // Handle camera permission requested by WebRTC / getUserMedia
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                                    == PackageManager.PERMISSION_GRANTED) {
                                request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                            } else {
                                pendingCameraPermissionRequest = request;
                                ActivityCompat.requestPermissions(MainActivity.this,
                                        new String[]{Manifest.permission.CAMERA},
                                        CAMERA_PERMISSION_CODE);
                            }
                            return;
                        }
                    }
                    request.grant(request.getResources());
                });
            }

            // Handle file input / dragdrop picker
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                            FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (Exception e) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (ActivityNotFoundException e) {
                    fileUploadCallback = null;
                    Toast.makeText(MainActivity.this, "未找到系统文件选择器", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        // Add JavaScript bridge for file saving from Blob / Download
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        // Download listener for intercepting blob / data downloads
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimetype, long contentLength) {
                if (url.startsWith("blob:") || url.startsWith("data:")) {
                    fetchBlobAndSave(url, contentDisposition, mimetype);
                }
            }
        });

        // Load entry page
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
    }

    private void fetchBlobAndSave(String blobUrl, String contentDisposition, String mimeType) {
        String filename = "downloaded_file";
        if (contentDisposition != null && contentDisposition.contains("filename=")) {
            String[] parts = contentDisposition.split("filename=");
            if (parts.length > 1) {
                filename = parts[1].replace("\"", "").trim();
            }
        }

        // Execute JS to convert blob to Base64 and pass to AndroidBridge
        String js = "(function() {" +
                "  var xhr = new XMLHttpRequest();" +
                "  xhr.open('GET', '" + blobUrl + "', true);" +
                "  xhr.responseType = 'blob';" +
                "  xhr.onload = function() {" +
                "    var reader = new FileReader();" +
                "    reader.readAsDataURL(xhr.response);" +
                "    reader.onloadend = function() {" +
                "      window.AndroidBridge.saveBase64File(reader.result, '" + filename + "', '" + mimeType + "');" +
                "    };" +
                "  };" +
                "  xhr.send();" +
                "})();";

        webView.evaluateJavascript(js, null);
    }

    public class AndroidBridge {
        @JavascriptInterface
        public void saveBase64File(String base64Data, String filename, String mimeType) {
            new Thread(() -> {
                try {
                    if (base64Data == null || !base64Data.contains(",")) return;
                    String pureBase64 = base64Data.substring(base64Data.indexOf(",") + 1);
                    byte[] fileBytes = Base64.decode(pureBase64, Base64.DEFAULT);

                    saveBytesToDownloads(fileBytes, filename, mimeType);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to save file: " + filename, e);
                    showToast(getString(R.string.file_save_failed_toast, e.getMessage()));
                }
            }).start();
        }
    }

    private void saveBytesToDownloads(byte[] data, String filename, String mimeType) throws IOException {
        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = "application/octet-stream";
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri != null) {
                try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                    if (os != null) {
                        os.write(data);
                        os.flush();
                        showToast(getString(R.string.file_saved_toast, filename));
                        return;
                    }
                }
            }
            throw new IOException("Failed to create download entry in MediaStore");
        } else {
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs();
            }
            File dest = new File(downloadsDir, filename);
            try (FileOutputStream fos = new FileOutputStream(dest)) {
                fos.write(data);
                fos.flush();
            }
            showToast(getString(R.string.file_saved_toast, filename));
        }
    }

    private void showToast(final String message) {
        new Handler(Looper.getMainLooper()).post(() ->
                Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show());
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingCameraPermissionRequest != null) {
                    pendingCameraPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    pendingCameraPermissionRequest = null;
                }
            } else {
                if (pendingCameraPermissionRequest != null) {
                    pendingCameraPermissionRequest.deny();
                    pendingCameraPermissionRequest = null;
                }
                Toast.makeText(this, R.string.camera_permission_required, Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        long now = System.currentTimeMillis();
        if (now - lastBackPressTime < 2000) {
            super.onBackPressed();
        } else {
            lastBackPressTime = now;
            Toast.makeText(this, R.string.press_again_to_exit, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
