# U.S. Government Notices API

A small Vercel hosted JSON API backed by the public Federal Register API.

## Endpoint

`GET /info`

Returns the latest 30 Federal Register documents as JSON. The response contains a `count` and a `notices` array with the original Federal Register records.

```text
/info?last=10
/info?start=2026-09-01&end=2026-10-01
```

`last` accepts an integer from 1 to 1000 and applies when no date range is given. Provide both `start` and `end` in `YYYY-MM-DD` format to return every document published in that inclusive date range. Date range requests paginate through Federal Register results; `last` does not limit a date range.

Invalid options return HTTP 400 with a JSON error. If the Federal Register service cannot be reached, the endpoint returns HTTP 502.

## Deployment

Deploy the `govnews` directory as the Vercel project root. Vercel serves the static site from `public` and runs the single function in `api/info.js`. The [Federal Register API](https://www.federalregister.gov/developers/documentation/api/v1) is public and does not require a key.

For local development, install dependencies and run `npx vercel dev` from this directory.
