# Importer draft session comparison

Base: `d5a2712387fc53d95d39041c782472ca20d77afc`.
Source commit: `728d662ebad8455ebbbd28f9a98a70c5e560a716`.
Browser: Chromium 140.0.7339.16. All data is from the disposable integration seed.

Both runs use the same Imports scenarios. The base run uses an archive of main. Its runtime root permits the existing dependency links. Its cold-build waits are longer. No product source is changed in that archive.

| State                   | Full-size comparison          | Pixel result                                          |
| ----------------------- | ----------------------------- | ----------------------------------------------------- |
| Dashboard ready         | [Image](desktop-ready.png)    | Identical                                             |
| Non-Pro downloads       | [Image](desktop-non-pro.png)  | Identical                                             |
| Excluded source rows    | [Image](desktop-excluded.png) | Identical                                             |
| Phone dashboard ready   | [Image](mobile-ready.png)     | Identical                                             |
| Phone Non-Pro downloads | [Image](mobile-non-pro.png)   | Identical                                             |
| Public builder mapping  | [Image](public-mapping.png)   | Identical outside the Next development status control |

The raw public-builder images retain the Next development control. Main shows `Compiling`; the refactor shows its idle icon. The differing rectangle is x=1127..1278, y=892..976. No product pixels differ outside that rectangle.

The Imports run checks public preparation, dashboard handoff, reload, selection, 100-row batches, write failure/retry, duplicate prevention, source cells, builder exclusions, non-Pro download failure/retry, and refresh retry after a saved write without another write. The separate interruption test holds two real cultivar-match responses. It tests reload during the first match and clear during the second match, then checks that no draft returns and no listing is created.

These checks use local providers. They do not verify live Clerk, Stripe, or production. Injected failures produce expected HTTP 500 diagnostics. Next development navigation can log aborted requests. No uncaught browser error occurred in these Imports tests.
