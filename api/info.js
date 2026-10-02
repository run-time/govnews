const FEDERAL_REGISTER_URL =
  'https://www.federalregister.gov/api/v1/documents.json';
const PAGE_SIZE = 1000;
const MAX_COUNT = 1000;

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function parseLast(value) {
  if (value === undefined) return 30;
  if (!/^\d+$/.test(String(value))) return null;
  const last = Number(value);
  return last >= 1 && last <= MAX_COUNT ? last : null;
}

function buildUrl({ start, end, page, perPage }) {
  const url = new URL(FEDERAL_REGISTER_URL);
  url.searchParams.set('order', 'newest');
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  if (start) {
    url.searchParams.set('conditions[publication_date][gte]', start);
    url.searchParams.set('conditions[publication_date][lte]', end);
  }
  return url;
}

async function getPage(options) {
  const response = await fetch(buildUrl(options), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Federal Register API returned HTTP ${response.status}`);
  }
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { start, end } = req.query;
  const hasStart = start !== undefined;
  const hasEnd = end !== undefined;
  if (hasStart !== hasEnd) {
    return res.status(400).json({ error: 'Provide both start and end dates' });
  }
  if (hasStart && (!isValidDate(start) || !isValidDate(end) || start > end)) {
    return res.status(400).json({
      error: 'start and end must be valid YYYY-MM-DD dates, with start on or before end',
    });
  }

  const last = parseLast(req.query.last);
  if (last === null) {
    return res.status(400).json({ error: `last must be an integer from 1 to ${MAX_COUNT}` });
  }

  try {
    if (!hasStart) {
      const data = await getPage({ start: null, page: 1, perPage: last });
      const notices = data.results ?? [];
      return res.status(200).json({ count: notices.length, notices });
    }

    const notices = [];
    let page = 1;
    let totalPages;
    do {
      const data = await getPage({ start, end, page, perPage: PAGE_SIZE });
      notices.push(...(data.results ?? []));
      totalPages = data.total_pages ?? (data.results?.length < PAGE_SIZE ? page : page + 1);
      page += 1;
    } while (page <= totalPages);

    return res.status(200).json({ start, end, count: notices.length, notices });
  } catch (error) {
    console.error('Error fetching Federal Register notices:', error);
    return res.status(502).json({ error: 'Unable to fetch notices from the Federal Register' });
  }
}
