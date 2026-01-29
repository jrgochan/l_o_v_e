import MetalKit
import SoulCore

// MARK: - Pipeline Configuration
extension SoulRenderer {

    internal func buildPipeline() {
        // 1. Load Library
        guard let library = loadMetalLibrary() else { return }

        // 2. Depth State
        configureDepthState()

        // 3. Configure Pipelines
        configureLiquidPipeline(library: library)
        configurePointPipeline(library: library)
        configurePathPipeline(library: library)

        print("🏁 buildPipeline completed")
    }

    private func loadMetalLibrary() -> MTLLibrary? {
        print("🔍 Debugging Metal Library Loading...")
        print("📂 Bundle.main path: \(Bundle.main.bundlePath)")

        // Strategy 1: Automatic Bundle.module with Named Library
        do {
            let bundle = Bundle.module
            print("📦 Bundle.module path: \(bundle.bundlePath)")

            if let libURL = bundle.url(forResource: "SoulUI", withExtension: "metallib") {
                let library = try device.makeLibrary(URL: libURL)
                print("✅ Found SoulUI.metallib at \(libURL.lastPathComponent)")
                return library
            } else {
                let library = try device.makeDefaultLibrary(bundle: bundle)
                print("✅ Found default.metallib in Bundle.module")
                return library
            }
        } catch {
            print("⚠️ Bundle.module load failed: \(error)")
        }

        // Strategy 2: Explicit Search for SoulUI_SoulUI.bundle
        if let bundleURL = Bundle.main.url(forResource: "SoulUI_SoulUI", withExtension: "bundle"),
           let bundle = Bundle(url: bundleURL) {
            print("📦 Found explicit SoulUI_SoulUI.bundle at \(bundleURL)")
            if let library = try? device.makeDefaultLibrary(bundle: bundle) {
                print("✅ Loaded from explicit SoulUI bundle")
                return library
            }
        }

        // Strategy 3: Bundle.main Fallback
        print("⚠️ Trying Bundle.main...")
        if let library = try? device.makeDefaultLibrary(bundle: Bundle.main) {
            return library
        }

        // Strategy 4: Device Default
        print("⚠️ Trying System Default...")
        if let library = device.makeDefaultLibrary() {
            return library
        }

        print("❌ ABSOLUTE FAILURE: Could not load Metal library in any way.")
        return nil
    }

    private func configureDepthState() {
        print("⚙️ creating Depth State...")
        let depthDesc = MTLDepthStencilDescriptor()
        depthDesc.depthCompareFunction = .less
        depthDesc.isDepthWriteEnabled = false
        self.depthState = device.makeDepthStencilState(descriptor: depthDesc)
        print("✅ Depth State created")
    }

    private func configureLiquidPipeline(library: MTLLibrary) {
        print("⚙️ configuring Liquid Pipeline...")
        let descriptor = MTLRenderPipelineDescriptor()
        descriptor.label = "Soul Shader Pipeline"

        guard let vertFunc = library.makeFunction(name: "vertexPassthrough"),
              let fragFunc = library.makeFunction(name: "liquidSoul") else {
            print("❌ Failed to find liquid shader functions")
            return
        }

        descriptor.vertexFunction = vertFunc
        descriptor.fragmentFunction = fragFunc
        descriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
        descriptor.depthAttachmentPixelFormat = .depth32Float

        descriptor.colorAttachments[0].isBlendingEnabled = true
        descriptor.colorAttachments[0].sourceRGBBlendFactor = .sourceAlpha
        descriptor.colorAttachments[0].destinationRGBBlendFactor = .oneMinusSourceAlpha

        do {
            pipelineState = try device.makeRenderPipelineState(descriptor: descriptor)
            print("✅ Liquid Pipeline created")
        } catch {
            print("❌ Failed to create pipeline state: \(error)")
        }
    }

    private func configurePointPipeline(library: MTLLibrary) {
        print("⚙️ configuring Point Pipeline...")
        let pointDesc = MTLRenderPipelineDescriptor()
        pointDesc.label = "Point Cloud Pipeline"
        pointDesc.vertexFunction = library.makeFunction(name: "vertexPoint")
        pointDesc.fragmentFunction = library.makeFunction(name: "fragmentPoint")
        pointDesc.colorAttachments[0].pixelFormat = .bgra8Unorm
        pointDesc.depthAttachmentPixelFormat = .depth32Float

        pointDesc.colorAttachments[0].isBlendingEnabled = true
        pointDesc.colorAttachments[0].sourceRGBBlendFactor = .sourceAlpha
        pointDesc.colorAttachments[0].destinationRGBBlendFactor = .one

        do {
            pointPipeline = try device.makeRenderPipelineState(descriptor: pointDesc)
            print("✅ Point Pipeline created")
        } catch {
            print("❌ Failed to create point pipeline: \(error)")
        }
    }

    private func configurePathPipeline(library: MTLLibrary) {
        print("⚙️ configuring Path Pipeline...")
        let pathDesc = MTLRenderPipelineDescriptor()
        pathDesc.label = "Path Pipeline"
        pathDesc.vertexFunction = library.makeFunction(name: "vertexLine")
        pathDesc.fragmentFunction = library.makeFunction(name: "fragmentLine")
        pathDesc.colorAttachments[0].pixelFormat = .bgra8Unorm
        pathDesc.depthAttachmentPixelFormat = .depth32Float

        pathDesc.colorAttachments[0].isBlendingEnabled = true
        pathDesc.colorAttachments[0].sourceRGBBlendFactor = .sourceAlpha
        pathDesc.colorAttachments[0].destinationRGBBlendFactor = .one

        do {
            pathPipeline = try device.makeRenderPipelineState(descriptor: pathDesc)
            print("✅ Path Pipeline created")
        } catch {
            print("❌ Failed to create path pipeline: \(error)")
        }
    }
}
