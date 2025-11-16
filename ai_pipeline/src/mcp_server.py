"""
Model Context Protocol (MCP) server for the AI pipeline.
Exposes pipeline functionality via standardized MCP interface.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from .pipeline import AgenticPipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SynthoraAI Agentic Pipeline MCP Server",
    description="Multi-agent AI pipeline for article processing",
    version="1.0.0",
)

# Initialize pipeline
pipeline = AgenticPipeline()


class Article(BaseModel):
    """Article input model."""
    id: str
    content: str
    title: Optional[str] = ""
    url: Optional[str] = ""
    source: Optional[str] = ""


class ProcessResponse(BaseModel):
    """Processing response model."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@app.post("/process", response_model=ProcessResponse)
async def process_article(article: Article) -> ProcessResponse:
    """
    Process an article through the AI pipeline.

    Args:
        article: Article data with id, content, and metadata

    Returns:
        Processed article with AI-generated metadata
    """
    try:
        logger.info(f"Processing article: {article.id}")

        result = await pipeline.process_article(article.model_dump())

        logger.info(f"Article {article.id} processed successfully. Quality score: {result['quality_score']}")

        return ProcessResponse(
            success=True,
            data=result,
        )
    except Exception as e:
        logger.error(f"Error processing article {article.id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch", response_model=ProcessResponse)
async def process_batch(articles: list[Article]) -> ProcessResponse:
    """
    Process multiple articles in batch.

    Args:
        articles: List of articles to process

    Returns:
        List of processed articles
    """
    try:
        logger.info(f"Processing batch of {len(articles)} articles")

        results = []
        for article in articles:
            try:
                result = await pipeline.process_article(article.model_dump())
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing article {article.id}: {str(e)}")
                results.append({
                    "id": article.id,
                    "error": str(e),
                })

        return ProcessResponse(
            success=True,
            data={"results": results},
        )
    except Exception as e:
        logger.error(f"Error processing batch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "SynthoraAI AI Pipeline",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
