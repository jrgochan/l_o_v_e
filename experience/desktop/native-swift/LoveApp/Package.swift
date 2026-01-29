// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "LoveApp",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "LoveApp", targets: ["LoveApp"])
    ],
    dependencies: [
        // Local "Soul" Packages
        .package(path: "../Packages/SoulCore"),
        .package(path: "../Packages/SoulUI"),
        .package(path: "../Packages/SoulBrain"),
        .package(path: "../Packages/SoulBio"),
        .package(path: "../Packages/SoulVoice"),
        .package(path: "../Packages/SoulChat")
    ],
    targets: [
        .executableTarget(
            name: "LoveApp",
            dependencies: [
                "SoulCore",
                "SoulUI",
                "SoulBrain",
                "SoulBio",
                "SoulVoice",
                "SoulChat"
            ],
            resources: [
                // Add any resources here if needed
            ]
        )
    ]
)
