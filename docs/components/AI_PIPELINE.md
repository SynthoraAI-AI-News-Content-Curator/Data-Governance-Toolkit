# Agentic AI Pipeline Documentation

The Agentic AI Pipeline is a sophisticated multi-agent system built with LangGraph and LangChain for advanced article processing.

## Overview

The pipeline processes articles through multiple specialized AI agents in sequence, each performing a specific task:

1. **Content Analyzer** - Extracts structure, entities, and key information
2. **Summarizer** - Generates concise summaries
3. **Classifier** - Categorizes articles into topics
4. **Sentiment Analyzer** - Analyzes tone and objectivity
5. **Quality Checker** - Validates outputs and determines retry logic

## Architecture

### Assembly Line Pattern

```python
from langgraph.graph import StateGraph
from typing import TypedDict

class ArticleState(TypedDict):
    article: dict
    analysis: dict
    summary: str
    topics: list[str]
    sentiment: dict
    quality_score: int
    retry_count: int

# Create workflow graph
workflow = StateGraph(ArticleState)

# Add agent nodes
workflow.add_node("intake", intake_node)
workflow.add_node("analyze", content_analyzer_agent)
workflow.add_node("summarize", summarizer_agent)
workflow.add_node("classify", classifier_agent)
workflow.add_node("sentiment", sentiment_analyzer_agent)
workflow.add_node("quality_check", quality_checker_agent)
workflow.add_node("output", output_node)

# Define edges
workflow.add_edge("intake", "analyze")
workflow.add_edge("analyze", "summarize")
workflow.add_edge("summarize", "classify")
workflow.add_edge("classify", "sentiment")
workflow.add_edge("sentiment", "quality_check")

# Conditional routing based on quality
workflow.add_conditional_edges(
    "quality_check",
    should_retry,
    {
        "retry": "analyze",
        "output": "output"
    }
)

workflow.set_entry_point("intake")
workflow.set_finish_point("output")

app = workflow.compile()
```

## Agent Specifications

### 1. Content Analyzer Agent

**Purpose**: Extract structure, entities, dates, and writing style

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

class ContentAnalyzerAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-pro")
        self.prompt = ChatPromptTemplate.from_template("""
        Analyze the following article and extract:

        1. **Structure**: Main sections, headings, flow
        2. **Entities**:
           - People (names, titles, roles)
           - Organizations
           - Locations
           - Events
        3. **Dates**: Important dates and timelines
        4. **Writing Style**: Tone, perspective, formality
        5. **Main Arguments**: Key claims and supporting evidence

        Article:
        {content}

        Return as structured JSON.
        """)

    def analyze(self, article: dict) -> dict:
        chain = self.prompt | self.llm
        result = chain.invoke({"content": article["content"]})
        return json.loads(result.content)

# Node function
def content_analyzer_agent(state: ArticleState) -> ArticleState:
    analyzer = ContentAnalyzerAgent()
    analysis = analyzer.analyze(state["article"])
    state["analysis"] = analysis
    return state
```

### 2. Summarizer Agent

**Purpose**: Generate 150-200 word summary focusing on key points

```python
class SummarizerAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-pro")
        self.prompt = ChatPromptTemplate.from_template("""
        Based on this content analysis:
        {analysis}

        Create a concise 150-200 word summary that:
        - Captures main points and key takeaways
        - Includes important facts and figures
        - Highlights implications for government officials
        - Uses clear, professional language
        - Maintains objectivity

        Summary:
        """)

    def summarize(self, analysis: dict) -> str:
        chain = self.prompt | self.llm
        result = chain.invoke({"analysis": json.dumps(analysis)})
        return result.content

def summarizer_agent(state: ArticleState) -> ArticleState:
    summarizer = SummarizerAgent()
    summary = summarizer.summarize(state["analysis"])
    state["summary"] = summary
    return state
```

### 3. Classifier Agent

**Purpose**: Categorize article into relevant topics

```python
from typing import List

class ClassifierAgent:
    TOPICS = [
        "Politics & Government",
        "International Relations",
        "Economy & Finance",
        "Healthcare",
        "Education",
        "Technology",
        "Environment & Climate",
        "Defense & Security",
        "Justice & Law",
        "Social Issues",
        "Infrastructure",
        "Energy",
        "Agriculture",
        "Science & Research",
        "Culture & Arts"
    ]

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-pro")
        self.prompt = ChatPromptTemplate.from_template("""
        Classify the article into relevant topics from this list:
        {topics}

        Article analysis:
        {analysis}

        Return 1-3 most relevant topics as a JSON array.
        Consider:
        - Primary subject matter
        - Secondary themes
        - Policy implications

        Topics:
        """)

    def classify(self, analysis: dict) -> List[str]:
        chain = self.prompt | self.llm
        result = chain.invoke({
            "topics": ", ".join(self.TOPICS),
            "analysis": json.dumps(analysis)
        })
        return json.loads(result.content)

def classifier_agent(state: ArticleState) -> ArticleState:
    classifier = ClassifierAgent()
    topics = classifier.classify(state["analysis"])
    state["topics"] = topics
    return state
