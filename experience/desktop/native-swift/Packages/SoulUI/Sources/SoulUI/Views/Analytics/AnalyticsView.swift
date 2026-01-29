import SwiftUI
import Charts
import SoulCore
import SwiftData

/// Visualizes session data using Swift Charts.
@available(macOS 14, iOS 17, *)
public struct AnalyticsView: View {
    @State private var selectedSession: SessionAnalytics?
    
    public init() {}
    
    public var body: some View {
        NavigationSplitView {
            HistorySessionList(selectedSession: $selectedSession)
                .navigationTitle("History")
        } detail: {
            if let session = selectedSession {
                HistorySessionDetail(session: session)
            } else {
                ContentUnavailableView("Select a Session", systemImage: "chart.xyaxis.line", description: Text("View detailed analytics for past sessions."))
            }
        }
    }
}

@available(macOS 14, iOS 17, *)
public struct HistorySessionList: View {
    @Query(sort: \SessionAnalytics.startTime, order: .reverse) private var sessions: [SessionAnalytics]
    @Binding var selectedSession: SessionAnalytics?
    
    public init(selectedSession: Binding<SessionAnalytics?>) {
        self._selectedSession = selectedSession
    }
    
    public var body: some View {
        List(selection: $selectedSession) {
            ForEach(sessions) { session in
                NavigationLink(value: session) {
                    VStack(alignment: .leading) {
                        Text(session.startTime.formatted(date: .abbreviated, time: .shortened))
                            .font(.headline)
                        HStack {
                            Text("\(session.messageCount) msgs")
                            Spacer()
                            Text(formatDuration(session.duration))
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
    
    func formatDuration(_ interval: TimeInterval) -> String {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.minute, .second]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: interval) ?? ""
    }
}

@available(macOS 14, iOS 17, *)
public struct HistorySessionDetail: View {
    let session: SessionAnalytics
    @State private var showReplay = false
    
    // Derived metrics
    var metrics: [SessionAnalytics.SessionMetric] {
        session.getMetrics()
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                
                // Header & Actions
                HStack {
                    Text("Details")
                        .font(.title2.bold())
                    
                    Spacer()
                    
                    Button(action: { showReplay = true }, label: {
                        Label("Replay Session", systemImage: "play.fill")
                    })
                    .buttonStyle(.borderedProminent)
                    .tint(.purple)
                    .disabled(metrics.isEmpty)
                }
                .padding(.bottom, 8)
                
                // Summary Cards
                HStack(spacing: 16) {
                    MetricCard(title: "Duration", value: formatDuration(session.duration), icon: "clock")
                    MetricCard(title: "Interactions", value: "\(session.messageCount)", icon: "bubble.left.and.bubble.right")
                    MetricCard(title: "End Vibe", value: String(format: "V:%.1f", session.endValence ?? session.startValence), icon: "face.smiling")
                }
                
                Divider()
                
                if metrics.isEmpty {
                    ContentUnavailableView("No Data Points", systemImage: "waveform.path.ecg", description: Text("This session has no recorded time-series data."))
                } else {
                    // Charts
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Emotional Journey (Valence)", systemImage: "brain.head.profile")
                            .font(.headline)
                        
                        Chart(metrics) { point in
                            LineMark(
                                x: .value("Time", point.timestamp),
                                y: .value("Valence", point.valence)
                            )
                            .foregroundStyle(Color.blue.gradient)
                            .interpolationMethod(.catmullRom)
                            
                            AreaMark(
                                x: .value("Time", point.timestamp),
                                y: .value("Valence", point.valence)
                            )
                            .foregroundStyle(LinearGradient(colors: [.blue.opacity(0.3), .clear], startPoint: .top, endPoint: .bottom))
                            .interpolationMethod(.catmullRom)
                        }
                        .frame(height: 200)
                        .chartYScale(domain: -1...1)
                    }
                    .padding()
                    .background(RoundedRectangle(cornerRadius: 16).fill(.white.opacity(0.05)))
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Biometric Response (Heart Rate)", systemImage: "heart.fill")
                            .font(.headline)
                            .foregroundStyle(.pink)
                        
                        Chart(metrics) { point in
                            LineMark(
                                x: .value("Time", point.timestamp),
                                y: .value("Heart Rate", point.heartRate)
                            )
                            .foregroundStyle(Color.pink.gradient)
                            .interpolationMethod(.catmullRom)
                        }
                        .frame(height: 200)
                        .chartYScale(domain: 40...140) // Human range assumption
                    }
                    .padding()
                    .background(RoundedRectangle(cornerRadius: 16).fill(.white.opacity(0.05)))
                    
                    // Arousal vs Heart Rate Correlation
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Arousal vs Heart Rate", systemImage: "bolt.fill")
                            .font(.headline)
                        
                        Chart(metrics) { point in
                            PointMark(
                                x: .value("Arousal", point.arousal),
                                y: .value("Heart Rate", point.heartRate)
                            )
                            .foregroundStyle(.purple)
                        }
                        .frame(height: 200)
                        .chartXScale(domain: -1...1)
                    }
                    .padding()
                    .background(RoundedRectangle(cornerRadius: 16).fill(.white.opacity(0.05)))
                }
            }
            .padding()
        }
        .navigationTitle("Session Details")
        .sheet(isPresented: $showReplay) {
            SessionReplayView(session: session)
                #if os(macOS)
                .frame(minWidth: 800, minHeight: 600)
                #endif
        }
    }
    
    func formatDuration(_ interval: TimeInterval) -> String {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.minute, .second]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: interval) ?? ""
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                Text(title)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            
            Text(value)
                .font(.title2.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(RoundedRectangle(cornerRadius: 12).fill(.white.opacity(0.1)))
    }
}
