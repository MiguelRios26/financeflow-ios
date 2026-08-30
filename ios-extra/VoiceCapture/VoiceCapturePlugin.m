#import <Capacitor/Capacitor.h>

CAP_PLUGIN(VoiceCapturePlugin, "VoiceCapture",
  CAP_PLUGIN_METHOD(startListening, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(stopListening, CAPPluginReturnPromise);
)
