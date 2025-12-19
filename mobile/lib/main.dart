import 'dart:async';
import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:video_player/video_player.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await WakelockPlus.enable();

  // Set orientasi landscape untuk TV
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Hide system UI untuk full screen experience
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  runApp(const StreamTvApp());
}

const String kBrandName = "STREAM TV TEI";
const Color kBrandColor = Color(0xFF0EA5E9);

class StreamTvApp extends StatefulWidget {
  const StreamTvApp({super.key});

  @override
  State<StreamTvApp> createState() => _StreamTvAppState();
}

class _StreamTvAppState extends State<StreamTvApp> {
  final _configStore = ConfigStore();
  AppConfig? _config;
  AppConfig? _editConfig;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    final loaded = await _configStore.load();
    setState(() {
      _config = loaded;
      _loading = false;
    });
  }

  Future<void> _saveConfig(AppConfig config) async {
    await _configStore.save(config);
    setState(() {
      _config = config;
      _editConfig = null;
    });
  }

  void _beginEditConfig() {
    setState(() {
      _editConfig = _config;
      _config = null;
    });
  }

  void _cancelEditConfig() {
    setState(() {
      _config = _editConfig;
      _editConfig = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: kBrandName,
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: kBrandColor,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: _loading
          ? const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            )
          : (_config == null
              ? SetupScreen(
                  onSaved: _saveConfig,
                  initialConfig: _editConfig,
                  onBack: _editConfig == null ? null : _cancelEditConfig,
                )
              : PlayerScreen(
                  config: _config!,
                  onChangeConfig: _beginEditConfig,
                )),
    );
  }
}

class AppConfig {
  final String baseUrl;
  final String deviceCode;
  final String tvMac;

  const AppConfig({
    required this.baseUrl,
    required this.deviceCode,
    required this.tvMac,
  });

  Map<String, String> toJson() => {
        "baseUrl": baseUrl,
        "deviceCode": deviceCode,
        "tvMac": tvMac,
      };

  factory AppConfig.fromJson(Map<String, dynamic> json) => AppConfig(
        baseUrl: json["baseUrl"] ?? "",
        deviceCode: json["deviceCode"] ?? "",
        tvMac: json["tvMac"] ?? "",
      );
}

class ConfigStore {
  static const _key = "stream_tv_config";

  Future<AppConfig?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return null;
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      final cfg = AppConfig.fromJson(data);
      if (cfg.baseUrl.isEmpty || cfg.deviceCode.isEmpty) return null;
      return cfg;
    } catch (_) {
      return null;
    }
  }

  Future<void> save(AppConfig config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(config.toJson()));
  }
}

// ==========================================
// OPTIMIZED SETUP SCREEN (TV REMOTE FRIENDLY)
// ==========================================

class SetupScreen extends StatefulWidget {
  final Future<void> Function(AppConfig) onSaved;
  final AppConfig? initialConfig;
  final VoidCallback? onBack;

  const SetupScreen({
    super.key,
    required this.onSaved,
    this.initialConfig,
    this.onBack,
  });

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _hostController = TextEditingController();
  final _portController = TextEditingController(text: "5000");
  final _deviceController = TextEditingController(text: "demo");
  final _macController = TextEditingController();

  final _hostFocus = FocusNode();
  final _portFocus = FocusNode();
  final _deviceFocus = FocusNode();
  final _macFocus = FocusNode();
  final _saveFocus = FocusNode();
  final _backFocus = FocusNode();

  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();

