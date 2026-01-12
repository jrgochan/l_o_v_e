# AI Models Settings UI

## User Interface Design for Model Management**

**Created**: December 7, 2025  
**Purpose**: Design intuitive UI for managing AI models  
**Scope**: Experience frontend (Settings page)

---

## 🎨 Settings Tab: "AI Models"

### Location: /admin/settings → AI Models tab

### Layout

```text
┌──────────────────────────────────────────────────────────┐
│ Settings > AI Models                                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─────────────────────┬──────────────────────────────┐  │
│ │ Model Library       │  Function Assignments         │  │
│ │                     │                               │  │
│ │ [Local] [Available] │  [semantic_vac]               │  │
│ │                     │  Current: llama3.1:8b         │  │
│ │ (Model cards)       │  Perf: ~2.2s | RAM: 8GB       │  │
│ │                     │  [Change Model ▼]             │  │
│ │                     │                               │  │
│ │                     │  [multi_emotion]              │  │
│ │                     │  Current: mixtral:8x7b        │  │
│ │                     │  Perf: ~5s | RAM: 32GB        │  │
│ │                     │  [Change Model ▼]             │  │
│ │                     │                               │  │
│ └─────────────────────┴──────────────────────────────┘  │
│                                                           │
│ [System Resources: 16GB RAM available | 250GB disk free] │
└──────────────────────────────────────────────────────────┘
```

---

## 📦 Component: ModelLibrary

### Local Models Tab

```tsx
<ModelLibrary view="local">
  {localModels.map(model => (
    <ModelCard key={model.name}>
      <ModelHeader>
        <ModelIcon family={model.family} />
        <ModelName>{model.name}</ModelName>
        <ModelBadges>
          {isAssigned(model) && <Badge variant="success">In Use</Badge>}
          {model.tags.map(tag => <Badge>{tag}</Badge>)}
        </ModelBadges>
      </ModelHeader>
      
      <ModelStats>
        <Stat label="Size" value={formatGB(model.size)} />
        <Stat label="Params" value={model.parameter_size} />
        <Stat label="Speed" value={renderStars(model.speed_rating)} />
        <Stat label="Quality" value={renderStars(model.quality_rating)} />
        <Stat label="RAM" value={`${model.ram_gb}GB`} />
      </ModelStats>
      
      <ModelDescription>
        {model.description}
      </ModelDescription>
      
      <ModelUsage>
        <strong>Currently assigned to:</strong>
        {getAssignedFunctions(model).map(fn => (
          <FunctionBadge key={fn}>{fn}</FunctionBadge>
        ))}
        {getAssignedFunctions(model).length === 0 && (
          <span className="text-gray-400">Not assigned</span>
        )}
      </ModelUsage>
      
      <ModelActions>
        <Button 
          variant="outline" 
          onClick={() => openAssignDialog(model)}
          disabled={!isAssigned(model)}
        >
          Assign to Function
        </Button>
        <Button 
          variant="destructive"
          onClick={() => confirmDelete(model)}
        >
          Delete
        </Button>
      </ModelActions>
    </ModelCard>
  ))}
</ModelLibrary>
```

### Available Models Tab (Can be downloaded)

```tsx
<ModelLibrary view="available">
  {availableModels.map(model => (
    <ModelCard key={model.name} variant="downloadable">
      <ModelHeader>
        <ModelIcon family={model.family} />
        <ModelName>{model.display_name}</ModelName>
        <ModelBadges>
          {model.recommended_for.length > 0 && (
            <Badge variant="info">Recommended</Badge>
          )}
        </ModelBadges>
      </ModelHeader>
      
      <ModelStats>
        <Stat label="Download Size" value={`${model.size_gb}GB`} />
        <Stat label="Params" value={model.parameter_size} />
        <Stat label="Est. Speed" value={renderStars(model.speed_rating)} />
        <Stat label="Est. Quality" value={renderStars(model.quality_rating)} />
        <Stat label="Requires RAM" value={`${model.ram_gb}GB`} />
      </ModelStats>
      
      <ModelDescription>
        {model.description}
      </ModelDescription>
      
      <ModelRecommendation>
        <strong>Good for:</strong>
        {model.recommended_for.map(fn => (
          <span key={fn}>{formatFunctionName(fn)}</span>
        ))}
      </ModelRecommendation>
      
      {hasInsufficientResources(model) && (
        <Alert variant="warning">
          ⚠️ This model requires {model.ram_gb}GB RAM but you have {systemRAM}GB available
        </Alert>
      )}
      
      <ModelActions>
        <Button 
          variant="primary"
          onClick={() => startPull(model)}
          disabled={hasInsufficientResources(model) || isPulling}
        >
          {isPulling ? 'Downloading...' : 'Download Model'}
        </Button>
      </ModelActions>
    </ModelCard>
  ))}
</ModelLibrary>
```

