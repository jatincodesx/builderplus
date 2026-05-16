# National Parcel/Cadastral Data Sources — Australia

Research findings for extending BuilderPlus from ACT-only to national parcel support.

## State/Territory Source Summary

| State | Provider | Service Type | Endpoint | Layer ID | Searchable Fields | Geometry | SR | Address Search | Suburb Search | Public Access | Status |
|-------|----------|-------------|----------|----------|-------------------|----------|-----|----------------|---------------|---------------|--------|
| ACT | ACTmapi | ArcGIS REST FeatureServer | https://data.actmapi.act.gov.au/arcgis/rest/services | Multiple (block, division, addresses) | DIVISION_NAME, ADDRESSES, FULL_ADDRESS | Polygon (4326) | 4326 | Yes (address layer) | Yes (division layer) | Yes — no auth | working |
| NSW | SIX Maps Cadastre | ArcGIS REST MapServer | https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer/9 | 9 (Lot) | planlabel, lotnumber, sectionnumber, plannumber, lotidstring | Polygon (3857 → outSR=4326) | 3857 | No (address layer requires auth) | Yes (via NSW_Administrative_Boundaries/MapServer/0 — suburbname field) | Yes — no auth for cadastre | working |
| NSW | SIX Maps Suburbs | ArcGIS REST MapServer | https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Administrative_Boundaries/MapServer/0 | 0 (Suburb) | suburbname, postcode | Polygon (3857 → outSR=4326) | 3857 | N/A | Yes | Yes — no auth | working |
| VIC | Land Victoria / Data.Vic | ArcGIS REST (requires endpoint) | Set VIC_CADASTRE_URL | TBD | TBD | TBD | TBD | Only if endpoint provides address fields | Only if endpoint provides locality fields | Restricted — most endpoints require auth/token | stub |
| QLD | QSpatial / DNRME | ArcGIS REST (intermittent) | https://gisservices.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/Cadastre/MapServer/0 | 0 | TBD | TBD | TBD | Only if endpoint provides address fields | Only if endpoint provides locality fields | Unreliable — endpoint currently unreachable | stub |
| SA | Location SA | ArcGIS REST (requires auth) | Set SA_CADASTRE_URL | TBD | TBD | TBD | TBD | Only if endpoint provides address fields | Only if endpoint provides locality fields | Restricted — requires SA government account | stub |
| WA | SLIP (Landgate) | ArcGIS REST / WFS | Set WA_CADASTRE_URL | TBD | TBD | TBD | TBD | Only if endpoint provides address fields | Only if endpoint provides locality fields | Restricted — requires SLIP account (free tier available) | stub |
| TAS | theLIST (DPIPWE) | ArcGIS REST MapServer | https://services.thelist.tas.gov.au/arcgis/rest/services/Public/CadastreParcels/MapServer/0 | 0 (Cadastral Parcels) | PID, VOLUME, FOLIO, PROP_ADD, PROP_NAME, CAD_TYPE1, CAD_TYPE2, TENURE_TY, FEAT_NAME | Polygon (3857 → outSR=4326) | 3857 | Yes (PROP_ADD field on parcels) | Yes (derived from parcel PROP_ADD locality) | Yes — public, no auth, supports geoJSON | working |
| NT | NT Geoserver | GeoServer WFS/WMS (unreachable) | Set NT_CADASTRE_URL | TBD | TBD | TBD | TBD | No | No | Unreliable — endpoint often unreachable | stub |

## Detailed Findings

### ACT — ACTmapi ArcGIS FeatureServer
- **Status**: working (fully implemented)
- **Endpoints**: Block, Division, Addresses FeatureServer layers
- **Auth**: None required
- **SR**: WGS84 (4326)
- **Address search**: Full support via dedicated address layer
- **Suburb search**: Full support via dedicated division layer
- **MaxRecordCount**: Varies by layer

### NSW — SIX Maps Cadastre
- **Status**: working (parcel + suburb; no address)
- **Parcel endpoint**: `https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer/9`
  - Layer 9 = Lot (esriGeometryPolygon)
  - Fields: `objectid`, `cadid`, `plannumber`, `planlabel`, `lotnumber`, `sectionnumber`, `planlotarea`, `planlotareaunits`, `lotidstring`, `urbanity`, `classsubtype`, `shape_Area`, `shape_Length`
  - MaxRecordCount: 1000
  - Supports: JSON, AMF, geoJSON
  - SR: Web Mercator (3857) — must specify `outSR=4326`
- **Suburb endpoint**: `https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Administrative_Boundaries/MapServer/0`
  - Layer 0 = Suburb (esriGeometryPolygon)
  - Fields: `rid`, `suburbname`, `postcode`, `state`
  - MaxRecordCount: 1000
  - SR: Web Mercator (3857) — must specify `outSR=4326`
- **Address search**: No confirmed public address API. Geocoded addressing layer exists but requires authentication.
- **Fallback**: Search suburb + parcel click; manual draw

