package top.uclimax.tcgtoolws

import android.app.DownloadManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

/**
 * Android Native Bridge exposed to WebView.
 * Handles file saving (MediaStore) and clipboard operations (FileProvider) without frontend changes.
 */
class AndroidBridge(private val context: Context, private val webView: WebView) {
  init {
    cleanupOldUpdates()
  }

  companion object {
    const val TAG = "TCGToolWS_NativeBridge"
    const val BRIDGE_NAME = "__AndroidNativeBridge__"
    const val SYNC_CHANNEL_ID = "card_image_sync_channel"
    const val SYNC_NOTIFICATION_ID = 2001

    /**
     * Polyfill script injected into WebView to intercept downloads and image copying.
     */
    const val INJECTION_SCRIPT = """
(function() {
    if (window.__TCGTOOLWS_NATIVE_HOOKED__) return;
    window.__TCGTOOLWS_NATIVE_HOOKED__ = true;

    // 1. Safe Blob Cache to defend against immediate URL.revokeObjectURL calls
    var blobMap = new Map();
    var origCreateObjectURL = URL.createObjectURL;
    var origRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = function(blob) {
        var url = origCreateObjectURL.call(URL, blob);
        if (blob instanceof Blob) {
            blobMap.set(url, blob);
            setTimeout(function() {
                blobMap.delete(url);
            }, 60000);
        }
        return url;
    };

    URL.revokeObjectURL = function(url) {
        setTimeout(function() {
            blobMap.delete(url);
            try {
                origRevokeObjectURL.call(URL, url);
            } catch (e) {}
        }, 30000);
    };

    function readBlobAsBase64(blob) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() {
                if (typeof reader.result === 'string') {
                    var idx = reader.result.indexOf(',');
                    resolve(idx >= 0 ? reader.result.substring(idx + 1) : reader.result);
                } else {
                    reject(new Error('Failed to read blob as Base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function resolveBlob(url) {
        if (blobMap.has(url)) {
            return blobMap.get(url);
        }
        if (url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) {
            try {
                var response = await fetch(url);
                return await response.blob();
            } catch (e) {
                console.warn('[NativeBridge] fetch failed for URL:', url, e);
            }
        }
        return null;
    }

    // 2. Intercept HTMLAnchorElement.prototype.click
    var origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
        var href = this.href || '';
        var hasDownloadAttr = this.hasAttribute('download');
        var downloadAttr = this.getAttribute('download') || this.download;

        if (window.__AndroidNativeBridge__ && (hasDownloadAttr || href.indexOf('blob:') === 0 || href.indexOf('data:') === 0)) {
            var filename = downloadAttr || '';
            if (!filename) {
                if (href.indexOf('data:image/png') === 0) filename = 'image.png';
                else if (href.indexOf('data:application/pdf') === 0) filename = 'document.pdf';
                else filename = 'download';
            }

            resolveBlob(href).then(async function(blob) {
                if (blob) {
                    var mime = blob.type || (filename.endsWith('.pdf') ? 'application/pdf' : 'image/png');
                    var base64 = await readBlobAsBase64(blob);
                    window.__AndroidNativeBridge__.saveBase64File(base64, filename, mime);
                } else if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0) {
                    window.__AndroidNativeBridge__.downloadUrl(href, filename);
                }
            }).catch(function(err) {
                console.error('[NativeBridge] Download interception error:', err);
            });

            return;
        }

        return origAnchorClick.apply(this, arguments);
    };

    // 3. Intercept navigator.clipboard.write
    if (navigator.clipboard) {
        var origClipboardWrite = navigator.clipboard.write ? navigator.clipboard.write.bind(navigator.clipboard) : null;

        navigator.clipboard.write = async function(items) {
            if (!window.__AndroidNativeBridge__) {
                if (origClipboardWrite) return origClipboardWrite(items);
                throw new Error('Clipboard API unavailable');
            }

            var imageItemHandled = false;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item && item.types) {
                    var imgType = item.types.find(function(t) { return t.indexOf('image/') === 0; });
                    if (imgType) {
                        try {
                            var blob = await item.getType(imgType);
                            var base64 = await readBlobAsBase64(blob);
                            window.__AndroidNativeBridge__.copyImageToClipboard(base64, imgType);
                            imageItemHandled = true;
                            break;
                        } catch (err) {
                            console.error('[NativeBridge] Clipboard item extraction error:', err);
                        }
                    }
                }
            }

            if (imageItemHandled) {
                return Promise.resolve();
            }

            if (origClipboardWrite) {
                return origClipboardWrite(items);
            }
            return Promise.resolve();
        };
    }
})();
"""
  }

