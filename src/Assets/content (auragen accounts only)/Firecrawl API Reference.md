<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Firecrawl API Reference

Firecrawl is a web scraping and data extraction API designed specifically for AI applications and agents, converting web content into LLM-ready markdown or structured data.[^1_1][^1_2]

## Base Configuration

### Base URL

```
https://api.firecrawl.dev
```


### Authentication

All requests require a Bearer token in the Authorization header:[^1_3]

```
Authorization: Bearer fc-YOUR_API_KEY
```


### HTTP Response Codes

| Status | Description |
| :-- | :-- |
| 200 | Request successful |
| 400 | Invalid parameters |
| 401 | Missing API key |
| 402 | Payment required |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 5xx | Server error |

[^1_3]

## Core API Endpoints

### `/scrape` - Single URL Scraping

Scrapes a single URL and returns content in various formats including markdown, HTML, structured JSON, or screenshots.[^1_2][^1_4]

**Python SDK Example:**

```python
from firecrawl import Firecrawl

firecrawl = Firecrawl(api_key="fc-YOUR-API-KEY")
doc = firecrawl.scrape("https://firecrawl.dev", formats=["markdown", "html"])
print(doc)
```

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "markdown": "Launch Week I is here!...",
    "html": "<!DOCTYPE html>...",
    "metadata": {
      "title": "Home - Firecrawl",
      "description": "Firecrawl crawls and converts any website into clean markdown",
      "language": "en",
      "sourceURL": "https://firecrawl.dev",
      "statusCode": 200
    }
  }
}
```

**Supported Output Formats:**

- `markdown` - Clean markdown text
- `html` - Processed HTML
- `rawHtml` - Unmodified HTML
- `screenshot` - Page screenshot
- `links` - All page links
- `json` - Structured data extraction
- `images` - All image URLs
- `summary` - AI-generated summary

[^1_5]

### `/scrape` with Structured Extraction

Extract structured data using a schema or prompt.[^1_2][^1_5]

**With Schema (Python):**

```python
from firecrawl import Firecrawl
from pydantic import BaseModel

class CompanyInfo(BaseModel):
    company_mission: str
    supports_sso: bool
    is_open_source: bool
    is_in_yc: bool

app = Firecrawl(api_key="fc-YOUR-API-KEY")
result = app.scrape(
    'https://firecrawl.dev',
    formats=[{
        "type": "json",
        "schema": CompanyInfo.model_json_schema()
    }]
)
```

**Without Schema (Prompt-only):**

```python
result = app.scrape(
    'https://firecrawl.dev',
    formats=[{
        "type": "json",
        "prompt": "Extract the company mission from the page."
    }]
)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "json": {
      "company_mission": "AI-powered web scraping and data extraction",
      "supports_sso": true,
      "is_open_source": true,
      "is_in_yc": true
    }
  }
}
```


### Actions - Browser Interactions

Perform actions before scraping (click, type, wait, screenshot).[^1_6][^1_2]

**Example:**

```python
doc = firecrawl.scrape(
    url="google.com",
    formats=["markdown"],
    actions=[
        {"type": "wait", "milliseconds": 2000},
        {"type": "click", "selector": "textarea[title='Search']"},
        {"type": "write", "text": "firecrawl"},
        {"type": "press", "key": "ENTER"},
        {"type": "wait", "milliseconds": 3000},
        {"type": "screenshot"}
    ]
)
```

**Available Action Types:**

- `wait` - Pause for specified milliseconds
- `click` - Click element by selector
- `write` - Type text
- `press` - Press keyboard key
- `screenshot` - Capture screenshot

[^1_6]

### `/crawl` - Multi-page Crawling

Crawls entire websites starting from a base URL.[^1_4][^1_2]

**Python Example:**

```python
job = firecrawl.crawl(
    url="https://docs.firecrawl.dev",
    limit=100,
    scrape_options={
        'formats': ['markdown', 'html']
    }
)
```

**Natural Language Crawl Control (v2):**

```json
{
  "url": "https://example.com",
  "prompt": "Only crawl blog posts and docs, skip marketing pages"
}
```

**Crawl Options:**


| Parameter | Type | Description |
| :-- | :-- | :-- |
| `limit` | integer | Maximum pages to crawl (default: 10000) |
| `maxDiscoveryDepth` | integer | Maximum crawl depth from root |
| `includePaths` | array | Regex patterns for paths to include |
| `excludePaths` | array | Regex patterns for paths to exclude |
| `crawlEntireDomain` | boolean | Follow sibling/parent URLs, not just children |
| `allowExternalLinks` | boolean | Follow external domains |
| `allowSubdomains` | boolean | Follow subdomains |
| `sitemap` | string | `"include"` or `"skip"` sitemap usage |
| `ignoreSitemap` | boolean | Deprecated, use `sitemap: "skip"` |
| `delay` | integer | Seconds between scrapes |

[^1_7]

**Response:**

```json
{
  "status": "completed",
  "total": 36,
  "completed": 36,
  "creditsUsed": 36,
  "data": [
    {
      "markdown": "[Firecrawl Docs home page]...",
      "metadata": {
        "title": "Build a 'Chat with website'",
        "sourceURL": "https://docs.firecrawl.dev/learn/rag-llama3"
      }
    }
  ]
}
```


### `/extract` - Structured Data Extraction

Extract structured data from single or multiple URLs, including wildcards.[^1_8][^1_2]

**Single Page:**

```python
from firecrawl import Firecrawl