### VIC — Land Victoria / Data.Vic
- **Status**: stub (requires endpoint confirmation)
- **Portal**: LASSI (https://maps.land.vic.gov.au/lvwebservice/) — interactive portal, not a queryable API
- **Vicmap Property**: The authoritative parcel dataset, available via:
  - Data.Vic open data portal (bulk download, not API)
  - City of Melbourne open data (property-boundaries dataset, limited to Melbourne LGA)
- **No confirmed public ArcGIS/WFS endpoint** for statewide parcel queries without authentication
- **Implementation**: Full ArcGIS provider code — activates when `VIC_CADASTRE_URL` is set to a validated endpoint
- **Fallback**: Manual draw

### QLD — QSpatial / DNRME
- **Status**: stub (endpoint intermittently available)
- **Known endpoints**:
  - `https://gisservices.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/Cadastre/MapServer/0` — currently unreachable
  - `https://openmaps-nrde.qld.gov.au/arcgis/rest/services/PlanningCadastre/Cadastre/MapServer` — currently unreachable
- **Implementation**: Full ArcGIS provider code — activates when `QLD_CADASTRE_URL` is set to a validated endpoint
- **Fallback**: Manual draw

### SA — Location SA / SA Data
- **Status**: stub (requires authentication)
- **Known endpoint**: `https://location.sadata.sa.gov.au/arcgis/rest/services/PlanningCadastre/Cadastre/MapServer` — currently unreachable without authentication
- **Implementation**: Full ArcGIS provider code — activates when `SA_CADASTRE_URL` is set to a validated endpoint
- **Fallback**: Manual draw

### WA — SLIP (Shared Location Information Platform)
- **Status**: stub (requires SLIP account)
- **Portal**: `https://services.slip.wa.gov.au/public/services`
- **Access**: Requires free SLIP account registration
- **Implementation**: Full ArcGIS provider code — activates when `WA_CADASTRE_URL` is set to a validated endpoint
- **Fallback**: Manual draw

### TAS — theLIST (DPIPWE)
- **Status**: working (address + suburb + parcel)
- **Endpoint**: `https://services.thelist.tas.gov.au/arcgis/rest/services/Public/CadastreParcels/MapServer/0`
  - Layer 0 = Cadastral Parcels (esriGeometryPolygon)
  - Fields: `OBJECTID`, `CID`, `VOLUME`, `FOLIO`, `PID`, `POT_PID`, `LPI`, `CAD_TYPE1`, `CAD_TYPE2`, `TENURE_TY`, `FEAT_NAME`, `STRATA_LEV`, `COMP_AREA`, `MEAS_AREA`, `PROP_NAME`, `PROP_ADD`, `PROP_ADD1`, `PROP_ADD2`, `PROP_ADD3`
  - MaxRecordCount: 2000
  - Supports: JSON, geoJSON
  - SR: Web Mercator (3857) — must request `outSR=4326`
- **Address search**: `PROP_ADD` field on parcels enables text-based address search directly on the parcel layer
- **Suburb search**: Derived from parcel PROP_ADD locality grouping
- **Auth**: None required

### NT — NT Geoserver
- **Status**: stub (endpoint unreachable)
- **Known endpoint**: `https://geoserver-geospatial.nt.gov.au/geoserver/` — currently unreachable
- **Implementation**: Full ArcGIS provider code — activates when `NT_CADASTRE_URL` is set to a validated endpoint
- **Fallback**: Manual draw (recommended)

## Provider Implementation Status

| Jurisdiction | Address Search | Suburb Search | Parcel by Point | Parcels by Suburb | Parcels by Bbox | Manual Draw | Provider Status |
|-------------|---------------|--------------|----------------|-------------------|----------------|-------------|----------------|
| ACT | Yes | Yes | Yes | Yes | Yes | Yes | working |
| NSW | No (auth required) | Yes (suburb boundary layer) | Yes | Yes | Yes | Yes | working |
| TAS | Yes (PROP_ADD) | Yes | Yes | Yes | Yes | Yes | working |
| VIC | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | Yes | stub |
| QLD | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | Yes | stub |
| SA | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | Yes | stub |
| WA | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | Yes | stub |
| NT | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | If endpoint configured | Yes | stub |

## Architecture

All providers implement the `ParcelProvider` interface:
- `searchAddress(query)` — text search for addresses
- `searchSuburb(query)` — text search for suburbs/localities
- `getParcelByPoint(lat, lng)` — spatial query for parcel containing point
- `getParcelsBySuburb(division)` — attribute query for parcels in a suburb
- `getParcelsByBbox(bbox)` — spatial query for parcels in a bounding box
- `getStatus()` — returns provider health and capability info

All providers normalise raw fields into `ParcelProperties`:
- id, block, section, division, areaSqm, zone, classification, selectable, address, source, jurisdiction, rawProperties

Shared utilities in `lib/parcels/arcgisShared.ts`:
- `queryArcgisByPoint`, `queryArcgisByBbox`, `searchArcgisTextFields`
- `fetchMetadata`, `fetchArcgisGeoJson`, `featuresFromResponse`
- `buildLikeWhere`, `buildEqualsWhere`, `attrString`, `attrValue`
- `findLikelyFields`, `existingFields`, `uniqueFields`
- `safeNumber`, `safeString`, `normaliseArcgisCentroid`

## Key Risks
- ArcGIS MapServer endpoints (NSW, TAS) use Web Mercator (3857) — must specify `outSR=4326` and test that geoJSON output is actually in 4326
- MapServer layers (not FeatureServer) may have limited query capabilities compared to ACT's FeatureServer
- Rate limiting / IP blocking is possible with repeated automated queries
- Government endpoints can change or be deprecated without notice
- All non-ACT providers are "best effort" — manual draw must remain the universal fallback
- NSW has no locality/division field on the Lot layer itself — suburb boundaries must be queried from the separate administrative boundaries service
- QLD/SA/WA/NT providers require endpoint confirmation before they can be marked as working