---

## 🎬 Component: PullProgress

### Download Progress Dialog

```tsx
<PullProgressDialog open={isPulling} model={pullingModel}>
  <DialogHeader>
    <h3>Downloading {pullingModel.name}</h3>
  </DialogHeader>
  
  <DialogBody>
    <ProgressBar 
      percent={pullProgress.percent || 0}
      variant="animated"
    />
    
    <ProgressStats>
      <Stat label="Downloaded">
        {formatGB(pullProgress.completed)} / {formatGB(pullProgress.total)}
      </Stat>
      <Stat label="Speed">
        {formatMBps(pullProgress.speed)}
      </Stat>
      <Stat label="Time Remaining">
        {formatDuration(pullProgress.eta)}
      </Stat>
    </ProgressStats>
    
    <ProgressLayers>
      {pullProgress.layers.map(layer => (
        <Layer key={layer.digest}>
          {layer.status === 'complete' && <Check />}
          {layer.status === 'downloading' && <Spinner />}
          {layer.status === 'pending' && <Circle />}
          <span>{layer.name}</span>
          {layer.status === 'downloading' && (
            <span>{layer.percent}%</span>
          )}
        </Layer>
      ))}
    </ProgressLayers>
  </DialogBody>
  
  <DialogFooter>
    <Button variant="outline" onClick={cancelPull}>
      Cancel Download
    </Button>
  </DialogFooter>
</PullProgressDialog>
```

---

## 🎯 Component: FunctionAssignments

### Model Assignment Interface

```tsx
<FunctionAssignments>
  {FUNCTIONS.map(fn => (
    <FunctionCard key={fn.id}>
      <FunctionHeader>
        <FunctionIcon name={fn.id} />
        <FunctionName>{fn.display_name}</FunctionName>
        <FunctionTag>{fn.category}</FunctionTag>
      </FunctionHeader>
      
      <CurrentAssignment>
        <Label>Current Model:</Label>
        <ModelSelector
          value={assignments[fn.id]}
          onChange={(model) => assignModel(fn.id, model)}
        >
          {localModels
            .filter(m => isRecommendedFor(m, fn.id))
            .map(model => (
              <Option key={model.name} value={model.name}>
                <OptionContent>
                  <ModelName>{model.name}</ModelName>
                  <ModelMeta>
                    {model.parameter_size} | 
                    Speed: {renderStars(model.speed_rating)} | 
                    Quality: {renderStars(model.quality_rating)}
                  </ModelMeta>
                </OptionContent>
              </Option>
            ))}
        </ModelSelector>
      </CurrentAssignment>
      
      <PerformanceMetrics>
        <Metric label="Avg Latency" value={`${metrics[fn.id].avg_latency_ms}ms`} />
        <Metric label="Success Rate" value={`${metrics[fn.id].success_rate}%`} />
        <Metric label="Last Used" value={formatRelativeTime(metrics[fn.id].last_used)} />
      </PerformanceMetrics>
      
      <FunctionDescription>
        {fn.description}
      </FunctionDescription>
      
      <Recommendation>
        💡 <strong>Recommended:</strong> {getRecommendation(fn.id)}
      </Recommendation>
      
      <Actions>
        <Button 
          variant="outline" 
          onClick={() => testFunction(fn.id)}
        >
          Test with Sample
        </Button>
      </Actions>
    </FunctionCard>
  ))}
</FunctionAssignments>
```

---

## 🔍 Component: ModelTester

### Test Model Before Assigning

