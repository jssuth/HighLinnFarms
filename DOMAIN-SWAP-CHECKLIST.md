# Domain Swap Checklist — new.highlinnfarms.com → highlinnfarms.com

_Reference notes for moving the site from the subdomain to the bare root domain.
Prepared 2026-05-23. No site files have been changed by this document._

## Goal

The site currently serves from the subdomain **new.highlinnfarms.com**. The goal is
to have it serve from the bare root domain **highlinnfarms.com**.

## Key finding: the code is already swap-ready

A full scan of the repo found that the SEO / sharing references already point at the
bare domain, so they need **no change** for the swap:

- `og:url` and `og:image` meta tags on all pages
- `sitemap.xml` (all URLs)
- the `Sitemap:` line in `robots.txt`
- the `_redirect` hidden field in `contact.html`
- footer `mailto:` links and the CSS print-footer text

The **only** place the old subdomain is hardcoded is the deploy path in `.cpanel.yml`:

```
export DEPLOYPATH=/home/highli31/new.highlinnfarms.com/
```

When the root domain serves the site, this path changes to the root domain's document
root (most likely `/home/highli31/public_html/`, but confirm in cPanel first).

There are currently **no `<link rel="canonical">` tags** anywhere on the site. Adding
them (pointing at the bare domain) is optional and not required for the swap.

## Why this is the easy case: zero prior visitors

With essentially no prior visitors and no search-engine history on the subdomain,
there is no SEO value or inbound links to preserve. That means you can keep the move
simple — point the root domain at the site, redirect the old subdomain as cheap
insurance, and skip any careful SEO migration.

## cPanel / InMotion steps

1. In cPanel, confirm the **document root** for `highlinnfarms.com`
   (most likely `/home/highli31/public_html/`). Write down the exact path.
2. Make sure **DNS** for `highlinnfarms.com` (and `www`) points to the InMotion
   server's IP. If the domain is managed at a registrar, set it there.
3. Confirm `highlinnfarms.com` is set as the **primary domain** serving from that
   document root.
4. Update **`DEPLOYPATH` in `.cpanel.yml`** to the confirmed path, then push so deploys
   land in the right folder. (This is the one repo edit needed.)
5. Issue / verify the **SSL certificate** (AutoSSL / Let's Encrypt) covering both
   `highlinnfarms.com` and `www.highlinnfarms.com`.
6. Load `https://highlinnfarms.com` and click through **every page** — confirm images,
   the weather widget, the Properties lightbox, the seasonal viewer, and Farm Talk all
   work.
7. In **cPanel → Redirects**, add a permanent **301** redirect from
   `new.highlinnfarms.com` → `https://highlinnfarms.com`.
8. Decide whether to **keep** the now-redirecting subdomain or **retire** it
   (either is fine).
9. Check that **`www` and non-`www`** both resolve consistently.

## Optional, later

- Add `<link rel="canonical">` tags (bare domain) across all pages for cleaner future
  indexing.
- Submit `sitemap.xml` in Google Search Console once you want the site indexed.

## The one repo edit, for reference

In `.cpanel.yml`, line 4:

```
# current
- export DEPLOYPATH=/home/highli31/new.highlinnfarms.com/

# after the swap (confirm the exact path in cPanel first)
- export DEPLOYPATH=/home/highli31/public_html/
```
