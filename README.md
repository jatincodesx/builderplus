# BuilderPlus

BuilderPlus is a production-quality MVP foundation for selecting ACT residential blocks, starting with Canberra. It gives users a premium map-first flow for searching ACT suburbs or addresses, zooming to the location, hovering parcels, selecting a block, and reviewing early plot details.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

BuilderPlus uses Leaflet + React Leaflet, so no Mapbox token is required.
For development it uses configurable OSM-compatible map tiles plus an optional
satellite basemap. Close zoom levels can auto-switch to satellite so block-scale
work is easier to read. Do not bulk download tiles, prefetch large areas, or
otherwise abuse public tile infrastructure. Production can switch to CARTO,
Stadia, MapTiler, Protomaps, or self-hosted tiles by changing
`lib/mapConfig.ts` or these optional environment variables:

```bash
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_TILE_ATTRIBUTION=© OpenStreetMap contributors
NEXT_PUBLIC_SATELLITE_TILE_URL=https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
NEXT_PUBLIC_SATELLITE_TILE_ATTRIBUTION=Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community
```

## ACTmapi Configuration

The frontend only calls local API routes under `app/api`. ACTmapi service URLs stay server-side and can be added in `.env.local`:

```bash
ACTMAPI_BLOCK_URL=https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_BLOCKS/FeatureServer/0
ACTMAPI_DIVISION_URL=
ACTMAPI_ADDRESSES_URL=
```

Required conceptual datasets:

- `ACTGOV DIVISION`: suburb/division boundaries and names for suburb search and map zooming.
- `ACTGOV BLOCK`: land parcel/block polygons for hover, click and selected-plot geometry.
- `ACTGOV ADDRESSES`: authoritative ACT address points for address search and point-to-block lookup.

The map, tile and parcel style config lives in `lib/mapConfig.ts`, and ACTmapi access is isolated in `lib/actmapi.ts`. Replace the placeholder URLs with ACTmapi or ACT Geospatial Data Catalogue FeatureServer layer endpoints without changing UI components.

To verify live data:

1. Add `ACTMAPI_BLOCK_URL` to `.env.local` using the `ACTGOV_BLOCKS` URL shown above.
2. Add `ACTMAPI_DIVISION_URL` and `ACTMAPI_ADDRESSES_URL` once copied from the ACT Geospatial Data Catalogue.
3. Restart the dev server after changing `.env.local`.
4. Open [http://localhost:3000/api/debug/actmapi](http://localhost:3000/api/debug/actmapi) and confirm the block service metadata, field names and sample attributes are returned.
5. Test suburb search and parcel selection in the app.

## Mock Data

The app includes clearly labelled mock ACT suburb, address and parcel data in `lib/mockData.ts` for Denman Prospect, Coombs and Whitlam. If a live ACTmapi URL is missing, a request fails, or the block query returns no matching features, only that feature area falls back to this data so the UI remains testable.

In non-production mode, the app shows the specific fallback reason when fallback parcel data is active.

## Plot Tools

Selected blocks support an approximate floor plan overlay. Upload a JPG or PNG
from the selected plot panel, then drag, scale, rotate, adjust opacity, reset,
lock or remove it with the floating overlay controls. The overlay is visual only
and is not surveyed or approval-ready.

If ACTmapi does not return a block, use **Draw plot manually** from the search
panel. Click four corners on the map, drag corner markers to refine the outline,
then confirm the user-drawn plot. Manual plots are labelled as user drawn, shown
with a dashed amber/cyan outline, and calculate an approximate area in square
metres. They are not official ACT cadastral boundaries.

## Structure

```text
app/
  api/
    search-suburb/route.ts
    search-address/route.ts
    debug/actmapi/route.ts
    parcels/by-suburb/route.ts
    parcels/by-point/route.ts
    parcels/by-bbox/route.ts
  page.tsx
components/
  BasemapToggle.tsx
  BuilderPlusMap.tsx
  FloorPlanControls.tsx
  FloorPlanOverlay.tsx
  FloorPlanUploadButton.tsx
  ManualPlotDrawControl.tsx
  SearchPanel.tsx
  SelectedPlotPanel.tsx
  ParcelTooltip.tsx
  Stepper.tsx
  ACTOnlyNotice.tsx
lib/
  actmapi.ts
  mapConfig.ts
  geojson.ts
  mockData.ts
  geometry.ts
types/
  floorPlan.ts
  geo.ts
  manualPlot.ts
  parcel.ts
  search.ts
```

## Current Scope

This MVP implements the plot search/select foundation, basemap switching,
approximate image overlays and a manual four-point plot fallback. Zoning checks,
setbacks, surveyed placement, saved projects and enquiry flows are intentionally
out of scope for this iteration.
