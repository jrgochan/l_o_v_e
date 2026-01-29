// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SoulVoice",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "SoulVoice",
            targets: ["SoulVoice"]
        )
    ],
    dependencies: [
        .package(path: "../SoulCore")
    ],
    targets: [
        .target(
            name: "SoulVoice",
            dependencies: ["SoulCore"]
        ),
        .testTarget(
            name: "SoulVoiceTests",
            dependencies: ["SoulVoice"]
        )
    ]
)
