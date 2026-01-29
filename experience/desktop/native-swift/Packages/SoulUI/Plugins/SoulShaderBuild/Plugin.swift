import PackagePlugin
import Foundation

@main
struct SoulShaderBuild: BuildToolPlugin {
    func createBuildCommands(context: PluginContext, target: Target) async throws -> [Command] {
        guard let target = target as? SourceModuleTarget else { return [] }

        let metalFiles = target.sourceFiles.filter { $0.url.pathExtension == "metal" }
        guard !metalFiles.isEmpty else { return [] }

        var buildCommands: [Command] = []
        var airFiles: [URL] = []

        // 1. Compile .metal to .air
        for file in metalFiles {
            let outputName = file.url.deletingPathExtension().lastPathComponent + ".air"
            let outputPath = context.pluginWorkDirectoryURL.appendingPathComponent(outputName)
            airFiles.append(outputPath)

            buildCommands.append(
                .buildCommand(
                    displayName: "Compiling \(file.url.lastPathComponent)",
                    executable: URL(fileURLWithPath: "/usr/bin/xcrun"),
                    arguments: [
                        "-sdk", "macosx",
                        "metal",
                        "-c", file.url.path,
                        "-o", outputPath.path,
                        "-I", file.url.deletingLastPathComponent().path
                    ],
                    inputFiles: [file.url],
                    outputFiles: [outputPath]
                )
            )
        }

        let metallibName = "SoulUI.metallib"
        let metallibPath = context.pluginWorkDirectoryURL.appendingPathComponent(metallibName)

        buildCommands.append(
            .buildCommand(
                displayName: "Linking Metal Library",
                executable: URL(fileURLWithPath: "/usr/bin/xcrun"),
                arguments: [
                    "-sdk", "macosx",
                    "metallib"
                ] + airFiles.map { $0.path } + [
                    "-o", metallibPath.path
                ],
                inputFiles: airFiles,
                outputFiles: [metallibPath]
            )
        )

        return buildCommands
    }
}
