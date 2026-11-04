# Lá Cashback — approved botanical concept

Implement the desktop and mobile image approved in chat: forest charcoal, pale lime, clear link composer, unified wallet summary, photographic discovery categories, recent real orders. Preserve demo disclosure and real API values; unknown cashback remains unknown. Product photography is illustrative, generated with ImageGen, and carries no advertised rate or price.

Reuse existing React components, API workflows, light/dark tokens and navigation. Home styles are in src/redesign.css. Desktop sidebar is 216px, home content uses a 2:1 discovery/orders split. Mobile uses five primary bottom destinations, a full-width action, two-column discovery, and stacks recent orders. Admin access remains available when authenticated as admin.

Brand requirements override generic style rules: forest-tinted dark surfaces, lime action and botanical leaf. The large two-line shopping heading belongs to the public landing page at `/`. The application at `/app` uses short, functional titles and keeps the composer and filters near the top. Older `/#…` links still open the corresponding app pages. Use visible focus, 44px primary touch targets and reduced-motion support. No animation library is needed.

Theme switching lives in the topbar next to the notifications and avatar at all widths. Copyright and demo version belong to the page footer after its content, never in the sidebar.

## Community and wide-screen extension

Match the functional categories visible in the user's Monback screenshots, without importing their artwork, copy, red palette, or narrow mobile-width desktop column. Keep Lá's existing components and colors. No React Bits or GSAP needed for these data screens.

Primary task: paste a shopping link and follow its order. Secondary objects: saved tracking links, editorial posts, likes, daily check-ins, points, referrals, opt-in ranking and support tickets. Money stays in the existing ledger; experience points are a separate database table and are never money.

Use a centered canvas up to 1760px. At 1700px+ viewport, home splits composer/discovery and wallet/community in a 2:1 grid. At laptop widths, wallet returns to a horizontal strip. Account overview uses three logical groups; feed uses two readable article columns and a contextual rail. Collapse into one column on mobile. Keep five primary bottom destinations; admin access is in the account page. Desktop navigation scrolls when viewport height is short.

Check-ins: 10 experience points per Vietnam calendar day; tiers at 0/100/500. Public demonstration code LACHAMBAO grants 100 points once per user. These are Lá demo rules, not claims about Monback. Referrals record one inviter per account with no monetary bonus. Ranking shows only opted-in aliases and currently approved order cashback, grouped by last reconciliation update within the selected calendar period. Do not fabricate a populated ranking.
