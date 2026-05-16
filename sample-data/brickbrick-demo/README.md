# BuilderPlus BrickBrick Demo Catalogue

This directory contains a synthetic BuilderPlus house design catalogue for testing a future BrickBrick-style floor plan data source. The records are realistic demo data only and do not use copyrighted builder imagery.

## Contents

- `designs.json` - 12 `HouseDesign` records matching the BuilderPlus type.
- `images/` - generated SVG thumbnail, facade, and floor plan placeholders for each design.
- `s3-manifest.json` - upload manifest for the S3 demo catalogue.

## Browser catalogue URL

After upload, set `NEXT_PUBLIC_DESIGN_CATALOGUE_URL` to the public S3 URL for `brickbrick-demo/designs.json`. If the env var is empty, BuilderPlus keeps using the existing local demo catalogue.
