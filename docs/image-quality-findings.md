# Image URL Quality Findings

Date: 2026-02-12

## Scope
This note documents why hover-image previews looked low quality. No scraper behavior was changed.

## What We Verified
- The scraper stores image URLs exactly as returned by eBay Browse search results.
- In `src/ebay_watchlist/ebay/api.py`, `parse_items()` reads `image.imageUrl` from each item summary.
- In `src/ebay_watchlist/db/repositories.py`, that value is persisted directly to `item.image_url`.
- There is no application-side resize/downscale step.

## Database Evidence
A check of existing data showed stored image URLs are thumbnail-sized:
- `COUNT(image_url)` with value: `359`
- Sample suffix pattern: `/s-l225.jpg`
- Distinct suffix count query returned only `/s-l225.jpg` in current rows.

## eBay API Evidence
- Browse `search` / item summary examples commonly provide `imageUrl` values like `.../s-l225.jpg`.
- Browse item-detail responses (`getItem`) can include larger image assets (for example `s-l1600`-style URLs in docs/examples).

## Conclusion
The low resolution is upstream from the currently used summary endpoint payload, not from our code.

## Implication
If higher-resolution previews are needed later, we likely need one of:
- an additional item-detail fetch path, or
- a validated image-URL upgrade strategy.

No code change was made in this branch for scraper/image ingestion.
