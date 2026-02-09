# LaTeX Assembly Guide for L.O.V.E. Stack Paper

## Overview

This guide explains how to convert the markdown section files to LaTeX and compile the final paper.

---

## File Structure

```
docs/paper/
├── 00-PAPER_PLAN.md              # Master plan (not in final paper)
├── 01-abstract.md                # → Abstract
├── 02-introduction.md            # → Section 1
├── 03-related-work.md            # → Section 2
├── 04-vac-model.md               # → Section 3
├── 05-architecture.md            # → Section 4
├── 06-vac-extraction.md          # → Section 5
├── 07-validation.md              # → Section 6
├── 08-mental-health-apps.md      # → Section 7
├── 09-implementation.md          # → Section 8
├── 10-discussion.md              # → Section 9
├── 11-conclusion.md              # → Section 10
├── 12-references.bib             # → Bibliography
├── figures/
│   ├── figure-plan.md            # Figure specifications
│   └── *.pdf                     # Generated figures
├── ASSEMBLY_GUIDE.md             # This file
└── output/
    ├── main.tex                  # Main LaTeX file
    ├── sections/                 # Individual section .tex files
    │   ├── abstract.tex
    │   ├── introduction.tex
    │   └── ...
    └── compiled/
        ├── main.pdf              # Final compiled paper
        └── main.aux, .bbl, etc.  # Build artifacts
```

---

## Step 1: Convert Markdown to LaTeX

### Option A: Manual Conversion (Recommended for Control)

1. **Create main.tex template**:

```latex
\documentclass[10pt,twocolumn]{article}

% Packages
\usepackage[utf8]{inputenc}
\usepackage[margin=1in]{geometry}
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{cite}
\usepackage{url}
\usepackage{hyperref}
\usepackage{booktabs}
\usepackage{xcolor}

% Title and authors
\title{Beyond Valence-Arousal: The L.O.V.E. Stack and the Connection Axis for Computational Emotion Recognition in Mental Health Applications}

\author{
    [Your Name] \\
    Independent Researcher \\
    \texttt{your.email@example.com}
    \and
    Claude (Anthropic) \\
    AI Research Collaborator \\
    \texttt{Anthropic AI}
}

\date{\today}

\begin{document}

\maketitle

% Abstract
\begin{abstract}
\input{sections/abstract}
\end{abstract}

% Keywords
\textbf{Keywords:} Emotion recognition, affective computing, mental health technology, VAC model, dimensional emotion models, speech processing, connection axis

% Main sections
\section{Introduction}
\input{sections/introduction}

\section{Related Work}
\input{sections/related-work}

\section{The VAC Model}
\input{sections/vac-model}

\section{System Architecture}
\input{sections/architecture}

\section{VAC Extraction from Speech and Text}
\input{sections/vac-extraction}

\section{Validation}
\input{sections/validation}

\section{Mental Health Applications}
\input{sections/mental-health-apps}

\section{Implementation and Performance}
\input{sections/implementation}

\section{Discussion}
\input{sections/discussion}

\section{Conclusion}
\input{sections/conclusion}

% References
\bibliographystyle{plain}
\bibliography{references}

\end{document}
```

2. **Convert each markdown file to LaTeX**:
   - Copy content from markdown files
   - Convert markdown formatting to LaTeX:
     - `**bold**` → `\textbf{bold}`
     - `*italic*` → `\textit{italic}`
     - `# Heading` → `\subsection{Heading}` (adjust level)
     - `## Subheading` → `\subsubsection{Subheading}`
     - Code blocks → `\begin{verbatim}...\end{verbatim}` or `\lstlisting`
     - Math: `$...$` stays as is
     - Tables: Convert to `\begin{tabular}...\end{tabular}`
     - Citations: `[CITATION]` → `\cite{key}`

### Option B: Pandoc Conversion (Faster but Needs Cleanup)

```bash
# Convert each markdown file
for file in 0{1..11}-*.md; do
    basename=$(basename $file .md)
    pandoc $file -f markdown -t latex -o output/sections/${basename}.tex
done

# Note: You'll still need to:
# - Clean up formatting
# - Fix citation keys
# - Adjust section levels
# - Convert complex tables
```

