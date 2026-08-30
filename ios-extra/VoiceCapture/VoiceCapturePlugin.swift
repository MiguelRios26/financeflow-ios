import Foundation
import Capacitor
import Speech
import AVFoundation

// Plugin nativo de captura de voz para iOS: escuta o microfone com
// SFSpeechRecognizer + AVAudioEngine e resolve automaticamente assim que
// detecta uma pausa na fala (ou apos 10s no maximo). Criado porque o plugin
// de terceiros @capacitor-community/speech-recognition se mostrou instavel
// neste app (travava sem capturar audio, ou derrubava o app na 2a chamada).
@objc(VoiceCapturePlugin)
public class VoiceCapturePlugin: CAPPlugin {
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var speechRecognizer: SFSpeechRecognizer?
    private var silenceTimer: Timer?
    private var lastText: String = ""
    private var finished = false

    @objc func startListening(_ call: CAPPluginCall) {
        finished = false
        lastText = ""

        SFSpeechRecognizer.requestAuthorization { [weak self] authStatus in
            guard let self = self else { return }
            guard authStatus == .authorized else {
                DispatchQueue.main.async { call.reject("Permissao de reconhecimento de voz negada.") }
                return
            }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                guard granted else {
                    DispatchQueue.main.async { call.reject("Permissao de microfone negada.") }
                    return
                }
                DispatchQueue.main.async { self.beginRecognition(call) }
            }
        }
    }

    private func beginRecognition(_ call: CAPPluginCall) {
        recognitionTask?.cancel()
        recognitionTask = nil
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }

        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            call.reject("Falha ao configurar sessao de audio: \(error.localizedDescription)")
            return
        }

        let recognizerOrNil = SFSpeechRecognizer(locale: Locale(identifier: "pt-BR")) ?? SFSpeechRecognizer()
        guard let recognizer = recognizerOrNil, recognizer.isAvailable else {
            call.reject("Reconhecimento de voz nao disponivel no momento.")
            return
        }
        speechRecognizer = recognizer

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        recognitionRequest = request

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            call.reject("Falha ao iniciar o microfone: \(error.localizedDescription)")
            return
        }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result {
                let text = result.bestTranscription.formattedString
                let isFinal = result.isFinal
                DispatchQueue.main.async {
                    self.lastText = text
                    if isFinal {
                        self.finishRecognition(call)
                    } else {
                        self.silenceTimer?.invalidate()
                        self.silenceTimer = Timer.scheduledTimer(withTimeInterval: 1.6, repeats: false) { [weak self] _ in
                            self?.finishRecognition(call)
                        }
                    }
                }
            }
            if error != nil {
                DispatchQueue.main.async { self.finishRecognition(call) }
            }
        }

        // Rede de seguranca: encerra em 10s mesmo sem detectar pausa na fala.
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            self?.finishRecognition(call)
        }
    }

    private func finishRecognition(_ call: CAPPluginCall) {
        if finished { return }
        finished = true
        silenceTimer?.invalidate()
        silenceTimer = nil
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        call.resolve(["text": lastText])
    }

    @objc func stopListening(_ call: CAPPluginCall) {
        call.resolve()
    }
}
