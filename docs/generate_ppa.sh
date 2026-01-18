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

echo "🖼️  Generating Drawings PDF..."
DRAWINGS_MD="drawings_temp.md"
DRAWINGS_OUTPUT="drawings.pdf"

# Initialize drawings markdown
echo "\pagenumbering{gobble}" > "$DRAWINGS_MD"

# Array of figures in order
FIGS=("figures/fig1.png" "figures/fig2.png" "figures/fig3.png" "figures/fig4.png" "figures/fig5.png" "figures/fig6.png" "figures/love.png")

COUNT=0
for fig in "${FIGS[@]}"; do
    COUNT=$((COUNT+1))
    
    # Add new page if not the first page
    if [ $COUNT -gt 1 ]; then
        echo "\newpage" >> "$DRAWINGS_MD"
    fi
    
    # Add Figure Label and Image (LaTeX formatting for xelatex)
    echo "\begin{center}" >> "$DRAWINGS_MD"
    echo "\textbf{\huge FIG. $COUNT}" >> "$DRAWINGS_MD"
    echo "\vspace{1cm}" >> "$DRAWINGS_MD"
    echo "\includegraphics[width=0.9\textwidth,height=0.8\textheight,keepaspectratio]{$fig}" >> "$DRAWINGS_MD"
    echo "\end{center}" >> "$DRAWINGS_MD"
done

# Generate Drawings PDF
pandoc "$DRAWINGS_MD" \
    -o "$DRAWINGS_OUTPUT" \
    --pdf-engine=xelatex \
    -V geometry:margin=1in \
    -V papersize=letter \
    -V header-includes="\usepackage{graphicx}"

if [ $? -eq 0 ]; then
    echo "✅ Drawings PDF generated: $DRAWINGS_OUTPUT"
    rm "$DRAWINGS_MD"
else
    echo "❌ Drawings PDF generation failed."
    rm "$DRAWINGS_MD"
    exit 1
fi

echo "🎉 Done! Files are ready in $DOCS_DIR"
