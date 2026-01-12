# Listener Module - Semantic Analysis

## Overview

The **Semantic Analysis** engine is where transcribed text becomes emotional understanding. Using LangChain and LLMs, the Listener extracts VAC scalars and maps input to the Atlas of the Heart taxonomy.

## The Critical Challenge: Connection Extraction

Standard sentiment analysis models (VADER, TextBlob) output Valence and Arousal but have no concept of **Connection** (the z-axis).

The Listener must teach the LLM to recognize this novel dimension through:
- Few-shot prompting with Atlas examples
- Chain-of-thought reasoning
- Structured output enforcement

## LangChain Integration

### SemanticAnalyzer Class

```python
# backend/app/services/semantic_analyzer.py

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import Literal

class VACVector(BaseModel):
    valence: float = Field(ge=-1.0, le=1.0, description="Pleasure vs displeasure")
    arousal: float = Field(ge=-1.0, le=1.0, description="Energy vs calm")
    connection: float = Field(ge=-1.0, le=1.0, description="Relational alignment")

class EmotionalClassification(BaseModel):
    primary_emotion: str = Field(description="One of the 87 Atlas emotions")
    category: str = Field(description="One of the 13 Atlas categories")
    vac: VACVector
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = Field(description="Step-by-step psychometric analysis")

class SemanticAnalyzer:
    """Extract VAC vectors using LLM"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o",  # or "llama-3-70b" via Groq
            temperature=0.0  # Deterministic
        )
        
        self.parser = PydanticOutputParser(
            pydantic_object=EmotionalClassification
        )
        
        self.prompt = self._create_prompt()
    
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create psychometric prompt with few-shot examples"""
        
        system_message = """You are the Listener, an expert psychometrician trained in Dr. Brené Brown's Atlas of the Heart.

Your task is to analyze text and map it to the 3-dimensional VAC Model:
- **Valence** (X): Pleasure (+1) to Displeasure (-1)
- **Arousal** (Y): High Energy (+1) to Low Energy/Calm (-1)
- **Connection** (Z): Connected/Aligned (+1) to Disconnected/Isolated (-1)

The Connection axis is CRITICAL and novel. It measures:
- Relational stance ("with" vs "against" others)
- Self-alignment vs external conformity
- Vulnerability and emotional exposure

Follow this analysis process:
1. Analyze Valence: Look for hedonic keywords
2. Analyze Arousal: Look for energy markers
3. Analyze Connection: Look for relational vectors (this is THE hardest step)
4. Select Category: Which of the 13 Atlas categories?
5. Select Emotion: Which specific emotion from the 87?

{format_instructions}"""
        
        few_shot_examples = """
Examples:

Input: "I feel sorry for them, they're struggling."
Analysis:
- Valence: Slightly negative (witnessing suffering)
- Arousal: Low (reflective, not active)
- Connection: NEGATIVE (feeling FOR, not WITH - separation, condescension)
Output: {{"primary_emotion": "Pity", "category": "Places We Go With Others", "vac": {{"valence": -0.3, "arousal": -0.1, "connection": -0.7}}, "confidence": 0.9, "reasoning": "Pity is characterized by separation. The phrase 'for them' indicates distance."}}

Input: "I understand their pain. I'm here for them."
Analysis:
- Valence: Neutral to slightly positive (offering support)
- Arousal: Low to moderate (calm presence)
- Connection: POSITIVE (feeling WITH - shared humanity, alignment)
Output: {{"primary_emotion": "Compassion", "category": "Places We Go With Others", "vac": {{"valence": 0.5, "arousal": 0.2, "connection": 0.9}}, "confidence": 0.95, "reasoning": "Compassion involves feeling with someone. The commitment 'I'm here' shows connection."}}

Input: "I'm feeling amazing today, everything is clicking!"
Output: {{"primary_emotion": "Joy", "category": "Places We Go When Life Is Good", "vac": {{"valence": 0.9, "arousal": 0.7, "connection": 0.8}}, "confidence": 0.92, "reasoning": "High positive affect, energized, sense of flow and connection."}}

Input: "I feel so alone. Nobody gets me."
Output: {{"primary_emotion": "Loneliness", "category": "Places We Go When We Search for Connection", "vac": {{"valence": -0.7, "arousal": -0.2, "connection": -0.9}}, "confidence": 0.93, "reasoning": "Deep disconnection is the defining feature of loneliness."}}
"""
        
        return ChatPromptTemplate.from_messages([
            ("system", system_message + "\n\n" + few_shot_examples),
            ("human", "Analyze this input:\n\n{input_text}")
        ])
    
    async def analyze(self, text: str) -> EmotionalClassification:
        """
        Extract VAC and emotion from text.
        
        Args:
            text: Transcribed or direct text input
        
        Returns:
            EmotionalClassification with VAC scalars
        """
        # Format prompt
        formatted_prompt = self.prompt.format_messages(
            input_text=text,
            format_instructions=self.parser.get_format_instructions()
        )
        
        # Call LLM
        response = await self.llm.ainvoke(formatted_prompt)
        
        # Parse structured output
        result = self.parser.parse(response.content)
        
        return result
```

## Prompt Engineering Strategy

### Chain-of-Thought Reasoning

Force the LLM to reason step-by-step:

```
1. Analyze Valence: [LLM explains its reasoning]
2. Analyze Arousal: [LLM explains its reasoning]
3. Analyze Connection: [LLM explains its reasoning]
4. Select Category: [LLM explains its reasoning]
5. Select Emotion: [LLM explains its reasoning]
```

This prevents "gut feeling" responses and ensures thoughtful classification.

### Few-Shot Examples

The prompt must include at least 5 examples covering:
- **Pity vs. Compassion** (Connection axis calibration)
- **High arousal states** (Excitement, Panic, Anger)
- **Low arousal states** (Calm, Depression, Boredom)
- **Mixed valence** (Bittersweetness, Nostalgia)
- **Pure connection shifts** (Belonging vs. Fitting In)

## Next Steps

Now that you understand semantic analysis:
- **05-atlas-mapping.md** - 87 emotions and categories
- **06-pii-sanitization.md** - Privacy protection
- **07-api-specification.md** - FastAPI endpoints
