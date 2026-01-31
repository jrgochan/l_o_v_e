import SwiftUI
import SwiftData
import SoulCore

@available(macOS 14, iOS 17, *)
public struct ChatView: View {
    @StateObject private var viewModel = ChatViewModel()
    @Query(sort: \Message.timestamp, order: .forward) private var messages: [Message]
    @Environment(\.modelContext) private var modelContext

    // Callback to main app
    public var onSend: ((String) -> Void)?
    public var onMicTap: (() -> Void)?
    @Binding public var isRecording: Bool

    // Streaming Bindings
    @Binding public var streamingText: String
    @Binding public var isThinking: Bool
    @Binding public var isReflecting: Bool
    @Binding public var thoughtContent: String
    @Binding public var transcribedText: String

    public init(isRecording: Binding<Bool>,
                streamingText: Binding<String> = .constant(""),
                isThinking: Binding<Bool> = .constant(false),
                isReflecting: Binding<Bool> = .constant(false),
                thoughtContent: Binding<String> = .constant(""),
                transcribedText: Binding<String> = .constant(""),
                onSend: ((String) -> Void)? = nil,
                onMicTap: (() -> Void)? = nil) {
        self._isRecording = isRecording
        self._streamingText = streamingText
        self._isThinking = isThinking
        self._isReflecting = isReflecting
        self._thoughtContent = thoughtContent
        self._transcribedText = transcribedText
        self.onSend = onSend
        self.onMicTap = onMicTap
    }

    public var body: some View {
        VStack {
            // Message List
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(messages) { msg in
                            MessageBubble(message: msg)
                        }

                        // Streaming / Thinking Indicator (The "Ghost Bubble")
                        if isThinking || !streamingText.isEmpty {
                            HStack {
                                Text(streamingText.isEmpty ? "..." : streamingText)
                                    .padding(12)
                                    .background(Color.black.opacity(0.4))
                                    .background(.ultraThinMaterial)
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(.white.opacity(0.1), lineWidth: 1)
                                    )
                                    .foregroundStyle(.white.opacity(streamingText.isEmpty ? 0.5 : 1.0))
                                    .symbolEffect(
                                        .pulse,
                                        isActive: isThinking && streamingText.isEmpty
                                    ) // Pulse if just thinking
                                    .id("GhostBubble")

                                Spacer()
                            }
                            .transition(.opacity)
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) {
                    scrollToBottom(proxy: proxy)
                }
                .onChange(of: streamingText) { _, _ in
                    scrollToBottom(proxy: proxy, id: "GhostBubble")
                }
                .onChange(of: isThinking) { _, newValue in
                    if newValue { scrollToBottom(proxy: proxy, id: "GhostBubble") }
                }
            }

            // ... (Input Field remains same)
            inputSection
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy, id: (any Hashable)? = nil) {
        withAnimation {
            if let target = id {
                proxy.scrollTo(target, anchor: .bottom)
            } else if let last = messages.last {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }

    var inputSection: some View {
        VStack(spacing: 8) {
            // Thought Bubble Overlay
            if isReflecting {
                HStack {
                    Image(systemName: "sparkles")
                        .symbolEffect(.variableColor.iterative.reversing)
                    Text(thoughtContent.isEmpty ? "Reflecting..." : thoughtContent)
                        .font(.caption.italic())
                        .multilineTextAlignment(.leading)
                    Spacer()
                }
                .padding(12)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.teal.opacity(0.3), lineWidth: 1))
                .padding(.horizontal, 20)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            HStack {
            TextField(isRecording ? "Listening..." : "Talk to the Soul...", text: $viewModel.inputText)
                .textFieldStyle(.plain)
                .padding(12)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .onSubmit {
                    sendMessage()
                }

            // Mic Button
            Button(action: { onMicTap?() }, label: {
                Image(systemName: isRecording ? "stop.circle.fill" : "mic.circle.fill")
                    .font(.title)
                    .foregroundStyle(isRecording ? .red : .white.opacity(0.8))
                    .symbolEffect(.pulse, isActive: isRecording)
            })
            .buttonStyle(.plain)

            // Send Button
            Button(action: sendMessage) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title)
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
            .disabled(viewModel.inputText.isEmpty && !isRecording)
        }
        .padding()
        .background(.ultraThinMaterial.opacity(0.3))
        .onChange(of: transcribedText) { _, newVal in
            SoulLog.brain.debug("💬 ChatView received text: '\(newVal)' (Recording: \(isRecording))")
            if isRecording {
                viewModel.inputText = newVal
            }
        }
    }
    }
    private func sendMessage() {
        let text = viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        // 1. Clear Input
        viewModel.inputText = ""

        // 2. Trigger Brain Processing (which saves the message)
        onSend?(text)
    }
}
