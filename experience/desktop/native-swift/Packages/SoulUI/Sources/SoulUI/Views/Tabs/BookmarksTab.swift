import SwiftUI
import SwiftData
import SoulCore

public struct BookmarksTab: View {
    @Query(sort: \ViewPreset.createdAt, order: .reverse) private var presets: [ViewPreset]
    @Environment(\.modelContext) private var context

    var onSave: () -> Void
    var onRestore: (ViewPreset) -> Void

    public init(onSave: @escaping () -> Void, onRestore: @escaping (ViewPreset) -> Void) {
        self.onSave = onSave
        self.onRestore = onRestore
    }

    public var body: some View {
        VStack {
             // Header / Capture
             HStack {
                 Text("Bookmarks")
                     .font(.title2.bold())
                 Spacer()
                 Button(action: {
                     onSave()
                 }, label: {
                     Label("Capture View", systemImage: "camera.aperture")
                 })
                 .buttonStyle(.bordered)
             }
             .padding()

             if presets.isEmpty {
                 ContentUnavailableView(
                    "No Bookmarks",
                    systemImage: "bookmark.slash",
                    description: Text("Capture a moment to save it here.")
                 )
             } else {
                 ScrollView {
                     LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 16) {
                         ForEach(presets) { preset in
                             VStack(alignment: .leading) {
                                 Text(preset.name)
                                     .font(.headline)
                                     .lineLimit(1)

                                 HStack {
                                     Circle()
                                         .fill(Color(
                                             red: preset.valence > 0 ? 1 : 0.2,
                                             green: preset.valence > 0 ? 0.8 : 0.2,
                                             blue: preset.valence < 0 ? 1 : 0.2
                                         ))
                                         .frame(width: 6, height: 6)
                                     Text(preset.visualModeRaw.capitalized)
                                         .font(.caption2)
                                         .foregroundStyle(.secondary)
                                 }
                             }
                             .padding()
                             .frame(maxWidth: .infinity, alignment: .leading)
                             .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                             .overlay(
                                 RoundedRectangle(cornerRadius: 12)
                                     .stroke(.white.opacity(0.1), lineWidth: 1)
                             )
                             .onTapGesture {
                                 onRestore(preset)
                             }
                             .contextMenu {
                                 Button("Delete", role: .destructive) {
                                     context.delete(preset)
                                 }
                             }
                         }
                     }
                     .padding()
                 }
             }
         }
         .navigationTitle("Views")
    }
}
