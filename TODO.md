# TODO

## AWS / CDN follow-ups

- [ ] **Custom domain for CloudFront** — `cdn.fresclean.com`
  - Request ACM cert in `us-east-1` (CloudFront requirement, not `ap-southeast-3`)
  - Validate cert via DNS (CNAME at registrar)
  - Attach cert + alternate domain name to distribution `d3jemt9o5eygkv`
  - Add DNS CNAME: `cdn.fresclean.com` → `d3jemt9o5eygkv.cloudfront.net`
  - Swap `CDN_BASE_URL` in `packages/server/.env` to `https://cdn.fresclean.com`
  - ~20 min total

- [ ] **Billing budget alert** — protect against surprise charges
  - Console → Billing → Budgets → Create budget
  - Monthly cost budget, $10 USD threshold
  - Email alert at 80% actual + 100% forecasted

- [ ] **Enable MFA on AWS root account** — security baseline
  - IAM → Security credentials → Assign MFA device
  - Use authenticator app (1Password, Authy, etc.)

- [ ] **Prod environment separation** — decide strategy
  - Option A: separate bucket + distribution per env (cleanest)
  - Option B: single bucket with `dev/` / `prod/` key prefixes (cheaper, simpler)
  - Recommendation: Option A for prod isolation

## UI/UX — remaining after `feat/uiux-foundational-fixes`

Most PR #19 smoke-test items and full-app-scan items were closed on branch
`feat/uiux-foundational-fixes` (commits `159089b..5205d27`). The items below
are what's still open — either deferred, partially covered, or flagged for
verification rather than a code change.

### Deferred — primary UI

- [ ] **Transactions POS breaks at md/lg viewports** — Store/services panel +
  product grid + cart summary all fight for ~600px of content width minus
  sidebar. Service tab labels truncate to "Deep C…", store header to
  "KMG - Fresclean…", search placeholder cut to "Search service…". The
  cashier flow is Fresclean's primary UI — any responsive rework needs a
  paired design pass (sticky bottom sheet cart under `lg`, or panel+grid
  stacked above cart under `md`) before touching the layout. File:
  `packages/web/src/routes/_admin/transactions.tsx`.

### Pending — not yet addressed

- [ ] **Order detail page has large vertical gaps on mobile** — the stats /
  customer / totals 3-column grid stacks with whitespace between cards
  because of desktop-first grid spans. Verify `grid-cols-*` + `gap-*` reduce
  cleanly and trailing margins don't accumulate. File:
  `packages/web/src/routes/_admin/orders.$orderId.tsx`.
- [ ] **Users list has no filters or search** — customers got a search box in
  the foundational-fixes branch; users still has none. Match the customers
  pattern (name / username / role). File:
  `packages/web/src/routes/_admin/users.tsx`.
- [ ] **Long emails truncate without a tooltip on `/users`** — customers now
  carries a `title` attribute on the email cell but users doesn't. Mirror
  the customers fix so hovering the cell reveals the full address.

### Verify (likely already correct)

- [ ] **Error / 404 pages center vertically** — `global-error-page.tsx` and
  `not-found-page.tsx` already wrap the card in
  `grid min-h-dvh place-items-center bg-background`, so in a real browser
  the card should sit centered. The earlier screenshot that looked
  off-center was the MCP full-page capture, not the rendered viewport.
  Re-verify by opening `/login` (redirects) and `/orders/0` (500) at a
  real mobile viewport before closing the item.
- [ ] **Sidebar nav overflow on short viewports** — `SidebarContent` already
  has `flex-1 min-h-0 overflow-auto`, so nav items should scroll under the
  footer naturally. The earlier clipping was the duplicate floating
  trigger (fixed in commit `159089b`). Re-verify at `height ≤ 660px` that
  the footer never steals nav space.
