import SwiftUI
import SoulCore

public struct ModelSettingsView: View {
    @StateObject private var modelManager = ModelManager.shared

    // Recommended Model
    let recommendedURL = URL(string: "https://huggingface.co/mlx-community/Llama-3.2-3B-Instruct-4bit/resolve/main/model.safetensors?download=true")!
    let recommendedFilename = "model.safetensors"

    public init() {}

    public var body: some View {
        Form {
            Section(header: Text("Active Intelligence")) {
                if modelManager.localModels.isEmpty {
                    Text("No models installed. Using Simulation Mode.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(modelManager.localModels) { model in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(model.name)
                                    .font(.headline)
                                Text(ByteCountFormatter.string(fromByteCount: model.size, countStyle: .file))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if modelManager.activeModelId == model.id {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Button("Select") {
                                    modelManager.activeModelId = model.id
                                }
                            }
                        }
                        .contextMenu {
                            Button(role: .destructive) {
                                modelManager.deleteModel(id: model.id)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
            }

            Section(header: Text("Download")) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Llama 3.2 3B Instruct (4-bit)")
                        .font(.headline)
                    Text("Recommended for most Macs. ~2.0 GB")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if modelManager.isDownloading {
                        ProgressView(value: modelManager.downloadProgress) {
                            Text("\(Int(modelManager.downloadProgress * 100))%")
                        }
                    } else if modelManager.localModels.contains(where: { $0.url.lastPathComponent == recommendedFilename }) {
                         Text("✓ Model Installed")
                             .foregroundStyle(.green)
                             .font(.caption)
                    } else {
                        Button(action: {
                            modelManager.downloadModel(url: recommendedURL, filename: recommendedFilename)
                        }, label: {
                            Label("Download from HuggingFace", systemImage: "icloud.and.arrow.down")
                        })
                        .disabled(modelManager.isDownloading)
                    }
                }
                .padding(.vertical, 5)
            }

            Section(header: Text("Location")) {
                HStack {
                    Text(modelManager.modelsDirectory.path)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)

                    Spacer()

                    Button(action: {
                        NSWorkspace.shared.open(modelManager.modelsDirectory)
                    }, label: {
                        Image(systemName: "folder")
                    })
                }
            }
        }
        .padding()
        .onAppear {
            modelManager.refreshModels()
        }
        .navigationTitle("Brain Settings")
    }
}
