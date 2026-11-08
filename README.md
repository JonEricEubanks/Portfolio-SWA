# JonEric Eubanks — Portfolio

Personal portfolio showcasing production AI agents, Power Platform apps, Power BI dashboards, and GIS visualizations built for governments and organizations.

**Live site:** https://happy-tree-026e2110f.7.azurestaticapps.net/

This repository is the deployment source for Azure Static Web Apps. It has a
separate history from the `JonEricEubanks/Portfolio` source repository.

## Highlights

- **CivicGrant IQ** (June 2026) — Best IQ Agent, Microsoft Agents League. Five-agent system that rose from a field of ~5,000 contestants and turns federal NOFOs into traceable municipal pursuit decisions.
- **CivicLens** (April 2026) — Grand Prize winner.
- **MAINTAIN AI & Kaizen AI** (February 2026) — Production AI agent builds.
- **ELM (Employment Lifecycle Management)** (March 2025) — Best in Automation, Microsoft.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Main portfolio page (hero award carousel, projects, dashboards, GIS, certs) |
| `career-timeline.html` | Chronological career timeline and awards |
| `chat.html` / `chat.js` | "Ask the AI" chat experience |
| `style.css` | Main stylesheet |
| `intro-fix.css` | Intro curtain/logo animation styles |
| `blog.js` / `blog-styles.css` | Blog section |
| `api/` | Azure Functions API (auth, chat, posts, likes, comments, image upload) |
| `Images/` | Screenshots and assets |

## GitHub Actions and deployment

The [Azure deployment workflow](.github/workflows/azure-static-web-apps-happy-tree-026e2110f.yml)
calls the shared [Portfolio checks workflow](.github/workflows/portfolio-checks.yml)
before deploying. The checks install the locked site and API dependencies and
run the Jest suite, including credential and published-writing tests.

- A pull request to `main` runs the tests and, only if they pass, deploys an
  Azure preview. Runs for the same pull request are serialized, and its state
  is checked before deployment. After every pull-request run, including failed
  or skipped tests and deployments, the workflow checks its current state and
  removes the preview if it is closed. This also handles a pending close run
  being replaced by a re-run of an older workflow.
- A push to `main` runs the same tests and, only if they pass, deploys the site
  root and `api/` Azure Functions to production. If tests fail, the previous
  production deployment remains live.
- Portfolio checks can also be started manually from the GitHub Actions tab.

For portfolio updates:

1. Make the requested changes on a branch and run the local checks below.
2. Open a pull request in **JonEricEubanks/Portfolio-SWA**. Wait for
   **Validate portfolio / Portfolio tests** and the Azure preview deployment
   to pass, then inspect the preview.
3. Merge only when production publication is authorized, and verify the
   [live site](https://happy-tree-026e2110f.7.azurestaticapps.net/).
4. Reconcile the separate **JonEricEubanks/Portfolio** source repository when
   safe. Its pushes do not automatically update this repository, and its
   independent Vercel integration may still deploy on push. Do not trigger
   that integration without the user's approval.

For certifications, verify the official name and link, add the screenshot,
keep the displayed count and relevant timeline/chat content in sync, and
update the tests. For published articles, verify the title, author, date, and
URL; update the writing card, `blog-data/external-posts.json`, image, timeline
when applicable, and tests. When removing a credential, remove the requested
claim from the relevant page, timeline, chat context, and résumé only as
authorized; preserve unrelated credentials and existing profile links.

GitHub Actions runs these checks and deployments; it does not author portfolio
changes or disconnect independent integrations. Branch protection must be
configured separately if passing checks should also be required for merging.

When changing `style.css` or other assets, bump the cache-busting query string in `index.html` (e.g. `style.css?v=YYYYMMDD`) so browsers pick up the new version.

## Local development

On a clean checkout, install both dependency sets and run the same tests as GitHub Actions:

```powershell
npm ci
npm ci --prefix api
npm test -- --runInBand
```

Open `index.html` directly in a browser, or serve the folder with any static server. The `api/` folder runs locally with Azure Functions Core Tools (`func start`).
