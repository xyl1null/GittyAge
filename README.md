# GittyAge

Check when a GitHub account was created.

## GitHub Pages

Open `index.html` through GitHub Pages. The page calls GitHub's public REST API from the browser and does not use or store a token.

Unauthenticated browser requests share GitHub's public API rate limit for the source IP. If that limit is exhausted, wait for the reset time shown by the page.

## CLI

```bash
python3 github_user_registered_time.py octocat
```

For higher local rate limits, pass a token through the environment:

```bash
GITHUB_TOKEN=... python3 github_user_registered_time.py octocat
```

Do not commit personal access tokens or `.env` files.
