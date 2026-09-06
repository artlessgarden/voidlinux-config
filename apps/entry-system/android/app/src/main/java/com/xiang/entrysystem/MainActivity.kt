package com.xiang.entrysystem

import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.View
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.URL
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread

private const val PREFS_NAME = "entry_system_settings"
private const val SERVER_URL_KEY = "server_url"

data class Entry(
    val id: String,
    val content: String,
    val createdAt: Long,
    val updatedAt: Long,
    val deleted: Int,
    val version: Int
)

class EntryDb(context: Context) : SQLiteOpenHelper(context, "entry-system.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE entries(
              id TEXT PRIMARY KEY,
              content TEXT NOT NULL,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL,
              deleted INTEGER NOT NULL DEFAULT 0,
              version INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE outbox(
              op_id TEXT PRIMARY KEY,
              device_id TEXT NOT NULL,
              client_seq INTEGER NOT NULL,
              type TEXT NOT NULL,
              entry_id TEXT NOT NULL,
              base_version INTEGER,
              payload TEXT NOT NULL,
              created_at INTEGER NOT NULL
            )
        """.trimIndent())
        db.execSQL("CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    fun entries(query: String): List<Entry> {
        val like = "%${query.trim()}%"
        val cursor = readableDatabase.rawQuery(
            if (query.trim().isEmpty())
                "SELECT * FROM entries WHERE deleted = 0 ORDER BY updated_at DESC LIMIT 200"
            else
                "SELECT * FROM entries WHERE deleted = 0 AND content LIKE ? ORDER BY updated_at DESC LIMIT 200",
            if (query.trim().isEmpty()) emptyArray() else arrayOf(like)
        )
        val result = mutableListOf<Entry>()
        cursor.use {
            while (it.moveToNext()) {
                result.add(Entry(
                    it.getString(it.getColumnIndexOrThrow("id")),
                    it.getString(it.getColumnIndexOrThrow("content")),
                    it.getLong(it.getColumnIndexOrThrow("created_at")),
                    it.getLong(it.getColumnIndexOrThrow("updated_at")),
                    it.getInt(it.getColumnIndexOrThrow("deleted")),
                    it.getInt(it.getColumnIndexOrThrow("version")),
                ))
            }
        }
        return result
    }

    fun getEntry(id: String): Entry? {
        val cursor = readableDatabase.rawQuery("SELECT * FROM entries WHERE id = ?", arrayOf(id))
        cursor.use {
            if (!it.moveToFirst()) return null
            return Entry(
                it.getString(it.getColumnIndexOrThrow("id")),
                it.getString(it.getColumnIndexOrThrow("content")),
                it.getLong(it.getColumnIndexOrThrow("created_at")),
                it.getLong(it.getColumnIndexOrThrow("updated_at")),
                it.getInt(it.getColumnIndexOrThrow("deleted")),
                it.getInt(it.getColumnIndexOrThrow("version")),
            )
        }
    }

    fun upsertEntry(entry: Entry) {
        val values = ContentValues().apply {
            put("id", entry.id)
            put("content", entry.content)
            put("created_at", entry.createdAt)
            put("updated_at", entry.updatedAt)
            put("deleted", entry.deleted)
            put("version", entry.version)
        }
        writableDatabase.insertWithOnConflict("entries", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun createLocal(content: String, deviceId: String) {
        val now = System.currentTimeMillis()
        val id = UUID.randomUUID().toString()
        upsertEntry(Entry(id, content, now, now, 0, 0))
        addOp("create_entry", id, null, JSONObject()
            .put("content", content)
            .put("created_at", now)
            .put("updated_at", now), deviceId)
    }

    fun updateLocal(entry: Entry, content: String, deviceId: String) {
        val now = System.currentTimeMillis()
        upsertEntry(entry.copy(content = content, updatedAt = now))
        addOp("update_entry", entry.id, entry.version, JSONObject()
            .put("content", content)
            .put("updated_at", now), deviceId)
    }

    private fun addOp(type: String, entryId: String, baseVersion: Int?, payload: JSONObject, deviceId: String) {
        val values = ContentValues().apply {
            put("op_id", UUID.randomUUID().toString())
            put("device_id", deviceId)
            put("client_seq", System.currentTimeMillis())
            put("type", type)
            put("entry_id", entryId)
            if (baseVersion == null) putNull("base_version") else put("base_version", baseVersion)
            put("payload", payload.toString())
            put("created_at", System.currentTimeMillis())
        }
        writableDatabase.insertOrThrow("outbox", null, values)
    }

    fun outbox(): JSONArray {
        val result = JSONArray()
        val cursor = readableDatabase.rawQuery("SELECT * FROM outbox ORDER BY client_seq ASC", emptyArray())
        cursor.use {
            while (it.moveToNext()) {
                result.put(JSONObject()
                    .put("op_id", it.getString(it.getColumnIndexOrThrow("op_id")))
                    .put("device_id", it.getString(it.getColumnIndexOrThrow("device_id")))
                    .put("client_seq", it.getLong(it.getColumnIndexOrThrow("client_seq")))
                    .put("type", it.getString(it.getColumnIndexOrThrow("type")))
                    .put("entry_id", it.getString(it.getColumnIndexOrThrow("entry_id")))
                    .put("base_version", if (it.isNull(it.getColumnIndexOrThrow("base_version"))) JSONObject.NULL else it.getInt(it.getColumnIndexOrThrow("base_version")))
                    .put("payload", JSONObject(it.getString(it.getColumnIndexOrThrow("payload"))))
                    .put("created_at", it.getLong(it.getColumnIndexOrThrow("created_at"))))
            }
        }
        return result
    }

    fun clearOutbox() {
        writableDatabase.delete("outbox", null, null)
    }

    fun getSetting(key: String, defaultValue: String = "0"): String {
        val cursor = readableDatabase.rawQuery("SELECT value FROM settings WHERE key = ?", arrayOf(key))
        cursor.use {
            return if (it.moveToFirst()) it.getString(0) else defaultValue
        }
    }

    fun setSetting(key: String, value: String) {
        val values = ContentValues().apply {
            put("key", key)
            put("value", value)
        }
        writableDatabase.insertWithOnConflict("settings", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun applyServerOp(op: JSONObject) {
        val payload = JSONObject(op.getString("payload"))
        val type = op.getString("type")
        val id = op.getString("entry_id")
        val existing = getEntry(id)
        val seq = op.getLong("server_seq")
        val version = if (existing == null) 1 else existing.version + 1
        val now = payload.optLong("updated_at", op.optLong("created_at", System.currentTimeMillis()))

        if (type == "create_entry" || existing == null) {
            upsertEntry(Entry(id, payload.optString("content"), payload.optLong("created_at", now), now, 0, version))
        } else if (type == "update_entry") {
            upsertEntry(existing.copy(content = payload.optString("content"), updatedAt = now, version = version))
        } else if (type == "delete_entry") {
            upsertEntry(existing.copy(deleted = 1, updatedAt = now, version = version))
        }
        setSetting("last_seq", seq.toString())
    }
}

class MainActivity : Activity() {
    private lateinit var db: EntryDb
    private lateinit var list: LinearLayout
    private lateinit var editor: EditText
    private lateinit var query: EditText
    private lateinit var status: TextView
    private lateinit var prefs: SharedPreferences
    private var selected: Entry? = null
    private val handler = Handler(Looper.getMainLooper())
    private val deviceId by lazy {
        Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: UUID.randomUUID().toString()
    }
    private var serverUrl: String? = null
    private var nsdManager: NsdManager? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null
    private var multicastLock: WifiManager.MulticastLock? = null
    private val scanning = AtomicBoolean(false)
    private val syncing = AtomicBoolean(false)
    private val http = OkHttpClient()
    private var socket: WebSocket? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        db = EntryDb(this)
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        serverUrl = prefs.getString(SERVER_URL_KEY, null)
        buildUi()
        handleSharedText(intent)
        render()
        startDiscovery()
        if (serverUrl == null) {
            scanForServer()
        } else {
            openSocket(serverUrl!!)
            syncNow()
        }
        scheduleSync()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleSharedText(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        discoveryListener?.let { nsdManager?.stopServiceDiscovery(it) }
        multicastLock?.release()
        socket?.close(1000, "closed")
    }

    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(18, 18, 18, 18)
        }
        val top = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        query = EditText(this).apply {
            hint = "搜索"
            setSingleLine(true)
            layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
        }
        val refresh = Button(this).apply {
            text = "同步"
            setOnClickListener { syncNow() }
        }
        top.addView(query)
        top.addView(refresh)
        status = TextView(this).apply { text = "寻找局域网服务" }
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val scroll = ScrollView(this).apply {
            addView(list)
            layoutParams = LinearLayout.LayoutParams(-1, 0, 1f)
        }
        editor = EditText(this).apply {
            hint = "写一条内容"
            minLines = 5
            gravity = android.view.Gravity.TOP
        }
        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val add = Button(this).apply {
            text = "新建"
            setOnClickListener {
                val text = editor.text.toString().trim()
                if (text.isNotEmpty()) {
                    db.createLocal(text, deviceId)
                    editor.setText("")
                    selected = null
                    render()
                    syncNow()
                }
            }
        }
        val save = Button(this).apply {
            text = "保存"
            setOnClickListener {
                selected?.let {
                    db.updateLocal(it, editor.text.toString(), deviceId)
                    render()
                    syncNow()
                }
            }
        }
        actions.addView(add)
        actions.addView(save)
        root.addView(top)
        root.addView(status)
        root.addView(scroll)
        root.addView(editor)
        root.addView(actions)
        setContentView(root)

        query.setOnEditorActionListener { _, _, _ ->
            render()
            true
        }
    }

    private fun render() {
        list.removeAllViews()
        for (entry in db.entries(query.text.toString())) {
            val button = Button(this).apply {
                text = firstLine(entry.content) + "\n" + android.text.format.DateFormat.format("yyyy-MM-dd HH:mm", entry.updatedAt)
                textAlignment = View.TEXT_ALIGNMENT_TEXT_START
                setOnClickListener {
                    selected = entry
                    editor.setText(entry.content)
                }
            }
            list.addView(button)
        }
    }

    private fun firstLine(text: String): String {
        return text.lines().firstOrNull { it.trim().isNotEmpty() } ?: "空条目"
    }

    private fun handleSharedText(intent: Intent?) {
        if (intent?.action == Intent.ACTION_SEND && intent.type?.startsWith("text/") == true) {
            val text = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
            if (text.isNotBlank()) {
                db.createLocal(text, deviceId)
                syncNow()
            }
        }
    }

    private fun startDiscovery() {
        val wifi = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
        multicastLock = wifi.createMulticastLock("entry-system-mdns").apply {
            setReferenceCounted(true)
            acquire()
        }
        nsdManager = getSystemService(NSD_SERVICE) as NsdManager
        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) = Unit
            override fun onDiscoveryStopped(serviceType: String) = Unit
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                runOnUiThread { status.text = "发现失败，扫描局域网" }
                scanForServer()
            }
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
            override fun onServiceLost(serviceInfo: NsdServiceInfo) = Unit
            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                if (serviceInfo.serviceType.contains("entry-system")) {
                    nsdManager?.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                        override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                            scanForServer()
                        }
                        override fun onServiceResolved(info: NsdServiceInfo) {
                            val host = info.host.hostAddress ?: return
                            setServerUrl("http://$host:${info.port}")
                            runOnUiThread {
                                status.text = "已发现 $serverUrl"
                            }
                            syncNow()
                        }
                    })
                }
            }
        }
        nsdManager?.discoverServices("_entry-system._tcp.", NsdManager.PROTOCOL_DNS_SD, discoveryListener)
    }

    private fun scheduleSync() {
        handler.postDelayed(object : Runnable {
            override fun run() {
                syncNow()
                handler.postDelayed(this, 2500)
            }
        }, 2500)
    }

    private fun syncNow() {
        val base = serverUrl
        if (base == null) {
            scanForServer()
            return
        }
        if (!syncing.compareAndSet(false, true)) return
        thread {
            try {
                runOnUiThread { status.text = statusText("同步中", base) }
                push(base)
                val pulled = pull(base)
                runOnUiThread {
                    status.text = statusText("已同步 ${android.text.format.DateFormat.format("HH:mm:ss", System.currentTimeMillis())}", base, pulled)
                    render()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    status.text = statusText("离线: ${e.message}", base)
                    scanForServer()
                }
            } finally {
                syncing.set(false)
            }
        }
    }

    private fun scanForServer() {
        if (!scanning.compareAndSet(false, true)) return
        thread {
            try {
                runOnUiThread { status.text = "扫描局域网服务" }
                val found = findServer()
                runOnUiThread {
                    if (found == null) {
                        status.text = statusText("未发现服务", serverUrl)
                    } else {
                        setServerUrl(found)
                        status.text = statusText("已连接", found)
                        syncNow()
                    }
                }
            } finally {
                scanning.set(false)
            }
        }
    }

    private fun findServer(): String? {
        val candidates = linkedSetOf("10.0.2.2")
        for (address in localIpv4Addresses()) {
            val parts = address.split(".")
            if (parts.size == 4) {
                val prefix = parts.take(3).joinToString(".")
                for (i in 1..254) candidates.add("$prefix.$i")
            }
        }

        val result = AtomicReference<String?>(null)
        val pool = Executors.newFixedThreadPool(32)
        val latch = CountDownLatch(candidates.size)
        for (host in candidates) {
            pool.execute {
                try {
                    if (result.get() == null && isEntryServer(host)) {
                        result.compareAndSet(null, "http://$host:38521")
                    }
                } finally {
                    latch.countDown()
                }
            }
        }
        latch.await(5, TimeUnit.SECONDS)
        pool.shutdownNow()
        return result.get()
    }

    private fun localIpv4Addresses(): List<String> {
        val result = mutableListOf<String>()
        val interfaces = NetworkInterface.getNetworkInterfaces()
        while (interfaces.hasMoreElements()) {
            val networkInterface = interfaces.nextElement()
            if (!networkInterface.isUp || networkInterface.isLoopback) continue
            val addresses = networkInterface.inetAddresses
            while (addresses.hasMoreElements()) {
                val address = addresses.nextElement()
                if (address is Inet4Address && !address.isLoopbackAddress) {
                    result.add(address.hostAddress ?: continue)
                }
            }
        }
        return result
    }

    private fun isEntryServer(host: String): Boolean {
        return try {
            val response = request("http://$host:38521/api/health", "GET", null, 300)
            JSONObject(response).optBoolean("ok", false)
        } catch (_: Exception) {
            false
        }
    }

    private fun push(base: String) {
        val ops = db.outbox()
        if (ops.length() == 0) return
        val body = JSONObject().put("ops", ops).toString()
        request("$base/api/sync/push", "POST", body)
        db.clearOutbox()
    }

    private fun pull(base: String): Int {
        val after = db.getSetting("last_seq", "0")
        val response = JSONObject(request("$base/api/sync/pull?after=$after", "GET", null))
        val ops = response.getJSONArray("ops")
        for (i in 0 until ops.length()) db.applyServerOp(ops.getJSONObject(i))
        return ops.length()
    }

    private fun setServerUrl(url: String) {
        if (serverUrl == url) {
            if (socket == null) openSocket(url)
            return
        }
        serverUrl = url
        prefs.edit().putString(SERVER_URL_KEY, url).apply()
        openSocket(url)
    }

    private fun openSocket(base: String) {
        socket?.close(1000, "switch")
        val wsUrl = base.trimEnd('/').replaceFirst("http://", "ws://").replaceFirst("https://", "wss://")
        val request = Request.Builder().url(wsUrl).build()
        socket = http.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                runOnUiThread { status.text = statusText("实时连接", base) }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                syncNow()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                runOnUiThread { status.text = statusText("实时断开，轮询同步", base) }
            }
        })
    }

    private fun statusText(prefix: String, base: String?, pulled: Int = 0): String {
        val pending = db.outbox().length()
        val url = base ?: "无服务"
        val suffix = mutableListOf<String>()
        if (pending > 0) suffix.add("待传 $pending")
        if (pulled > 0) suffix.add("收到 $pulled")
        return if (suffix.isEmpty()) "$prefix · $url" else "$prefix · $url · ${suffix.joinToString(" · ")}"
    }

    private fun request(url: String, method: String, body: String?, timeout: Int = 1500): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = timeout
        conn.readTimeout = if (timeout < 1000) 1000 else 3000
        conn.setRequestProperty("Content-Type", "application/json")
        if (body != null) {
            conn.doOutput = true
            OutputStreamWriter(conn.outputStream).use { it.write(body) }
        }
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        return BufferedReader(InputStreamReader(stream)).use { it.readText() }
    }
}
