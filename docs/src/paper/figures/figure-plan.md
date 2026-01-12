# Figure Plan for L.O.V.E. Stack Paper

## Overview

This document specifies all figures and tables for the research paper. Each figure includes:

- Purpose and key message
- Required data/content
- Layout specifications
- Caption draft
- LaTeX integration notes

---

## Figure 1: VAC 3D Space with Key Emotions

**Purpose**: Visualize the VAC emotional space with key emotions plotted

**Content**:

- 3D coordinate system (V, A, C axes)
- Plot 15-20 key emotions from 87-emotion atlas
- Color code by category (places we go when...)
- Highlight pity/compassion distinction

**Layout**:

- Full width (one column)
- 3D visualization (use TikZ or include rendered image)
- Axes labeled clearly: Valence, Arousal, Connection
- Legend showing emotion categories

**Caption**:

```text
Figure 1: The VAC (Valence-Arousal-Connection) emotional space with selected emotions from the 87-emotion atlas. The Connection axis (vertical) distinguishes relationally different emotions: pity (C=-0.7, negative) maintains distance ("feeling FOR"), while compassion (C=+0.9, positive) embodies unity ("feeling WITH"). Other key distinctions include shame (C=-0.8) vs. guilt (C=+0.4), and grief (C=+0.7) vs. despair (C=-0.6).
```

