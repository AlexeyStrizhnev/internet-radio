// Netlify serverless function — CORS proxy for Radio Record API
export default async function handler(req) {
  // Extract the API path from the incoming request
  // req.url can be absolute or relative depending on Netlify's rewrite behavior
  let urlPath;
  try {
    urlPath = new URL(req.url).pathname;
  } catch {
    urlPath = req.url;
  }

  // Get everything after the /api/ prefix
  // Handles: /api/stations, /api/stations/now/, /.netlify/functions/api-proxy/stations
  const apiIdx = urlPath.indexOf('/api/');
  const apiPath = apiIdx >= 0 ? urlPath.slice(apiIdx + 4) : '/stations';
  const targetUrl = `https://www.radiorecord.ru/api${apiPath}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'InternetRadioPWA/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Upstream error: ${response.status}` }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