firecrawl = Firecrawl(api_key="fc-YOUR-API-KEY")

schema = {
    "type": "object",
    "properties": {
        "company_mission": {"type": "string"},
        "is_open_source": {"type": "boolean"},
        "is_in_yc": {"type": "boolean"}
    },
    "required": ["company_mission", "is_open_source", "is_in_yc"]
}

res = firecrawl.extract(
    urls=["https://docs.firecrawl.dev"],
    prompt="Extract the page description",
    schema=schema
)
```

**Multiple Pages with Wildcard:**

```bash
curl -X POST https://api.firecrawl.dev/v2/extract \
    -H 'Authorization: Bearer YOUR_API_KEY' \
    -d '{
      "urls": ["https://firecrawl.dev/*"],
      "prompt": "Extract company mission and features",
      "schema": {...}
    }'
```

**Extract without URLs (Alpha):**

```python
prompt = 'Extract the company mission from Firecrawl\'s website.'
scrape_result = firecrawl.extract(prompt=prompt, schema=ExtractSchema)
```

**Web Search Enhancement:**

```python
data = firecrawl.extract(
    urls=['https://nextbase.com/dash-cams/622gw-dash-cam'],
    prompt="Extract details about dash cams including prices and reviews",
    enable_web_search=True
)
```

**Job Status States:**

- `completed` - Extraction finished successfully
- `processing` - Request still processing
- `failed` - Error occurred
- `cancelled` - Job cancelled by user

[^1_8]

### `/map` - URL Discovery

Quickly retrieve all URLs from a website without scraping content.[^1_9][^1_2]

**Use Case:** Identify specific pages to scrape or get sitemap-like overview.[^1_9]

### Batch Scraping

Scrape multiple URLs simultaneously.[^1_5]

```python
job = firecrawl.batch_scrape([
    "https://firecrawl.dev",
    "https://docs.firecrawl.dev"
], formats=["markdown"], poll_interval=2, wait_timeout=120)
```


## Advanced Features

### Location \& Language Targeting

Specify country and language preferences for location-specific content.[^1_5]

```python
doc = firecrawl.scrape(
    'https://example.com',
    formats=['markdown'],
    location={
        'country': 'US',  # ISO 3166-1 alpha-2 code
        'languages': ['en']
    }
)
```


### Caching Control

Control cache behavior for faster responses.[^1_5]

**Default:** `maxAge = 172800000ms` (2 days)

```python
# Always fetch fresh (no cache)
doc = firecrawl.scrape(url='https://example.com', maxAge=0)

# 10-minute cache window
doc = firecrawl.scrape(url='https://example.com', maxAge=600000)

