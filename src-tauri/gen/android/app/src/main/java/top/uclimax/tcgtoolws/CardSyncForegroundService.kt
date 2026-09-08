package top.uclimax.tcgtoolws

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Foreground Service that keeps CPU awake (WakeLock) and maintains network activity (WifiLock)
 * during card image sync downloads, even when the app is minimized or screen is locked.
 */
class CardSyncForegroundService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null
  private var wifiLock: WifiManager.WifiLock? = null

  companion object {
    const val TAG = "CardSyncService"
    const val CHANNEL_ID = "card_image_sync_channel"
    const val NOTIFICATION_ID = 2001

    const val ACTION_START_SYNC = "top.uclimax.tcgtoolws.action.START_SYNC"
    const val ACTION_UPDATE_PROGRESS = "top.uclimax.tcgtoolws.action.UPDATE_PROGRESS"
    const val ACTION_COMPLETE_SYNC = "top.uclimax.tcgtoolws.action.COMPLETE_SYNC"
    const val ACTION_STOP_SYNC = "top.uclimax.tcgtoolws.action.STOP_SYNC"

    const val EXTRA_PROGRESS = "extra_progress"
    const val EXTRA_TITLE = "extra_title"
    const val EXTRA_TEXT = "extra_text"
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    acquireLocks()
  }

  override fun onStartCommand(
    intent: Intent?,
    flags: Int,
    startId: Int,
  ): Int {
    when (intent?.action) {
      ACTION_START_SYNC -> {
        val progress = intent.getIntExtra(EXTRA_PROGRESS, 0)
        startForegroundServiceWithNotification(progress)
      }
      ACTION_UPDATE_PROGRESS -> {
        val progress = intent.getIntExtra(EXTRA_PROGRESS, 0)
        updateNotification(progress)
      }
      ACTION_COMPLETE_SYNC -> {
        completeAndStop()
      }
      ACTION_STOP_SYNC -> {
        stopForegroundAndSelf()
      }
    }
    return START_NOT_STICKY
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel =
        NotificationChannel(
          CHANNEL_ID,
          "卡图下载与同步",
          NotificationManager.IMPORTANCE_LOW,
        ).apply {
          description = "卡图资源后台同步与下载进度"
          setShowBadge(false)
          enableLights(false)
          enableVibration(false)
        }
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      manager?.createNotificationChannel(channel)
    }
  }

  private fun acquireLocks() {
    try {
      if (wakeLock == null) {
        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        wakeLock =
          powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "TCGToolWS:CardSyncWakeLock",
          )?.apply {
            setReferenceCounted(false)
            // 1-hour safety timeout to prevent battery drain in case of an unexpected crash
            acquire(60 * 60 * 1000L)
          }
      }

      if (wifiLock == null) {
        val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val wifiMode =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            WifiManager.WIFI_MODE_FULL_LOW_LATENCY
          } else {
            @Suppress("DEPRECATION")
            WifiManager.WIFI_MODE_FULL_HIGH_PERF
          }
        wifiLock =
          wifiManager?.createWifiLock(wifiMode, "TCGToolWS:CardSyncWifiLock")?.apply {
            setReferenceCounted(false)
            acquire()
          }
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to acquire WakeLock or WifiLock", e)
    }
  }

  private fun releaseLocks() {
    try {
      wakeLock?.let {
        if (it.isHeld) {
          it.release()
        }
      }
      wakeLock = null

      wifiLock?.let {
        if (it.isHeld) {
          it.release()
        }
      }
      wifiLock = null
    } catch (e: Exception) {
      Log.w(TAG, "Failed to release WakeLock or WifiLock", e)
    }
  }

  private fun buildNotification(
    title: String,
    progress: Int,
    ongoing: Boolean,
  ): NotificationCompat.Builder {
    val launchIntent =
      packageManager.getLaunchIntentForPackage(packageName)?.apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
    val pendingIntent =
      launchIntent?.let {
        PendingIntent.getActivity(
          this,
          0,
          it,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
      }

    val validProgress = progress.coerceIn(0, 100)
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentIntent(pendingIntent)
      .setProgress(100, validProgress, false)
      .setOngoing(ongoing)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
  }

  private fun startForegroundServiceWithNotification(progress: Int) {
    val notification = buildNotification("卡图下载", progress, true).build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun updateNotification(progress: Int) {
    val validProgress = progress.coerceIn(0, 100)
    val notification = buildNotification("卡图下载", validProgress, true).build()
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    manager?.notify(NOTIFICATION_ID, notification)
  }

  private fun completeAndStop() {
    releaseLocks()
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent =
      launchIntent?.let {
        PendingIntent.getActivity(
          this,
          0,
          it,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
      }

    val completeNotification =
      NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle("卡图同步完成")
        .setContentText("所有卡图资源已成功下载并就绪")
        .setContentIntent(pendingIntent)
        .setProgress(0, 0, false)
        .setOngoing(false)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()

    manager?.notify(NOTIFICATION_ID, completeNotification)
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun stopForegroundAndSelf() {
    releaseLocks()
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    manager?.cancel(NOTIFICATION_ID)
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onDestroy() {
    releaseLocks()
    super.onDestroy()
  }
}