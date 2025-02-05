/**
 * URL Shortener Worker using Rebrandly API
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function handleRequest(request, env) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { url } = await request.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL provided');
    }

    const response = await fetch('https://api.rebrandly.com/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': env.REBRANDLY_API_KEY,
      },
      body: JSON.stringify({
        destination: url,
        domain: { fullName: env.DOMAIN },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage;
      try {
        const error = JSON.parse(text);
        errorMessage = error.message || 'Failed to shorten URL';
      } catch {
        errorMessage = text || 'Failed to shorten URL';
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return new Response(JSON.stringify({
      shortUrl: `https://${data.shortUrl}`,
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
