// swift-tools-version: 6.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SoulUI",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "SoulUI",
            targets: ["SoulUI"]
        )
    ],
    dependencies: [
        .package(path: "../SoulCore"),
        .package(path: "../SoulBrain"),
        .package(path: "../SoulChat"),
        .package(path: "../SoulVoice"),
        .package(path: "../SoulBio"),
        .package(url: "https://github.com/nalexn/ViewInspector", from: "0.9.11")
    ],
    targets: [
        .target(
            name: "SoulUI",
            dependencies: ["SoulCore", "SoulBrain", "SoulChat", "SoulVoice", "SoulBio"],
            resources: [
                .process("Resources")
            ],
            swiftSettings: [
                .unsafeFlags(["-Xfrontend", "-strict-concurrency=complete"])
            ],
            linkerSettings: [
                .linkedFramework("Metal"),
                .linkedFramework("MetalKit")
            ],
            plugins: ["SoulShaderBuild"]
        ),
        .plugin(
            name: "SoulShaderBuild",
            capability: .buildTool()
        ),
        .testTarget(
            name: "SoulUITests",
            dependencies: ["SoulUI", "ViewInspector"]
        )
    ]
)