```

### 4. Sentiment Analyzer Agent

**Purpose**: Analyze emotional tone, objectivity, urgency, controversy

```python
class SentimentAnalyzerAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-pro")
        self.prompt = ChatPromptTemplate.from_template("""
        Analyze the sentiment and characteristics of this article:

        Analysis: {analysis}
        Summary: {summary}

        Provide scores (0-100) for:
        1. **Tone**: positive, negative, or neutral
        2. **Objectivity**: 0 (very biased) to 100 (completely objective)
        3. **Urgency**: 0 (not urgent) to 100 (extremely urgent)
        4. **Controversy**: 0 (uncontroversial) to 100 (highly controversial)

        Return as JSON:
        {{
          "tone": "positive|negative|neutral",
          "objectivity": 0-100,
          "urgency": 0-100,
          "controversy": 0-100,
          "reasoning": "explanation"
        }}
        """)

    def analyze(self, analysis: dict, summary: str) -> dict:
        chain = self.prompt | self.llm
        result = chain.invoke({
            "analysis": json.dumps(analysis),
            "summary": summary
        })
        return json.loads(result.content)

def sentiment_analyzer_agent(state: ArticleState) -> ArticleState:
    analyzer = SentimentAnalyzerAgent()
    sentiment = analyzer.analyze(state["analysis"], state["summary"])
    state["sentiment"] = sentiment
    return state
```

### 5. Quality Checker Agent

**Purpose**: Validate processing quality and determine retry logic

```python
class QualityCheckerAgent:
    MIN_QUALITY_SCORE = 80
    MAX_RETRIES = 3

    def check(self, state: ArticleState) -> tuple[bool, int]:
        score = 0

        # Check completeness (25 points)
        required_fields = ["analysis", "summary", "topics", "sentiment"]
        if all(state.get(field) for field in required_fields):
            score += 25

        # Check summary quality (25 points)
        summary = state.get("summary", "")
        word_count = len(summary.split())
        if 150 <= word_count <= 200:
            score += 25
        elif 100 <= word_count <= 250:
            score += 15

        # Check metadata accuracy (25 points)
        topics = state.get("topics", [])
        if 1 <= len(topics) <= 3:
            score += 25

        # Check sentiment validity (25 points)
        sentiment = state.get("sentiment", {})
        if all(
            0 <= sentiment.get(key, -1) <= 100
            for key in ["objectivity", "urgency", "controversy"]
        ):
            score += 25

        passed = score >= self.MIN_QUALITY_SCORE
        return (passed, score)

def quality_checker_agent(state: ArticleState) -> ArticleState:
    checker = QualityCheckerAgent()
    passed, score = checker.check(state)
    state["quality_score"] = score
    return state

def should_retry(state: ArticleState) -> str:
    max_retries = QualityCheckerAgent.MAX_RETRIES
    min_score = QualityCheckerAgent.MIN_QUALITY_SCORE

    if state["quality_score"] >= min_score:
        return "output"

    if state.get("retry_count", 0) < max_retries:
        state["retry_count"] = state.get("retry_count", 0) + 1
        return "retry"

    return "output"  # Give up after max retries
```

## Model Context Protocol (MCP) Server

Expose the pipeline through a standardized MCP interface:

```python
from fastmcp import FastMCP

mcp = FastMCP("SynthoraAI Agentic Pipeline")

@mcp.tool()
async def process_article(
    article_id: str,
    content: str,
    url: str,
    source: str
) -> dict:
    """
    Process an article through the AI pipeline.

    Args:
        article_id: Unique identifier
        content: Full article text
        url: Article URL
        source: Source domain

    Returns:
        Processed article with AI-generated metadata
    """
    result = await app.ainvoke({
        "article": {
            "id": article_id,
            "content": content,
            "url": url,
            "source": source
        },
        "retry_count": 0
    })

    return {
        "id": article_id,
        "summary": result["summary"],
        "topics": result["topics"],
        "sentiment": result["sentiment"],
        "quality_score": result["quality_score"]
    }

@mcp.tool()
async def reprocess_failed_articles(min_quality_score: int = 80) -> list[dict]:
    """
    Reprocess articles that failed quality checks.

    Args:
        min_quality_score: Minimum acceptable quality score

    Returns:
        List of reprocessed articles
    """
    from models import Article

    failed = await Article.find({
        "qualityScore": {"$lt": min_quality_score}
    }).limit(50)

    results = []
    for article in failed:
        result = await process_article(
            article["_id"],
            article["content"],
            article["url"],
            article["source"]
        )
        results.append(result)

    return results

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

## Usage

### Programmatic

```python
from agentic_ai.core.pipeline import AgenticPipeline
import asyncio

async def main():
    pipeline = AgenticPipeline()

    result = await pipeline.process_article({
        "id": "article-001",
        "content": "Full article content here...",
        "url": "https://example.com/article",
        "source": "example.com"
    })

    print(f"Summary: {result['summary']}")
    print(f"Topics: {result['topics']}")
    print(f"Quality Score: {result['quality_score']}")

asyncio.run(main())
```

### MCP Server

```bash
# Start MCP server
python -m agentic_ai.mcp_server.server

# Use via MCP client
mcp-client call process_article \
  --article_id="001" \
  --content="Article content..." \
  --url="https://example.com" \
  --source="example.com"
```

## Cloud Deployment

### AWS Lambda

```bash
cd agentic_ai/aws
./deploy.sh production
```

### Azure Functions

```bash
cd agentic_ai/azure
./deploy.sh production
```

## Monitoring

```python
import prometheus_client as prom

# Metrics
articles_processed = prom.Counter(
    'articles_processed_total',
    'Total articles processed'
)

processing_duration = prom.Histogram(
    'processing_duration_seconds',
    'Article processing duration'
)

quality_scores = prom.Histogram(
    'quality_scores',
    'Distribution of quality scores',
    buckets=[0, 20, 40, 60, 80, 100]
)
```

---

**Service**: Agentic AI Pipeline
**Technology**: Python, LangGraph, LangChain
**Documentation**: [Full README](../../agentic_ai/README.md)
