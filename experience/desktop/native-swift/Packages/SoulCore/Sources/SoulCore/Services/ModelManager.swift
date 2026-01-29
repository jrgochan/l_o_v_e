import Foundation
import Combine

public struct LocalModel: Identifiable, Hashable {
    public let id: String
    public let name: String
    public let url: URL
    public let size: Int64
    public let format: String // "gguf", "safetensors"
    
    public init(url: URL) {
        self.url = url
        self.id = url.lastPathComponent
        self.name = url.lastPathComponent
        self.format = url.pathExtension
        self.size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
    }
}

@MainActor
public class ModelManager: ObservableObject {
    public static let shared = ModelManager()
    
    @Published public var localModels: [LocalModel] = []
    @Published public var downloadProgress: Double = 0.0
    @Published public var isDownloading: Bool = false
    @Published public var activeModelId: String? {
        didSet {
            UserDefaults.standard.set(activeModelId, forKey: "activeLLMModelId")
        }
    }
    
    private let fileManager = FileManager.default
    private var downloadTask: URLSessionDownloadTask?
    
    // Directory: ~/Documents/models (Default)
    // Can be overridden for testing
    public var modelsDirectory: URL
    
    private init() {
        self.activeModelId = UserDefaults.standard.string(forKey: "activeLLMModelId")
        
        // Default path
        let paths = fileManager.urls(for: .documentDirectory, in: .userDomainMask)
        let documentsDirectory = paths[0]
        self.modelsDirectory = documentsDirectory.appendingPathComponent("models")
        
        createDirectoryIfNeeded()
        refreshModels()
    }
    
    // For Testing
    public convenience init(directory: URL) {
        self.init()
        self.modelsDirectory = directory
        createDirectoryIfNeeded()
        refreshModels()
    }
    
    private func createDirectoryIfNeeded() {
        if !fileManager.fileExists(atPath: modelsDirectory.path) {
            try? fileManager.createDirectory(at: modelsDirectory, withIntermediateDirectories: true)
        }
        
        // Also create a "llama3" specific folder if we want to organize
        let llamaDir = modelsDirectory.appendingPathComponent("llama3")
        if !fileManager.fileExists(atPath: llamaDir.path) {
            try? fileManager.createDirectory(at: llamaDir, withIntermediateDirectories: true)
        }
    }
    
    public func refreshModels() {
        do {
            // Recursive scan or just top level? Let's do recursive to find nested 'model.safetensors'
            let resourceKeys: [URLResourceKey] = [.fileSizeKey, .nameKey]
            let enumerator = fileManager.enumerator(at: modelsDirectory, includingPropertiesForKeys: resourceKeys, options: [.skipsHiddenFiles])
            
            var foundModels: [LocalModel] = []
            
            while let url = enumerator?.nextObject() as? URL {
                if url.pathExtension == "safetensors" || url.pathExtension == "gguf" {
                    foundModels.append(LocalModel(url: url))
                }
            }
            
            self.localModels = foundModels
            print("📦 ModelManager: Found \(foundModels.count) models.")
        } // catch? Enumerator doesn't throw directly but effectively handles it
    }
    
    public func downloadModel(url: URL, filename: String) {
        guard !isDownloading else { return }
        
        isDownloading = true
        downloadProgress = 0.0
        
        let destination = modelsDirectory.appendingPathComponent("llama3").appendingPathComponent(filename)
        
        let session = URLSession(configuration: .default, delegate: nil, delegateQueue: nil)
        
        // Simple download task for now (no progress delegate in this simple block, but we can simulate or upgrade)
        // For Phase 24, let's use a background task with delegate if we want real progress, 
        // OR just a simple data task and assume we want to mock progress for the "Experience" if the file is huge.
        // But the user asked for "Robust".
        // Let's implement a wrapper that handles progress.
        // Actually, for simplicity and robustness in this snippet, let's start with a simulation 
        // IF the URL is a "test" URL, but support real download.
        
        print("⬇️ ModelManager: Starting download from \(url)")
        
        Task {
            // Real download logic utilizing async bytes if possible for progress
            do {
                let (bytes, response) = try await session.bytes(from: url)
                let totalBytes = response.expectedContentLength
                
                var data = Data()
                data.reserveCapacity(Int(totalBytes))
                
                var accumulated = 0
                
                for try await byte in bytes {
                    data.append(byte)
                    accumulated += 1
                    
                    if accumulated % 100000 == 0 { // Update occasionally
                        let progress = Double(accumulated) / Double(totalBytes)
                        await MainActor.run {
                            self.downloadProgress = progress
                        }
                    }
                }
                
                try data.write(to: destination)
                
                await MainActor.run {
                    self.isDownloading = false
                    self.downloadProgress = 1.0
                    self.refreshModels()
                }
                print("✅ ModelManager: Download complete!")
                
            } catch {
                print("❌ ModelManager: Download failed: \(error)")
                await MainActor.run {
                    self.isDownloading = false
                }
            }
        }
    }
    
    public func deleteModel(id: String) {
        guard let model = localModels.first(where: { $0.id == id }) else { return }
        try? fileManager.removeItem(at: model.url)
        refreshModels()
    }
    
    public func getModelUrl(id: String) -> URL? {
        return localModels.first(where: { $0.id == id })?.url
    }
}