  /**
   * Save a base64 encoded file into Android public directories (Pictures or Downloads) via MediaStore.
   */
  @JavascriptInterface
  fun saveBase64File(
    base64Data: String,
    fileName: String,
    mimeType: String,
  ) {
    Thread {
      try {
        val cleanFileName = sanitizeFileName(fileName)
        val isImage =
          mimeType.startsWith("image/", ignoreCase = true) ||
            cleanFileName.endsWith(".png", ignoreCase = true) ||
            cleanFileName.endsWith(".jpg", ignoreCase = true) ||
            cleanFileName.endsWith(".jpeg", ignoreCase = true) ||
            cleanFileName.endsWith(".webp", ignoreCase = true)

        val effectiveMime =
          when {
            mimeType.isNotBlank() && mimeType != "application/octet-stream" -> mimeType
            cleanFileName.endsWith(".pdf", ignoreCase = true) -> "application/pdf"
            cleanFileName.endsWith(".png", ignoreCase = true) -> "image/png"
            cleanFileName.endsWith(".jpg", ignoreCase = true) ||
              cleanFileName.endsWith(
                ".jpeg",
                ignoreCase = true,
              )
            -> "image/jpeg"

            cleanFileName.endsWith(".webp", ignoreCase = true) -> "image/webp"
            else -> if (isImage) "image/png" else "application/octet-stream"
          }

        val bytes = Base64.decode(base64Data, Base64.DEFAULT)

        if (isImage) {
          saveImageToMediaStore(cleanFileName, effectiveMime, bytes)
          showToast("已保存图片至相册: $cleanFileName")
        } else {
          saveDownloadToMediaStore(cleanFileName, effectiveMime, bytes)
          showToast("已保存文件至下载目录: $cleanFileName")
        }
      } catch (e: Exception) {
        Log.e(TAG, "Error saving base64 file: $fileName", e)
        showToast("保存失败: ${e.localizedMessage ?: "未知错误"}")
      }
    }.start()
  }