# Don't store in cache
doc = firecrawl.scrape(url='https://example.com', storeInCache=False)
```


### FIRE-1 AI Agent

Enhanced scraping with AI-powered browser control for complex navigation and extraction.[^1_8]

```bash
curl -X POST https://api.firecrawl.dev/v2/extract \
    -H 'Authorization: Bearer YOUR_API_KEY' \
    -d '{
      "urls": ["https://example-forum.com/topic/123"],
      "prompt": "Extract all user comments",
      "agent": {
        "model": "FIRE-1"
      }
    }'
```


## SDKs \& Integrations

### Official SDKs

- Python: `pip install firecrawl-py`
- Node.js: Available via npm

[^1_4][^1_2]

### LLM Framework Integrations

- LangChain (Python \& JavaScript)
- LlamaIndex
- CrewAI
- Composio
- PraisonAI

[^1_10][^1_2]

### No-Code/Low-Code Platforms

- Dify
- Langflow
- Flowise AI
- Zapier
- Pipedream
- Pabbly Connect

[^1_2]

### Community SDKs

- Go
- Rust

[^1_2]

## Common Error Codes (5xx)

| Error Code | Description |
| :-- | :-- |
| `SCRAPE_ALL_ENGINES_FAILED` | All scraping engines failed |
| `SCRAPE_SSL_ERROR` | Invalid SSL certificate (use `skipTlsVerification:true`) |
| `SCRAPE_SITE_ERROR` | Unrecoverable site error |
| `SCRAPE_DNS_RESOLUTION_ERROR` | DNS resolution failed |
| `SCRAPE_ACTION_ERROR` | Error during page action |
| `SCRAPE_ZDR_VIOLATION_ERROR` | Zero data retention conflict |

[^1_3]

## Key Capabilities

Firecrawl handles complex scraping challenges automatically:[^1_2][^1_5]

- Proxy rotation and management
- Rate limiting and caching
- JavaScript rendering
- Dynamic content loading
- PDF and image extraction
- Anti-bot bypass mechanisms
- Screenshot capture
- Form interaction and automation
<span style="display:none">[^1_11][^1_12][^1_13][^1_14][^1_15][^1_16][^1_17][^1_18][^1_19][^1_20]</span>

<div align="center">⁂</div>

[^1_1]: https://www.firecrawl.dev

[^1_2]: https://github.com/firecrawl/firecrawl

[^1_3]: https://docs.firecrawl.dev/api-reference/introduction

[^1_4]: https://docs.firecrawl.dev/sdks/python

[^1_5]: https://docs.firecrawl.dev/features/scrape

[^1_6]: https://docs.firecrawl.dev/introduction

[^1_7]: https://docs.firecrawl.dev/api-reference/endpoint/crawl-post

[^1_8]: https://docs.firecrawl.dev/features/extract

[^1_9]: https://docs.firecrawl.dev/features/map

[^1_10]: https://docs.crewai.com/tools/web-scraping/firecrawlscrapewebsitetool

[^1_11]: https://www.youtube.com/watch?v=8kUeK1Bo4mM

[^1_12]: https://www.youtube.com/watch?v=noWpWi6IZl4

[^1_13]: https://www.youtube.com/watch?v=V0d_Q3Gq3-Q

[^1_14]: https://www.firecrawl.dev/blog/mastering-firecrawl-scrape-endpoint

[^1_15]: https://www.reddit.com/r/LocalLLaMA/comments/1jw4yqv/what_is_the_best_scraper_tool_right_now_firecrawl/

[^1_16]: https://www.firecrawl.dev/playground

[^1_17]: https://www.firecrawl.dev/blog/mastering-the-crawl-endpoint-in-firecrawl

[^1_18]: https://docs.ag2.ai/latest/docs/use-cases/notebooks/notebooks/tools_firecrawl/

[^1_19]: https://www.blott.com/blog/post/how-firecrawl-cuts-web-scraping-time-by-60-real-developer-results

[^1_20]: https://docs.firecrawl.dev/sdks/overview

