import SwiftUI
import SwiftData
import SoulCore

public struct ExploreTab: View {
    @Query(sort: \Emotion.name) private var emotions: [Emotion]
    
    @Binding var selectedEmotion: String?
    var activeCollectionName: String
    var onSearch: (String) async -> [Emotion]
    
    // Internal State
    @State private var searchText: String = ""
    @State private var searchMode: SearchMode = .simple
    @State private var semanticResults: [Emotion] = []
    
    public enum SearchMode: String, CaseIterable, Identifiable {
        case simple = "Exact Name"
        case semantic = "Conceptual"
        public var id: String { rawValue }
    }
    
    public init(selectedEmotion: Binding<String?>, 
                activeCollectionName: String, 
                onSearch: @escaping (String) async -> [Emotion]) {
        self._selectedEmotion = selectedEmotion
        self.activeCollectionName = activeCollectionName
        self.onSearch = onSearch
    }
    
    var filteredEmotions: [Emotion] {
        if searchMode == .semantic && !searchText.isEmpty {
            return semanticResults
        }
        
        // Default / Simple Mode
        let collectionFiltered = emotions.filter { $0.collection?.name == activeCollectionName }
        if searchText.isEmpty {
            return collectionFiltered
        } else {
            return collectionFiltered.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    public var body: some View {
        List(filteredEmotions, selection: $selectedEmotion) { emotion in
            HStack {
                Circle()
                    .fill(Color(
                        red: emotion.valence > 0 ? 1 : 0.2,
                        green: emotion.valence > 0 ? 0.8 : 0.2,
                        blue: emotion.valence < 0 ? 1 : 0.2
                    ))
                    .frame(width: 8, height: 8)
                Text(emotion.name)
                Spacer()
                Text(String(format: "%.1f", emotion.valence))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .tag(emotion.name) // Selection uses Name
        }
        .searchable(text: $searchText, prompt: searchMode == .simple ? "Search by Name" : "Describe a Feeling...")
        .onChange(of: searchText) { _, newValue in
            if searchMode == .semantic {
                // Debounce could be added here, but for now strict triggering
                Task {
                    // Only search if 3+ chars to save compute
                    if newValue.count > 2 {
                        self.semanticResults = await onSearch(newValue)
                    }
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Picker("Search Mode", selection: $searchMode) {
                    ForEach(SearchMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
            }
        }
        .navigationTitle("Emotions")
    }
}
