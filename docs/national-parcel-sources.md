# National Parcel/Cadastral Data Sources — Australia

Research findings for extending BuilderPlus from ACT-only to national parcel support.

## State/Territory Source Summary

| State | Provider | Service Type | Parcel Geometry | Address Search | Public Access | Reliability | Limitations |
|-------|----------|-------------|-----------------|----------------|---------------|-------------|-------------|
| ACT | ACTmapi (ACT Government) | ArcGIS REST FeatureServer | Yes (polygons) | Yes (address points, block addresses) | Yes — no auth | High | Already implemented |
| NSW | SIX Maps (DFSIs Spatial Services) | ArcGIS REST MapServer | Yes (Lot layer, polygons) | Limited (address layer exists but may require auth) | Partial — cadastre Lot layer is public, addressing may need token | Medium-High | Web Mercator (3857) SR; MapServer (not FeatureServer) so query support varies; no direct address search without auth |
| VIC | Land Victoria (LASSI / Data.Vic) | WFS / ArcGIS REST (limited) | Yes (Vicmap Property parcels) | Limited public API | Restricted — most endpoints require auth/token | Low-Medium | LASSI is a portal, not an open API; Vicmap API requires login; City of Melbourne has open data but limited to LGA |
| QLD | QSpatial / DNRME | ArcGIS REST (intermittent) | Yes (Cadastre layer) | Limited | Unreliable — endpoint availability varies widely | Low | Public endpoints are not consistently available; may require QGIS plugin or portal login |
| SA | SA Data (Location SA) | ArcGIS REST (may require auth) | Yes (Cadastre layer) | Limited | Unreliable — services frequently require authentication | Low | Public access has been tightened; may need SA government account |
| WA | SLIP (Shared Location Information Platform) | ArcGIS REST / WFS | Yes (Cadastre layer) | Limited | Restricted — requires SLIP account (free tier available) | Low-Medium | Free tier exists but requires registration; some layers are open via WFS |
| TAS | theLIST (DPIPWE) | ArcGIS REST MapServer | Yes (Cadastral Parcels, polygons with address) | Yes (PROP_ADD field on parcel) | Yes — public, no auth, supports geoJSON | High | Best public source outside ACT; includes property address directly on parcel features; Web Mercator (3857) |
| NT | NT Geoserver (DPIR) | GeoServer WFS/WMS | Yes (Cadastre parcels) | No public address API | Unreliable — endpoint often unreachable | Very Low | Geoserver intermittently available; no public address search; manual draw is the only reliable option |

## Detailed Findings

### ACT — ACTmapi ArcGIS FeatureServer
- **Confirmed working**: Already implemented in BuilderPlus.
- **Endpoints**: Block, Division, Addresses FeatureServer layers.
- **Auth**: None required.
- **SR**: WGS84 (4326).
- **Address search**: Full support via dedicated address layer.

### NSW — SIX Maps Cadastre
- **Endpoint**: `https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer`
- **Lot layer**: ID 9, `esriGeometryPolygon`, supports geoJSON queries.
- **Fields**: `planlabel`, `lotnumber`, `sectionnumber`, `plannumber`, `planlotarea`, `shape_Area`.
- **Auth**: None for cadastre; address layer requires token.
- **SR**: Web Mercator (3857) — must transform to 4326 via `outSR=4326`.
- **MaxRecordCount**: 1000.
- **Address search**: No confirmed public address API. Geocoded addressing layer exists but requires authentication. Fallback: G-NAF (not publicly queryable).
- **Reliability**: Medium-High for parcel geometry; Low for address search.