  /**
   * Copy an image to the Android system clipboard via FileProvider and ClipData.
   */
  @JavascriptInterface
  fun copyImageToClipboard(
    base64Data: String,
    mimeType: String,
  ) {
    Thread {
      try {
        val bytes = Base64.decode(base64Data, Base64.DEFAULT)
        val cacheDir = File(context.cacheDir, "clipboard_images").apply { mkdirs() }
        cacheDir.listFiles()?.forEach { it.delete() }

        val ext =
          when {
            mimeType.contains("jpeg") || mimeType.contains("jpg") -> ".jpg"
            mimeType.contains("webp") -> ".webp"
            else -> ".png"
          }
        val imageFile = File(cacheDir, "copied_image$ext")
        FileOutputStream(imageFile).use { it.write(bytes) }

        val contentUri =
          FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            imageFile,
          )

        Handler(Looper.getMainLooper()).post {
          try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newUri(context.contentResolver, "Image", contentUri)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(context, "图片已成功复制到剪贴板", Toast.LENGTH_SHORT).show()
          } catch (e: Exception) {
            Log.e(TAG, "Failed to set clipboard clip", e)
            Toast.makeText(context, "复制到剪贴板失败: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
          }
        }
      } catch (e: Exception) {
        Log.e(TAG, "Error copying image to clipboard", e)
        showToast("复制失败: ${e.localizedMessage ?: "未知错误"}")
      }
    }.start()
  }

  /**
   * Directly download and install an APK file from URL in background without JS memory buffering.
   */
  @JavascriptInterface
  fun downloadAndInstallApk(apkUrl: String) {
    Thread {
      try {
        val cacheDir = File(context.cacheDir, "updates").apply { mkdirs() }
        val apkFile = File(cacheDir, "tcgtoolws_update.apk")
        var currentUrl = apkUrl
        var redirects = 0
        var conn: java.net.HttpURLConnection

        while (true) {
          val url = java.net.URL(currentUrl)
          conn = url.openConnection() as java.net.HttpURLConnection
          conn.connectTimeout = 15000
          conn.readTimeout = 30000
          conn.instanceFollowRedirects = true
          conn.setRequestProperty("User-Agent", "TCGToolWS-Client")
          conn.connect()

          val status = conn.responseCode
          if (status in listOf(301, 302, 303, 307, 308) && redirects < 5) {
            val newLocation = conn.getHeaderField("Location")
            if (!newLocation.isNullOrBlank()) {
              currentUrl = newLocation
              redirects++
              conn.disconnect()
              continue
            }
          }
          if (status !in 200..299) {
            throw Exception("HTTP $status")
          }
          break
        }

        val totalLength = conn.contentLength.toLong()
        var downloaded = 0L
        var lastEmitTime = 0L

        conn.inputStream.use { input ->
          FileOutputStream(apkFile).use { output ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (input.read(buffer).also { bytesRead = it } != -1) {
              output.write(buffer, 0, bytesRead)
              downloaded += bytesRead
              val now = System.currentTimeMillis()
              if (now - lastEmitTime >= 100 || downloaded == totalLength) {
                val progress = if (totalLength > 0) (downloaded.toDouble() / totalLength.toDouble()) * 100.0 else 0.0
                val js =
                  "window.dispatchEvent(new CustomEvent('android-update-progress', " +
                    "{ detail: { progress: $progress, downloaded: $downloaded, total: $totalLength } }));"
                Handler(Looper.getMainLooper()).post {
                  webView.evaluateJavascript(js, null)
                }
                lastEmitTime = now
              }
            }
          }
        }

        // Check unknown source install permission for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          if (!context.packageManager.canRequestPackageInstalls()) {
            val settingsIntent =
              Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
              }
            context.startActivity(settingsIntent)
            showToast("请先允许安装未知应用")
            Handler(Looper.getMainLooper()).post {
              webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('android-update-error', { detail: { error: '请在系统设置中允许安装来自此来源的应用，然后重试' } }));",
                null,
              )
            }
            return@Thread
          }
        }

        val contentUri =
          FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apkFile,
          )

        val intent =
          Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(contentUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
          }

        Handler(Looper.getMainLooper()).post {
          try {
            context.startActivity(intent)
            webView.evaluateJavascript(
              "window.dispatchEvent(new CustomEvent('android-update-installing'));",
              null,
            )
          } catch (e: Exception) {
            Log.e(TAG, "Failed to launch package installer", e)
            val escaped = (e.localizedMessage ?: "唤起安装器失败").replace("'", "\\'")
            showToast("唤起安装器失败: ${e.localizedMessage}")
            webView.evaluateJavascript(
              "window.dispatchEvent(new CustomEvent('android-update-error', { detail: { error: '$escaped' } }));",
              null,
            )
          }
        }
      } catch (e: Exception) {
        Log.e(TAG, "Error downloading APK", e)
        val escaped = (e.localizedMessage ?: "下载安装包失败").replace("'", "\\'")
        showToast("下载安装包失败: ${e.localizedMessage ?: "未知错误"}")
        Handler(Looper.getMainLooper()).post {
          webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('android-update-error', { detail: { error: '$escaped' } }));",
            null,
          )
        }
      }
    }.start()
  }

  /**
   * Fallback for standard HTTP/HTTPS file downloads.
   */
  @JavascriptInterface
  fun downloadUrl(
    url: String,
    fileName: String,
  ) {
    handleDownloadListener(url, null, "attachment; filename=\"$fileName\"", null)
  }

  /**
   * Handles WebView download listener requests for normal network links.
   */
  fun handleDownloadListener(
    url: String,
    userAgent: String?,
    contentDisposition: String?,
    mimetype: String?,
  ) {
    try {
      if (url.startsWith("http://", ignoreCase = true) || url.startsWith("https://", ignoreCase = true)) {
        val request =
          DownloadManager.Request(Uri.parse(url)).apply {
            if (!mimetype.isNullOrBlank()) setMimeType(mimetype)
            if (!userAgent.isNullOrBlank()) addRequestHeader("User-Agent", userAgent)
            val rawFileName = URLUtil.guessFileName(url, contentDisposition, mimetype)
            val cleanFileName = sanitizeFileName(rawFileName)
            setDescription("正在下载 $cleanFileName")
            setTitle(cleanFileName)
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "U-CLIMAX/$cleanFileName")
          }
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        dm.enqueue(request)
        showToast("开始下载文件...")
      }
    } catch (e: Exception) {
      Log.e(TAG, "DownloadManager failed", e)
      showToast("下载启动失败: ${e.localizedMessage}")
    }
  }

  private fun saveImageToMediaStore(
    fileName: String,
    mimeType: String,
    bytes: ByteArray,
  ) {
    val resolver = context.contentResolver
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val contentValues =
        ContentValues().apply {
          put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
          put(MediaStore.Images.Media.MIME_TYPE, mimeType)
          put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + File.separator + "U-CLIMAX")
          put(MediaStore.Images.Media.IS_PENDING, 1)
        }
      val uri =
        resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
          ?: throw IllegalStateException("无法创建相册媒体条目")
      resolver.openOutputStream(uri)?.use { it.write(bytes) }
        ?: throw IllegalStateException("无法打开输出流写入图片")
      contentValues.clear()
      contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
      resolver.update(uri, contentValues, null, null)
    } else {
      val picturesDir =
        File(
          Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
          "U-CLIMAX",
        ).apply { mkdirs() }
      val file = File(picturesDir, fileName)
      FileOutputStream(file).use { it.write(bytes) }
      MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
    }
  }

  private fun saveDownloadToMediaStore(
    fileName: String,
    mimeType: String,
    bytes: ByteArray,
  ) {
    val resolver = context.contentResolver
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val contentValues =
        ContentValues().apply {
          put(MediaStore.Downloads.DISPLAY_NAME, fileName)
          put(MediaStore.Downloads.MIME_TYPE, mimeType)
          put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + File.separator + "U-CLIMAX")
          put(MediaStore.Downloads.IS_PENDING, 1)
        }
      val uri =
        resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
          ?: throw IllegalStateException("无法创建下载媒体条目")
      resolver.openOutputStream(uri)?.use { it.write(bytes) }
        ?: throw IllegalStateException("无法打开输出流写入文件")
      contentValues.clear()
      contentValues.put(MediaStore.Downloads.IS_PENDING, 0)
      resolver.update(uri, contentValues, null, null)
    } else {
      val downloadDir =
        File(
          Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
          "U-CLIMAX",
        ).apply { mkdirs() }
      val file = File(downloadDir, fileName)
      FileOutputStream(file).use { it.write(bytes) }
      MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
    }
  }

  private fun sanitizeFileName(fileName: String): String {
    var clean = fileName.trim().replace(Regex("[\\\\/:*?\"<>|]"), "_")
    if (clean.isBlank()) {
      clean = "download_${System.currentTimeMillis()}"
    }
    return clean
  }

  private fun showToast(message: String) {
    Handler(Looper.getMainLooper()).post {
      Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }
  }

  private fun cleanupOldUpdates() {
    Thread {
      try {
        val cacheDir = File(context.cacheDir, "updates")
        if (cacheDir.exists() && cacheDir.isDirectory) {
          cacheDir.listFiles()?.forEach { it.delete() }
        }
      } catch (e: Exception) {
        Log.w(TAG, "Failed to cleanup old update files", e)
      }
    }.start()
  }

  /**
   * Start Foreground Service for card image sync to guarantee persistent background execution.
   */
  @JavascriptInterface
  fun startSyncForegroundService() {
    try {
      val intent =
        Intent(context, CardSyncForegroundService::class.java).apply {
          action = CardSyncForegroundService.ACTION_START_SYNC
          putExtra(CardSyncForegroundService.EXTRA_PROGRESS, 0)
        }
      ContextCompat.startForegroundService(context, intent)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to start CardSyncForegroundService", e)
    }
  }

  /**
   * Update ongoing background notification for card image sync progress.
   */
  @JavascriptInterface
  fun updateSyncProgressNotification(progress: Int) {
    try {
      val intent =
        Intent(context, CardSyncForegroundService::class.java).apply {
          action = CardSyncForegroundService.ACTION_UPDATE_PROGRESS
          putExtra(CardSyncForegroundService.EXTRA_PROGRESS, progress)
        }
      context.startService(intent)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to update sync progress via Service", e)
    }
  }

  /**
   * Update notification to indicate all card images have been synced.
   */
  @JavascriptInterface
  fun completeSyncNotification() {
    try {
      val intent =
        Intent(context, CardSyncForegroundService::class.java).apply {
          action = CardSyncForegroundService.ACTION_COMPLETE_SYNC
        }
      context.startService(intent)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to complete sync notification via Service", e)
    }
  }

  /**
   * Cancel the card image sync notification and stop Foreground Service.
   */
  @JavascriptInterface
  fun cancelSyncNotification() {
    try {
      val intent =
        Intent(context, CardSyncForegroundService::class.java).apply {
          action = CardSyncForegroundService.ACTION_STOP_SYNC
        }
      context.startService(intent)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to cancel sync notification via Service", e)
    }
  }

  private var networkCallback: ConnectivityManager.NetworkCallback? = null

  /**
   * Registers a system network callback to dispatch real-time online/offline events to WebView.
   */
  fun registerNetworkCallback() {
    try {
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
      val callback =
        object : ConnectivityManager.NetworkCallback() {
          override fun onAvailable(network: Network) {
            Handler(Looper.getMainLooper()).post {
              webView.evaluateJavascript("window.dispatchEvent(new Event('online'));", null)
            }
          }

          override fun onLost(network: Network) {
            Handler(Looper.getMainLooper()).post {
              webView.evaluateJavascript("window.dispatchEvent(new Event('offline'));", null)
            }
          }
        }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        cm.registerDefaultNetworkCallback(callback)
      } else {
        val request =
          NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        cm.registerNetworkCallback(request, callback)
      }
      networkCallback = callback
    } catch (e: Exception) {
      Log.w(TAG, "Failed to register network callback", e)
    }
  }

  /**
   * Unregisters the network callback on Activity destruction.
   */
  fun unregisterNetworkCallback() {
    try {
      networkCallback?.let {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        cm?.unregisterNetworkCallback(it)
        networkCallback = null
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to unregister network callback", e)
    }
  }

  /**
   * Checks if the device has active internet connectivity.
   */
  @JavascriptInterface
  fun isNetworkAvailable(): Boolean {
    return try {
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return true
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      } else {
        @Suppress("DEPRECATION")
        val networkInfo = cm.activeNetworkInfo
        networkInfo != null && networkInfo.isConnected
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to check network availability", e)
      true
    }
  }
}