```tsx
<ModelTester function="semantic_vac" model="phi-3:mini">
  <TesterHeader>
    <h3>Test: Semantic VAC with phi-3:mini</h3>
  </TesterHeader>
  
  <TesterInput>
    <Label>Sample Text:</Label>
    <TextArea
      value={testInput}
      onChange={setTestInput}
      placeholder="I'm feeling anxious about tomorrow..."
      rows={4}
    />
    <Button onClick={runTest} loading={testing}>
      Run Analysis
    </Button>
  </TesterInput>
  
  {testResult && (
    <TesterResults>
      <ResultHeader>
        <span>Results</span>
        <span className="text-gray-400">Completed in {testResult.latency}ms</span>
      </ResultHeader>
      
      <ResultData>
        <h4>Extracted VAC:</h4>
        <VACDisplay vac={testResult.vac} />
        
        <h4>Detected Emotion:</h4>
        <EmotionBadge 
          emotion={testResult.emotion}
          confidence={testResult.confidence}
        />
      </ResultData>
      
      <ResultComparison>
        <h4>vs Current Model (llama3.1:8b):</h4>
        <ComparisonTable>
          <Row>
            <Cell>Latency</Cell>
            <Cell>{testResult.latency}ms</Cell>
            <Cell>{currentModel.latency}ms</Cell>
            <Cell>
              {testResult.latency < currentModel.latency ? '⬆️ Faster' : '⬇️ Slower'}
            </Cell>
          </Row>
        </ComparisonTable>
      </ResultComparison>
      
      <ResultActions>
        <Button onClick={() => assignModel(fn, model)}>
          Looks Good - Assign this Model
        </Button>
        <Button variant="outline" onClick={closeTest}>
          Cancel
        </Button>
      </ResultActions>
    </TesterResults>
  )}
</ModelTester>
```

---

## 🎨 Component: SystemResources

### Show Available System Resources

```tsx
<SystemResources>
  <ResourceCard>
    <ResourceIcon type="ram" />
    <ResourceInfo>
      <ResourceLabel>RAM</ResourceLabel>
      <ResourceValue>{systemRAM}GB available</ResourceValue>
      <ResourceBar used={usedRAM} total={systemRAM} />
    </ResourceInfo>
    {ollama.models_loaded > 0 && (
      <ResourceDetail>
        {ollama.ram_used}GB used by loaded models
      </ResourceDetail>
    )}
  </ResourceCard>
  
  <ResourceCard>
    <ResourceIcon type="disk" />
    <ResourceInfo>
      <ResourceLabel>Disk Space</ResourceLabel>
      <ResourceValue>{diskFree}GB free</ResourceValue>
      <ResourceBar used={diskUsed} total={diskTotal} />
    </ResourceInfo>
    <ResourceDetail>
      {totalModelSize}GB used by {localModels.length} models
    </ResourceDetail>
  </ResourceCard>
  
  <ResourceCard>
    <ResourceIcon type="ollama" />
    <ResourceInfo>
      <ResourceLabel>Ollama Status</ResourceLabel>
      <ResourceValue>
        {ollamaRunning ? '✅ Running' : '❌ Not Running'}
      </ResourceValue>
    </ResourceInfo>
    {ollamaRunning && (
      <ResourceDetail>
        {loadedModels.length} model(s) loaded in memory
      </ResourceDetail>
    )}
  </ResourceCard>
</SystemResources>
```

---

## 📋 User Workflows

### Workflow 1: Download New Model

```text
1. User clicks "AI Models" in Settings
2. Clicks "Available" tab
3. Browses curated model list
4. Sees model card with stats/description
5. Checks: "Requires 32GB RAM" (they have 16GB)
6. ⚠️ Warning shown: "Insufficient RAM"
7. User chooses different model (8B version)
8. Clicks "Download Model"
9. Progress dialog shows download (26GB, 15 min ETA)
10. Download completes
11. Model appears in "Local" tab
12. Can now assign to functions
```

### Workflow 2: Assign Model to Function

```text
1. User in "Function Assignments" section
2. Sees "Insight Generation → llama3.1:8b (2.5s avg)"
3. Wants better quality, has good hardware
4. Clicks dropdown next to "Insight Generation"
5. Sees options:
   - llama3.1:8b (current) ⭐⭐⭐⭐
   - llama3.1:70b ⭐⭐⭐⭐⭐ (recommended for quality)
   - mixtral:8x7b ⭐⭐⭐⭐⭐
6. Selects "llama3.1:70b"
7. Confirmation: "This will increase latency to ~8s. Continue?"
8. Confirms
9. Model assigned
10. Next insight generation uses new model
```

### Workflow 3: Test Model Performance

