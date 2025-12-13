"""
clean_html.py
Handles cleaning up HTML files into plain text.

Functions:
- clean_html(html: str) -> str
- safe_string(input_text: str | None) -> str

Example usage:
    python clean_html.py
"""

from bs4 import BeautifulSoup
import re

def safe_string(input_text: str | None) -> str:
    """
    Ensures the input is a string. Returns empty string if None or invalid.
    """
    return input_text if isinstance(input_text, str) else ""


def clean_html(html: str) -> str:
    """
    Normalize messy HTML content into clean text.

    Steps:
    - Removes <script>, <style>, <noscript>
    - Removes hidden elements, ads, navs, headers, footers
    - Removes common paywall overlays
    - Collapses multiple spaces and newlines

    Args:
        html (str): Raw HTML content

    Returns:
        str: Cleaned text
    """
    if not html:
        return ""

    soup = BeautifulSoup(html, "html.parser")

    # Remove unwanted tags
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
        tag.decompose()

    # Remove elements with hidden styles or hidden attribute
    for el in soup.select("[style*='display:none'], [hidden]"):
        el.decompose()

    # Remove common paywalls/overlays
    for el in soup.select(".paywall, .overlay, .meteredContent, #gateway-content"):
        el.decompose()

    # Extract text and collapse whitespace
    content = soup.get_text(separator=" ").strip()
    content = re.sub(r"\s+", " ", content)

    return safe_string(content)


# Example usage
if __name__ == "__main__":
    html_content = """
    <html>
        <body>
            <script>alert(1)</script>
            <p>Hello <span style='display:none'>hidden</span> World!</p>
        </body>
    </html>
    """
    print(clean_html(html_content))
