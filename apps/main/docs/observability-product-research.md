# Observability and Product Research Runbook

Use this runbook to answer product questions with production evidence from
Daylily Catalog. It covers Sentry, PostHog, Google Search Console, Ahrefs, and
the VPS application and proxy logs.

Keep all access read-only unless a task explicitly calls for a configuration
change. Never paste API tokens, session cookies, or private keys into chat,
issues, pull requests, shell history, or tracked files.

## Start With the Question

| Question | Start here | Confirm with |
| --- | --- | --- |
| What are people doing in the product? | PostHog | server logs for the exact request or event |
| Where do users abandon onboarding or checkout? | PostHog funnel and event properties | Sentry errors around the same time |
| What is broken or slow for real users? | Sentry | VPS app logs and Caddy access logs |
| How are people finding the site from Google? | Search Console | Ahrefs for backlinks and competitor context |
| Is a page indexed and eligible for search? | Search Console | live page, robots.txt, sitemap, and HTTP headers |
| Is a crawl finding broken routes or SEO defects? | Ahrefs Site Audit | Search Console and a direct two-pass `curl` |
| Did a production deploy start cleanly? | VPS app logs | `/api/runtime-config`, Sentry, and container state |
| Is traffic reaching the origin or Cloudflare cache? | Caddy access logs | `cf-cache-status` from repeated public requests |

For product research, prefer a joined story over a single dashboard. A useful
sequence is:

1. Use Search Console or Ahrefs to find an acquisition opportunity.
2. Use PostHog to see what those visitors do after landing.
3. Use Sentry and server logs to rule out errors or latency as the explanation.
4. Inspect the real page in a browser before recommending a product change.
5. Record the date range, environment, route, event names, and filters with the
   conclusion so the research can be repeated.

## Current Production Surfaces

| Tool | Production target | Access |
| --- | --- | --- |
| Sentry | organization `makon-dev`, project `new-daylily-catalog` | Read-only personal token in macOS Keychain |
| PostHog | project ID `318446` | Codex PostHog connector or signed-in browser |
| Search Console | domain property `sc-domain:daylilycatalog.com` | Signed-in Chrome |
| Ahrefs | verified `daylilycatalog.com` project, ID `4376040` | Free signed-in browser account |
| App logs | Production Docker application container | Read-only SSH using private operator instructions |
| Proxy logs | Production reverse-proxy access logs | Read-only SSH using private operator instructions |

The live app exposes only public runtime observability configuration at:

```text
https://daylilycatalog.com/api/runtime-config
```

It should report Sentry and PostHog as enabled. The PostHog project key and
Sentry DSN are public client identifiers, not administrative API secrets.

## Sentry

Use Sentry for exceptions, failed requests, slow transactions, performance
issues, releases, and the exact URL or host associated with an event.

### Authentication

The read-only personal token has these scopes:

- `event:read`
- `org:read`
- `project:read`

It is stored in macOS Keychain as:

- service: `codex-sentry-readonly`
- account: `makon`

Load it at command execution time without printing it:

```sh
export SENTRY_AUTH_TOKEN="$(security find-generic-password \
  -a makon \
  -s codex-sentry-readonly \
  -w)"
```

Do not put this token in `.env.development`; that file may also be consumed by
application or build commands.

### Read-only issue query

The installed Sentry skill includes a deterministic API helper. Resolve its
installed path for the current Codex environment, then keep the global
arguments before the subcommand:

```sh
SENTRY_API="$HOME/.codex/plugins/cache/openai-curated-remote/sentry/0.1.2/skills/sentry/scripts/sentry_api.py"

SENTRY_AUTH_TOKEN="$(security find-generic-password \
  -a makon -s codex-sentry-readonly -w)" \
python3 "$SENTRY_API" \
  --org makon-dev \
  --project new-daylily-catalog \
  list-issues \
  --environment production \
  --time-range 24h \
  --limit 20 \
  --query "is:unresolved"
```

The plugin version in the path can change. If the file is missing, locate the
current helper under the installed Sentry plugin rather than copying the script
into this repository.

### Environments

New events are separated into:

- `production` for the VPS deployment
- `preview` for Vercel preview deployments
- `prod-like` for the local production-like Docker workflow

Events captured before this separation was deployed can still include
`*.deploy-preview.daylilycatalog.com` under `production`. For older events,
inspect the event URL or host before treating an issue as a live customer
problem.

## PostHog

Use PostHog for product behavior, funnels, paths, retention, Web Vitals,
session replay, and properties attached to known users or anonymous visitors.

The connected project currently receives events including:

- `$pageview`
- `$web_vitals`
- `$exception`
- `listing_page_viewed`
- `seller_landing_viewed`
- `seller_cta_clicked`
- `public_listing_contact_clicked`
- `onboarding_entry_viewed`
- `onboarding_step_viewed`
- `onboarding_step_completed`
- `onboarding_email_collected`
- `checkout_started`
- `checkout_redirect_ready`
- `first_listing_created`
- `first_image_uploaded`
- `public_isr_page_generated`

