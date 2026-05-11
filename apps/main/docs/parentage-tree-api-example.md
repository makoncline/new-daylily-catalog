# Parentage Tree API Example

This is a local example from the generated public search index plus the separate
generated parentage index. It shows how an agent could search for a recent blue
daylily, then follow linked parent cultivars as a small family tree.

Example query:

```txt
/api/v1/cultivars/search?cultivarName=Ebleuissant&limit=1&listingLimit=0
```

## Result

- [Ebleuissant](https://dev.daylilycatalog.com/cultivar/ebleuissant)
  - Year: 2026
  - Hybridizer: Michel Goulet
  - Color: Soft orange with a large blue eyezone with purple outline, white
    midribs, a small yellow throat and a green heart, double blue and purple
    edging on sepals and petals.
  - Raw parentage: `((Dragonfly Dawn x The Fantastic Barbara Watts) × (Stenciled Infusion x Yoga Man))`

## Parsed Parentage Tree

```txt
Ebleuissant
├─ cross
│  ├─ Dragonfly Dawn
│  │  └─ exact match: https://dev.daylilycatalog.com/cultivar/dragonfly-dawn
│  └─ The Fantastic Barbara Watts
│     └─ exact match: https://dev.daylilycatalog.com/cultivar/the-fantastic-barbara-watts
└─ cross
   ├─ Stenciled Infusion
   │  └─ exact match: https://dev.daylilycatalog.com/cultivar/stenciled-infusion
   └─ Yoga Man
      └─ exact match: https://dev.daylilycatalog.com/cultivar/yoga-man
```

## Why This Looks Useful

The API can now preserve the raw AHS parentage text while also providing a
structured tree. Each leaf can be linked with a confidence signal:

- `exact`: normalized parent text matched a known cultivar reference.
- `cleaned-exact`: matched after cleanup such as removing `Tet.`.
- `fuzzy`: close match, useful for typos and minor spelling drift.
- `ambiguous`: multiple plausible close matches; do not hard-link.
- `placeholder`: values like `sdlg`, `sdg`, or `unknown`.
- `none`: no useful match.

The parentage index is generated separately from the core cultivar/listing search
index. Core search can refresh frequently, while parentage can use a much longer
stale window because the underlying cultivar reference data changes rarely.
