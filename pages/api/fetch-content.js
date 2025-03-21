// File: pages/api/fetch-content.js
// This will be a Next.js API route for server-side content fetching

import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the URL from the request body
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Fetch the page content
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Check if the response is HTML
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      return res.status(400).json({ 
        error: `Unsupported content type: ${contentType}`,
        snippet: ''
      });
    }

    // Parse HTML with cheerio
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    
    // Remove scripts, styles, and navigation elements
    $('script, style, nav, header, footer, .nav, .menu, .sidebar, .comments, .ad, .advertisement').remove();
    
    // Get text from body or main content area
    let content = '';
    const mainSelectors = ['main', 'article', '.content', '.main-content', '#content', '#main'];
    
    // Try to find the main content area using common selectors
    for (const selector of mainSelectors) {
      if ($(selector).length) {
        content = $(selector).text();
        break;
      }
    }
    
    // If no main content found, use the body
    if (!content) {
      content = $('body').text();
    }
    
    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // Limit content length
    content = content.substring(0, 10000);

    // Return the parsed content
    return res.status(200).json({
      title,
      content,
      url
    });
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error.message);
    return res.status(500).json({
      error: error.message,
      url
    });
  }
}