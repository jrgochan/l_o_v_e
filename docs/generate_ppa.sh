#!/bin/bash
# Script to regenerate Provisional Patent Application PDF and DOCX
# Requirements: pandoc, xelatex (MacTeX/TeXLive)

set -e  # Exit on error

DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_FILE="provisional_patent_application.md"
PDF_OUTPUT="provisional_patent_application.pdf"
DOCX_OUTPUT="provisional_patent_application.docx"

echo "📂 Working directory: $DOCS_DIR"
cd "$DOCS_DIR"

if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Input file '$INPUT_FILE' not found!"
    exit 1
fi

echo "📄 Generating PDF..."
pandoc "$INPUT_FILE" \
    -o "$PDF_OUTPUT" \
    --pdf-engine=xelatex \
    -V geometry:margin=1in \
    -V papersize=letter \
    -V mainfont="Times New Roman" \
    -V colorlinks=false \
    --variable linkcolor=black \
    --variable urlcolor=black

if [ $? -eq 0 ]; then
    echo "✅ PDF generated: $PDF_OUTPUT"
else
    echo "❌ PDF generation failed."
    exit 1
fi

echo "📝 Generating DOCX..."
pandoc "$INPUT_FILE" \
    -o "$DOCX_OUTPUT"

if [ $? -eq 0 ]; then
    echo "✅ DOCX generated: $DOCX_OUTPUT"
else
    echo "❌ DOCX generation failed."
    exit 1
fi

echo "🎉 Done! Files are ready in $DOCS_DIR"