---

## Step 2: Prepare Figures

### Generate Figures from Specifications

**For Figure 1 (VAC 3D Space)**:
```python
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np

fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

# Plot emotions (example subset)
emotions = {
    'Pity': (-0.3, -0.1, -0.7),
    'Compassion': (0.5, 0.2, 0.9),
    'Shame': (-0.7, -0.2, -0.8),
    'Guilt': (-0.5, 0.1, 0.4),
    # ... add more emotions
}

for name, (v, a, c) in emotions.items():
    ax.scatter(v, a, c, s=100)
    ax.text(v, a, c, name, fontsize=8)

ax.set_xlabel('Valence')
ax.set_ylabel('Arousal')
ax.set_zlabel('Connection')
ax.set_xlim(-1, 1)
ax.set_ylim(-1, 1)
ax.set_zlim(-1, 1)

plt.savefig('figures/vac-3d-space.pdf', dpi=300, bbox_inches='tight')
```

**For Figure 2 (Architecture Diagram)**:
- Use draw.io, Inkscape, or TikZ
- Ensure high resolution (300+ DPI)
- Export as PDF for vector graphics

### Figure Checklist
- [ ] Figure 1: VAC 3D space (vac-3d-space.pdf)
- [ ] Figure 2: Architecture diagram (architecture-diagram.pdf)
- [ ] Figure 3: Validation results (validation-results.pdf)
- [ ] Figure 4: Pathfinding example (pathfinding-example.pdf)
- [ ] Figure 5: Performance benchmarks (performance-benchmarks.pdf)
- [ ] Figure 6: 87-emotion atlas (emotion-atlas.pdf)

---

## Step 3: Set Up Bibliography

1. **Copy 12-references.bib** to `output/references.bib`

2. **Fill in placeholder citations**:
   - Search Emily Provost's publications on Google Scholar
   - Add 3-5 key papers on speech emotion recognition
   - Replace `[PLACEHOLDER]` notes with actual citations

3. **Validate BibTeX**:
```bash
# Check for syntax errors
bibtex-check output/references.bib
```

---

## Step 4: Compile the Paper

### Using pdflatex + bibtex

```bash
cd output/

# First pass: Generate .aux file
pdflatex main.tex

# Process bibliography
bibtex main

# Second pass: Resolve citations
pdflatex main.tex

# Third pass: Resolve references
pdflatex main.tex

# Output: main.pdf
```

### Using latexmk (Recommended)

```bash
cd output/

# Automatically handles all passes
latexmk -pdf main.tex

# Watch for changes and recompile
latexmk -pdf -pvc main.tex
```

### Common Issues and Fixes

**Issue**: "Undefined control sequence"
- **Fix**: Check for unescaped special characters: `_`, `&`, `%`, `$`, `#`

**Issue**: "Citation undefined"
- **Fix**: Run bibtex, then pdflatex twice more

**Issue**: "File not found: figures/..."
- **Fix**: Ensure all figure files exist and paths are correct

**Issue**: Math rendering errors
- **Fix**: Check for unmatched `$` or missing packages (`amsmath`)

---

## Step 5: Review and Polish

### Content Review
- [ ] All sections flow logically
- [ ] No orphaned references (e.g., "as shown in Figure X")
- [ ] All figures are referenced in text
- [ ] All citations resolve correctly
- [ ] Math equations render properly
- [ ] Tables are formatted consistently

### Formatting Review
- [ ] Two-column layout works well (no awkward breaks)
- [ ] Figures fit within columns (or span both with `figure*`)
- [ ] Page count is within target (15-18 pages)
- [ ] Fonts are consistent and readable
- [ ] No overfull/underfull hbox warnings (or minimal)

### Figure Quality
- [ ] All figures are high resolution (300+ DPI)
- [ ] Text in figures is legible at print size
- [ ] Color schemes are colorblind-friendly
- [ ] Captions are self-contained

