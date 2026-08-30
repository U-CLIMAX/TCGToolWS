package top.uclimax.tcgtoolws

import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

class MainActivity : TauriActivity() {
  private var mWebView: WebView? = null
  private var lastBackPressTime = 0L

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    window.setFlags(
      WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
      WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
    )

    // Boost UI and display thread priority to URGENT_DISPLAY
    try {
      android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_DISPLAY)
    } catch (_: Exception) {
    }

    // Enable sustained performance mode on supported devices to lock high GPU/CPU clocks
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      window.setSustainedPerformanceMode(true)
    }

    super.onCreate(savedInstanceState)

    ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content)) { v, insets ->
      val bars =
        insets.getInsets(
          WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
        )
      v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      insets
    }

    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          val wv = mWebView
          if (wv != null && wv.canGoBack()) {
            wv.goBack()
          } else {
            val currentTime = System.currentTimeMillis()
            if (currentTime - lastBackPressTime < 2000) {
              isEnabled = false
              onBackPressedDispatcher.onBackPressed()
              isEnabled = true
            } else {
              lastBackPressTime = currentTime
              Toast.makeText(this@MainActivity, "再按一次退出应用", Toast.LENGTH_SHORT).show()
            }
          }
        }
      },
    )
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    this.mWebView = webView

    // Enable hardware acceleration layer with dark background to enable zero-copy GPU compositing
    webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
    webView.setBackgroundColor(android.graphics.Color.parseColor("#121212"))

    // Optimize settings for rendering, caching, and offscreen canvas
    webView.settings.apply {
      textZoom = 100 // Lock text zoom to 100% to prevent UI layout breakage
      domStorageEnabled = true
      cacheMode = WebSettings.LOAD_DEFAULT
      allowFileAccess = true
      allowContentAccess = true
      offscreenPreRaster = false

      // Disable Google SafeBrowsing to eliminate DNS/network timeout delays on launch
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        safeBrowsingEnabled = false
      }
    }

    val bridge = AndroidBridge(this, webView)
    webView.addJavascriptInterface(bridge, AndroidBridge.BRIDGE_NAME)

    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      WebViewCompat.addDocumentStartJavaScript(webView, AndroidBridge.INJECTION_SCRIPT, setOf("*"))
    }

    webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
      bridge.handleDownloadListener(url, userAgent, contentDisposition, mimetype)
    }
  }

  override fun onStop() {
    super.onStop()
    mWebView?.let { wv ->
      wv.onPause()
      // false indicates clearing only the RAM bitmap/decode cache, preserving disk cache to avoid network re-fetches
      wv.clearCache(false)
    }
  }

  override fun onStart() {
    super.onStart()
    mWebView?.onResume()
  }

  override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    if (level >= android.content.ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
      mWebView?.clearCache(false)
      System.gc()
    }
  }

  override fun onDestroy() {
    mWebView = null
    super.onDestroy()
  }
}