Always read the live PostHog schema before writing a query. Event names and
properties evolve, and a plausible name is not evidence that the app emitted
it.

For a product question:

1. Confirm the project and date range.
2. Read the event schema and property names.
3. Start with a narrow trend or small HogQL query.
4. Build a funnel only after confirming every step exists.
5. Break results down by route, referrer, device, or user state when useful.
6. Confirm surprising behavior with session replay or server-side evidence.

Internal operator observability intentionally retains email correlation where
the app emits it. Do not remove it during a general public-data privacy cleanup
unless the task explicitly changes that policy.

## Google Search Console

Use Search Console for Google search clicks, impressions, CTR, average
position, indexing, sitemap health, Core Web Vitals, HTTPS, robots.txt, and
structured-data reports.

The configured property is a verified domain property. The production sitemap
is:

```text
https://daylilycatalog.com/sitemap.xml
```

The sitemap is submitted successfully. Search Console UI access currently uses
the signed-in Chrome account. A browser login does not automatically create an
OAuth access token for the local Search Console API skill. Automated API pulls
would require a separate Google Cloud OAuth or service-account setup with
read-only Search Console access.

Current robots.txt reporting includes historical or secondary hosts such as
`app.daylilycatalog.com`, `images.daylilycatalog.com`, `dev.daylilycatalog.com`,
and `cf.daylilycatalog.com`. Separate failures on those hosts from the health of
the canonical `https://daylilycatalog.com/robots.txt` file.

For an SEO research pass, capture:

- current period versus previous period
- top queries and landing pages
- high-impression, low-CTR query/page pairs
- queries in positions 5-20
- mobile versus desktop differences
- important URLs that are not indexed
- sitemap and robots.txt status
- Product, Merchant listing, Breadcrumb, and Profile page enhancements

Search Console data normally lags current site behavior, so pair it with the
live page and current logs before attributing a change to a deployment.

## Ahrefs on the Free Plan

The API connector returns `Insufficient plan`, but the signed-in free browser
account remains useful. Do not buy a paid plan just to run routine research.

Available in the browser includes:

- the verified Daylily Catalog project
- existing Site Audit crawl results
- Domain Rating
- referring domains and backlink context
- limited organic traffic and keyword data
- free Ahrefs Web Analytics setup

Not available on the current free plan includes:

- Rank Tracker
- full API access
- fresh large crawls after monthly credits are exhausted

The saved Site Audit scope is intentionally narrow:

- keep the dashboard exclusion
- exclude `/search`
- exclude query-string crawl noise
- use website plus auto-detected sitemaps
- cap the crawl at 5,000 internal pages

Treat old crawl results as historical evidence, not current truth. For an old
bad URL, request it twice: the first request checks the current origin response;
the second checks whether Cloudflare warms to `HIT`.

## VPS Application Logs

Obtain the SSH target, application container name, and proxy log location from
the private operator instructions. Do not add production hostnames, IP
addresses, usernames, or server filesystem paths to this public repository.

The examples below use placeholders:

```sh
ssh <production-ssh-target>
```

Keep these checks read-only.

### Container status

```sh
docker ps --filter name=<application-container-filter>

docker inspect <application-container> \
  --format '{{.Config.Image}} {{.State.StartedAt}} {{.RestartCount}}'
```

### Recent application logs

```sh
docker logs --tail=200 <application-container>

docker logs --timestamps \
  --since '<UTC-timestamp>' \
  <application-container>
```

### Focused searches

```sh
docker logs --timestamps --since 24h <application-container> 2>&1 \
  | grep '"event":"image_moderation"'

docker logs --timestamps --since 24h <application-container> 2>&1 \
  | grep -iE 'error|exception|failed|fatal|unhandled'

docker logs --timestamps --since 24h <application-container> 2>&1 \
  | grep '"event":"observability_status"'
```

The `observability_status` startup record is the fastest way to confirm that
the running container accepted its Sentry and PostHog runtime configuration.

### Caddy access logs

```sh
tail -f <proxy-access-log>

grep '<production-domain>' <proxy-access-log>

zgrep '<production-domain>' <rotated-proxy-access-logs>
```

Use Caddy logs for request presence, status, method, route, user agent, and
timing. Use application logs for app context and Sentry for grouped failures.
Do not infer user behavior from bot traffic without checking the user agent and
request pattern.

## Production Triage Checklist

1. Write down the question, route, UTC window, and expected user behavior.
2. Confirm the live runtime config and container start/restart state.
3. Query PostHog for the behavior or funnel.
4. Query Sentry for matching errors or slow transactions.
5. Search app and Caddy logs using the same UTC window.
6. If acquisition or indexing is involved, check Search Console.
7. If crawl quality or backlinks are involved, check Ahrefs in Chrome.
8. Reproduce the visible flow in the real browser or deploy preview.
9. Save the filters, URLs, event names, and time range with the conclusion.

For deeper production-only reproduction, continue with
[`local-issue-debugging-runbook.md`](./local-issue-debugging-runbook.md). For
runtime environment and deployment ownership, see
[`deploy-vps.md`](./deploy-vps.md).
