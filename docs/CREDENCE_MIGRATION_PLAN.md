# Credence: Technical Migration Plan
## Transforming Credence AI (Cybersecurity) → Credence (SME Loan Analysis)

**Document Version:** 1.0
**Last Updated:** March 5, 2026
**Authors:** Claude Code (Technical Architecture Analysis)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Mapping Old System → New System](#3-mapping-old-system--new-system)
4. [Components That Can Be Reused](#4-components-that-can-be-reused)
5. [Components That Must Be Modified](#5-components-that-must-be-modified)
6. [Components That Should Be Removed](#6-components-that-should-be-removed)
7. [New Components to Implement](#7-new-components-to-implement)
8. [Live LLM Activity Streaming Architecture](#8-live-llm-activity-streaming-architecture)
9. [Updated System Architecture](#9-updated-system-architecture)
10. [Suggested Directory Structure](#10-suggested-directory-structure)
11. [Step-by-Step Refactoring Plan](#11-step-by-step-refactoring-plan)
12. [Risks and Technical Considerations](#12-risks-and-technical-considerations)

---

## 1. Overview

### 1.1 Current System

**Credence AI Backend** is a production-ready cybersecurity investigation platform that implements:

- **Agentic Architecture**: LangGraph-based multi-step reasoning agent
- **20+ Security Tools**: Signature detection, anomaly detection, MITRE ATT&CK mapping, threat intelligence enrichment
- **Multi-Agent Support**: Specialized agents (LogAnalyzer, ThreatPredictor, IncidentResponder, Verifier, Orchestrator)
- **RAG Knowledge Base**: Vector-based retrieval using pgvector for MITRE ATT&CK, OWASP, incident response playbooks
- **Real-Time Streaming**: Server-Sent Events (SSE) for live investigation progress
- **Multi-Provider LLM**: Supports Claude (Anthropic), GPT (OpenAI), Gemini (Google) via gateway pattern

**Technology Stack**:
- FastAPI (async Python backend)
- LangGraph (agent orchestration)
- PostgreSQL + pgvector (database + vector search)
- SQLAlchemy (ORM)
- LangChain (LLM framework)
- React/Next.js (frontend - not in scope)

### 1.2 New System Goals

**Credence** will be an AI-powered SME loan assessment platform that:

- **Analyzes Financial Documents**: Extract and understand balance sheets, P&L statements, bank statements, tax returns
- **Assesses Credit Risk**: Calculate credit scores (300-850 scale), default probability, risk factors
- **Provides Counterfactual Guidance**: Show rejected applicants exactly what to improve
- **Ensures Fairness**: Detect demographic bias, causal fairness checks
- **Streams Reasoning**: Real-time visibility into agent workflow (document processing, financial analysis, risk scoring)
- **Supports Multi-Agent Workflows**: FinancialAnalyzer, RiskAssessment, DocumentProcessor, LoanDecisionMaker

**Key Differences from Chat Interface**:
- **Task-based interaction**: Upload documents → Request evaluation → Get structured report
- **Structured outputs**: Credit scores, risk matrices, financial ratios (not free-form conversation)
- **Multi-step workflows**: Document ingestion → Feature engineering → Credit scoring → Explainability → Counterfactuals → Decision
- **Live activity feed**: Users see what the system is doing at each step (like Perplexity, v0.dev, Claude Code)

### 1.3 Adaptation Approach

**Reuse Strategy (80% code reuse)**:

✅ **Keep**: Core agent orchestration framework, tool architecture, streaming infrastructure, database models, authentication
🔧 **Adapt**: Agent prompts, state schema, workflow graph structure
🆕 **Replace**: Domain-specific tools (security → financial), RAG knowledge content, specialized agents
🗑️ **Remove**: Cybersecurity-specific tools, MITRE ATT&CK integration, security-focused middleware

**Migration Philosophy**:
- Preserve the **agentic orchestration layer** (LangGraph, tool registry, streaming)
- Replace the **domain-specific tools and knowledge**
- Enhance **streaming events** for better observability
- Add **structured output validation** for financial data
- Implement **multi-agent collaboration** for loan approval workflow

---

## 2. Current Architecture Analysis

### 2.1 Agent Architecture

**Core Pattern**: LangGraph state-driven graph with conditional routing

**Current Graph Structure**:
```
START
  ↓
CLASSIFY (LLM-based query classification)
  ↓
[security query?] → YES → PLANNING
                  ↓
                  NO → SIMPLE_RESPONSE → END
  ↓
PLANNING (assess query, determine approach)
  ↓
TOOL_SELECTION (LLM selects tools with bind_tools)
  ↓
[tools selected?] → YES → EXECUTE_TOOLS
                  ↓
                  NO → ANALYSIS
  ↓
EXECUTE_TOOLS (ToolNode executes tools)
  ↓
[continue investigation?] → YES → TOOL_SELECTION (loop)
                          ↓
                          NO → ANALYSIS
  ↓
ANALYSIS (correlate findings, MITRE mapping)
  ↓
RESPONSE (generate final report)
  ↓
END
```

**Key Files**:
- [app/ai/langgraph_agent.py](credence-ai-backend/app/ai/langgraph_agent.py) (1,208 lines) - Main agent orchestration
- [app/ai/specialized_agents.py](credence-ai-backend/app/ai/specialized_agents.py) (342 lines) - Multi-agent system
- [app/ai/gateway_client.py](credence-ai-backend/app/ai/gateway_client.py) (117 lines) - LLM provider abstraction

**State Schema**:
```python
class CyberSecurityState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    investigation_steps: list[str]
    iocs_found: list[dict]
    severity_level: str  # "low", "medium", "high", "critical"
    mitre_tactics: list[str]
    tools_used: list[str]
    tool_results: list[dict]
    pending_approval: dict | None
    final_response: str
```

### 2.2 Tool System

**Base Class**: [app/tools/base.py](credence-ai-backend/app/tools/base.py)
```python
class BaseTool(ABC):
    @property
    @abstractmethod
    def description(self) -> str: pass

    @property
    @abstractmethod
    def input_schema(self) -> type[BaseModel]: pass

    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]: pass
```

**Tool Registry** (20 tools currently registered):

| Category | Tools | Location |
|----------|-------|----------|
| **Detection** | signature_detector, anomaly_detector, ip_reputation_checker, ml_classifier | [app/tools/detection/](credence-ai-backend/app/tools/detection/) |
| **CTI Enrichment** | mitre_attack_mapper, cve_lookup, cti_fetcher, misp_connector, stix_parser | [app/tools/cti_enrichment/](credence-ai-backend/app/tools/cti_enrichment/) |
| **Correlation** | event_correlator, severity_scorer, time_series_analyzer, network_graph | [app/tools/correlation/](credence-ai-backend/app/tools/correlation/) |
| **Incident Response** | playbook_engine, firewall_rule_generator, notification_sender, report_generator | [app/tools/incident_response/](credence-ai-backend/app/tools/incident_response/) |
| **Log Ingestion** | log_file_reader, structured_log_parser | [app/tools/log_ingestion/](credence-ai-backend/app/tools/log_ingestion/) |
| **Knowledge** | rag_retriever | [app/tools/knowledge/](credence-ai-backend/app/tools/knowledge/) |

**Tool Execution Pattern**:
```python
# 1. LLM selects tools via function calling
llm_with_tools = llm.bind_tools(tools)
response = await llm_with_tools.ainvoke(messages)

# 2. ToolNode executes selected tools
tool_node = ToolNode(tools)
results = await tool_node.ainvoke(state)

# 3. Tool results added to conversation
state["messages"] += [ToolMessage(content=results)]
```

### 2.3 Streaming Architecture

**Current Implementation**: Server-Sent Events (SSE) with OpenAI-compatible format

**Event Transformation Pipeline**:
```python
async for event in langgraph_agent.astream_events(state, version="v2"):
    if event["event"] == "on_chat_model_stream":
        # LLM text generation
        yield {"type": "text-delta", "delta": chunk.content}

    elif event["event"] == "on_tool_start":
        # Tool execution starting
        yield {"type": "tool-start", "toolName": tool_name}

    elif event["event"] == "on_tool_end":
        # Tool execution complete
        yield {"type": "tool-end", "toolName": tool_name, "result": result}
```

**Frontend Format** (Vercel AI SDK compatible):
```json
{"type": "text-delta", "id": "msg_123", "delta": "content"}
{"type": "tool-start", "toolName": "signature_detector"}
{"type": "tool-end", "toolName": "signature_detector"}
{"type": "finish", "finishReason": "stop"}
```

**Key Files**:
- [app/routers/chat.py](credence-ai-backend/app/routers/chat.py) (730 lines) - SSE streaming endpoint
- [app/ai/langgraph_agent.py](credence-ai-backend/app/ai/langgraph_agent.py) - Event transformation logic

### 2.4 Database Models

**ORM**: SQLAlchemy (async)
**Database**: PostgreSQL (Supabase)

**Core Models**:

1. **User** ([app/models/user.py](credence-ai-backend/app/models/user.py))
   - Authentication (email/password + OAuth)
   - Profile information
   - Token management

2. **Chat** ([app/models/chat.py](credence-ai-backend/app/models/chat.py))
   - Conversation sessions
   - Visibility settings
   - Context tracking

3. **Message** ([app/models/chat.py](credence-ai-backend/app/models/chat.py))
   - Multi-part message support (text, image, tool_call, tool_result)
   - Provider tracking
   - Attachments

**Pydantic Schemas**: [app/schemas/chat.py](credence-ai-backend/app/schemas/chat.py)

### 2.5 RAG Knowledge Base

**Implementation**: pgvector (PostgreSQL extension) + OpenAI embeddings

**Architecture**:
- **Vector Store**: pgvector with IVFFlat index (cosine similarity)
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Chunking**: RecursiveCharacterTextSplitter (512 tokens, 100 overlap)
- **Retrieval**: Semantic search + metadata filtering

**Current Knowledge Base**:
- MITRE ATT&CK framework (700+ techniques)
- OWASP Top 10
- Incident response playbooks
- CVE database

**Key Files**:
- [app/tools/knowledge/rag_retriever.py](credence-ai-backend/app/tools/knowledge/rag_retriever.py) - RAG retriever tool
- [docs/RAG_INTEGRATION_GUIDE.md](credence-ai-backend/docs/RAG_INTEGRATION_GUIDE.md) - Comprehensive RAG setup guide

### 2.6 Multi-Agent System

**Specialized Agents** (optional mode, controlled by `use_specialized_agents` flag):

1. **LogAnalyzer** (Haiku 4.5 - fast tier)
   - Parses logs, extracts security events

2. **ThreatPredictor** (Sonnet 3.5 - smart tier)
   - Assesses threat likelihood, predicts attack progression

3. **IncidentResponder** (Haiku 4.5 - fast tier)
   - Generates response playbooks

4. **WorkerPlanner** (Haiku 4.5 - fast tier)
   - Plans investigation steps, selects tools

5. **Verifier** (Sonnet 3.5 - smart tier)
   - Validates evidence quality, assigns confidence scores

6. **Orchestrator** (Sonnet 3.5 - smart tier)
   - Coordinates all agents, synthesizes results

**Model Routing**: [app/ai/specialized_agents.py](credence-ai-backend/app/ai/specialized_agents.py) uses adaptive model routing (fast tasks → Haiku, complex reasoning → Sonnet)

### 2.7 Security and Safety

**Output Guard**: [app/utils/output_guard.py](credence-ai-backend/app/utils/output_guard.py)
- Prevents secrets leakage
- Content policy enforcement
- Output truncation (12,000 char limit)

**Input Validator**: [app/utils/input_validator.py](credence-ai-backend/app/utils/input_validator.py)
- SQL injection prevention
- XSS sanitization
- Max length enforcement

**Budget Guards**:
- Max agent steps: 10
- Max tool calls: 15
- Max runtime: 120 seconds

**Rate Limiting**: 10 requests/minute

---

## 3. Mapping Old System → New System

### 3.1 Component Mapping Table

| Existing Component | Current Purpose | New Purpose | Action |
|-------------------|----------------|-------------|--------|
| **Core Infrastructure** | | | |
| `LangGraphAgent` | Cybersecurity investigation orchestrator | Loan analysis orchestrator | **Modify** (change prompts, state schema, graph structure) |
| `GatewayClient` | Multi-provider LLM abstraction | Same | **Reuse** (no changes needed) |
| `BaseTool` | Tool interface definition | Same | **Reuse** (no changes needed) |
| `StateGraph` | Workflow orchestration | Same | **Reuse** (adapt graph nodes) |
| **Agent System** | | | |
| `CyberSecurityState` | Investigation state schema | Loan analysis state schema | **Modify** (rename, change fields) |
| `specialized_agents.py` | Security-focused agents | Finance-focused agents | **Modify** (replace agent roles) |
| `AgentFactory` | Agent creation and caching | Same | **Reuse** (change agent definitions) |
| **Tools** | | | |
| `signature_detector` | Detect SQLi, XSS, command injection | ❌ Not applicable | **Remove** |
| `anomaly_detector` | Security anomaly detection | Fraud detection in financials | **Modify** (change detection logic) |
| `mitre_attack_mapper` | Map attacks to MITRE ATT&CK | Map risks to Basel III / credit frameworks | **Modify** (change framework) |
| `cti_fetcher` | Threat intelligence APIs | Market data / economic indicators | **Modify** (change data sources) |
| `cve_lookup` | CVE vulnerability database | ❌ Not applicable | **Remove** |
| `severity_scorer` | Security severity scoring | Credit risk scoring | **Modify** (change scoring logic) |
| `event_correlator` | Correlate security events | Correlate financial trends | **Modify** (adapt correlation logic) |
| `time_series_analyzer` | Temporal pattern analysis | Financial trend analysis | **Reuse** (mostly unchanged) |
| `playbook_engine` | Incident response playbooks | Loan approval workflows | **Modify** (change workflow logic) |
| `firewall_rule_generator` | Generate security rules | ❌ Not applicable | **Remove** |
| `notification_sender` | Alert notifications | Loan decision notifications | **Reuse** (change message templates) |
| `report_generator` | Security investigation reports | Credit assessment reports | **Modify** (change templates) |
| `log_file_reader` | Parse security logs | Parse financial documents (PDFs, CSVs) | **Modify** (change parsing logic) |
| `structured_log_parser` | Extract IOCs from logs | Extract financial data from docs | **Modify** (change extraction logic) |
| `rag_retriever` | Retrieve MITRE ATT&CK knowledge | Retrieve lending regulations, credit policies | **Reuse** (change knowledge base content) |
| **Database Models** | | | |
| `User` | User authentication | Same (loan officers, admins) | **Reuse** (no changes needed) |
| `Chat` | Conversation sessions | Loan assessment sessions | **Modify** (rename, add loan-specific fields) |
| `Message` | Chat messages | Assessment interactions | **Reuse** (mostly unchanged) |
| **API Endpoints** | | | |
| `/api/chat` | Chat completion endpoint | Loan assessment endpoint | **Modify** (change endpoint logic) |
| `/api/files` | File upload | Document upload (financial statements) | **Reuse** (add file type validation) |
| `/api/auth` | Authentication | Same | **Reuse** (no changes needed) |
| `/api/health` | Health check | Same | **Reuse** (no changes needed) |
| **Middleware** | | | |
| `CorrelationIdMiddleware` | Request tracking | Same | **Reuse** (no changes needed) |
| `RateLimitMiddleware` | Rate limiting | Same | **Reuse** (adjust limits if needed) |
| `CORSMiddleware` | CORS handling | Same | **Reuse** (no changes needed) |
| **RAG System** | | | |
| `ThreatIntelligenceRetriever` | Retrieve security knowledge | Retrieve lending knowledge | **Modify** (rename, change knowledge base) |
| `EmbeddingPipeline` | Chunk and embed documents | Same | **Reuse** (no changes needed) |
| pgvector embeddings table | MITRE ATT&CK embeddings | Lending regulations, Basel III, credit policies | **Modify** (re-populate with new content) |

### 3.2 Agent Specialization Mapping

| Security Agent | Loan Agent | Function Change |
|----------------|-----------|----------------|
| **LogAnalyzer** | **FinancialStatementAnalyzer** | Parse security logs → Parse financial statements (balance sheet, P&L, cash flow) |
| **ThreatPredictor** | **DefaultRiskPredictor** | Predict attack progression → Predict default probability using credit scoring models |
| **IncidentResponder** | **LoanDecisionMaker** | Generate incident response playbooks → Make loan approval/rejection decision with terms |
| **WorkerPlanner** | **AnalysisPlanner** | Plan security investigation steps → Plan financial analysis workflow |
| **Verifier** | **DataQualityVerifier** | Validate security evidence quality → Validate financial data completeness and accuracy |
| **Orchestrator** | **LoanOfficerOrchestrator** | Synthesize security findings → Synthesize financial analysis and produce final recommendation |

### 3.3 State Schema Transformation

**Current** (`CyberSecurityState`):
```python
class CyberSecurityState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    investigation_steps: list[str]
    iocs_found: list[dict]
    severity_level: str  # "low", "medium", "high", "critical"
    mitre_tactics: list[str]
    tools_used: list[str]
    tool_results: list[dict]
    pending_approval: dict | None
    final_response: str
```

**Proposed** (`LoanAssessmentState`):
```python
class LoanAssessmentState(TypedDict):
    # Core conversation
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # Analysis workflow
    analysis_steps: list[str]  # Sequence of analysis actions
    documents_processed: list[dict]  # Uploaded financial documents

    # Financial metrics
    financial_ratios: dict  # debt-to-equity, current ratio, ROE, etc.
    revenue_trends: dict  # Time series analysis results
    cash_flow_analysis: dict  # Cash flow ratios and patterns

    # Credit assessment
    credit_score: float  # 300-850 scale
    default_probability: float  # 0-1
    risk_level: str  # "low", "medium", "high", "critical"
    risk_factors: list[str]  # Identified risk factors

    # Business context
    industry_benchmarks: dict  # Comparison to industry standards
    alternative_data: dict  # Mobile money, POS revenue, utility payments

    # Tool execution tracking
    tools_used: list[str]
    tool_results: list[dict]
    data_completeness_score: float  # 0-1 (SHAP-based importance)

    # Decision and explainability
    loan_recommendation: dict  # approve/reject, loan amount, interest rate, terms
    shap_explanations: dict  # Feature importance for credit score
    counterfactuals: list[dict]  # Improvement paths for rejected applicants
    fairness_check_results: dict  # Causal fairness validation

    # Output
    final_response: str  # Structured credit report
```

---

## 4. Components That Can Be Reused

### 4.1 Core Orchestration Framework (100% reuse)

**Why**: The LangGraph-based agent architecture is domain-agnostic and perfectly suited for loan analysis workflows.

**Files to Reuse**:
- ✅ `LangGraphAgent.__init__()` - Agent initialization logic
- ✅ `LangGraphAgent._build_graph()` - Graph construction framework (modify node contents, not structure)
- ✅ `LangGraphAgent._execute_tools_node()` - Tool execution logic
- ✅ `LangGraphAgent.stream_chat_completion()` - Streaming interface
- ✅ `StateGraph` from LangGraph - State machine framework

**Modifications Needed**:
- Rename `CyberSecurityState` → `LoanAssessmentState`
- Change node prompts (security → finance)
- Replace tool registry (security tools → financial tools)

### 4.2 Tool Architecture (100% reuse)

**Why**: The `BaseTool` abstract class and tool registry pattern are domain-agnostic.

**Files to Reuse**:
- ✅ [app/tools/base.py](credence-ai-backend/app/tools/base.py) - `BaseTool` interface
- ✅ Tool registration logic in `langgraph_agent.py`
- ✅ `ToolNode` execution pattern from LangGraph
- ✅ Logging decorator (`@log_tool_execution`)

**What Changes**: Only the tool implementations (replace security tools with financial tools)

### 4.3 Gateway Pattern (100% reuse)

**Why**: Multi-provider LLM support is still needed (Claude, GPT, Gemini).

**Files to Reuse**:
- ✅ [app/ai/gateway_client.py](credence-ai-backend/app/ai/gateway_client.py) - `GatewayClient` class
- ✅ [app/ai/llms/claude_client.py](credence-ai-backend/app/ai/llms/claude_client.py) - Claude API client
- ✅ [app/ai/llms/gemini_client.py](credence-ai-backend/app/ai/llms/gemini_client.py) - Gemini API client
- ✅ [app/ai/llms/openai_client.py](credence-ai-backend/app/ai/llms/openai_client.py) - OpenAI API client

**No modifications needed**: Provider abstraction works identically for financial analysis.

### 4.4 Streaming Infrastructure (100% reuse)

**Why**: SSE streaming is still the best approach for real-time LLM activity updates.

**Files to Reuse**:
- ✅ SSE streaming logic in [app/routers/chat.py](credence-ai-backend/app/routers/chat.py)
- ✅ Event transformation pipeline in `langgraph_agent.py`
- ✅ OpenAI-compatible format conversion

**Enhancements Needed**: Add more granular event types for financial analysis steps (see Section 8)

### 4.5 Database Infrastructure (95% reuse)

**Files to Reuse**:
- ✅ [app/database.py](credence-ai-backend/app/database.py) - Database connection and session management
- ✅ [app/models/user.py](credence-ai-backend/app/models/user.py) - User authentication
- ✅ SQLAlchemy async engine
- ✅ Alembic migrations framework

**Modifications Needed**:
- Rename `Chat` → `LoanAssessment`
- Add loan-specific fields (applicant_id, loan_amount, credit_score)
- Keep `Message` model (rename to `AssessmentInteraction` optionally)

### 4.6 RAG Infrastructure (90% reuse)

**Why**: RAG architecture (pgvector + embeddings) is domain-agnostic. Only knowledge content changes.

**Files to Reuse**:
- ✅ pgvector integration (database extension)
- ✅ [app/ai/embedding_pipeline.py](credence-ai-backend/app/ai/embedding_pipeline.py) - Chunking and embedding logic
- ✅ [app/ai/rag_retriever.py](credence-ai-backend/app/ai/rag_retriever.py) - Retrieval logic

**What Changes**:
- Replace MITRE ATT&CK content with lending regulations (Basel III, Dodd-Frank, FCRA, ECOA)
- Add credit policy documents, underwriting guidelines, industry risk reports
- Rename `ThreatIntelligenceRetriever` → `LendingKnowledgeRetriever`

### 4.7 Authentication and Middleware (100% reuse)

**Files to Reuse**:
- ✅ [app/routers/auth.py](credence-ai-backend/app/routers/auth.py) - OAuth + email/password auth
- ✅ [app/middleware/correlation_id.py](credence-ai-backend/app/middleware/correlation_id.py) - Request tracking
- ✅ [app/middleware/rate_limiter.py](credence-ai-backend/app/middleware/rate_limiter.py) - Rate limiting

**No modifications needed**: Authentication and middleware are domain-agnostic.

### 4.8 Configuration Management (90% reuse)

**Files to Reuse**:
- ✅ [app/config.py](credence-ai-backend/app/config.py) - Settings class
- ✅ Environment variable loading

**Modifications Needed**:
- Replace cybersecurity API keys with financial data API keys (e.g., `credit_bureau_api_key`, `market_data_api_key`)
- Add Credence-specific settings (e.g., `default_credit_score_threshold`, `max_loan_amount`)

### 4.9 Utility Modules (100% reuse)

**Files to Reuse**:
- ✅ [app/utils/structured_logger.py](credence-ai-backend/app/utils/structured_logger.py) - Structured logging
- ✅ [app/utils/output_guard.py](credence-ai-backend/app/utils/output_guard.py) - Output safety (adapt for PII)
- ✅ [app/utils/input_validator.py](credence-ai-backend/app/utils/input_validator.py) - Input validation

**Minor Adaptations**: Update output guard to detect financial PII (SSN, bank account numbers)

---

## 5. Components That Must Be Modified

### 5.1 LangGraph Agent (Major Modifications)

**File**: [app/ai/langgraph_agent.py](credence-ai-backend/app/ai/langgraph_agent.py)

**Required Changes**:

1. **Rename Class**:
   ```python
   # Before
   class LangGraphAgent:
       """LangGraph-powered cybersecurity investigation agent."""

   # After
   class LoanAssessmentAgent:
       """LangGraph-powered SME loan assessment agent."""
   ```

2. **Update State Schema**:
   ```python
   # Before
   class CyberSecurityState(TypedDict):
       investigation_steps: list[str]
       iocs_found: list[dict]
       severity_level: str
       mitre_tactics: list[str]

   # After
   class LoanAssessmentState(TypedDict):
       analysis_steps: list[str]
       financial_ratios: dict
       credit_score: float
       risk_factors: list[str]
       shap_explanations: dict
       counterfactuals: list[dict]
   ```

3. **Modify Graph Structure**:
   ```python
   # Before
   workflow.add_node("classify", self._classify_node)
   workflow.add_node("planning", self._planning_node)
   workflow.add_node("tool_selection", self._tool_selection_node)
   workflow.add_node("execute_tools", self._execute_tools_node)
   workflow.add_node("analysis", self._analysis_node)  # MITRE mapping
   workflow.add_node("response", self._response_node)

   # After
   workflow.add_node("classify", self._classify_node)
   workflow.add_node("document_ingestion", self._document_ingestion_node)  # NEW
   workflow.add_node("data_completeness_check", self._data_completeness_node)  # NEW
   workflow.add_node("planning", self._planning_node)
   workflow.add_node("tool_selection", self._tool_selection_node)
   workflow.add_node("execute_tools", self._execute_tools_node)
   workflow.add_node("credit_scoring", self._credit_scoring_node)  # NEW
   workflow.add_node("explainability", self._explainability_node)  # NEW (SHAP)
   workflow.add_node("fairness_check", self._fairness_check_node)  # NEW
   workflow.add_node("counterfactual_generation", self._counterfactual_node)  # NEW
   workflow.add_node("analysis", self._analysis_node)  # Risk framework mapping
   workflow.add_node("response", self._response_node)
   ```

4. **Rewrite Node Prompts**:
   ```python
   # Example: Planning Node
   # Before
   planning_prompt = """You are a cybersecurity analyst. Assess this security query..."""

   # After
   planning_prompt = """You are a senior loan officer. Assess this SME loan application..."""
   ```

5. **Replace Tool Registry**:
   ```python
   # Before
   self.tools = [
       signature_detector.to_langchain_tool(),
       anomaly_detector.to_langchain_tool(),
       mitre_attack_mapper.to_langchain_tool(),
       # ... 20 security tools
   ]

   # After
   self.tools = [
       financial_ratio_calculator.to_langchain_tool(),
       credit_score_model.to_langchain_tool(),
       fraud_detector.to_langchain_tool(),
       industry_benchmark_fetcher.to_langchain_tool(),
       # ... 15-20 financial tools
   ]
   ```

**Estimated Effort**: 3-5 days (40-60% of code rewritten, 60-40% reused)

### 5.2 Specialized Agents (Complete Rewrite)

**File**: [app/ai/specialized_agents.py](credence-ai-backend/app/ai/specialized_agents.py)

**Required Changes**:

1. **Replace All Agent Classes**:
   ```python
   # Before
   class LogAnalyzer(SpecializedAgent):
       role = "log_analyzer"
       system_prompt = """You are an expert at parsing security logs..."""

   class ThreatPredictor(SpecializedAgent):
       role = "threat_predictor"
       system_prompt = """You predict attack progression..."""

   # After
   class FinancialStatementAnalyzer(SpecializedAgent):
       role = "financial_statement_analyzer"
       system_prompt = """You are an expert at analyzing balance sheets, P&L statements..."""

   class DefaultRiskPredictor(SpecializedAgent):
       role = "default_risk_predictor"
       system_prompt = """You predict default probability using credit scoring models..."""
   ```

2. **Update AgentFactory**:
   ```python
   # Before
   AGENT_REGISTRY = {
       "log_analyzer": LogAnalyzer,
       "threat_predictor": ThreatPredictor,
       "incident_responder": IncidentResponder,
       "verifier": Verifier,
       "orchestrator": Orchestrator,
   }

   # After
   AGENT_REGISTRY = {
       "financial_statement_analyzer": FinancialStatementAnalyzer,
       "default_risk_predictor": DefaultRiskPredictor,
       "loan_decision_maker": LoanDecisionMaker,
       "data_quality_verifier": DataQualityVerifier,
       "loan_officer_orchestrator": LoanOfficerOrchestrator,
   }
   ```

**Estimated Effort**: 2-3 days (100% rewrite of agent roles and prompts)

### 5.3 Chat Router (Major Modifications)

**File**: [app/routers/chat.py](credence-ai-backend/app/routers/chat.py)

**Required Changes**:

1. **Rename Endpoint**:
   ```python
   # Before
   @router.post("/api/chat")
   async def chat(chat_request: ChatRequest):

   # After
   @router.post("/api/loan-assessment")
   async def assess_loan(assessment_request: LoanAssessmentRequest):
   ```

2. **Update Database Models**:
   ```python
   # Before
   chat = await db.execute(select(Chat).where(Chat.id == chat_id))

   # After
   assessment = await db.execute(select(LoanAssessment).where(LoanAssessment.id == assessment_id))
   ```

3. **Add Document Upload Handling**:
   ```python
   # NEW: Handle uploaded financial documents
   if assessment_request.documents:
       for doc in assessment_request.documents:
           await process_financial_document(doc, assessment_id)
   ```

**Estimated Effort**: 1-2 days (30% rewrite, 70% reused)

### 5.4 Database Models (Moderate Modifications)

**File**: [app/models/chat.py](credence-ai-backend/app/models/chat.py)

**Required Changes**:

1. **Rename Chat → LoanAssessment**:
   ```python
   # Before
   class Chat(Base):
       __tablename__ = "Chat"
       id: UUID
       createdAt: DateTime
       title: str
       userId: UUID
       visibility: str
       lastContext: JSONB

   # After
   class LoanAssessment(Base):
       __tablename__ = "LoanAssessment"
       id: UUID
       createdAt: DateTime
       userId: UUID  # Loan officer
       applicantName: str
       loanAmount: Decimal
       creditScore: Float
       riskLevel: str
       status: str  # "pending", "approved", "rejected"
       decisionReason: Text
       lastContext: JSONB
   ```

2. **Add Financial Document Model**:
   ```python
   # NEW
   class FinancialDocument(Base):
       __tablename__ = "FinancialDocument"
       id: UUID
       assessmentId: UUID  # FK → LoanAssessment
       documentType: str  # "balance_sheet", "income_statement", "bank_statement"
       filePath: str
       extractedData: JSONB
       uploadedAt: DateTime
   ```

**Estimated Effort**: 1 day (create migration, update models)

### 5.5 Pydantic Schemas (Moderate Modifications)

**File**: [app/schemas/chat.py](credence-ai-backend/app/schemas/chat.py)

**Required Changes**:

1. **Create Loan Assessment Schemas**:
   ```python
   # NEW
   class LoanAssessmentRequest(BaseModel):
       applicantName: str
       loanAmount: Decimal
       documents: Optional[List[UploadFile]]
       alternativeData: Optional[Dict[str, Any]]

   class LoanAssessmentResponse(BaseModel):
       assessmentId: str
       creditScore: float
       riskLevel: str
       recommendation: str  # "approve", "reject", "manual_review"
       interestRate: Optional[float]
       loanTerms: Optional[Dict[str, Any]]
       shapExplanations: Dict[str, float]
       counterfactuals: List[Dict[str, Any]]
   ```

**Estimated Effort**: 0.5-1 day

---

## 6. Components That Should Be Removed

### 6.1 Cybersecurity-Specific Tools (Complete Removal)

**Directories to Remove**:
- ❌ [app/tools/detection/signature_detector.py](credence-ai-backend/app/tools/detection/signature_detector.py) - SQLi, XSS detection (not applicable)
- ❌ [app/tools/detection/ip_reputation_checker.py](credence-ai-backend/app/tools/detection/ip_reputation_checker.py) - IP threat scoring (not applicable)
- ❌ [app/tools/cti_enrichment/cve_lookup.py](credence-ai-backend/app/tools/cti_enrichment/cve_lookup.py) - CVE database (not applicable)
- ❌ [app/tools/cti_enrichment/misp_connector.py](credence-ai-backend/app/tools/cti_enrichment/misp_connector.py) - MISP threat sharing (not applicable)
- ❌ [app/tools/cti_enrichment/stix_parser.py](credence-ai-backend/app/tools/cti_enrichment/stix_parser.py) - STIX/TAXII parsing (not applicable)
- ❌ [app/tools/incident_response/firewall_rule_generator.py](credence-ai-backend/app/tools/incident_response/firewall_rule_generator.py) - Firewall rules (not applicable)

**Justification**: These tools are 100% security-specific with no financial equivalent.

### 6.2 Security-Focused Example Files (Complete Removal)

**Files to Remove**:
- ❌ [app/tools/example_ioc_tool.py](credence-ai-backend/app/tools/example_ioc_tool.py) - IOC analysis example
- ❌ [test_agent.py](test_agent.py) (root level) - Security agent test

### 6.3 MITRE ATT&CK Integration (Complete Removal)

**Files to Remove**:
- ❌ [app/tools/cti_enrichment/mitre_attack_mapper.py](credence-ai-backend/app/tools/cti_enrichment/mitre_attack_mapper.py)

**Replacement**: Create `risk_framework_mapper.py` that maps to Basel III, credit risk frameworks instead

### 6.4 Security-Specific Configuration (Remove)

**File**: [app/config.py](credence-ai-backend/app/config.py)

**Remove These Settings**:
```python
# Remove
abuseipdb_api_key: str = ""
otx_api_key: str = ""
misp_url: str = ""
misp_api_key: str = ""
virustotal_api_key: str = ""
```

---

## 7. New Components to Implement

### 7.1 Financial Analysis Tools

**Create New Directory**: `app/tools/financial_analysis/`

#### 7.1.1 Financial Statement Analyzer
**File**: `app/tools/financial_analysis/statement_analyzer.py`

**Purpose**: Extract and analyze balance sheets, P&L statements, cash flow statements

**Input Schema**:
```python
class StatementAnalyzerInput(BaseModel):
    document_path: str  # Path to uploaded PDF/Excel
    statement_type: Literal["balance_sheet", "income_statement", "cash_flow"]
    fiscal_year: str
```

**Output**:
```python
{
    "ratios": {
        "current_ratio": 1.5,
        "debt_to_equity": 0.8,
        "return_on_equity": 0.15,
        "profit_margin": 0.12
    },
    "trends": {
        "revenue_growth": 0.25,  # 25% YoY
        "expense_growth": 0.18
    }
}
```

**Implementation Approach**:
- Use OCR (Tesseract) for PDF extraction
- Use `pandas` for Excel parsing
- Use LLM for table understanding (Claude multimodal)
- Validate extracted data with heuristics

#### 7.1.2 Credit Score Calculator
**File**: `app/tools/credit_scoring/credit_score_model.py`

**Purpose**: Calculate credit score (300-850) using XGBoost model

**Input Schema**:
```python
class CreditScoreInput(BaseModel):
    financial_ratios: Dict[str, float]
    business_tenure: int  # months
    revenue_trailing_12m: float
    loan_amount: float
    industry: str
    alternative_data: Optional[Dict[str, Any]]
```

**Output**:
```python
{
    "credit_score": 680,
    "score_band": "Good",  # Exceptional, Very Good, Good, Fair, Poor
    "default_probability": 0.25,
    "confidence": 0.85
}
```

**Implementation Approach**:
- Train XGBoost model on Home Credit Default Risk dataset (307K rows)
- Use Kaggle Credit Risk dataset for demo/prototype
- Feature engineering: 200+ aggregated features (credit utilization, payment punctuality, approval rates)
- Target: AUC > 0.85

#### 7.1.3 SHAP Explainer
**File**: `app/tools/explainability/shap_explainer.py`

**Purpose**: Explain credit score with SHAP feature importance

**Input Schema**:
```python
class SHAPExplainerInput(BaseModel):
    credit_score: float
    features: Dict[str, Any]  # All input features used for scoring
```

**Output**:
```python
{
    "explanations": [
        {"feature": "revenue_trailing_12m", "impact": +55, "direction": "positive"},
        {"feature": "business_tenure", "impact": -42, "direction": "negative"},
        {"feature": "debt_to_equity", "impact": +30, "direction": "positive"}
    ],
    "base_score": 600,
    "final_score": 680
}
```

**Implementation Approach**:
- Use `shap` library with TreeSHAP algorithm
- Compute local explanations (per decision)
- Sort by absolute impact

#### 7.1.4 Counterfactual Generator
**File**: `app/tools/explainability/counterfactual_generator.py`

**Purpose**: Generate "what-if" scenarios showing how to improve credit score

**Input Schema**:
```python
class CounterfactualInput(BaseModel):
    current_features: Dict[str, Any]
    current_score: float
    target_score: float  # e.g., 670 (approval threshold)
```

**Output**:
```python
{
    "counterfactuals": [
        {
            "description": "Increase business tenure by 4 months",
            "changes": {"business_tenure": 22},  # current: 18
            "new_score": 672,
            "feasibility": "high"
        },
        {
            "description": "Reduce loan amount to $4,000",
            "changes": {"loan_amount": 4000},  # current: 5000
            "new_score": 675,
            "feasibility": "medium"
        }
    ]
}
```

**Implementation Approach**:
- Use DiCE (Diverse Counterfactual Explanations) library
- Constraints: Age cannot decrease, income changes ±30%, business tenure only increases
- Optimization-based approach (minimize feature changes)

#### 7.1.5 Fairness Validator
**File**: `app/tools/fairness/fairness_validator.py`

**Purpose**: Detect demographic bias in credit decisions

**Input Schema**:
```python
class FairnessValidatorInput(BaseModel):
    features: Dict[str, Any]
    credit_score: float
    protected_attributes: List[str]  # ["gender", "ethnicity", "province"]
```

**Output**:
```python
{
    "fairness_passed": True,
    "demographic_parity_difference": 0.03,  # <0.05 threshold
    "bias_detected": False,
    "details": {
        "gender": {"male_approval_rate": 0.68, "female_approval_rate": 0.65, "gap": 0.03}
    }
}
```

**Implementation Approach**:
- Counterfactual fairness: Flip protected attributes, check if decision changes
- Demographic parity: Approval rate should be similar across groups
- Use `fairlearn` library

#### 7.1.6 Data Completeness Checker
**File**: `app/tools/validation/data_completeness_checker.py`

**Purpose**: Identify missing data, rank by SHAP importance

**Input Schema**:
```python
class DataCompletenessInput(BaseModel):
    features: Dict[str, Any]  # All features, some may be None
```

**Output**:
```python
{
    "completeness_score": 0.75,  # 75% of important features present
    "missing_fields": [
        {"field": "loan_amount", "importance": 0.25, "impact": "high"},
        {"field": "num_dependents", "importance": 0.15, "impact": "medium"}
    ],
    "recommendation": "Please provide loan_amount and num_dependents for accurate assessment"
}
```

**Implementation Approach**:
- Compute SHAP importance for all features
- Rank missing fields by importance
- Prompt user for highest-value missing inputs

### 7.2 Alternative Data Ingestion Tools

**Create New Directory**: `app/tools/alternative_data/`

#### 7.2.1 SoBanHang Data Fetcher
**File**: `app/tools/alternative_data/sobanhang_fetcher.py`

**Purpose**: Fetch merchant behavioral data from SoBanHang API

**Input Schema**:
```python
class SoBanHangFetcherInput(BaseModel):
    merchant_id: str
```

**Output**:
```python
{
    "merchant_profile": {
        "business_type": "coffee_shop",
        "location": "Hanoi",
        "business_tenure_months": 18,
        "monthly_revenue": 1200,
        "activity_rate": 0.94,
        "order_count_trailing_12m": 1450
    }
}
```

#### 7.2.2 Market Data Fetcher
**File**: `app/tools/market_data/market_data_fetcher.py`

**Purpose**: Fetch industry benchmarks, economic indicators

**Implementation**: Similar to `cti_fetcher` but for financial APIs (e.g., World Bank API, Vietnam GSO)

### 7.3 Document Processing Pipeline

**Create New Directory**: `app/tools/document_processing/`

#### 7.3.1 PDF Financial Extractor
**File**: `app/tools/document_processing/pdf_extractor.py`

**Purpose**: Extract tables and text from financial PDFs

**Implementation**:
- Use `pdfplumber` for table extraction
- Use OCR (Tesseract) for scanned documents
- Use Claude multimodal for unstructured document understanding

#### 7.3.2 Bank Statement Parser
**File**: `app/tools/document_processing/bank_statement_parser.py`

**Purpose**: Parse bank statement transactions, compute cash flow metrics

**Output**:
```python
{
    "total_inflow": 50000,
    "total_outflow": 45000,
    "net_cash_flow": 5000,
    "average_monthly_balance": 12000,
    "overdraft_incidents": 0
}
```

### 7.4 Loan Decision Workflow Engine

**File**: `app/workflows/loan_decision_workflow.py`

**Purpose**: Orchestrate multi-step loan approval workflow (similar to `playbook_engine`)

**Workflow Steps**:
1. Document ingestion → Financial statement analysis
2. Data completeness check → Request missing fields
3. Credit scoring → SHAP explanations
4. Fairness validation → Bias check
5. Loan decision → Approve/Reject/Manual Review
6. Counterfactual generation (if rejected)
7. Report generation

### 7.5 Credit Report Generator

**File**: `app/tools/reporting/credit_report_generator.py`

**Purpose**: Generate structured credit assessment report (Jinja2 templates)

**Template Sections**:
- Executive Summary
- Credit Score and Risk Level
- Financial Analysis (ratios, trends)
- SHAP Explanations (top factors)
- Loan Recommendation (approval, terms, interest rate)
- Counterfactuals (if rejected)
- Fairness Validation Results

---

## 8. Live LLM Activity Streaming Architecture

### 8.1 Problem Statement

**Current System**: SSE streaming shows only LLM text generation and basic tool execution events.

**New Requirement**: Users need real-time visibility into:
- What agent is currently doing (like Perplexity's "Searching...", "Reading...")
- Which tools/agents are being called
- Intermediate reasoning steps (not just final output)
- Progress updates for long-running tasks (document processing, model inference)
- Structured events that can be rendered in UI (not just text)

**Example User Experience** (similar to v0.dev, Claude Code):
```
[Agent] LoanOfficerOrchestrator started
[Document] Processing balance_sheet.pdf
[Tool] FinancialStatementAnalyzer extracting data
[LLM] Analyzing revenue trends
[Tool] CreditScoreModel computing score
[Result] Credit score: 680 (Good)
[Tool] SHAPExplainer generating feature importance
[Agent] DefaultRiskPredictor evaluating risk
[Tool] FairnessValidator checking bias
[Result] No bias detected
[Tool] CounterfactualGenerator creating improvement paths
[Response] Assessment complete
```

### 8.2 Event Model Design

**Enhanced Event Types** (beyond current `on_chat_model_stream`, `on_tool_start`, `on_tool_end`):

```python
class ActivityEventType(Enum):
    # Agent lifecycle
    AGENT_START = "agent_start"
    AGENT_THINKING = "agent_thinking"
    AGENT_END = "agent_end"

    # Tool execution
    TOOL_START = "tool_start"
    TOOL_PROGRESS = "tool_progress"  # NEW: Progress updates
    TOOL_END = "tool_end"

    # Document processing
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_PROCESSING = "document_processing"
    DOCUMENT_EXTRACTED = "document_extracted"

    # LLM reasoning
    LLM_REASONING = "llm_reasoning"  # NEW: Reasoning steps
    LLM_STREAMING = "llm_streaming"

    # Workflow transitions
    WORKFLOW_NODE_START = "workflow_node_start"  # NEW: Node transitions
    WORKFLOW_NODE_END = "workflow_node_end"

    # Results
    RESULT = "result"  # NEW: Structured result (credit score, risk level)
    ERROR = "error"

    # Final response
    RESPONSE_START = "response_start"
    RESPONSE_STREAMING = "response_streaming"
    RESPONSE_END = "response_end"
```

**Event Structure**:
```python
class ActivityEvent(BaseModel):
    event_type: ActivityEventType
    timestamp: datetime
    agent_name: Optional[str]
    tool_name: Optional[str]
    node_name: Optional[str]  # NEW: LangGraph node name
    message: str  # Human-readable description
    data: Optional[Dict[str, Any]]  # Structured data (progress %, results)
    metadata: Optional[Dict[str, Any]]
```

**Example Events**:

```python
# Agent start
ActivityEvent(
    event_type=ActivityEventType.AGENT_START,
    agent_name="LoanOfficerOrchestrator",
    message="Starting loan assessment workflow",
    data={"applicant_name": "Coffee Shop Co."}
)

# Workflow node transition
ActivityEvent(
    event_type=ActivityEventType.WORKFLOW_NODE_START,
    node_name="credit_scoring",
    message="Computing credit score",
    data={}
)

# Tool execution with progress
ActivityEvent(
    event_type=ActivityEventType.TOOL_START,
    tool_name="FinancialStatementAnalyzer",
    message="Extracting data from balance_sheet.pdf",
    data={"document_type": "balance_sheet"}
)

ActivityEvent(
    event_type=ActivityEventType.TOOL_PROGRESS,
    tool_name="FinancialStatementAnalyzer",
    message="OCR processing: 50% complete",
    data={"progress": 0.5}
)

# Structured result
ActivityEvent(
    event_type=ActivityEventType.RESULT,
    tool_name="CreditScoreModel",
    message="Credit score computed",
    data={
        "credit_score": 680,
        "score_band": "Good",
        "default_probability": 0.25
    }
)

# LLM reasoning step
ActivityEvent(
    event_type=ActivityEventType.LLM_REASONING,
    agent_name="DefaultRiskPredictor",
    message="Analyzing financial trends and industry benchmarks",
    data={"reasoning_step": 1, "total_steps": 3}
)
```

### 8.3 Streaming Transport Architecture

**Option 1: Server-Sent Events (SSE)** ✅ **Recommended**

**Pros**:
- Already implemented in current system
- Unidirectional (server → client) is sufficient
- Auto-reconnection built-in
- Simple client implementation

**Cons**:
- No bidirectional communication (not needed for our use case)

**Implementation**:
```python
# app/routers/loan_assessment.py

@router.post("/api/loan-assessment")
async def assess_loan(request: LoanAssessmentRequest):
    async def event_stream():
        async for event in loan_assessment_agent.stream_with_activity(request):
            # Transform ActivityEvent to SSE format
            sse_data = {
                "type": event.event_type.value,
                "timestamp": event.timestamp.isoformat(),
                "message": event.message,
                "data": event.data
            }
            yield f"data: {json.dumps(sse_data)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"}  # Disable nginx buffering
    )
```

**Option 2: WebSocket**

**Pros**:
- Bidirectional communication (future: user can pause/cancel assessment)
- Lower latency

**Cons**:
- More complex client/server implementation
- Need to manage connection lifecycle

**When to Use**: If we need real-time user interaction during assessment (e.g., "Cancel assessment", "Provide missing data")

### 8.4 Agent Activity Emission

**Modify LangGraph Agent to Emit Events**:

```python
# app/ai/loan_assessment_agent.py

class LoanAssessmentAgent:
    async def stream_with_activity(
        self,
        request: LoanAssessmentRequest
    ) -> AsyncGenerator[ActivityEvent, None]:
        """Stream assessment with real-time activity events."""

        # Emit agent start
        yield ActivityEvent(
            event_type=ActivityEventType.AGENT_START,
            agent_name="LoanOfficerOrchestrator",
            message="Starting loan assessment",
            data={"applicant_name": request.applicant_name}
        )

        # Build initial state
        state = self._build_initial_state(request)

        # Stream LangGraph execution with event interception
        async for event in self.app.astream_events(state, version="v2"):
            # Transform LangGraph events to ActivityEvents
            activity_events = await self._transform_to_activity_events(event)
            for activity_event in activity_events:
                yield activity_event

    async def _transform_to_activity_events(
        self,
        langgraph_event: Dict[str, Any]
    ) -> List[ActivityEvent]:
        """Convert LangGraph events to ActivityEvents."""

        event_type = langgraph_event.get("event")

        if event_type == "on_chain_start":
            # Workflow node started
            node_name = langgraph_event.get("name")
            return [ActivityEvent(
                event_type=ActivityEventType.WORKFLOW_NODE_START,
                node_name=node_name,
                message=f"Starting {node_name}",
                data={}
            )]

        elif event_type == "on_tool_start":
            # Tool execution started
            tool_name = langgraph_event.get("name")
            tool_input = langgraph_event.get("data", {}).get("input")
            return [ActivityEvent(
                event_type=ActivityEventType.TOOL_START,
                tool_name=tool_name,
                message=f"Calling {tool_name}",
                data={"input": tool_input}
            )]

        elif event_type == "on_tool_end":
            # Tool execution completed
            tool_name = langgraph_event.get("name")
            tool_output = langgraph_event.get("data", {}).get("output")
            return [ActivityEvent(
                event_type=ActivityEventType.TOOL_END,
                tool_name=tool_name,
                message=f"{tool_name} completed",
                data={"output": tool_output}
            )]

        elif event_type == "on_chat_model_stream":
            # LLM streaming
            chunk = langgraph_event.get("data", {}).get("chunk")
            return [ActivityEvent(
                event_type=ActivityEventType.LLM_STREAMING,
                message=chunk.content,
                data={}
            )]

        return []
```

### 8.5 Tool Progress Updates

**For Long-Running Tools** (document processing, model inference), emit progress events:

```python
# app/tools/document_processing/pdf_extractor.py

class PDFExtractor(BaseTool):
    async def execute(self, document_path: str) -> Dict[str, Any]:
        # Emit start event
        await self.emit_event(ActivityEvent(
            event_type=ActivityEventType.TOOL_START,
            tool_name="PDFExtractor",
            message=f"Processing {os.path.basename(document_path)}"
        ))

        # Extract pages (emit progress)
        total_pages = self._get_page_count(document_path)
        for page_num in range(total_pages):
            extracted_data = self._extract_page(page_num)

            # Emit progress update
            await self.emit_event(ActivityEvent(
                event_type=ActivityEventType.TOOL_PROGRESS,
                tool_name="PDFExtractor",
                message=f"Processing page {page_num + 1}/{total_pages}",
                data={"progress": (page_num + 1) / total_pages}
            ))

        # Emit completion event
        await self.emit_event(ActivityEvent(
            event_type=ActivityEventType.TOOL_END,
            tool_name="PDFExtractor",
            message="Document extraction complete",
            data={"pages_extracted": total_pages}
        ))

        return extracted_data
```

**Event Bus Pattern** (for tools to emit events):

```python
# app/utils/event_bus.py

class EventBus:
    """Global event bus for activity streaming."""

    _subscribers: List[Callable[[ActivityEvent], Awaitable[None]]] = []

    @classmethod
    async def emit(cls, event: ActivityEvent):
        """Emit event to all subscribers."""
        for subscriber in cls._subscribers:
            await subscriber(event)

    @classmethod
    def subscribe(cls, callback: Callable[[ActivityEvent], Awaitable[None]]):
        """Subscribe to activity events."""
        cls._subscribers.append(callback)
```

### 8.6 Frontend Integration

**React Example** (using `eventsource-parser` for SSE):

```typescript
// Example: LoanAssessmentPage.tsx

async function streamLoanAssessment(request: LoanAssessmentRequest) {
  const response = await fetch('/api/loan-assessment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const event = JSON.parse(line.slice(6));
        handleActivityEvent(event);
      }
    }
  }
}

function handleActivityEvent(event: ActivityEvent) {
  switch (event.type) {
    case 'agent_start':
      setActivityLog(prev => [...prev, { icon: '🤖', message: event.message }]);
      break;

    case 'tool_start':
      setActivityLog(prev => [...prev, { icon: '🔧', message: event.message }]);
      break;

    case 'tool_progress':
      updateProgressBar(event.data.progress);
      break;

    case 'result':
      displayResult(event.data);  // Show credit score, risk level
      break;

    case 'llm_reasoning':
      setActivityLog(prev => [...prev, { icon: '💭', message: event.message }]);
      break;
  }
}
```

**Activity Feed UI** (like Perplexity):
```
🤖 LoanOfficerOrchestrator started
📄 Processing balance_sheet.pdf (50% complete)
🔧 FinancialStatementAnalyzer extracting data
💭 Analyzing revenue trends
🔧 CreditScoreModel computing score
✅ Credit score: 680 (Good)
🔧 SHAPExplainer generating explanations
🤖 DefaultRiskPredictor evaluating risk
✅ No bias detected
📊 Assessment complete
```

---

## 9. Updated System Architecture

### 9.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Credence SYSTEM ARCHITECTURE                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│  • Document Upload UI (balance sheet, P&L, bank statements)      │
│  • Live Activity Feed (SSE event stream)                         │
│  • Credit Score Dashboard                                        │
│  • SHAP Explanations Visualization                               │
│  • Counterfactual Scenarios                                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/SSE
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                              │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI + API Gateway                                           │
│  • POST /api/loan-assessment (SSE streaming)                     │
│  • POST /api/documents/upload                                    │
│  • GET /api/assessment/{id}                                      │
│  • Authentication (JWT)                                          │
│  • Rate Limiting (10 req/min)                                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                   AGENTIC ORCHESTRATION LAYER                    │
├─────────────────────────────────────────────────────────────────┤
│  LoanAssessmentAgent (LangGraph)                                 │
│                                                                   │
│  Workflow Graph:                                                 │
│  START → CLASSIFY → DOCUMENT_INGESTION → DATA_COMPLETENESS      │
│         → PLANNING → TOOL_SELECTION → EXECUTE_TOOLS              │
│         → CREDIT_SCORING → EXPLAINABILITY → FAIRNESS_CHECK       │
│         → COUNTERFACTUAL_GENERATION → ANALYSIS → RESPONSE → END  │
│                                                                   │
│  Multi-Agent System (Optional):                                  │
│  • FinancialStatementAnalyzer (Haiku)                            │
│  • DefaultRiskPredictor (Sonnet)                                 │
│  • LoanDecisionMaker (Sonnet)                                    │
│  • DataQualityVerifier (Haiku)                                   │
│  • LoanOfficerOrchestrator (Sonnet)                              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ↓            ↓            ↓
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│   TOOL EXECUTION     │  │   LLM PROVIDERS      │  │   STREAMING          │
│      LAYER           │  │      (Gateway)       │  │   EVENT BUS          │
├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤
│ Financial Analysis   │  │ • Claude (Anthropic) │  │ • ActivityEvent      │
│ • statement_analyzer │  │ • GPT (OpenAI)       │  │   publishing         │
│ • ratio_calculator   │  │ • Gemini (Google)    │  │ • SSE transformation │
│                      │  │                      │  │ • Frontend streaming │
│ Credit Scoring       │  │ Model Routing:       │  └──────────────────────┘
│ • credit_score_model │  │ • Fast tasks → Haiku │
│ • fraud_detector     │  │ • Complex → Sonnet   │
│                      │  └──────────────────────┘
│ Explainability       │
│ • shap_explainer     │
│ • counterfactual_gen │
│                      │
│ Fairness             │
│ • fairness_validator │
│                      │
│ Validation           │
│ • data_completeness  │
│                      │
│ Alternative Data     │
│ • sobanhang_fetcher  │
│ • market_data_api    │
│                      │
│ Document Processing  │
│ • pdf_extractor      │
│ • bank_stmt_parser   │
│                      │
│ Reporting            │
│ • report_generator   │
│ • notification_sender│
└──────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase) + pgvector                                │
│                                                                   │
│  Core Tables:                                                    │
│  • User (loan officers, admins)                                  │
│  • LoanAssessment (sessions, credit scores, decisions)           │
│  • FinancialDocument (uploaded files, extracted data)            │
│  • AssessmentInteraction (conversation messages)                 │
│                                                                   │
│  Vector Store (RAG):                                             │
│  • lending_knowledge_embeddings (pgvector)                       │
│    - Basel III regulations                                       │
│    - Dodd-Frank Act, FCRA, ECOA                                  │
│    - Credit policy documents                                     │
│    - Industry risk reports                                       │
│    - Underwriting guidelines                                     │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│  • SoBanHang API (merchant behavioral data)                      │
│  • Market Data APIs (economic indicators, industry benchmarks)   │
│  • Credit Bureau APIs (optional: formal credit history)          │
│  • Document Storage (S3 or local filesystem)                     │
└───────────────────────────────────────────────���─────────────────┘
```

### 9.2 Data Flow Diagram

**Loan Assessment Workflow**:

```
1. User uploads financial documents → POST /api/documents/upload
   ↓
2. Documents stored in S3, metadata saved to FinancialDocument table
   ↓
3. User requests assessment → POST /api/loan-assessment (SSE stream)
   ↓
4. LoanAssessmentAgent starts workflow
   ↓
5. DOCUMENT_INGESTION node: pdf_extractor extracts tables, text
   ↓ (emit: TOOL_START, TOOL_PROGRESS, TOOL_END)
6. DATA_COMPLETENESS node: data_completeness_checker identifies gaps
   ↓ (emit: RESULT with missing fields)
7. If data incomplete → Request missing fields from user
   ↓
8. PLANNING node: LLM plans analysis steps
   ↓ (emit: LLM_REASONING)
9. TOOL_SELECTION node: LLM selects financial analysis tools
   ↓
10. EXECUTE_TOOLS node: statement_analyzer, ratio_calculator run
    ↓ (emit: TOOL_START, TOOL_END for each tool)
11. CREDIT_SCORING node: credit_score_model computes score
    ↓ (emit: RESULT with credit score)
12. EXPLAINABILITY node: shap_explainer generates feature importance
    ↓ (emit: RESULT with SHAP values)
13. FAIRNESS_CHECK node: fairness_validator checks bias
    ↓ (emit: RESULT with fairness check results)
14. If rejected → COUNTERFACTUAL_GENERATION node: Generate improvement paths
    ↓ (emit: RESULT with counterfactuals)
15. ANALYSIS node: DefaultRiskPredictor synthesizes findings
    ↓ (emit: LLM_REASONING)
16. RESPONSE node: report_generator produces credit report
    ↓ (emit: RESPONSE_STREAMING)
17. Save assessment results to LoanAssessment table
    ↓
18. Stream final response to user → END
```

### 9.3 Agent Collaboration Diagram

**Multi-Agent Workflow** (when `use_specialized_agents=True`):

```
┌───────────────────────────────────────────────────────────────┐
│                  LoanOfficerOrchestrator                      │
│                     (Sonnet 3.5)                              │
│  • Coordinates all agents                                     │
│  • Synthesizes final recommendation                           │
└───────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ FinancialStmt   │ │ DefaultRisk     │ │ LoanDecision    │
│ Analyzer        │ │ Predictor       │ │ Maker           │
│ (Haiku 4.5)     │ │ (Sonnet 3.5)    │ │ (Sonnet 3.5)    │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ • Parse balance │ │ • Predict       │ │ • Make final    │
│   sheet, P&L    │ │   default prob  │ │   decision      │
│ • Extract       │ │ • Assess risk   │ │ • Set terms     │
│   ratios        │ │   factors       │ │ • Generate      │
│                 │ │ • Industry      │ │   counterfacts  │
│                 │ │   comparison    │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ↓
                ┌─────────────────────┐
                │ DataQuality         │
                │ Verifier            │
                │ (Haiku 4.5)         │
                ├─────────────────────┤
                │ • Validate data     │
                │ • Check completeness│
                │ • Assign confidence │
                └─────────────────────┘
```

**Agent Communication Pattern**:
1. **Orchestrator** receives user request
2. **FinancialStatementAnalyzer** extracts financial data
3. **DataQualityVerifier** validates extracted data (confidence score)
4. **DefaultRiskPredictor** assesses credit risk
5. **LoanDecisionMaker** makes final decision based on risk assessment
6. **Orchestrator** synthesizes all agent outputs into final report

---

## 10. Suggested Directory Structure

```
credence-ai-backend/  (rename to Credence-backend)
│
├── app/
│   ├── __init__.py
│   │
│   ├── ai/  # Agent orchestration
│   │   ├── __init__.py
│   │   ├── loan_assessment_agent.py  # Main agent (renamed from langgraph_agent.py)
│   │   ├── specialized_agents.py  # Financial agents (modified)
│   │   ├── gateway_client.py  # LLM provider abstraction (reuse)
│   │   ├── embedding_pipeline.py  # Document chunking (reuse)
│   │   ├── lending_knowledge_retriever.py  # RAG retriever (renamed)
│   │   └── llms/  # LLM clients (reuse)
│   │       ├── claude_client.py
│   │       ├── gemini_client.py
│   │       └── openai_client.py
│   │
│   ├── tools/  # Financial analysis tools
│   │   ├── __init__.py
│   │   ├── base.py  # BaseTool interface (reuse)
│   │   │
│   │   ├── financial_analysis/  # NEW
│   │   │   ├── __init__.py
│   │   │   ├── statement_analyzer.py
│   │   │   ├── ratio_calculator.py
│   │   │   ├── trend_analyzer.py
│   │   │   └── industry_comparator.py
│   │   │
│   │   ├── credit_scoring/  # NEW
│   │   │   ├── __init__.py
│   │   │   ├── credit_score_model.py
│   │   │   ├── default_probability_model.py
│   │   │   └── fraud_detector.py  # Adapted from anomaly_detector
│   │   │
│   │   ├── explainability/  # NEW
│   │   │   ├── __init__.py
│   │   │   ├── shap_explainer.py
│   │   │   ├── counterfactual_generator.py
│   │   │   └── feature_importance.py
│   │   │
│   │   ├── fairness/  # NEW
│   │   │   ├── __init__.py
│   │   │   ├── fairness_validator.py
│   │   │   ├── bias_detector.py
│   │   │   └── causal_fairness.py
│   │   │
│   │   ├── validation/  # NEW
│   │   │   ├── __init__.py
│   │   │   ├── data_completeness_checker.py
│   │   │   └── data_quality_validator.py
│   │   │
│   │   ├── alternative_data/  # NEW
│   │   │   ├── __init__.py
│   │   │   ├── sobanhang_fetcher.py
│   │   │   ├── utility_payment_analyzer.py
│   │   │   └── mobile_money_analyzer.py
│   │   │
│   │   ├── document_processing/  # NEW (adapted from log_ingestion)
│   │   │   ├── __init__.py
│   │   │   ├── pdf_extractor.py
│   │   │   ├── excel_parser.py
│   │   │   ├── bank_statement_parser.py
│   │   │   └── ocr_processor.py
│   │   │
│   │   ├── market_data/  # NEW (adapted from cti_enrichment)
│   │   │   ├── __init__.py
│   │   │   ├── market_data_fetcher.py
│   │   │   ├── economic_indicators.py
│   │   │   └── industry_benchmarks.py
│   │   │
│   │   ├── reporting/  # Adapted from incident_response
│   │   │   ├── __init__.py
│   │   │   ├── credit_report_generator.py  # Adapted from report_generator
│   │   │   └── notification_sender.py  # Reuse
│   │   │
│   │   └── knowledge/  # Reuse
│   │       ├── __init__.py
│   │       └── lending_knowledge_retriever.py  # Adapted from rag_retriever
│   │
│   ├── workflows/  # NEW: Loan approval workflows
│   │   ├── __init__.py
│   │   ├── loan_decision_workflow.py
│   │   └── underwriting_workflow.py
│   │
│   ├── models/  # Database models
│   │   ├── __init__.py
│   │   ├── user.py  # Reuse
│   │   ├── loan_assessment.py  # Renamed from chat.py
│   │   ├── financial_document.py  # NEW
│   │   └── credit_decision.py  # NEW
│   │
│   ├── schemas/  # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── loan_assessment.py  # Renamed from chat.py
│   │   ├── credit_score.py  # NEW
│   │   └── financial_document.py  # NEW
│   │
│   ├── routers/  # API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py  # Reuse
│   │   ├── loan_assessment.py  # Renamed from chat.py
│   │   ├── documents.py  # Renamed from files.py
│   │   ├── health.py  # Reuse
│   │   └── debug.py  # Reuse
│   │
│   ├── middleware/  # Reuse
│   │   ├── __init__.py
│   │   ├── correlation_id.py
│   │   └── rate_limiter.py
│   │
│   ├── utils/  # Reuse + adapt
│   │   ├── __init__.py
│   │   ├── structured_logger.py
│   │   ├── output_guard.py  # Adapt for financial PII
│   │   ├── input_validator.py
│   │   ├── event_bus.py  # NEW: Activity event streaming
│   │   └── session.py
│   │
│   ├── config.py  # Adapt configuration
│   ├── database.py  # Reuse
│   └── main.py  # Reuse
│
├── data/  # Knowledge base and datasets
│   ├── knowledge/  # RAG knowledge base
│   │   ├── basel_iii.md  # NEW: Basel III regulations
│   │   ├── dodd_frank.md  # NEW: Dodd-Frank Act
│   │   ├── fcra.md  # NEW: Fair Credit Reporting Act
│   │   ├── ecoa.md  # NEW: Equal Credit Opportunity Act
│   │   ├── credit_policies/  # NEW: Credit policy documents
│   │   └── industry_reports/  # NEW: Industry risk reports
│   │
│   └── datasets/  # Training data
│       ├── home_credit_default_risk/  # 307K rows for training
│       ├── kaggle_credit_risk/  # 32K rows for demo
│       └── taiwan_credit/  # 30K rows for validation
│
├── scripts/  # Ingestion and migration scripts
│   ├── ingest_lending_knowledge.py  # NEW: Ingest Basel III, regulations
│   ├── train_credit_model.py  # NEW: Train XGBoost credit scoring model
│   └── migrate_cybersecurity_to_finance.py  # NEW: Migration script
│
├── ml_models/  # NEW: Trained models
│   ├── credit_scoring/
│   │   ├── xgboost_model.pkl
│   │   ├── feature_engineering.py
│   │   └── model_config.yaml
│   └── fraud_detection/
│       └── anomaly_model.pkl
│
├── templates/  # Report templates
│   ├── credit_report.html  # Adapted from security_report.html
│   └── loan_decision_email.html  # NEW
│
├── tests/  # Test suite
│   ├── test_loan_assessment_agent.py  # Adapted from test_langgraph_agent.py
│   ├── test_credit_scoring.py  # NEW
│   ├── test_explainability.py  # NEW
│   └── test_streaming_events.py  # NEW
│
├── alembic/  # Database migrations
│   └── versions/
│       └── XXX_migrate_to_loan_assessment.py  # NEW: Migration script
│
├── docs/  # Documentation
│   ├── Credence_MIGRATION_PLAN.md  # This document
│   ├── LOAN_ASSESSMENT_GUIDE.md  # Adapted from BEGINNER_GUIDE.md
│   ├── CREDIT_SCORING_MODEL.md  # NEW
│   └── RAG_INTEGRATION_GUIDE.md  # Adapt for lending knowledge
│
├── requirements.txt  # Python dependencies
├── .env.example  # Environment variables template
├── README.md  # Project README
└── docker-compose.yml  # Docker setup
```

---

## 11. Step-by-Step Refactoring Plan

### Phase 1: Domain Decoupling (Week 1)

**Goal**: Isolate cybersecurity-specific logic from reusable infrastructure

**Tasks**:

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/Credence-migration
   ```

2. **Rename Project Directory**:
   ```bash
   mv credence-ai-backend Credence-backend
   ```

3. **Update Configuration**:
   - [app/config.py](credence-ai-backend/app/config.py): Remove cybersecurity API keys (abuseipdb_api_key, otx_api_key, misp_url)
   - Add financial API keys (credit_bureau_api_key, market_data_api_key, sobanhang_api_key)

4. **Create Migration Tracking Document**:
   - Create `MIGRATION_CHECKLIST.md` to track progress

5. **Set Up New Directory Structure**:
   ```bash
   mkdir -p app/tools/{financial_analysis,credit_scoring,explainability,fairness,validation,alternative_data,document_processing,market_data}
   mkdir -p app/workflows
   mkdir -p ml_models/credit_scoring
   mkdir -p data/knowledge/{credit_policies,industry_reports}
   ```

**Deliverable**: Clean project structure with cybersecurity references clearly identified

---

### Phase 2: Remove Cybersecurity Modules (Week 1-2)

**Goal**: Remove all security-specific tools and logic

**Tasks**:

1. **Remove Cybersecurity Tools**:
   ```bash
   rm -rf app/tools/detection/signature_detector.py
   rm -rf app/tools/detection/ip_reputation_checker.py
   rm -rf app/tools/cti_enrichment/cve_lookup.py
   rm -rf app/tools/cti_enrichment/misp_connector.py
   rm -rf app/tools/cti_enrichment/stix_parser.py
   rm -rf app/tools/cti_enrichment/mitre_attack_mapper.py
   rm -rf app/tools/incident_response/firewall_rule_generator.py
   rm -rf app/tools/example_ioc_tool.py
   ```

2. **Update Tool Registry**:
   - [app/ai/langgraph_agent.py](credence-ai-backend/app/ai/langgraph_agent.py): Comment out all tool imports and registrations
   - Keep tool registration framework intact

3. **Remove Security-Specific Tests**:
   ```bash
   rm -rf tests/test_security_*
   ```

4. **Clean Up Dependencies**:
   - [requirements.txt](credence-ai-backend/requirements.txt): Remove security-specific libraries (e.g., `pymisp`, `stix2`)

**Deliverable**: Codebase with only reusable infrastructure (agent framework, gateway, database)

---

### Phase 3: Implement Financial Tools (Week 2-4)

**Goal**: Build core financial analysis tools

**Priority 1: Essential Tools** (Week 2):

1. **Financial Statement Analyzer**:
   - File: `app/tools/financial_analysis/statement_analyzer.py`
   - Implementation: Use `pdfplumber` + Claude multimodal for PDF extraction
   - Test with sample balance sheet, P&L statement

2. **Credit Score Model** (Prototype):
   - File: `app/tools/credit_scoring/credit_score_model.py`
   - Implementation: Load pre-trained XGBoost model (train on Kaggle Credit Risk dataset)
   - Input: Financial ratios, business tenure, loan amount
   - Output: Credit score (300-850), default probability

3. **Data Completeness Checker**:
   - File: `app/tools/validation/data_completeness_checker.py`
   - Implementation: Identify missing fields, rank by SHAP importance
   - Output: Completeness score, list of missing fields with impact

**Priority 2: Explainability Tools** (Week 3):

4. **SHAP Explainer**:
   - File: `app/tools/explainability/shap_explainer.py`
   - Implementation: Use `shap` library with TreeSHAP
   - Output: Feature importance (top factors affecting credit score)

5. **Counterfactual Generator**:
   - File: `app/tools/explainability/counterfactual_generator.py`
   - Implementation: Use DiCE library
   - Constraints: Age cannot decrease, income ±30%, business tenure only increases

**Priority 3: Validation Tools** (Week 4):

6. **Fairness Validator**:
   - File: `app/tools/fairness/fairness_validator.py`
   - Implementation: Counterfactual fairness (flip protected attributes)
   - Output: Demographic parity difference, bias detection

7. **Report Generator**:
   - File: `app/tools/reporting/credit_report_generator.py`
   - Adaptation: Modify Jinja2 templates from security reports to credit reports

**Testing**:
- Create `tests/test_financial_tools.py`
- Test each tool with sample data

**Deliverable**: 7 core financial tools implemented and tested

---

### Phase 4: Adapt Agent Orchestration (Week 4-5)

**Goal**: Transform LangGraph agent from security investigation to loan assessment

**Tasks**:

1. **Rename and Update State Schema**:
   ```python
   # app/ai/loan_assessment_agent.py

   class LoanAssessmentState(TypedDict):
       # Core conversation
       messages: Annotated[Sequence[BaseMessage], add_messages]

       # Analysis workflow
       analysis_steps: list[str]
       documents_processed: list[dict]

       # Financial metrics
       financial_ratios: dict
       credit_score: float
       risk_level: str
       risk_factors: list[str]

       # Tool tracking
       tools_used: list[str]
       tool_results: list[dict]

       # Decision
       loan_recommendation: dict
       shap_explanations: dict
       counterfactuals: list[dict]
       final_response: str
   ```

2. **Update Graph Structure**:
   ```python
   def _build_graph(self):
       workflow = StateGraph(LoanAssessmentState)

       # Add nodes
       workflow.add_node("classify", self._classify_node)
       workflow.add_node("document_ingestion", self._document_ingestion_node)
       workflow.add_node("data_completeness", self._data_completeness_node)
       workflow.add_node("planning", self._planning_node)
       workflow.add_node("tool_selection", self._tool_selection_node)
       workflow.add_node("execute_tools", self._execute_tools_node)
       workflow.add_node("credit_scoring", self._credit_scoring_node)
       workflow.add_node("explainability", self._explainability_node)
       workflow.add_node("fairness_check", self._fairness_check_node)
       workflow.add_node("counterfactual_generation", self._counterfactual_node)
       workflow.add_node("analysis", self._analysis_node)
       workflow.add_node("response", self._response_node)

       # Define edges
       workflow.set_entry_point("classify")
       workflow.add_edge("classify", "document_ingestion")
       workflow.add_edge("document_ingestion", "data_completeness")
       workflow.add_conditional_edges("data_completeness", self._is_data_complete, {
           "complete": "planning",
           "incomplete": "request_missing_data"
       })
       # ... (continue with remaining edges)

       return workflow.compile()
   ```

3. **Rewrite Node Prompts**:
   - Update all system prompts from cybersecurity to financial analysis
   - Example: `_planning_node` should plan financial analysis steps, not security investigation

4. **Register Financial Tools**:
   ```python
   def __init__(self):
       # Initialize LLM
       self.llm = ChatAnthropic(model="claude-sonnet-4.5")

       # Register financial tools
       self.tools = [
           statement_analyzer.to_langchain_tool(),
           credit_score_model.to_langchain_tool(),
           shap_explainer.to_langchain_tool(),
           counterfactual_generator.to_langchain_tool(),
           fairness_validator.to_langchain_tool(),
           data_completeness_checker.to_langchain_tool(),
           credit_report_generator.to_langchain_tool(),
       ]
   ```

5. **Update Specialized Agents**:
   - File: `app/ai/specialized_agents.py`
   - Rewrite all agent classes (FinancialStatementAnalyzer, DefaultRiskPredictor, etc.)

**Testing**:
- Create `tests/test_loan_assessment_agent.py`
- Test full workflow with sample loan application

**Deliverable**: Functional LoanAssessmentAgent with end-to-end workflow

---

### Phase 5: Implement Activity Streaming (Week 5-6)

**Goal**: Add real-time LLM activity streaming for better observability

**Tasks**:

1. **Create Event Model**:
   ```python
   # app/utils/activity_events.py

   class ActivityEventType(Enum):
       AGENT_START = "agent_start"
       TOOL_START = "tool_start"
       TOOL_PROGRESS = "tool_progress"
       TOOL_END = "tool_end"
       WORKFLOW_NODE_START = "workflow_node_start"
       RESULT = "result"
       # ... (see Section 8.2)

   class ActivityEvent(BaseModel):
       event_type: ActivityEventType
       timestamp: datetime
       message: str
       data: Optional[Dict[str, Any]]
   ```

2. **Create Event Bus**:
   ```python
   # app/utils/event_bus.py

   class EventBus:
       _subscribers: List[Callable[[ActivityEvent], Awaitable[None]]] = []

       @classmethod
       async def emit(cls, event: ActivityEvent):
           for subscriber in cls._subscribers:
               await subscriber(event)
   ```

3. **Update Agent to Emit Events**:
   ```python
   # app/ai/loan_assessment_agent.py

   async def stream_with_activity(self, request):
       async for event in self.app.astream_events(state, version="v2"):
           activity_events = await self._transform_to_activity_events(event)
           for activity_event in activity_events:
               yield activity_event
   ```

4. **Update API Endpoint**:
   ```python
   # app/routers/loan_assessment.py

   @router.post("/api/loan-assessment")
   async def assess_loan(request: LoanAssessmentRequest):
       async def event_stream():
           async for event in agent.stream_with_activity(request):
               sse_data = {"type": event.event_type.value, "message": event.message}
               yield f"data: {json.dumps(sse_data)}\n\n"

       return StreamingResponse(event_stream(), media_type="text/event-stream")
   ```

5. **Update Tools to Emit Progress**:
   - Modify long-running tools (pdf_extractor, credit_score_model) to emit TOOL_PROGRESS events

**Testing**:
- Create `tests/test_streaming_events.py`
- Verify all event types are emitted correctly

**Deliverable**: Real-time activity streaming with detailed event feed

---

### Phase 6: Database Migration (Week 6)

**Goal**: Update database models for loan assessment

**Tasks**:

1. **Create Migration Script**:
   ```bash
   alembic revision --autogenerate -m "migrate_to_loan_assessment"
   ```

2. **Update Models**:
   ```python
   # app/models/loan_assessment.py

   class LoanAssessment(Base):
       __tablename__ = "LoanAssessment"
       id: UUID
       userId: UUID
       applicantName: str
       loanAmount: Decimal
       creditScore: Float
       riskLevel: str
       status: str
       decisionReason: Text
       createdAt: DateTime

   class FinancialDocument(Base):
       __tablename__ = "FinancialDocument"
       id: UUID
       assessmentId: UUID
       documentType: str
       filePath: str
       extractedData: JSONB
   ```

3. **Run Migration**:
   ```bash
   alembic upgrade head
   ```

4. **Update API Endpoints**:
   - Update [app/routers/chat.py](credence-ai-backend/app/routers/chat.py) → `loan_assessment.py`
   - Change database queries from `Chat` to `LoanAssessment`

**Deliverable**: Database schema updated, migrations tested

---

### Phase 7: RAG Knowledge Base (Week 7)

**Goal**: Replace MITRE ATT&CK with lending regulations and credit policies

**Tasks**:

1. **Populate Knowledge Base**:
   - Download Basel III regulations (PDF)
   - Download Dodd-Frank Act, FCRA, ECOA (text)
   - Add credit policy documents (markdown)
   - Add industry risk reports (PDF)

2. **Create Ingestion Script**:
   ```python
   # scripts/ingest_lending_knowledge.py

   async def ingest_basel_iii():
       # Load Basel III PDF
       # Chunk and embed
       # Store in pgvector
   ```

3. **Run Ingestion**:
   ```bash
   python -m scripts.ingest_lending_knowledge
   ```

4. **Update RAG Retriever**:
   - Rename `ThreatIntelligenceRetriever` → `LendingKnowledgeRetriever`
   - Update metadata schema (source: "basel_iii", "dodd_frank", etc.)

5. **Test Retrieval**:
   ```python
   # scripts/test_rag_retrieval.py

   retriever = LendingKnowledgeRetriever()
   results = retriever.retrieve("What are Basel III capital requirements?", k=5)
   ```

**Deliverable**: RAG knowledge base populated with 1000+ lending documents

---

### Phase 8: Train Credit Scoring Model (Week 7-8)

**Goal**: Train XGBoost credit scoring model on public datasets

**Tasks**:

1. **Download Datasets**:
   - Home Credit Default Risk (307K rows): https://www.kaggle.com/c/home-credit-default-risk
   - Kaggle Credit Risk (32K rows): https://www.kaggle.com/datasets/laotse/credit-risk-dataset

2. **Feature Engineering**:
   ```python
   # ml_models/credit_scoring/feature_engineering.py

   def engineer_features(df):
       # Aggregate features:
       # - Credit utilization ratios
       # - Payment punctuality scores
       # - Approval rates
       # - Installment-to-income ratios
       # ... (200+ features)
       return engineered_df
   ```

3. **Train Model**:
   ```python
   # scripts/train_credit_model.py

   import xgboost as xgb
   from sklearn.model_selection import train_test_split

   # Load data
   df = load_home_credit_data()
   X_train, X_test, y_train, y_test = train_test_split(...)

   # Train XGBoost
   model = xgb.XGBClassifier(...)
   model.fit(X_train, y_train)

   # Evaluate
   auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
   print(f"AUC: {auc}")  # Target: >0.85

   # Save model
   model.save_model("ml_models/credit_scoring/xgboost_model.pkl")
   ```

4. **Integrate Model into Tool**:
   ```python
   # app/tools/credit_scoring/credit_score_model.py

   class CreditScoreModel(BaseTool):
       def __init__(self):
           self.model = xgb.Booster()
           self.model.load_model("ml_models/credit_scoring/xgboost_model.pkl")

       async def execute(self, **kwargs):
           features = self._prepare_features(kwargs)
           default_prob = self.model.predict(features)
           credit_score = 850 - int(default_prob * 550)  # Map to 300-850 scale
           return {"credit_score": credit_score, "default_probability": default_prob}
   ```

**Deliverable**: Trained XGBoost model with AUC > 0.85

---

### Phase 9: Integration Testing (Week 8-9)

**Goal**: End-to-end testing of loan assessment workflow

**Tasks**:

1. **Create Test Scenarios**:
   - Scenario 1: Complete loan application (all fields present)
   - Scenario 2: Incomplete application (missing fields)
   - Scenario 3: Rejected applicant (counterfactual generation)
   - Scenario 4: Bias detection (protected attributes)

2. **Write Integration Tests**:
   ```python
   # tests/test_loan_assessment_integration.py

   @pytest.mark.asyncio
   async def test_complete_loan_assessment():
       agent = LoanAssessmentAgent()

       request = LoanAssessmentRequest(
           applicant_name="Coffee Shop Co.",
           loan_amount=5000,
           documents=[...],
       )

       result = await agent.assess_loan(request)

       assert result.credit_score > 300
       assert result.risk_level in ["low", "medium", "high", "critical"]
       assert len(result.shap_explanations) > 0
   ```

3. **Performance Testing**:
   - Measure latency (target: P95 < 3 seconds)
   - Test with 100 concurrent requests

4. **Fix Bugs and Optimize**:
   - Profile slow tools
   - Optimize database queries
   - Add caching for repeated queries

**Deliverable**: Passing integration tests, performance benchmarks met

---

### Phase 10: Frontend Integration (Week 9-10)

**Goal**: Build UI for loan assessment (out of scope for backend, but coordination needed)

**Backend Responsibilities**:

1. **API Documentation**:
   - Generate OpenAPI/Swagger docs
   - Document all endpoints, schemas, event types

2. **CORS Configuration**:
   - Update [app/main.py](credence-ai-backend/app/main.py) to allow frontend origin

3. **WebSocket Support** (optional):
   - If frontend needs bidirectional communication

**Frontend (Next.js) Responsibilities** (not in this plan):
- Document upload UI
- Live activity feed (SSE event stream)
- Credit score dashboard
- SHAP explanations visualization
- Counterfactual scenarios UI

**Deliverable**: Backend API fully documented, CORS configured

---

### Phase 11: Deployment (Week 10-11)

**Goal**: Deploy Credence to production

**Tasks**:

1. **Dockerize Application**:
   ```dockerfile
   # Dockerfile

   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. **Set Up PostgreSQL + pgvector**:
   - Deploy Supabase instance OR self-hosted PostgreSQL
   - Enable pgvector extension
   - Run migrations

3. **Deploy to AWS Lambda + SageMaker Serverless** (optional):
   - Deploy agent as Lambda function
   - Deploy XGBoost model to SageMaker Serverless
   - Use API Gateway for HTTP endpoints

4. **Environment Variables**:
   - Set production API keys (Anthropic, OpenAI, SoBanHang, market data)
   - Configure database URL

5. **Monitoring**:
   - Set up CloudWatch logs (if AWS)
   - Set up Sentry for error tracking
   - Configure Prometheus metrics

**Deliverable**: Credence deployed to production

---

### Phase 12: Documentation and Handoff (Week 11-12)

**Goal**: Create documentation for engineers and stakeholders

**Tasks**:

1. **Technical Documentation**:
   - Update [README.md](credence-ai-backend/README.md) for Credence
   - Create `docs/LOAN_ASSESSMENT_GUIDE.md` (adapted from BEGINNER_GUIDE.md)
   - Create `docs/CREDIT_SCORING_MODEL.md` (model architecture, training process)
   - Update `docs/RAG_INTEGRATION_GUIDE.md` for lending knowledge

2. **API Documentation**:
   - Generate Swagger/OpenAPI docs
   - Add example requests/responses

3. **User Guide**:
   - How to use the loan assessment system
   - How to interpret credit reports
   - How to use counterfactual guidance

4. **Handoff Meeting**:
   - Present system to stakeholders
   - Demo live loan assessment workflow
   - Q&A session

**Deliverable**: Complete documentation, stakeholder sign-off

---

## 12. Risks and Technical Considerations

### 12.1 Model Performance Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Credit scoring model underperforms** (AUC < 0.85) | Medium | High | - Use ensemble models (XGBoost + LightGBM)<br>- Fine-tune hyperparameters with Bayesian optimization<br>- Add more alternative data features (SoBanHang, mobile money) |
| **Low-quality financial document extraction** (OCR errors) | High | High | - Use Claude multimodal for table understanding<br>- Manual review for low-confidence extractions<br>- Validate extracted data with heuristics (e.g., assets = liabilities + equity) |
| **Poor counterfactual quality** (unrealistic recommendations) | Medium | Medium | - Add domain constraints (age cannot decrease, income ±30%)<br>- Use DiCE with feasibility scoring<br>- Human review of counterfactuals |

### 12.2 Data Quality Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Incomplete financial data** (missing key fields) | High | High | - Implement data completeness checker (SHAP-based importance)<br>- Prompt user for highest-value missing fields<br>- Use median imputation for optional fields |
| **Fraudulent financial statements** | Medium | High | - Implement fraud detection tool (anomaly detector)<br>- Cross-validate with alternative data sources<br>- Flag suspicious patterns for manual review |
| **SoBanHang API unavailable** | Low | Medium | - Fallback to manual data entry<br>- Cache historical SoBanHang data<br>- Graceful degradation (assessment with warning) |

### 12.3 Streaming and Latency Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **High latency** (P95 > 3 seconds) | Medium | Medium | - Optimize tool execution (async, parallelization)<br>- Cache repeated queries (Redis)<br>- Use faster LLM models for non-critical tasks (Haiku) |
| **SSE connection drops** | Medium | Low | - Implement client-side auto-reconnection<br>- Store partial results in database<br>- Resume from last checkpoint |
| **Event stream overload** (too many events) | Low | Low | - Rate-limit event emission (max 10 events/sec)<br>- Batch low-priority events<br>- Use event filtering on client side |

### 12.4 LLM Hallucination Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **LLM generates incorrect financial analysis** | Medium | High | - Use Bedrock Guardrails (output validation)<br>- Cross-validate LLM analysis with rule-based checks<br>- Require human review for loan amounts > threshold |
| **LLM fabricates credit score** | Low | Critical | - NEVER let LLM generate credit score directly<br>- Use XGBoost model for credit scoring<br>- LLM only interprets and explains the score |
| **LLM generates biased recommendations** | Medium | High | - Implement fairness validator (counterfactual fairness)<br>- Monitor demographic parity difference<br>- Retrain model if bias detected |

### 12.5 Regulatory and Compliance Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Non-compliance with Vietnamese Cybersecurity Law** | Low | Critical | - Encrypt all data (AES-256 at rest, TLS 1.3 in transit)<br>- Pseudonymize PII before training<br>- Store data in Vietnam (or compliant region) |
| **Bias in credit decisions** (ECOA violation) | Medium | Critical | - Implement causal fairness checks<br>- Monitor approval rates across protected groups<br>- Audit log all decisions for regulatory review |
| **Inability to explain credit decisions** (FCRA requirement) | Low | High | - Implement SHAP explanations for all decisions<br>- Generate adverse action notices with specific factors<br>- Provide counterfactual guidance |

### 12.6 Scalability Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **High traffic** (>50K assessments/month) | Low | Medium | - Use serverless auto-scaling (Lambda, SageMaker Serverless)<br>- Implement connection pooling (PostgreSQL)<br>- Use Redis for caching |
| **Large financial documents** (>100 pages) | Low | Medium | - Implement pagination for PDF extraction<br>- Use asynchronous processing (background jobs)<br>- Show progress bar for long-running tasks |
| **Vector database performance degradation** | Low | Medium | - Tune pgvector index (lists parameter)<br>- Monitor query latency<br>- Migrate to Pinecone if >50M vectors |

### 12.7 Migration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Breaking changes during migration** | High | Medium | - Use feature flags to toggle old/new code paths<br>- Run parallel deployments (Credence AI + Credence)<br>- Gradual rollout (canary deployment) |
| **Loss of functionality during refactoring** | Medium | High | - Write comprehensive tests before refactoring<br>- Use Git branches for incremental changes<br>- Maintain backward compatibility where possible |
| **Timeline overrun** (estimated 12 weeks → actual 16+ weeks) | High | Medium | - Prioritize MVP features (credit scoring, SHAP)<br>- Defer nice-to-have features (GraphRAG, multi-modal RAG)<br>- Allocate buffer time (20% contingency) |

### 12.8 Team and Knowledge Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Lack of domain expertise** (finance, credit risk) | High | High | - Consult with credit risk experts<br>- Review lending regulations (Basel III, Dodd-Frank)<br>- Partner with microfinance institutions for validation |
| **Unfamiliarity with LangGraph** | Medium | Medium | - Study LangGraph documentation<br>- Run example projects<br>- Reuse existing patterns from Credence AI |
| **Model training expertise** (XGBoost, SHAP, DiCE) | Medium | Medium | - Use pre-trained models from Kaggle competitions<br>- Consult ML experts for hyperparameter tuning<br>- Use AutoML libraries (TPOT, H2O.ai) |

---

## 13. Success Metrics

**Technical Metrics**:
- ✅ Credit scoring model AUC > 0.85
- ✅ P95 latency < 3 seconds
- ✅ Data completeness checker accuracy > 90%
- ✅ RAG retrieval quality (average relevance score > 0.7)
- ✅ Zero bias in credit decisions (demographic parity difference < 5%)

**Business Metrics** (from proposal):
- ✅ Approve 30% more creditworthy micro-SMEs (vs. traditional models)
- ✅ Shrink assessment time from days to <10 seconds
- ✅ 100% of rejections include counterfactual guidance

**Code Reuse Metrics**:
- ✅ 80% code reuse (agent framework, tools, database)
- ✅ 20% new code (financial tools, credit scoring model)

---

## 14. Conclusion

This migration plan provides a comprehensive roadmap for transforming the Credence AI cybersecurity platform into Credence, an AI-powered SME loan assessment system. The plan maximizes code reuse (80%) while systematically replacing domain-specific components with financial analysis tools.

**Key Strengths**:
- **Proven Architecture**: LangGraph-based agent orchestration is battle-tested
- **Modular Design**: Tool-based architecture makes domain migration straightforward
- **Streaming Infrastructure**: SSE streaming already implemented, easily extended for activity events
- **RAG Foundation**: pgvector + embeddings infrastructure ready for lending knowledge

**Key Challenges**:
- **Model Training**: Requires ML expertise for credit scoring (XGBoost, SHAP, DiCE)
- **Document Processing**: Financial statement extraction is complex (OCR, table understanding)
- **Regulatory Compliance**: Must ensure fairness, explainability, data privacy

**Recommended Approach**:
- **Phase 1-2**: Clean up cybersecurity modules (Weeks 1-2)
- **Phase 3-4**: Build financial tools and agent orchestration (Weeks 2-5)
- **Phase 5**: Add activity streaming (Weeks 5-6)
- **Phase 6-7**: Database migration and RAG knowledge base (Weeks 6-7)
- **Phase 8**: Train credit scoring model (Weeks 7-8)
- **Phase 9-11**: Integration testing and deployment (Weeks 8-11)
- **Phase 12**: Documentation and handoff (Weeks 11-12)

**Estimated Timeline**: 12 weeks (3 months) with 4 engineers

**Risk-Adjusted Timeline**: 14-16 weeks (with 20% contingency buffer)

---

## 15. Next Steps

1. **Review this plan** with engineering team and stakeholders
2. **Set up development environment** (branch strategy, CI/CD)
3. **Start Phase 1** (Domain Decoupling)
4. **Weekly progress reviews** to track against milestones
5. **Adjust timeline** based on actual progress

**Questions for Stakeholders**:
- Do we have access to SoBanHang API? (validation dataset)
- What are the priority features for MVP? (counterfactuals, fairness checks optional?)
- What is the target deployment environment? (AWS, Azure, on-premise?)
- Are there regulatory requirements we need to address? (Vietnam data privacy laws)

---

**End of Migration Plan**

*For questions or clarifications, refer to:*
- [Original Architecture Analysis](#2-current-architecture-analysis)
- [Credence AI RAG Integration Guide](credence-ai-backend/docs/RAG_INTEGRATION_GUIDE.md)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
