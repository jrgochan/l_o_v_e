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
        .package(path: "../SoulBio")
    ],
    targets: [
        .target(
            name: "SoulUI",
            dependencies: ["SoulCore", "SoulBrain", "SoulChat", "SoulVoice", "SoulBio"],
            resources: [
                .process("Resources")
            ],
            plugins: ["SoulShaderBuild"]
        ),
        .plugin(
            name: "SoulShaderBuild",
            capability: .buildTool()
        ),
        .testTarget(
            name: "SoulUITests",
            dependencies: ["SoulUI"]
        )
    ]
)