```text
1. User considering switching model
2. Clicks "Test with Sample" on function card
3. Test dialog opens
4. Enters sample text: "I feel overwhelmed"
5. Clicks "Run Analysis"
6. Shows results from candidate model
7. Shows side-by-side comparison with current model
8. Latency: 1.8s vs 2.2s (faster!)
9. Quality: Emotion detected correctly
10. User decides to assign
11. Clicks "Assign this Model"
12. Done!
```

---

## 🎨 Visual Design Patterns

### Model Cards

```tsx
// Small card (library view)
<ModelCardSmall>
  <Header>
    <Icon /> llama3.1:8b
    {inUse && <Badge>Active</Badge>}
  </Header>
  <Stats compact>
    4.7GB | 8B | ⭐⭐⭐⭐
  </Stats>
  <Actions>
    <IconButton icon="assign" />
    <IconButton icon="delete" />
  </Actions>
</ModelCardSmall>

// Large card (detailed view)
<ModelCardLarge>
  <Header>
    <Icon /> llama3.1:70b-instruct-q4_0
    <BadgeGroup>
      <Badge>Premium</Badge>
      <Badge>Best Quality</Badge>
    </BadgeGroup>
  </Header>
  
  <StatsGrid>
    <Stat label="Size" value="40GB" />
    <Stat label="Parameters" value="70B" />
    <Stat label="Speed" value="★★☆☆☆" />
    <Stat label="Quality" value="★★★★★" />
    <Stat label="RAM Required" value="48GB" />
    <Stat label="Est. Speed" value="3 tok/s" />
  </StatsGrid>
  
  <Description>
    Highest quality model for therapeutic insights...
  </Description>
  
  <RecommendedFor>
    ✅ Insight Generation<br/>
    ✅ Multi-Emotion Detection<br/>
    ⚠️ Not for: Real-time VAC (too slow)
  </RecommendedFor>
  
  <PerformanceData>
    <h4>Real-World Performance</h4>
    <Chart data={modelMetrics} />
    <ul>
      <li>Avg Latency: 7.8s</li>
      <li>Success Rate: 98.5%</li>
      <li>User Rating: 4.8/5</li>
    </ul>
  </PerformanceData>
  
  <Actions>
    <Button variant="primary">Download Model</Button>
    <Button variant="outline">View Details</Button>
  </Actions>
</ModelCardLarge>
```

---

## 🎯 Function Assignment UI

### Assignment Dropdown

```tsx
<FunctionAssignmentCard function="semantic_vac">
  <FunctionInfo>
    <Icon>🧠</Icon>
    <div>
      <h4>Semantic VAC Extraction</h4>
      <p className="text-sm text-gray-400">
        Real-time analysis of text/audio → VAC coordinates
      </p>
    </div>
  </FunctionInfo>
  
  <CurrentModel>
    <Label>Current Model:</Label>
    <ModelDropdown
      value={current}
      onChange={handleAssign}
      options={compatibleModels}
    >
      {compatibleModels.map(model => (
        <DropdownOption key={model.name} value={model.name}>
          <OptionIcon family={model.family} />
          <OptionText>
            <OptionName>{model.name}</OptionName>
            <OptionMeta>
              {model.parameter_size} • 
              {model.speed_rating}⭐ speed • 
              {model.quality_rating}⭐ quality
            </OptionMeta>
          </OptionText>
          {model.name === current && <CheckIcon />}
          {isRecommended(model, 'semantic_vac') && (
            <RecommendedBadge>Recommended</RecommendedBadge>
          )}
        </DropdownOption>
      ))}
    </ModelDropdown>
  </CurrentModel>
  
  <PerformanceDisplay>
    <MetricCard>
      <MetricValue>{metrics.avg_latency}ms</MetricValue>
      <MetricLabel>Avg Latency</MetricLabel>
      <MetricTrend trend={metrics.latency_trend} />
    </MetricCard>
    
    <MetricCard>
      <MetricValue>{metrics.success_rate}%</MetricValue>
      <MetricLabel>Success Rate</MetricLabel>
    </MetricCard>
    
    <MetricCard>
      <MetricValue>{metrics.total_invocations}</MetricValue>
      <MetricLabel>Total Uses</MetricLabel>
    </MetricCard>
  </PerformanceDisplay>
  
  <RecommendationBox>
    💡 For real-time VAC extraction, we recommend:
    <ul>
      <li><strong>Fast</strong>: phi-3:mini (~1.5s)</li>
      <li><strong>Balanced</strong>: llama3.1:8b (~2.2s)</li>
      <li><strong>Quality</strong>: llama3.1:13b (~4s)</li>
    </ul>
  </RecommendationBox>
</FunctionAssignmentCard>
```

