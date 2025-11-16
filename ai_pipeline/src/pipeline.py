"""
Multi-agent AI pipeline for article processing using LangGraph.
"""
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
import os
import json
from dotenv import load_dotenv

load_dotenv()


class ArticleState(TypedDict):
    """State for the article processing pipeline."""
    article_id: str
    content: str
    title: str
    url: str
    source: str

    # Agent outputs
    analysis: dict
    summary: str
    topics: list[str]
    sentiment: dict
    quality_score: int
    retry_count: int


class AgenticPipeline:
    """Main pipeline orchestrator using LangGraph."""

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=os.getenv("GOOGLE_AI_API_KEY"),
            temperature=0.7,
        )
        self.workflow = self._build_workflow()
        self.app = self.workflow.compile()

    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(ArticleState)

        # Add nodes (agents)
        workflow.add_node("intake", self.intake_node)
        workflow.add_node("analyze", self.content_analyzer_agent)
        workflow.add_node("summarize", self.summarizer_agent)
        workflow.add_node("classify", self.classifier_agent)
        workflow.add_node("sentiment", self.sentiment_analyzer_agent)
        workflow.add_node("quality_check", self.quality_checker_agent)
        workflow.add_node("output", self.output_node)

        # Define edges
        workflow.add_edge("intake", "analyze")
        workflow.add_edge("analyze", "summarize")
        workflow.add_edge("summarize", "classify")
        workflow.add_edge("classify", "sentiment")
        workflow.add_edge("sentiment", "quality_check")

        # Conditional routing based on quality
        workflow.add_conditional_edges(
            "quality_check",
            self.should_retry,
            {
                "retry": "analyze",
                "output": "output",
            },
        )

        # Set entry and exit points
        workflow.set_entry_point("intake")
        workflow.set_finish_point("output")

        return workflow

    def intake_node(self, state: ArticleState) -> ArticleState:
        """Validate input and initialize state."""
        if not state.get("retry_count"):
            state["retry_count"] = 0
        return state

    def content_analyzer_agent(self, state: ArticleState) -> ArticleState:
        """Extract structure, entities, dates, and writing style."""
        prompt = ChatPromptTemplate.from_template("""
        Analyze the following article and extract:

        1. Structure: Main sections, headings, flow
        2. Entities:
           - People (names, titles, roles)
           - Organizations
           - Locations
           - Events
        3. Dates: Important dates and timelines
        4. Writing Style: Tone, perspective, formality
        5. Main Arguments: Key claims and supporting evidence

        Article Title: {title}
        Article Content: {content}

        Return as JSON with keys: structure, entities, dates, style, main_arguments
        """)

        chain = prompt | self.llm
        result = chain.invoke({
            "title": state["title"],
            "content": state["content"][:10000]  # Limit content length
        })

        try:
            analysis = json.loads(result.content)
        except json.JSONDecodeError:
            # Fallback if not valid JSON
            analysis = {
                "structure": "Unable to analyze",
                "entities": [],
                "dates": [],
                "style": "neutral",
                "main_arguments": []
            }

        state["analysis"] = analysis
        return state

    def summarizer_agent(self, state: ArticleState) -> ArticleState:
        """Generate 150-200 word summary."""
        prompt = ChatPromptTemplate.from_template("""
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

        chain = prompt | self.llm
        result = chain.invoke({
            "analysis": json.dumps(state["analysis"], indent=2)
        })

        state["summary"] = result.content
        return state

    def classifier_agent(self, state: ArticleState) -> ArticleState:
        """Classify article into relevant topics."""
        topics = [
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
            "Culture & Arts",
        ]

        prompt = ChatPromptTemplate.from_template("""
        Classify the article into 1-3 most relevant topics from this list:
        {topics}

        Article analysis:
        {analysis}

        Consider:
        - Primary subject matter
        - Secondary themes
        - Policy implications

        Return only a JSON array of topic names: ["Topic1", "Topic2"]
        """)

        chain = prompt | self.llm
        result = chain.invoke({
            "topics": ", ".join(topics),
            "analysis": json.dumps(state["analysis"], indent=2)
        })

        try:
            classified_topics = json.loads(result.content)
        except json.JSONDecodeError:
            classified_topics = ["General"]

        state["topics"] = classified_topics[:3]  # Max 3 topics
        return state

    def sentiment_analyzer_agent(self, state: ArticleState) -> ArticleState:
        """Analyze emotional tone, objectivity, urgency, controversy."""
        prompt = ChatPromptTemplate.from_template("""
        Analyze the sentiment and characteristics of this article:

        Analysis: {analysis}
        Summary: {summary}

        Provide scores (0-100) for:
        1. Tone: positive, negative, or neutral
        2. Objectivity: 0 (very biased) to 100 (completely objective)
        3. Urgency: 0 (not urgent) to 100 (extremely urgent)
        4. Controversy: 0 (uncontroversial) to 100 (highly controversial)

        Return as JSON:
        {{
          "tone": "positive|negative|neutral",
          "objectivity": number,
          "urgency": number,
          "controversy": number
        }}
        """)

        chain = prompt | self.llm
        result = chain.invoke({
            "analysis": json.dumps(state["analysis"], indent=2),
            "summary": state["summary"]
        })

        try:
            sentiment = json.loads(result.content)
        except json.JSONDecodeError:
            sentiment = {
                "tone": "neutral",
                "objectivity": 75,
                "urgency": 50,
                "controversy": 30
            }

        state["sentiment"] = sentiment
        return state

    def quality_checker_agent(self, state: ArticleState) -> ArticleState:
        """Validate processing quality and determine retry logic."""
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

        state["quality_score"] = score
        return state

    def should_retry(self, state: ArticleState) -> str:
        """Determine if retry is needed based on quality score."""
        MAX_RETRIES = 3
        MIN_QUALITY_SCORE = 80

        if state["quality_score"] >= MIN_QUALITY_SCORE:
            return "output"

        if state.get("retry_count", 0) < MAX_RETRIES:
            state["retry_count"] = state.get("retry_count", 0) + 1
            return "retry"

        return "output"  # Give up after max retries

    def output_node(self, state: ArticleState) -> ArticleState:
        """Final output node."""
        return state

    async def process_article(self, article: dict) -> dict:
        """Process an article through the AI pipeline."""
        state = ArticleState(
            article_id=article["id"],
            content=article["content"],
            title=article.get("title", ""),
            url=article.get("url", ""),
            source=article.get("source", ""),
            analysis={},
            summary="",
            topics=[],
            sentiment={},
            quality_score=0,
            retry_count=0,
        )

        result = await self.app.ainvoke(state)

        return {
            "id": result["article_id"],
            "summary": result["summary"],
            "topics": result["topics"],
            "sentiment": result["sentiment"],
            "quality_score": result["quality_score"],
            "analysis": result["analysis"],
        }


# Standalone function for easy import
async def process_article(article: dict) -> dict:
    """Process a single article through the pipeline."""
    pipeline = AgenticPipeline()
    return await pipeline.process_article(article)
