import Foundation
import NaturalLanguage

/// Scrubs Personally Identifiable Information (PII) from text.
/// Mirrors `pii_scrubber.py` from Listener.
public class PIIFilter {

    private let tagger: NLTagger

    public init() {
        self.tagger = NLTagger(tagSchemes: [.nameType])
    }

    /// Redacts names, locations, and organizations from the input text.
    public func scrub(_ text: String) -> String {
        tagger.string = text

        var redactedText = text
        // NLTagger ranges are based on the original string.
        // To replace consistently, we should collect ranges and replace from end to start.

        var replacements: [(Range<String.Index>, String)] = []

        let options: NLTagger.Options = [.omitPunctuation, .omitWhitespace, .joinNames]
        let tags: [NLTag] = [.personalName, .placeName, .organizationName]

        tagger.enumerateTags(
            in: text.startIndex..<text.endIndex,
            unit: .word,
            scheme: .nameType,
            options: options
        ) { tag, range in
            if let tag = tag, tags.contains(tag) {
                let placeholder = placeholder(for: tag)
                replacements.append((range, placeholder))
            }
            return true
        }

        // Apply replacements in reverse order to preserve indices
        for (range, placeholder) in replacements.reversed() {
            redactedText.replaceSubrange(range, with: placeholder)
        }

        return redactedText
    }

    private func placeholder(for tag: NLTag) -> String {
        switch tag {
        case .personalName: return "[NAME]"
        case .placeName: return "[LOCATION]"
        case .organizationName: return "[ORG]"
        default: return "[REDACTED]"
        }
    }
}
