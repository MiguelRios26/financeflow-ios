import WidgetKit
import SwiftUI

struct VoiceEntry: TimelineEntry {
    let date: Date
}

struct VoiceProvider: TimelineProvider {
    func placeholder(in context: Context) -> VoiceEntry {
        VoiceEntry(date: Date())
    }
    func getSnapshot(in context: Context, completion: @escaping (VoiceEntry) -> Void) {
        completion(VoiceEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<VoiceEntry>) -> Void) {
        let entry = VoiceEntry(date: Date())
        completion(Timeline(entries: [entry], policy: .never))
    }
}

extension View {
    @ViewBuilder
    func ffWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(Color(red: 0.02, green: 0.05, blue: 0.09), for: .widget)
        } else {
            self.background(Color(red: 0.02, green: 0.05, blue: 0.09))
        }
    }
}

struct FinanceFlowWidgetEntryView: View {
    var entry: VoiceProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Link(destination: URL(string: "financeflow://voice")!) {
            ZStack {
                Circle().fill(Color(red: 0.12, green: 0.44, blue: 0.66))
                Image(systemName: "mic.fill")
                    .font(.system(size: family == .accessoryCircular ? 20 : 24, weight: .semibold))
                    .foregroundColor(.white)
            }
            .padding(family == .accessoryCircular ? 0 : 14)
        }
        .ffWidgetBackground()
    }
}

@main
struct FinanceFlowWidget: Widget {
    let kind: String = "FinanceFlowVoiceWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: VoiceProvider()) { entry in
            FinanceFlowWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("FinanceFlow — Voz")
        .description("Registre um gasto ou receita por comando de voz, direto da tela de bloqueio ou inicial.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}

