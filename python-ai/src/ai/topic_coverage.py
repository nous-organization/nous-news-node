from typing import List, Dict, Optional, TypedDict, Literal

# ------------------------------------------------------
# Type definitions
# ------------------------------------------------------

class ArticleAnalyzed(TypedDict, total=False):
    source: Optional[str]
    tags: Optional[List[str]]
    politicalBias: Optional[Literal["left", "center", "right"]]

class TopicCoverage(TypedDict):
    source: str
    topics: Dict[str, int]  # topic name -> number of articles
    totalArticles: int

class BlindspotReport(TypedDict):
    topic: str
    underrepresentedBias: Literal["left", "center", "right"]
    coveragePercent: float

# ------------------------------------------------------
# Functions
# ------------------------------------------------------

def aggregate_topics(articles: List[ArticleAnalyzed]) -> Dict[str, TopicCoverage]:
    """
    Aggregate topics per source from analyzed articles.

    Args:
        articles: List of analyzed articles.

    Returns:
        Dictionary mapping source -> TopicCoverage
    """
    coverage: Dict[str, TopicCoverage] = {}

    for art in articles:
        source = art.get("source") or "unknown"
        coverage.setdefault(source, {"source": source, "topics": {}, "totalArticles": 0})
        coverage[source]["totalArticles"] += 1

        for tag in art.get("tags") or []:
            coverage[source]["topics"][tag] = coverage[source]["topics"].get(tag, 0) + 1

    return coverage


def detect_blindspots(
    articles: List[ArticleAnalyzed],
    threshold: float = 20.0
) -> List[BlindspotReport]:
    """
    Detect blindspots: topics underrepresented for a given political bias.

    Args:
        articles: List of analyzed articles.
        threshold: Percent threshold to flag a blindspot (0-100)

    Returns:
        List of BlindspotReport objects
    """
    topic_bias_map: Dict[str, Dict[str, int]] = {}
    total_per_topic: Dict[str, int] = {}

    for art in articles:
        topics = art.get("tags") or ["unknown"]
        bias = art.get("politicalBias") or "center"
        for t in topics:
            topic_bias_map.setdefault(t, {})
            topic_bias_map[t][bias] = topic_bias_map[t].get(bias, 0) + 1
            total_per_topic[t] = total_per_topic.get(t, 0) + 1

    blindspots: List[BlindspotReport] = []

    for t, bias_counts in topic_bias_map.items():
        total = total_per_topic.get(t, 1)
        for bias in ["left", "center", "right"]:
            percent = (bias_counts.get(bias, 0) / total) * 100
            if percent < threshold:
                blindspots.append({
                    "topic": t,
                    "underrepresentedBias": bias,
                    "coveragePercent": percent
                })

    # Sort by topic and bias for readability
    blindspots.sort(key=lambda x: (x["topic"], x["underrepresentedBias"]))
    return blindspots