    final cfg = widget.initialConfig;
    if (cfg != null) {
      final uri = _parseLooseUrl(cfg.baseUrl);
      if (uri != null) {
        _hostController.text = uri.host;
        if (uri.hasPort && uri.port > 0) {
          _portController.text = uri.port.toString();
        }
      } else {
        _hostController.text = cfg.baseUrl;
      }
    
      _deviceController.text = cfg.deviceCode;
      _macController.text = cfg.tvMac;
    }
  }

  @override
  void dispose() {
    _hostController.dispose();
    _portController.dispose();
    _deviceController.dispose();
    _macController.dispose();
    _hostFocus.dispose();
    _portFocus.dispose();
    _deviceFocus.dispose();
    _macFocus.dispose();
    _saveFocus.dispose();
    _backFocus.dispose();
    super.dispose();
  }

  void _maybeSplitUrlFromHostField() {
    final raw = _hostController.text.trim();
    if (raw.isEmpty) return;

    final Uri? uri = _parseLooseUrl(raw);
    if (uri == null) return;

    if (uri.host.isNotEmpty) {
      _hostController.text = uri.host;
      _hostController.selection = TextSelection.fromPosition(
        TextPosition(offset: _hostController.text.length),
      );
    }

    if (uri.hasPort && uri.port > 0) {
      _portController.text = uri.port.toString();
      _portController.selection = TextSelection.fromPosition(
        TextPosition(offset: _portController.text.length),
      );
    }
  }

  Uri? _parseLooseUrl(String raw) {
    final input = raw.trim();
    if (input.isEmpty) return null;

    final String withScheme = input.contains("://") ? input : "http://$input";
    try {
      final uri = Uri.parse(withScheme);
      if (uri.host.isEmpty) return null;
      return uri;
    } catch (_) {
      return null;
    }
  }

  String? _buildNormalizedBaseUrl() {
    final hostRaw = _hostController.text.trim();
    final portRaw = _portController.text.trim();

    if (hostRaw.isEmpty) return null;

    final Uri? parsed = _parseLooseUrl(hostRaw);
    final host = (parsed?.host.isNotEmpty ?? false) ? parsed!.host : hostRaw;

    final String portCandidate =
        (parsed != null && parsed.hasPort && parsed.port > 0)
            ? parsed.port.toString()
            : (portRaw.isEmpty ? "5000" : portRaw);
    final int? port = int.tryParse(portCandidate);
    if (port == null || port < 1 || port > 65535) return null;

    return Uri(scheme: "http", host: host, port: port).toString();
  }

  Future<void> _save() async {
    final device = _deviceController.text.trim();
    final mac = _macController.text.trim();
    final base = _buildNormalizedBaseUrl();

    if (base == null || base.isEmpty || device.isEmpty) {
      setState(() =>
          _error = "IP/host server, port, dan device code wajib diisi");
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final cfg = AppConfig(
      baseUrl: base,
      deviceCode: device,
      tvMac: mac,
    );
    await widget.onSaved(cfg);
  }

  @override
  Widget build(BuildContext context) {
    final canGoBack = widget.onBack != null;

    return Shortcuts(
      shortcuts: <LogicalKeySet, Intent>{
        LogicalKeySet(LogicalKeyboardKey.select): const ActivateIntent(),
        LogicalKeySet(LogicalKeyboardKey.enter): const ActivateIntent(),
        LogicalKeySet(LogicalKeyboardKey.numpadEnter): const ActivateIntent(),
        LogicalKeySet(LogicalKeyboardKey.goBack): const DismissIntent(),
        LogicalKeySet(LogicalKeyboardKey.escape): const DismissIntent(),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          DismissIntent: CallbackAction<DismissIntent>(onInvoke: (intent) {
            if (canGoBack && !_saving) {
              widget.onBack?.call();
            }
            return null;
          }),
        },
        child: Focus(
          autofocus: true,
          child: PopScope(
            canPop: !canGoBack,
            onPopInvokedWithResult: (didPop, result) {
              if (didPop) return;
              final back = widget.onBack;
              if (back != null) back();
            },
            child: Scaffold(
              body: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.black, Color(0xFF0F172A)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: SafeArea(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 640),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: FocusTraversalGroup(
                          policy: OrderedTraversalPolicy(),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: kBrandColor.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: kBrandColor.withValues(alpha: 0.5),
                                      ),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.tv, color: kBrandColor),
                                        SizedBox(width: 8),
                                        Text(
                                          kBrandName,
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 0.6,
                                            fontSize: 18,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 28),
                              Text(
                                "Konfigurasi Koneksi",
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                "Gunakan OK/Enter di remote untuk fokus dan pindah Next",
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                      color: Colors.grey[400],
                                    ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 28),

                              Row(
                                children: [
                                  Expanded(
                                    flex: 3,
                                    child: FocusTraversalOrder(
                                      order: const NumericFocusOrder(1),
                                      child: _TvLabeledField(
                                        controller: _hostController,
                                        label: "IP/Host Server",
                                        hint: "192.168.1.10",
                                        prefixText: "http://",
                                        focusNode: _hostFocus,
                                        textInputAction: TextInputAction.next,
                                        autoFocus: true,
                                        onSubmitted: (_) {
                                          _maybeSplitUrlFromHostField();
                                          FocusScope.of(context)
                                              .requestFocus(_portFocus);
                                        },
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    flex: 1,
                                    child: FocusTraversalOrder(
                                      order: const NumericFocusOrder(2),
                                      child: _TvLabeledField(
                                        controller: _portController,
                                        label: "Port",
                                        hint: "5000",
                                        prefixText: ":",
                                        focusNode: _portFocus,
                                        keyboardType: TextInputType.number,
                                        inputFormatters: [
                                          FilteringTextInputFormatter.digitsOnly
                                        ],
                                        textInputAction: TextInputAction.next,
                                        onSubmitted: (_) => FocusScope.of(context)
                                            .requestFocus(_deviceFocus),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              FocusTraversalOrder(
                                order: const NumericFocusOrder(3),
                                child: _TvLabeledField(
                                  controller: _deviceController,
                                  label: "Device Code",
                                  hint: "PROD1",
                                  focusNode: _deviceFocus,
                                  textInputAction: TextInputAction.next,
                                  onSubmitted: (_) =>
                                      FocusScope.of(context)
                                          .requestFocus(_macFocus),
                                ),
                              ),
                              const SizedBox(height: 14),
                              FocusTraversalOrder(
                                order: const NumericFocusOrder(4),
                                child: _TvLabeledField(
                                  controller: _macController,
                                  label: "MAC Address (WOL - Opsional)",
                                  hint: "AA:BB:CC:DD:EE:FF",
                                  focusNode: _macFocus,
                                  textInputAction: TextInputAction.done,
                                  onSubmitted: (_) =>
                                      FocusScope.of(context)
                                          .requestFocus(_saveFocus),
                                ),
                              ),
                              if (_error != null) ...[
                                const SizedBox(height: 18),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: Colors.red.withValues(alpha: 0.5),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.error_outline,
                                          color: Colors.redAccent),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          _error!,
                                          style: const TextStyle(
                                            color: Colors.redAccent,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 26),

                              Row(
                                children: [
                                  if (canGoBack) ...[
                                    Expanded(
                                      child: FocusTraversalOrder(
                                        order: const NumericFocusOrder(5),
                                        child: _TvButton(
                                          focusNode: _backFocus,
                                          onPressed: _saving ? null : widget.onBack,
                                          icon: Icons.arrow_back,
                                          label: "Kembali",
                                          isPrimary: false,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                  ],
                                  Expanded(
                                    child: FocusTraversalOrder(
                                      order: const NumericFocusOrder(6),
                                      child: _TvButton(
                                        focusNode: _saveFocus,
                                        onPressed: _saving ? null : _save,
                                        icon: _saving
                                            ? Icons.hourglass_empty
                                            : Icons.save,
                                        label: _saving
                                            ? "Menyimpan..."
                                            : "Simpan Config",
                                        isPrimary: true,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Optimized TextField for TV Remote Control
class _TvLabeledField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final String? prefixText;
  final FocusNode? focusNode;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputAction? textInputAction;
  final void Function(String)? onSubmitted;
  final bool autoFocus;

  const _TvLabeledField({
    required this.controller,
    required this.label,
    required this.hint,
    this.prefixText,
    this.focusNode,
    this.keyboardType,
    this.inputFormatters,
    this.textInputAction,
    this.onSubmitted,
    this.autoFocus = false,
  });

  @override
  Widget build(BuildContext context) {
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.arrowDown): () {
          FocusScope.of(context).nextFocus();
        },
        const SingleActivator(LogicalKeyboardKey.arrowUp): () {
          FocusScope.of(context).previousFocus();
        },
        const SingleActivator(LogicalKeyboardKey.arrowLeft): () {
          // Allow left arrow in text field
        },
        const SingleActivator(LogicalKeyboardKey.arrowRight): () {
          // Allow right arrow in text field
        },
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Colors.white70,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            focusNode: focusNode,
            autofocus: autoFocus,
            keyboardType: keyboardType,
            inputFormatters: inputFormatters,
            textInputAction: textInputAction,
            onSubmitted: onSubmitted,
            style: const TextStyle(color: Colors.white, fontSize: 18),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle:
                  TextStyle(color: Colors.white.withValues(alpha: 0.3)),
              prefixText: prefixText,
              prefixStyle: const TextStyle(color: Colors.white70),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.08),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 20,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    BorderSide(color: Colors.white.withValues(alpha: 0.15)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: kBrandColor,
                  width: 3,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// TV-Optimized Button with better focus feedback
class _TvButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final String label;
  final IconData icon;
  final bool isPrimary;
  final FocusNode? focusNode;

  const _TvButton({
    required this.onPressed,
    required this.label,
    required this.icon,
    required this.isPrimary,
    this.focusNode,
  });

  @override
  State<_TvButton> createState() => _TvButtonState();
}

class _TvButtonState extends State<_TvButton> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: widget.focusNode,
      onFocusChange: (focused) {
        setState(() => _isFocused = focused);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        transform: _isFocused
            ? Matrix4.diagonal3Values(1.08, 1.08, 1.0)
            : Matrix4.identity(),
        child: ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: widget.isPrimary
                ? kBrandColor
                : (_isFocused
                    ? Colors.white.withValues(alpha: 0.2)
                    : Colors.transparent),
            foregroundColor: widget.isPrimary ? Colors.black : Colors.white,
            side: widget.isPrimary
                ? null
                : BorderSide(
                    color: _isFocused ? Colors.white : Colors.white38,
                    width: _isFocused ? 3 : 2,
                  ),
            padding:
                const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: _isFocused ? 12 : 0,
          ),
          onPressed: widget.onPressed,
          icon: Icon(widget.icon, size: 24),
          label: Text(
            widget.label,
            style: TextStyle(
              fontWeight: _isFocused ? FontWeight.bold : FontWeight.w600,
              fontSize: 18,
            ),
          ),
        ),
      ),
    );
  }
}

// ==========================================
// PLAYER LOGIC
// ==========================================

class PlaylistItem {
  final String id;
  final String type;
  final String url;
  final String title;
  final String displayFit;
  final double? duration;

  const PlaylistItem({
    required this.id,
    required this.type,
    required this.url,
    required this.title,
    required this.displayFit,
    this.duration,
  });

  factory PlaylistItem.fromJson(Map<String, dynamic> json, String baseUrl) {
    final rawUrl = json["url"] as String? ?? "";
    final isAbsolute =
        rawUrl.startsWith("http://") || rawUrl.startsWith("https://");
    final safeBase = baseUrl.endsWith("/")
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final builtUrl = isAbsolute ? rawUrl : "$safeBase$rawUrl";

    return PlaylistItem(
      id: json["id"]?.toString() ?? "",
      type: (json["type"] as String? ?? "video").toLowerCase(),
      url: builtUrl,
      title: json["title"] as String? ?? "",
      displayFit: json["displayFit"] as String? ?? "contain",
      duration: (json["duration"] as num?)?.toDouble(),
    );
  }
}

class RemoteCommand {
  final String id;
  final String command;
  final Map<String, dynamic>? params;

  RemoteCommand({
    required this.id,
    required this.command,
    this.params,
  });

  factory RemoteCommand.fromJson(Map<String, dynamic> json) {
    return RemoteCommand(
      id: json["id"]?.toString() ?? "",
      command: (json["command"] as String? ?? "").toLowerCase(),
      params: json["params"] is Map<String, dynamic>
          ? json["params"] as Map<String, dynamic>
          : null,
    );
  }
}

class ApiClient {
  final Dio _dio;
  ApiClient(String baseUrl)
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 5),
            receiveTimeout: const Duration(seconds: 10),
            headers: {"Accept": "application/json"},
          ),
        );

  Future<List<PlaylistItem>> fetchPlaylist(AppConfig config) async {
    final res = await _dio.get(
      "/api/player/playlist",
      queryParameters: {"device": config.deviceCode},
      options: Options(
        responseType: ResponseType.json,
        followRedirects: true,
      ),
    );
    final data = res.data;
    if (data is Map<String, dynamic> && data["items"] is List) {
      return (data["items"] as List)
          .map((e) =>
              PlaylistItem.fromJson(e as Map<String, dynamic>, config.baseUrl))
          .toList();
    }
    if (data is List) {
      return data
          .map(
              (e) => PlaylistItem.fromJson(e as Map<String, dynamic>, config.baseUrl))
          .toList();
    }
    throw Exception("Format playlist tidak dikenal");
  }

  Future<void> sendHeartbeat({
    required AppConfig config,
    String? ipAddress,
    String? macAddress,
    String? wifiName,
    String? wifiBssid,
  }) async {
    final payload = <String, dynamic>{
      "playerVer": "flutter-1.0.0",
      if (ipAddress != null && ipAddress.isNotEmpty) "ipAddress": ipAddress,
      if (macAddress != null && macAddress.isNotEmpty) "macAddress": macAddress,
      if (wifiName != null && wifiName.isNotEmpty) "wifiName": wifiName,
      if (wifiBssid != null && wifiBssid.isNotEmpty) "wifiBssid": wifiBssid,
    };

    try {
      await _dio.post(
        "/api/player/heartbeat",
        queryParameters: {"device": config.deviceCode},
        data: payload,
        options:
            Options(validateStatus: (code) => code != null && code < 500),
      );
    } catch (_) {}
  }

  Future<List<RemoteCommand>> fetchCommandsLongPoll({
    required String deviceCode,
    Duration wait = const Duration(seconds: 25),
    Duration pollInterval = const Duration(milliseconds: 250),
    int limit = 20,
    CancelToken? cancelToken,
  }) async {
    final res = await _dio.get(
      "/api/player/poll-commands",
      queryParameters: {
        "device": deviceCode,
        "waitMs": wait.inMilliseconds,
        "pollIntervalMs": pollInterval.inMilliseconds,
        "limit": limit,
      },
      options: Options(
        responseType: ResponseType.json,
        receiveTimeout: wait + const Duration(seconds: 5),
        validateStatus: (code) => code != null && code < 500,
      ),
      cancelToken: cancelToken,
    );
    if (res.statusCode == 200 && res.data is Map<String, dynamic>) {
      final data = res.data as Map<String, dynamic>;
      final cmds = data["commands"] as List<dynamic>? ?? [];
      return cmds
          .map((e) => RemoteCommand.fromJson(e as Map<String, dynamic>))
          .where((e) => e.id.isNotEmpty && e.command.isNotEmpty)
          .toList();
    }
    return [];
  }

  Future<void> ackCommand(String commandId,
      {String status = "executed"}) async {
    try {
      await _dio.post(
        "/api/player/poll-commands",
        data: {"commandId": commandId, "status": status},
        options:
            Options(validateStatus: (code) => code != null && code < 500),
      );
    } catch (_) {}
  }
}

class PlayerScreen extends StatefulWidget {
  final AppConfig config;
  final VoidCallback onChangeConfig;
  const PlayerScreen({
    super.key,
    required this.config,
    required this.onChangeConfig,
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final ApiClient _api;
  List<PlaylistItem> _items = [];
  int _index = 0;
  bool _loading = true;
  String? _error;
  VideoPlayerController? _video;
  Timer? _imageTimer;
  StreamSubscription? _connSub;
  ConnectivityResult _connectivity = ConnectivityResult.none;
  String? _ipAddress;
  String? _wifiName;
  String? _wifiBssid;
  Timer? _heartbeatTimer;
  bool _commandLoopRunning = false;
  bool _stopCommandLoop = false;
  CancelToken? _commandCancelToken;
  bool _advanceLocked = false;
  bool _showControls = true;
  Timer? _hideControlsTimer;

  // Focus nodes untuk remote control
  final _prevFocus = FocusNode();
  final _playPauseFocus = FocusNode();
  final _nextFocus = FocusNode();
  final _settingsFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _api = ApiClient(widget.config.baseUrl);
    _listenConnectivity();
    _captureNetworkInfo().whenComplete(_startHeartbeatLoop);
    _loadPlaylist();
    _startCommandLoop();
    _startHideControlsTimer();
  }

  @override
  void dispose() {
    _stopCommandLoop = true;
    _commandCancelToken?.cancel("dispose");
    _video?.removeListener(_handleVideoUpdate);
    _video?.dispose();
    _imageTimer?.cancel();
    _connSub?.cancel();
    _heartbeatTimer?.cancel();
    _hideControlsTimer?.cancel();
    _prevFocus.dispose();
    _playPauseFocus.dispose();
    _nextFocus.dispose();
    _settingsFocus.dispose();
    super.dispose();
  }

  void _listenConnectivity() {
    final connectivity = Connectivity();

    connectivity.checkConnectivity().then((value) {
      if (!mounted) return;
      setState(() {
        _connectivity = _normalizeConnectivity(value);
      });
    });

    _connSub = connectivity.onConnectivityChanged.listen((result) {
      if (!mounted) return;
      setState(() {
        _connectivity = _normalizeConnectivity(result);
      });

      if (_normalizeConnectivity(result) != ConnectivityResult.none &&
          _items.isEmpty &&
          !_loading) {
        _loadPlaylist();
      }
    });
  }

  ConnectivityResult _normalizeConnectivity(dynamic event) {
    if (event is ConnectivityResult) return event;
    if (event is List<ConnectivityResult>) {
      return event.isNotEmpty ? event.first : ConnectivityResult.none;
    }
    return ConnectivityResult.none;
  }

  Future<void> _captureNetworkInfo() async {
    try {
      final info = NetworkInfo();
      final wifiIP = await info.getWifiIP();
      final wifiName = await info.getWifiName();
      final wifiBssid = await info.getWifiBSSID();

      if (!mounted) return;
      setState(() {
        _ipAddress = wifiIP;
        _wifiName = wifiName;
        _wifiBssid = wifiBssid;
      });
    } catch (_) {
      // ignore
    }
  }

  void _startHeartbeatLoop() {
    _heartbeatTimer?.cancel();
    _sendHeartbeat();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _sendHeartbeat();
    });
  }

  Future<void> _sendHeartbeat() async {
    await _api.sendHeartbeat(
      config: widget.config,
      ipAddress: _ipAddress,
      macAddress:
          widget.config.tvMac.isNotEmpty ? widget.config.tvMac : null,
      wifiName: _wifiName,
      wifiBssid: _wifiBssid,
    );
  }

  Future<void> _loadPlaylist() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await _api.fetchPlaylist(widget.config);
      if (!mounted) return;

      if (items.isEmpty) {
        setState(() {
          _items = [];
          _index = 0;
          _loading = false;
          _error = "Playlist kosong dari server.";
        });
        return;
      }

      setState(() {
        _items = items;
        final newIndex = _index.clamp(0, _items.length - 1).toInt();
        _index = newIndex;
        _loading = false;
      });

      await _initForCurrentItem();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = "Gagal memuat playlist: $e";
      });
    }
  }

  PlaylistItem? get _currentItem {
    if (_items.isEmpty) return null;
    if (_index < 0 || _index >= _items.length) return null;
    return _items[_index];
  }

  Future<void> _initForCurrentItem() async {
    _advanceLocked = false;
    _imageTimer?.cancel();
    _imageTimer = null;

    final oldVideo = _video;
    if (oldVideo != null) {
      oldVideo.removeListener(_handleVideoUpdate);
      await oldVideo.dispose();
    }
    _video = null;

    final item = _currentItem;
    if (item == null) return;

    if (item.type == "image" ||
        item.type == "img" ||
        item.type == "photo") {
      _prepareImage(item);
      if (mounted) {
        setState(() {});
      }
    } else {
      await _prepareVideo(item);
    }
  }

  void _prepareImage(PlaylistItem item) {
    if (_items.length <= 1) return;

    final seconds = (item.duration ?? 10).clamp(1, 3600).toInt();
    _imageTimer = Timer(Duration(seconds: seconds), () {
      if (!mounted) return;
      _next();
    });
  }

  Future<void> _prepareVideo(PlaylistItem item) async {
    final controller = VideoPlayerController.networkUrl(Uri.parse(item.url));
    _video = controller;

    try {
      await controller.initialize();
      controller.setLooping(false);
      await controller.play();
      controller.addListener(_handleVideoUpdate);

      if (mounted) {
        setState(() {});
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = "Gagal memutar video: $e";
      });
    }
  }

  void _handleVideoUpdate() {
    final controller = _video;
    if (controller == null) return;

    final value = controller.value;
    if (!value.isInitialized) return;

    final duration = value.duration;
    final position = value.position;

    if (duration > Duration.zero &&
        position >= duration &&
        !_advanceLocked) {
      _advanceLocked = true;
      if (_items.length > 1) {
        _next();
      }
    }

    // repaint progress / play state
    if (mounted) {
      setState(() {});
    }
  }

  void _next() {
    if (_items.isEmpty) return;
    setState(() {
      _index = (_index + 1) % _items.length;
    });
    _initForCurrentItem();
  }

  void _previous() {
    if (_items.isEmpty) return;
    setState(() {
      _index =
          (_index - 1) < 0 ? _items.length - 1 : (_index - 1) % _items.length;
    });
    _initForCurrentItem();
  }

  void _gotoIndex(int index) {
    if (_items.isEmpty) return;
    final clamped = index.clamp(0, _items.length - 1).toInt();
    setState(() {
      _index = clamped;
    });
    _initForCurrentItem();
  }

  void _startHideControlsTimer() {
    _hideControlsTimer?.cancel();
    _hideControlsTimer = Timer(const Duration(seconds: 6), () {
      if (!mounted) return;
      setState(() {
        _showControls = false;
      });
    });
  }

  void _resetHideControlsTimer() {
    if (!_showControls) {
      setState(() {
        _showControls = true;
      });
    }
    _startHideControlsTimer();
  }

  void _toggleControls() {
    setState(() {
      _showControls = !_showControls;
    });
    if (_showControls) {
      _startHideControlsTimer();
    } else {
      _hideControlsTimer?.cancel();
    }
  }

  void _play() {
    final c = _video;
    if (c == null || !c.value.isInitialized) return;
    c.play();
    setState(() {});
  }

  void _pause() {
    final c = _video;
    if (c == null || !c.value.isInitialized) return;
    c.pause();
    setState(() {});
  }

  void _togglePlayPause() {
    final c = _video;
    if (c == null || !c.value.isInitialized) return;
    if (c.value.isPlaying) {
      c.pause();
    } else {
      c.play();
    }
    setState(() {});
  }

  Future<void> _startCommandLoop() async {
    if (_commandLoopRunning) return;
    _commandLoopRunning = true;
    _stopCommandLoop = false;

    while (!_stopCommandLoop) {
      try {
        _commandCancelToken = CancelToken();
        final commands = await _api.fetchCommandsLongPoll(
          deviceCode: widget.config.deviceCode,
          cancelToken: _commandCancelToken,
        );

        if (!mounted) break;

        for (final cmd in commands) {
          await _handleRemoteCommand(cmd);
        }
      } catch (_) {
        if (_stopCommandLoop) break;
        await Future.delayed(const Duration(seconds: 2));
      }
    }

    _commandLoopRunning = false;
  }

  Future<void> _handleRemoteCommand(RemoteCommand cmd) async {
    final name = cmd.command.toLowerCase();
    final params = cmd.params ?? const <String, dynamic>{};

    switch (name) {
      case "next":
        _next();
        break;
      case "prev":
      case "previous":
        _previous();
        break;
      case "reload":
      case "refresh":
        await _loadPlaylist();
        break;
      case "goto":
        final dynamic indexRaw = params["index"];
        final dynamic idRaw = params["id"];

        if (indexRaw is int) {
          _gotoIndex(indexRaw);
        } else if (indexRaw is String) {
          final idx = int.tryParse(indexRaw);
          if (idx != null) _gotoIndex(idx);
        } else if (idRaw != null) {
          final id = idRaw.toString();
          final idx = _items.indexWhere((e) => e.id == id);
          if (idx != -1) _gotoIndex(idx);
        }
        break;
      case "play":
        _play();
        break;
      case "pause":
        _pause();
        break;
      case "toggle_play":
      case "playpause":
      case "toggle":
        _togglePlayPause();
        break;
      case "show_controls":
        if (!_showControls) {
          setState(() => _showControls = true);
        }
        _startHideControlsTimer();
        break;
      case "hide_controls":
        if (_showControls) {
          setState(() => _showControls = false);
        }
        _hideControlsTimer?.cancel();
        break;
      case "open_config":
      case "settings":
        widget.onChangeConfig();
        break;
      default:
        break;
    }

    await _api.ackCommand(cmd.id);
  }

  void _onUserNavigated(VoidCallback action) {
    action();
    _resetHideControlsTimer();
  }

  Widget _buildMainContent(PlaylistItem? item) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return _buildErrorView();
    }

    if (item == null) {
      return _buildEmptyView();
    }

    if (item.type == "image" ||
        item.type == "img" ||
        item.type == "photo") {
      return _buildImage(item);
    }

    return _buildVideo(item);
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline,
                color: Colors.redAccent, size: 64),
            const SizedBox(height: 16),
            const Text(
              'Gagal memuat playlist',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            if (_error != null)
              Text(
                _error!,
                style: const TextStyle(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadPlaylist,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba lagi'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.playlist_play,
                color: Colors.white70, size: 64),
            const SizedBox(height: 16),
            const Text(
              'Belum ada konten untuk diputar',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Device code: ${widget.config.deviceCode}',
              style: const TextStyle(color: Colors.white70),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadPlaylist,
              icon: const Icon(Icons.refresh),
              label: const Text('Muat ulang playlist'),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: widget.onChangeConfig,
              icon: const Icon(Icons.settings),
              label: const Text('Ubah pengaturan koneksi'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImage(PlaylistItem item) {
    final fit = (item.displayFit.toLowerCase() == "cover")
        ? BoxFit.cover
        : BoxFit.contain;

    return Container(
      color: Colors.black,
      alignment: Alignment.center,
      child: CachedNetworkImage(
        imageUrl: item.url,
        width: double.infinity,
        height: double.infinity,
        fit: fit,
        placeholder: (context, url) =>
            const Center(child: CircularProgressIndicator()),
        errorWidget: (context, url, error) => const Center(
          child: Icon(
            Icons.broken_image,
            size: 64,
            color: Colors.white54,
          ),
        ),
      ),
    );
  }

  Widget _buildVideo(PlaylistItem item) {
    final controller = _video;

    if (controller == null || !controller.value.isInitialized) {
      return const Center(child: CircularProgressIndicator());
    }

    final fit = (item.displayFit.toLowerCase() == "cover")
        ? BoxFit.cover
        : BoxFit.contain;

    final size = controller.value.size;
    final width = size.width == 0 ? 1920.0 : size.width;
    final height = size.height == 0 ? 1080.0 : size.height;

    return Container(
      color: Colors.black,
      alignment: Alignment.center,
      child: FittedBox(
        fit: fit,
        clipBehavior: Clip.hardEdge,
        child: SizedBox(
          width: width,
          height: height,
          child: VideoPlayer(controller),
        ),
      ),
    );
  }

  Widget _buildOverlayControls(PlaylistItem? item) {
    final controller = _video;
    final isVideo = item != null &&
        !(item.type == "image" || item.type == "img" || item.type == "photo");

    final initializedController = (isVideo &&
            controller != null &&
            controller.value.isInitialized)
        ? controller
        : null;
    final isPlaying = initializedController?.value.isPlaying ?? false;

    return IgnorePointer(
      ignoring: false,
      child: Stack(
        children: [
          Align(
            alignment: Alignment.topCenter,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Row(
                children: [
                  _buildBrandChip(),
                  const Spacer(),
                  _buildStatusIndicators(),
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Color(0xCC000000),
                    Color(0x00000000),
                  ],
                ),
              ),
              padding:
                  const EdgeInsets.fromLTRB(24, 24, 24, 32),
              child: ConstrainedBox(
                constraints:
                    const BoxConstraints(maxWidth: 900),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment:
                      CrossAxisAlignment.stretch,
                  children: [
                    if (item != null) ...[
                      Text(
                        item.title.isEmpty
                            ? 'Item ${_index + 1} / ${_items.length}'
                            : item.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.url,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.white54,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 16),
                    ],
                    Row(
                      mainAxisAlignment:
                          MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 220,
                          child: _TvButton(
                            focusNode: _prevFocus,
                            onPressed: _items.length <= 1
                                ? null
                                : () => _onUserNavigated(
                                      _previous,
                                    ),
                            icon: Icons.skip_previous,
                            label: 'Sebelumnya',
                            isPrimary: false,
                          ),
                        ),
                        const SizedBox(width: 16),
                        SizedBox(
                          width: 240,
                          child: _TvButton(
                            focusNode: _playPauseFocus,
                            onPressed: isVideo
                                ? () => _onUserNavigated(
                                      _togglePlayPause,
                                    )
                                : null,
                            icon: isPlaying
                                ? Icons.pause
                                : Icons.play_arrow,
                            label: isVideo
                                ? (isPlaying
                                    ? 'Jeda'
                                    : 'Putar')
                                : 'Tidak ada video',
                            isPrimary: true,
                          ),
                        ),
                        const SizedBox(width: 16),
                        SizedBox(
                          width: 220,
                          child: _TvButton(
                            focusNode: _nextFocus,
                            onPressed: _items.length <= 1
                                ? null
                                : () => _onUserNavigated(
                                      _next,
                                    ),
                            icon: Icons.skip_next,
                            label: 'Berikutnya',
                            isPrimary: false,
                          ),
                        ),
                        const SizedBox(width: 16),
                        SizedBox(
                          width: 240,
                          child: _TvButton(
                            focusNode: _settingsFocus,
                            onPressed: () {
                              _hideControlsTimer
                                  ?.cancel();
                              widget.onChangeConfig();
                            },
                            icon: Icons.settings,
                            label: 'Pengaturan',
                            isPrimary: false,
                          ),
                        ),
                      ],
                    ),
                    if (initializedController != null) ...[
                      const SizedBox(height: 16),
                      _buildVideoProgressBar(initializedController),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBrandChip() {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: kBrandColor.withValues(alpha: 0.7),
        ),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.tv, color: kBrandColor, size: 20),
          SizedBox(width: 8),
          Text(
            kBrandName,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              letterSpacing: 0.6,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicators() {
    IconData icon;
    String label;

    if (_connectivity == ConnectivityResult.wifi) {
      icon = Icons.wifi;
      label = _wifiName ?? "Wi‑Fi";
    } else if (_connectivity == ConnectivityResult.mobile) {
      icon = Icons.signal_cellular_4_bar;
      label = "Mobile data";
    } else if (_connectivity == ConnectivityResult.none) {
      icon = Icons.wifi_off;
      label = "Offline";
    } else {
      icon = Icons.device_hub;
      label = "Connected";
    }

    final ip = _ipAddress;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(
              horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: Colors.white70),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.white70,
                ),
              ),
              if (ip != null && ip.isNotEmpty) ...[
                const SizedBox(width: 8),
                Text(
                  ip,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.white54,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(
              horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            "Device: ${widget.config.deviceCode}",
            style: const TextStyle(
              fontSize: 12,
              color: Colors.white70,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVideoProgressBar(VideoPlayerController controller) {
    final value = controller.value;
    final duration = value.duration;
    final position = value.position;

    double progress = 0;
    if (duration.inMilliseconds > 0) {
      progress = position.inMilliseconds /
          duration.inMilliseconds;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Slider(
          value: progress.clamp(0.0, 1.0).toDouble(),
          onChanged: (v) {
            final newMillis =
                (duration.inMilliseconds * v).toInt();
            controller.seekTo(
              Duration(milliseconds: newMillis),
            );
          },
        ),
        Row(
          mainAxisAlignment:
              MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _formatDuration(position),
              style: const TextStyle(
                fontSize: 12,
                color: Colors.white70,
              ),
            ),
            Text(
              _formatDuration(duration),
              style: const TextStyle(
                fontSize: 12,
                color: Colors.white70,
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _formatDuration(Duration d) {
    String twoDigits(int n) =>
        n.toString().padLeft(2, '0');
    final twoDigitMinutes =
        twoDigits(d.inMinutes.remainder(60));
    final twoDigitSeconds =
        twoDigits(d.inSeconds.remainder(60));
    if (d.inHours > 0) {
      return '${twoDigits(d.inHours)}:$twoDigitMinutes:$twoDigitSeconds';
    }
    return '$twoDigitMinutes:$twoDigitSeconds';
  }

  @override
  Widget build(BuildContext context) {
    final item = _currentItem;

    return Scaffold(
      backgroundColor: Colors.black,
      body: CallbackShortcuts(
        bindings: {
          const SingleActivator(
            LogicalKeyboardKey.arrowRight,
          ): () => _onUserNavigated(_next),
          const SingleActivator(
            LogicalKeyboardKey.arrowLeft,
          ): () => _onUserNavigated(_previous),
          const SingleActivator(
            LogicalKeyboardKey.space,
          ): () => _onUserNavigated(_togglePlayPause),
          const SingleActivator(
            LogicalKeyboardKey.select,
          ): _toggleControls,
        },
        child: FocusTraversalGroup(
          policy: OrderedTraversalPolicy(),
          child: Focus(
            autofocus: true,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _toggleControls,
              onDoubleTap: _togglePlayPause,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _buildMainContent(item),
                  if (_showControls)
                    _buildOverlayControls(item),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