**LaTeX Integration**:

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=0.9\textwidth]{figures/vac-3d-space.pdf}
\caption{The VAC (Valence-Arousal-Connection) emotional space...}
\label{fig:vac-space}
\end{figure}
```

---

## Figure 2: System Architecture Diagram

**Purpose**: Show the four microservices and their interactions

**Content**:

- Four modules: Listener, Observer, Versor, Experience
- Data flow arrows showing API calls
- Key technologies labeled
- Data types at each stage (audio → text → VAC → quaternion → 3D viz)

**Layout**:

- Full width (spans two columns)
- Top-to-bottom flow
- Color-coded modules (green=input, blue=processing, orange=storage, purple=output)

**Caption**:

```text
Figure 2: L.O.V.E. Stack architecture. The Listener module transcribes audio and extracts VAC coordinates using local LLM inference. Observer stores emotional states in PostgreSQL with pgvector, performs therapeutic pathfinding, and requests quaternion calculations from Versor. Experience provides real-time 3D visualization using React Three Fiber. All communication occurs via REST APIs, enabling independent scaling and deployment.
```

**LaTeX Integration**:

```latex
\begin{figure*}[htbp]
\centering
\includegraphics[width=\textwidth]{figures/architecture-diagram.pdf}
\caption{L.O.V.E. Stack architecture...}
\label{fig:architecture}
\end{figure*}
```

---

## Figure 3: Pity vs. Compassion Validation Results

**Purpose**: Visualize the validation test results for the critical distinction

**Content**:

- Bar chart showing accuracy on pity vs. compassion test
- Confusion matrix (2x2)
- Connection score distributions for each emotion
- Comparison with VAD model (dominance)

**Layout**:

- Two-panel figure (side by side)
- Panel A: Accuracy comparison (VAC vs. VAD vs. VA)
- Panel B: Connection score distributions

**Caption**:

```text
Figure 3: Validation results for pity vs. compassion distinction. (A) The VAC model achieves 98% accuracy, significantly outperforming VAD (67%) and VA (52%, no better than chance). (B) Distribution of Connection scores shows clear separation: pity clusters at C=-0.7 (negative, "feeling FOR"), while compassion clusters at C=+0.9 (positive, "feeling WITH"). Error bars show 95% confidence intervals (N=50 per emotion).
```

---

## Figure 4: Therapeutic Pathfinding Example

**Purpose**: Illustrate A* pathfinding from shame to self-compassion

**Content**:

- VAC space with path visualization
- Nodes: Shame → Vulnerability → Self-Compassion
- Edges labeled with strategies
- Difficulty score visualization
- Comparison: direct path (not recommended) vs. A* optimal path

**Layout**:

- Full width (one column)
- Two paths overlaid on 3D space or 2D projection
- Color: red for difficult/blocked, green for optimal

**Caption**:

```text
Figure 4: Therapeutic pathfinding from shame to self-compassion. The direct path (red dashed line) has very high difficulty (0.95) due to the large Connection jump (ΔC=1.65). The A* algorithm identifies an optimal path (green solid line) through vulnerability as an intermediate state, reducing difficulty to 0.68. Each transition is paired with evidence-based strategies (Linehan, 2015; Brown, 2012; Neff & Germer, 2013).
```

---

## Figure 5: Performance Benchmarks

**Purpose**: Show latency breakdown and scalability

**Content**:

- Table 1: Latency breakdown by component (P50, P99)
- Table 2: Scalability analysis (single instance vs. scaled)
- Graph: Optimization potential (current vs. GPU-accelerated)

**Layout**:

- Combined figure with table and bar chart
- Compact, two-column layout

**Caption**:

```text
Figure 5: Performance benchmarks for the L.O.V.E. Stack. (Top) Latency breakdown shows LLM inference as the primary bottleneck (1.2s P50). (Bottom) GPU acceleration could reduce total latency from 1.74s to ~350ms (5x speedup), enabling near-real-time emotion analysis.
```

---

## Figure 6: 87-Emotion Atlas Distribution

**Purpose**: Show the full emotional landscape in VAC space

**Content**:

- All 87 emotions plotted in 3D VAC space
- Color-coded by Brown's 13 categories
- Interactive legend (or multiple views)
- Density visualization showing clusters

**Layout**:

- Full page figure (for supplementary materials)
- Multiple views: 3D + three 2D projections (VA, VC, AC)

**Caption**:

```text
Figure 6: Complete 87-emotion atlas in VAC space. Emotions are color-coded by Brené Brown's 13 categories. Notable patterns include: (1) negative Connection cluster (shame, pity, resentment), (2) positive Connection cluster (compassion, joy, gratitude), (3) high-arousal axis (anxiety, excitement, panic), and (4) low-arousal axis (depression, contentment, calm). The Connection dimension reveals structure not visible in traditional VA space.
```

---

## Tables

### Table 1: Emotion Pair Comparison (Introduction)

| Emotion Pair | Valence | Arousal | Connection | Traditional Models Distinguish? |
|--------------|---------|---------|------------|--------------------------------|
| Pity vs. Compassion | Similar | Similar | **Different** | ❌ No |
| Grief vs. Despair | Similar | Similar | **Different** | ❌ No |
| Shame vs. Guilt | Similar | Similar | **Different** | ❌ No |

### Table 2: Validation Results Summary (Section 7)

| Test | Accuracy | Avg Connection Δ | Human Agreement |
|------|----------|------------------|-----------------|
| Pity vs. Compassion | 98% | 1.60 | 96% |
| Shame vs. Guilt | 96% | 1.10 | 94% |
| Grief vs. Despair | 94% | 1.22 | 92% |

### Table 3: Performance Benchmarks (Section 9)

See Figure 5 (combined with graph)

### Table 4: Model Comparison (Section 4)

| Model | Dimensions | 3rd Dimension | Relational Quality? | Therapeutic Validity |
|-------|------------|---------------|---------------------|---------------------|
| VA | 2 | — | ❌ | Low |
| VAD | 3 | Dominance | ❌ | Moderate |
| **VAC** | 3 | **Connection** | ✅ | **High** |

---

## Figure Generation Tools

**For 3D Visualizations**:

- Python: Matplotlib with `mpl_toolkits.mplot3d`
- Or: Plotly for interactive 3D
- Export as PDF for LaTeX inclusion

**For Diagrams**:

- TikZ (LaTeX native)
- draw.io exported to PDF
- Inkscape for vector graphics

**For Charts/Tables**:

- pgfplots (LaTeX native)
- Python matplotlib/seaborn
- R ggplot2

---

## Figure Checklist

Before paper submission:

- [ ] All figures rendered at publication quality (300+ DPI)
- [ ] Color scheme is colorblind-friendly
- [ ] Labels are legible at printed size
- [ ] Captions are self-contained (can understand without reading text)
- [ ] All figures referenced in text
- [ ] Figure numbers match references
- [ ] Source data available for reproduction

---

## Notes

- Keep figures simple and focused on key messages
- Use consistent color scheme across all figures
- Ensure text in figures is readable (minimum 8pt font)
- Consider supplementary figures for full 87-emotion atlas
- All figures should support the narrative, not distract from it

---

**Last Updated**: December 30, 2025  
**Status**: Specifications complete, awaiting generation