---

## 🔔 Notifications & Feedback

### Download Complete

```tsx
<Toast variant="success" duration={5000}>
  ✅ Model downloaded successfully!
  <ToastContent>
    <strong>{modelName}</strong> is now available
  </ToastContent>
  <ToastActions>
    <Button size="sm" onClick={() => navigateToAssignments()}>
      Assign to Function
    </Button>
  </ToastActions>
</Toast>
```

### Assignment Changed

```tsx
<Toast variant="info" duration={3000}>
  🔄 Model assignment updated
  <ToastContent>
    <strong>{functionName}</strong> now uses <strong>{newModel}</strong>
  </ToastContent>
</Toast>
```

### Insufficient Resources

```tsx
<Alert variant="warning">
  ⚠️ This model requires {requiredRAM}GB RAM
  <AlertContent>
    Your system has {availableRAM}GB available. The model may not load properly.
  </AlertContent>
  <AlertActions>
    <Button variant="outline" onClick={showAlternatives}>
      Show Alternative Models
    </Button>
  </AlertActions>
</Alert>
```

---

## 📊 Data Hooks

### useOllamaModels

```typescript
export function useOllamaModels() {
  const [localModels, setLocalModels] = useState<ModelInfo[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchLocalModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/listener/ai/models/local');
      const data = await response.json();
      setLocalModels(data.models);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const pullModel = async (modelName: string) => {
    // Connect to WebSocket for progress
    const ws = new WebSocket(`ws://localhost:8002/listener/ai/models/pull/${taskId}`);
    
    ws.onmessage = (event) => {
      const progress = JSON.parse(event.data);
      setPullProgress(progress);
    };
    
    // ... etc
  };
  
  const deleteModel = async (modelName: string) => {
    await fetch(`/listener/ai/models/${modelName}`, { method: 'DELETE' });
    await fetchLocalModels(); // Refresh
  };
  
  return {
    localModels,
    availableModels,
    loading,
    error,
    pullModel,
    deleteModel,
    refreshModels: fetchLocalModels
  };
}
```

### useModelAssignments

```typescript
export function useModelAssignments() {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<Record<string, FunctionMetrics>>({});
  
  const fetchAssignments = async () => {
    const response = await fetch('/observer/ai/assignments');
    const data = await response.json();
    setAssignments(data.assignments);
  };
  
  const assignModel = async (function: string, modelName: string) => {
    await fetch('/observer/ai/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ function, model_name: modelName })
    });
    
    await fetchAssignments(); // Refresh
    
    toast.success(`${function} now uses ${modelName}`);
  };
  
  return {
    assignments,
    metrics,
    assignModel,
    refreshAssignments: fetchAssignments
  };
}
```

---

## 🎯 Success Metrics (UI)

### UI Success Criteria

1. ✅ Users can discover models easily
2. ✅ Download process is transparent (progress visible)
3. ✅ Resource requirements are clear before download
4. ✅ Assignment is intuitive (drag-drop or dropdown)
5. ✅ Performance impact is visible
6. ✅ Recommendations help decision-making
7. ✅ Testing before assignment reduces risk
8. ✅ System resources are monitored

---

## 🔮 Future Enhancements

### V2: Model Comparison

Side-by-side comparison of multiple models:

- Run same sample through different models
- Compare latency, quality, output
- Visual diff of results

### V3: Automatic Optimization

```tsx
<AutoOptimizeButton>
  Automatically select best models for my hardware
</AutoOptimizeButton>
```

Analyzes:

- Available RAM/CPU
- Typical usage patterns
- Speed vs quality preference
- Assigns optimal models automatically

### V4: Community Ratings

```tsx
<ModelCard>
  {/* ... */}
  <CommunityRatings>
    <Rating value={4.2} count={156} />
    <span>156 users recommend this model</span>
  </CommunityRatings>
</ModelCard>
```

---

**Next**: See `03-IMPLEMENTATION-ROADMAP.md` for phased rollout plan
