#!/usr/bin/env python3
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_URL = "https://api.github.com/users/{username}"
API_VERSION = "2022-11-28"


def fetch_user(username: str, token: str | None = None) -> dict:
    url = API_URL.format(username=username)
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": "github-user-registered-time-script",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(url, headers=headers)
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def format_age(created_at: datetime, now: datetime) -> str:
    delta = now - created_at
    days = delta.days
    seconds = delta.seconds
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return f"{days} days, {hours} hours, {minutes} minutes"


def format_rate_limit_reset(reset_header: str | None) -> str:
    if not reset_header:
        return ""

    try:
        reset_at = datetime.fromtimestamp(int(reset_header), timezone.utc)
    except ValueError:
        return ""

    return reset_at.strftime("%Y-%m-%d %H:%M:%S UTC")


def read_http_error_message(exc: HTTPError) -> str:
    try:
        payload = json.loads(exc.read().decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return f"HTTP {exc.code}"

    return payload.get("message") or f"HTTP {exc.code}"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check when a GitHub user account was created."
    )
    parser.add_argument("username", help="GitHub username to inspect")
    parser.add_argument(
        "--token",
        default=os.getenv("GITHUB_TOKEN"),
        help="GitHub token (or set GITHUB_TOKEN) for higher rate limits",
    )
    args = parser.parse_args()

    try:
        user = fetch_user(args.username, args.token)
    except HTTPError as exc:
        if exc.code == 404:
            print(f"user not found: {args.username}", file=sys.stderr)
            return 1
        if exc.code in (403, 429):
            message = read_http_error_message(exc)
            reset_at = format_rate_limit_reset(exc.headers.get("X-RateLimit-Reset"))
            if reset_at:
                message = f"{message} Try again after {reset_at}."
            print(message, file=sys.stderr)
            return 1
        print(f"GitHub API error: HTTP {exc.code}", file=sys.stderr)
        return 1
    except URLError as exc:
        print(f"network error: {exc.reason}", file=sys.stderr)
        return 1

    created_at_raw = user.get("created_at")
    if not created_at_raw:
        print("GitHub response did not include created_at", file=sys.stderr)
        return 1

    created_at = datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    age = format_age(created_at, now)

    print(f"username: {user.get('login', args.username)}")
    print(f"created_at: {created_at_raw}")
    print(f"account_age: {age}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
