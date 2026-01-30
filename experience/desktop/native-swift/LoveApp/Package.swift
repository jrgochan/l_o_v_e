// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "LoveApp",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
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
        .package(path: "../Packages/SoulChat"),
        .package(url: "https://github.com/nalexn/ViewInspector", from: "0.9.11")
    ],
    targets: [
        .target(
            name: "LoveAppFeature",
            dependencies: [
                "SoulCore",
                "SoulUI",
                "SoulBrain",
                "SoulBio",
                "SoulVoice",
                "SoulChat"
            ],
            swiftSettings: [
                .unsafeFlags(["-Xfrontend", "-strict-concurrency=complete"])
            ],
            linkerSettings: [
                .linkedFramework("Metal"),
                .linkedFramework("MetalKit"),
                .linkedFramework("CoreAudio"),
                .linkedFramework("AVFoundation")
            ]
        ),
        .testTarget(
            name: "LoveAppFeatureTests",
            dependencies: ["LoveAppFeature", "SoulUI", "ViewInspector"]
        ),
        .executableTarget(
            name: "LoveApp",
            dependencies: [
                "LoveAppFeature"
            ],
            resources: [
                // Add any resources here if needed
            ],
            swiftSettings: [
                .unsafeFlags(["-Xfrontend", "-strict-concurrency=complete"])
            ],
            linkerSettings: [
                .unsafeFlags([
                    "-Xlinker", "-sectcreate",
                    "-Xlinker", "__TEXT",
                    "-Xlinker", "__info_plist",
                    "-Xlinker", "Sources/LoveApp/Info.plist"
                ])
            ]
        )
    ]
)
