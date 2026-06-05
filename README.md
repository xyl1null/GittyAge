# GittyAge

Check when a GitHub account was created.

## GitHub Pages

Open `index.html` through GitHub Pages. The page calls GitHub's public REST API from the browser and does not use or store a token.

The page supports English and Chinese. Use the globe button in the top-right corner to switch languages.

The account age result defaults to days. Use the small trailing conversion icon to switch it to approximate years.

Project structure:
- `index.html` for the page shell
- `assets/css/style.css` for styling
- `assets/js/app.js` for browser logic

Unauthenticated browser requests share GitHub's public API rate limit for the source IP. If that limit is exhausted, wait for the reset time shown by the page. If you are using a proxy or VPN, turn it off or switch networks and try again.

## CLI

```bash
python3 github_user_registered_time.py octocat
```

For higher local rate limits, pass a token through the environment:

```bash
GITHUB_TOKEN=... python3 github_user_registered_time.py octocat
```

Do not commit personal access tokens or `.env` files.