### VIC — Land Victoria / Data.Vic
- **Portal**: LASSI (https://maps.land.vic.gov.au/lvwebservice/) — interactive portal, not a queryable API.
- **Vicmap Property**: The authoritative parcel dataset, available via:
  - Data.Vic open data portal (bulk download, not API)
  - City of Melbourne open data (property-boundaries dataset, limited to Melbourne LGA)
- **No confirmed public ArcGIS/WFS endpoint** for statewide parcel queries without authentication.
- **Reliability**: Low for live API access; bulk data is the alternative.

### QLD — QSpatial / DNRME
- **Known endpoints** (all intermittently available):
  - `https://gisservices.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/Cadastre/MapServer`
  - `https://openmaps-nrde.qld.gov.au/arcgis/rest/services/PlanningCadastre/Cadastre/MapServer`
- **Both endpoints are currently unreachable** from external access.
- **QSpatial portal** (https://qspatial.information.qld.gov.au/) requires login for data download.
- **Reliability**: Very Low for live API; may work intermittently or only on QLD government networks.

### SA — Location SA / SA Data
- **Known endpoint**: `https://location.sadata.sa.gov.au/arcgis/rest/services/PlanningCadastre/Cadastre/MapServer`
- **Currently unreachable** without authentication.
- **SA government has tightened public access** to spatial services.
- **Reliability**: Very Low for unauthenticated API access.

### WA — SLIP (Shared Location Information Platform)
- **Portal**: `https://services.slip.wa.gov.au/public/services`
- **Access**: Requires free SLIP account registration.
- **WFS**: Some cadastral layers available via WFS with free-tier credentials.
- **No unauthenticated public ArcGIS REST endpoint** confirmed.
- **Reliability**: Low-Medium; requires account setup per deployment.

### TAS — theLIST (DPIPWE)
- **Endpoint**: `https://services.thelist.tas.gov.au/arcgis/rest/services/Public/CadastreParcels/MapServer/0`
- **Confirmed working**: Public, no auth, supports geoJSON queries.
- **Fields**: `PID`, `VOLUME`, `FOLIO`, `PROP_ADD` (property address), `COMP_AREA`, `MEAS_AREA`, `CAD_TYPE1`, `CAD_TYPE2`, `TENURE_TY`, `FEAT_NAME`.
- **SR**: Web Mercator (3857) — must request `outSR=4326` and `geometry` in query.
- **MaxRecordCount**: 2000.
- **Address search**: `PROP_ADD` field on parcels enables text-based address search directly on the parcel layer.
- **Suburb search**: No dedicated suburb boundary layer confirmed; can derive from parcel centroids grouped by address locality.
- **Reliability**: High — best public source outside ACT.

### NT — NT Geoserver
- **Known endpoint**: `https://geoserver-geospatial.nt.gov.au/geoserver/`
- **Currently unreachable** from external access.
- **WFS/WMS**: Would support parcel queries if available.
- **No public address API**.
- **Reliability**: Very Low; manual draw is the only viable option.

## Implementation Strategy

### Working Providers (live API confirmed)
1. **ACT** — Full implementation (existing).
2. **TAS** — ArcGIS REST MapServer with parcel geometry and address field.
3. **NSW** — ArcGIS REST MapServer with Lot layer geometry (no address search; manual draw fallback for address).

### Stub Providers (endpoint exists but unreliable/requires auth)
4. **VIC** — Stub with documented Data.Vic and City of Melbourne endpoints.
5. **QLD** — Stub with documented QSpatial endpoints.
6. **SA** — Stub with documented Location SA endpoints.
7. **WA** — Stub with documented SLIP endpoints (noting free-tier registration path).

### No Public API Providers
8. **NT** — Stub only; manual draw is the sole option.

## Key Risks
- ArcGIS MapServer endpoints (NSW, TAS) use Web Mercator (3857) — must specify `outSR=4326` and test that geoJSON output is actually in 4326.
- MapServer layers (not FeatureServer) may have limited query capabilities compared to ACT's FeatureServer.
- Rate limiting / IP blocking is possible with repeated automated queries.
- Government endpoints can change or be deprecated without notice.
- All non-ACT providers are "best effort" — manual draw must remain the universal fallback.