### Citation Review
- [ ] All claims are supported by citations
- [ ] Citation format is consistent
- [ ] Emily Provost's work is properly cited (3-5 papers)
- [ ] No "et al." for <6 authors on first mention
- [ ] DOIs included where available

---

## Step 6: Generate Supplementary Materials

### Supplementary Material 1: Complete 87-Emotion Atlas

Create a separate PDF with the full emotion atlas:
```latex
\documentclass{article}
\usepackage{longtable}
\usepackage{booktabs}

\title{Supplementary Material: Complete 87-Emotion VAC Atlas}
\author{[Your Name]}

\begin{document}
\maketitle

\begin{longtable}{lrrrp{6cm}}
\toprule
Emotion & V & A & C & Description \\
\midrule
\endhead
Joy & 0.9 & 0.7 & 0.8 & Energized, connected positivity \\
Gratitude & 0.8 & 0.3 & 0.9 & Warm appreciation WITH others \\
% ... all 87 emotions
\bottomrule
\end{longtable}

\end{document}
```

### Supplementary Material 2: 107 Evidence-Based Strategies

Similar format with strategy name, description, evidence level, citations.

---

## Step 7: Prepare for Submission

### For arXiv

1. Compile locally to ensure no errors
2. Upload source files (.tex, .bib, figures/)
3. arXiv will compile server-side
4. Verify the PDF matches local compilation

### For Conference/Journal

1. Read submission guidelines carefully
2. Adjust formatting (margins, fonts, spacing) as needed
3. Anonymize if required (double-blind review)
4. Prepare cover letter highlighting:
   - Novel Connection axis
   - 98% validation accuracy
   - Complete implementation (L.O.V.E. Stack)
   - Collaboration opportunity (Emily Provost)

### Files to Include

- `main.pdf` - Compiled paper
- `main.tex` - Main LaTeX file
- `sections/*.tex` - All section files
- `references.bib` - Bibliography
- `figures/*.pdf` - All figures
- `supplementary.pdf` - Supplementary materials
- `README.txt` - Compilation instructions

---

## Alternative: Using Overleaf

If you prefer a web-based LaTeX editor:

1. Go to [overleaf.com](https://www.overleaf.com)
2. Create new project → Upload Project
3. Upload all `.tex`, `.bib`, and figure files
4. Select compiler: pdfLaTeX
5. Compile and download PDF

**Advantages**:
- No local LaTeX installation needed
- Real-time collaboration
- Version control built-in
- Automatic compilation

---

## Conversion Checklist

### Pre-Conversion
- [x] All markdown section files written
- [x] Bibliography compiled
- [x] Figure specifications documented
- [ ] Figures generated

### Conversion
- [ ] main.tex created
- [ ] All sections converted to .tex
- [ ] Citations converted to \cite{} format
- [ ] Math equations verified
- [ ] Tables converted to LaTeX format
- [ ] Figures linked correctly

### Post-Conversion
- [ ] Paper compiles without errors
- [ ] All figures render
- [ ] All citations resolve
- [ ] Page count within target (15-18 pages)
- [ ] Final proofread complete

### Submission Prep
- [ ] Supplementary materials prepared
- [ ] Source files organized
- [ ] Submission guidelines reviewed
- [ ] Cover letter drafted
- [ ] Author information filled in

---

## Tips for Success

1. **Compile early and often**: Don't wait until all sections are done
2. **Use version control**: Git commit after each major change
3. **Keep markdown and LaTeX in sync**: If you edit LaTeX, update markdown
4. **Test on multiple systems**: Compile on different machines if possible
5. **Get feedback**: Share PDF with colleagues before submission

---

## Contact for Questions

If you encounter issues during assembly:
1. Check LaTeX error messages carefully
2. Search StackExchange for specific errors
3. Consult the master plan (00-PAPER_PLAN.md) for context
4. Review section notes for LaTeX-specific guidance

---

**Last Updated**: December 30, 2025
**Status**: Assembly guide complete
**Next Step**: Begin markdown → LaTeX conversion
