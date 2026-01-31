import Foundation
import SoulCore
import OSLog

/// A provider that connects to an external inference server (e.g., Python/FastAPI)
/// via HTTP POST, supporting streaming responses.
@available(macOS 14, iOS 17, *)
public actor ExternalInferenceProvider: InferenceProvider {
    
    private let endpoint: URL
    private let session: URLSession
    private let logger = SoulLog.brain
    
    public init(url: URL = URL(string: "http://localhost:8000/stream")!) {
        self.endpoint = url
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60 // Long timeout for generation
        self.session = URLSession(configuration: config)
    }
    
    public var isReady: Bool {
        get async {
            // Simple health check
            var request = URLRequest(url: endpoint)
            request.httpMethod = "HEAD"
            do {
                let (_, response) = try await session.data(for: request)
                if let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 200 {
                    return true
                }
                // Some servers might return 405 Method Not Allowed for HEAD, which is technically "alive"
                if let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 405 {
                    return true
                }
                return false
            } catch {
                logger.warning("💓 External Provider Health Check failed: \(error.localizedDescription)")
                return false
            }
        }
    }
    
    public func load() async throws {
        // No local loading needed, but we could verify connection
        if await !isReady {
            logger.warning("External server at \(self.endpoint) appears down during load.")
            // Don't throw, just warn, as it might come up later
        } else {
            logger.info("Connected to external inference server at \(self.endpoint).")
        }
    }
    
    public func generate(prompt: String) async -> AsyncStream<String> {
        AsyncStream { continuation in
            var request = URLRequest(url: endpoint)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            // Simple JSON payload
            let body: [String: Any] = [
                "prompt": prompt,
                "stream": true,
                "max_tokens": 512,
                "temperature": 0.7
            ]
            
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
            } catch {
                logger.error("Failed to serialize request: \(error)")
                continuation.finish()
                return
            }
            
            // Async implementation using URLSession.bytes(for:) for streaming
            
            // Async implementation
            Task {
                do {
                    let (bytes, response) = try await session.bytes(for: request)
                    
                    guard let httpResponse = response as? HTTPURLResponse, 
                          (200...299).contains(httpResponse.statusCode) else {
                        logger.error("Server returned bad status code")
                        continuation.finish()
                        return
                    }
                    
                    for try await line in bytes.lines {
                        // Assuming SSE format: "data: <token>" or just raw text lines?
                        // Let's assume the server sends raw text chunks or standard SSE.
                        // Standard SSE: "data: {json}\n\n"
                        // Simple Python: Just yields strings.
                        
                        // Let's implement a robust parser for standard SSE "data: " prefix
                        var cleanLine = line
                        if cleanLine.hasPrefix("data: ") {
                            cleanLine = String(cleanLine.dropFirst(6))
                        }
                        
                        if cleanLine == "[DONE]" { break }
                        
                        // Check if it's JSON encoded
                        // If the server sends `data: {"text": "hello"}`, parse it.
                        // If raw text, just yield.
                        
                        // Try to parse as simple JSON envelope if it looks like one
                        if cleanLine.starts(with: "{") && cleanLine.hasSuffix("}") {
                            if let data = cleanLine.data(using: .utf8),
                               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                               let token = json["text"] as? String { // "choices[0].text" etc is standard, but let's assume simple
                                continuation.yield(token)
                            } else {
                                // Fallback: just yield the line content if parsing fails? 
                                // Or maybe it IS the content.
                                // Let's try standard OpenAI format parsing just in case
                                if let data = cleanLine.data(using: .utf8),
                                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                                   let choices = json["choices"] as? [[String: Any]],
                                   let first = choices.first,
                                   let text = first["text"] as? String {
                                    continuation.yield(text)
                                } else if let data = cleanLine.data(using: .utf8),
                                          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                                          let choices = json["choices"] as? [[String: Any]],
                                          let first = choices.first,
                                          let delta = first["delta"] as? [String: Any],
                                          let content = delta["content"] as? String {
                                    continuation.yield(content)
                                } else {
                                    // Raw string fallback
                                    continuation.yield(cleanLine + "\n")
                                }
                            }
                        } else {
                            // Raw text line
                             if !cleanLine.isEmpty {
                                 continuation.yield(cleanLine + " ") // Add space if line breaks are tokens
                             }
                        }
                    }
                    continuation.finish()
                } catch {
                    logger.error("Streaming failed: \(error)")
                    continuation.finish()
                }
            }
        }
    }
}
