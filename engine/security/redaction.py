import re


def redact_text(text: str, secret: str | None = None) -> str:
    if not text:
        return ""

    redacted = text

    # Redact explicit secret if provided
    if secret and len(secret) > 3:
        redacted = redacted.replace(secret, "[REDACTED_SECRET]")

    # Redact Authorization: Bearer tokens
    redacted = re.sub(
        r"(Bearer\s+)[A-Za-z0-9\-._~+/]+=*",
        r"\1[REDACTED_BEARER_TOKEN]",
        redacted,
        flags=re.IGNORECASE,
    )

    # Redact API token patterns
    redacted = re.sub(
        r"(api[_-]?token\s*[:=]\s*['\"]?)[A-Za-z0-9\-._~+/]+(['\"]?)",
        r"\1[REDACTED_API_TOKEN]\2",
        redacted,
        flags=re.IGNORECASE,
    )

    return redacted

