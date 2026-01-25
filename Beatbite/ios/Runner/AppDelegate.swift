import UIKit
import Flutter
import AVFoundation

@main
@objc class AppDelegate: FlutterAppDelegate {

    private var audioEngine: AudioEngine?

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        GeneratedPluginRegistrant.register(with: self)

        // Set up method channel
        let controller = window?.rootViewController as! FlutterViewController
        let channel = FlutterMethodChannel(
            name: "com.beatbite/audio",
            binaryMessenger: controller.binaryMessenger
        )

        audioEngine = AudioEngine()

        channel.setMethodCallHandler { [weak self] (call, result) in
            guard let self = self else { return }

            switch call.method {
            case "initialize":
                let args = call.arguments as? [String: Any] ?? [:]
                let sampleRate = args["sampleRate"] as? Int ?? 48000
                let bufferSize = args["bufferSize"] as? Int ?? 256
                let channels = args["channels"] as? Int ?? 1

                let success = self.audioEngine?.initialize(
                    sampleRate: sampleRate,
                    bufferSize: bufferSize,
                    channels: channels
                ) ?? false
                result(success)

            case "startPassthrough":
                let success = self.audioEngine?.startPassthrough() ?? false
                result(success)

            case "stopPassthrough":
                self.audioEngine?.stopPassthrough()
                result(nil)

            case "measureLatency":
                let latency = self.audioEngine?.measureLatency() ?? -1.0
                result(latency)

            case "setInputGain":
                let args = call.arguments as? [String: Any] ?? [:]
                let gain = args["gain"] as? Float ?? 1.0
                self.audioEngine?.setInputGain(gain)
                result(nil)

            case "setOutputVolume":
                let args = call.arguments as? [String: Any] ?? [:]
                let volume = args["volume"] as? Float ?? 1.0
                self.audioEngine?.setOutputVolume(volume)
                result(nil)

            case "dispose":
                self.audioEngine?.dispose()
                result(nil)

            default:
                result(FlutterMethodNotImplemented)
            }
        }

        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }
}
