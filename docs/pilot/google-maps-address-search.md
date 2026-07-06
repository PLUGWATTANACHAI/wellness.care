# Google Maps Address Search for Pilot

## Current Pilot Behavior

The pilot now has two address search layers:

- Works now without an API key: opens Google Maps Search using Maps URLs.
- Ready for in-app autocomplete: uses `VITE_GOOGLE_MAPS_API_KEY` with Maps JavaScript API and Places when the key is configured.

## No-Key Fallback

The `ค้นหาใน Google Maps` button opens:

```text
https://www.google.com/maps/search/?api=1&query=...
```

This is useful for the first pilot because Google Maps URLs can launch Google Maps across devices and do not need a Google API key.

## In-App Autocomplete Setup

For real in-app place autocomplete:

1. Create a Google Cloud project.
2. Enable Maps JavaScript API.
3. Enable Places API.
4. Create a browser API key.
5. Restrict the key by website domain:
   - `https://wellnest-pilot.onrender.com/*`
   - later production domain when ready
6. Restrict the key to only the APIs needed:
   - Maps JavaScript API
   - Places API
7. Add the key to Render static site env:
   - `VITE_GOOGLE_MAPS_API_KEY`
8. Redeploy `wellnest-pilot`.

## Cost Control

- Do not expose unrestricted Google Maps keys.
- Use separate keys for web, Android, iOS, and backend.
- Keep field requests minimal. The pilot only requests:
  - `displayName`
  - `formattedAddress`
  - `location`
  - `id`
- Review billing and quota before opening the pilot beyond a small trusted group.

## Source Notes

- Google Maps JavaScript API requires an API key for authentication and billing.
- Google Maps URLs can open search/directions across devices and do not need an API key.
- Places uses pay-as-you-go billing and billing must be enabled for production API use.
