import axios from 'axios';
import * as cheerio from 'cheerio'; // Add this dependency for HTML parsing

// This would be stored in environment variables in a real application
const HUGGING_FACE_API_KEY = process.env.NEXT_PUBLIC_HUGGING_FACE_API_KEY || 'your-api-key';
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/google/gemma-7b';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Function to clean response text by removing instruction artifacts
const cleanResponseText = (text, topic = "", communityName = "", countryName = "") => {
  if (!text) return "";
  
  let cleanedText = text
    // Remove any obvious instructions that might appear at the beginning
    .replace(/^I'll create a research report based on.*?\n\n/s, '')
    .replace(/^Here's a comprehensive research summary.*?\n\n/s, '')
    .replace(/^Based on the search results provided.*?\n\n/s, '')
    .replace(/^As a development researcher.*?\n\n/s, '')
    .trim();
  
  // If the text doesn't start with a heading and we have topic info, add a title
  if (!cleanedText.startsWith('#') && topic) {
    const titleCasedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    return `# ${titleCasedTopic} in ${communityName}, ${countryName}\n\n${cleanedText}`;
  } else if (!cleanedText.startsWith('#')) {
    // Generic title if we don't have topic info
    return "# Research Report\n\n" + cleanedText;
  }
  
  return cleanedText;
};

// Add a search API key - this could be for Google Custom Search or similar
const SEARCH_API_KEY = process.env.NEXT_PUBLIC_SEARCH_API_KEY || 'your-search-api-key';
const SEARCH_ENGINE_ID = process.env.NEXT_PUBLIC_SEARCH_ENGINE_ID || 'your-search-engine-id';

// Function to query the Gemina AI model via Hugging Face API
export const queryOpenAI = async (prompt, options = {}) => {
  try {
    const isConversation = options.messages && Array.isArray(options.messages);
    let payload;
    if (isConversation) {
      payload = {
        model: "gpt-4o", // if this model worked before
        messages: options.messages,
        max_completion_tokens: options.max_new_tokens || 800, // Changed from max_tokens
        temperature: options.temperature || 0.5,
        top_p: options.top_p || 0.95,
        ...options.parameters,
      };
    } else {
      payload = {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: options.max_new_tokens || 1500, // Changed from max_tokens
        temperature: options.temperature || 0.5,
        top_p: options.top_p || 0.95,
        ...options.parameters,
      };
    }
    
    console.log("Sending request to OpenAI model with payload:", {
      model: payload.model,
      messages: payload.messages.slice(0, 1)
    });
    
    const response = await axios.post(
      OPENAI_API_URL,
      payload,
      {
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    console.log("OpenAI response status:", response.status);
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error querying OpenAI model:", error);
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
    }
    throw new Error("Failed to get response from AI model");
  }
};

// New function to fetch and parse webpage content
async function fetchPageContent(url) {
  try {
    console.log(`Fetching content from: ${url}`);
    
    // Set timeout to avoid hanging on slow requests
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Check if the response is HTML
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      console.log(`Skipping non-HTML content: ${contentType}`);
      return {
        title: '',
        content: '',
        error: `Unsupported content type: ${contentType}`
      };
    }
    
    // Parse HTML with cheerio
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    
    // Extract main content - this is a simple approach, might need refinement
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
    
    // Limit content length to avoid processing extremely large pages
    content = content.substring(0, 10000);
    
    return {
      title,
      content,
      error: null
    };
  } catch (error) {
    console.error(`Error fetching page content from ${url}:`, error.message);
    return {
      title: '',
      content: '',
      error: error.message
    };
  }
}

export const generateReportFromData = async (text, topicName, communityName, countryName) => {
  // Extract snippets to use in the report
  const snippetRegex = /SNIPPET: (.*?)(?=SOURCE|\n\nWrite|$)/gs;
  const snippets = [];
  let match;
  while ((match = snippetRegex.exec(text)) !== null) {
    snippets.push(match[1].trim());
  }
  
  // Extract source titles
  const sourceRegex = /SOURCE \d+: (.*?)(?=\nURL:)/g;
  const sources = [];
  while ((match = sourceRegex.exec(text)) !== null) {
    sources.push(match[1].trim());
  }
  
  // Extract URLs
  const urlRegex = /URL: (.*?)(?=\nSNIPPET:)/g;
  const urls = [];
  while ((match = urlRegex.exec(text)) !== null) {
    urls.push(match[1].trim());
  }
  
  console.log("Extracted snippets:", snippets.length);
  console.log("Extracted sources:", sources.length);
  console.log("Extracted URLs:", urls.length);
  
  // Generate the report using the new async generateReport function
  const reportContent = await generateReport(topicName, communityName, snippets);
  
  // Add the title and return the full report
  return `# ${topicName.charAt(0).toUpperCase() + topicName.slice(1)} in ${communityName}, ${countryName}
${reportContent}`;
};








// Helper function to generate a sources list
function generateSourcesList(sources, urls, snippets) {
  // Check if parameters exist to avoid undefined errors
  if (!sources || !Array.isArray(sources)) sources = [];
  if (!urls || !Array.isArray(urls)) urls = [];
  if (!snippets || !Array.isArray(snippets)) snippets = [];
  
  let sourcesList = '';
  for (let i = 0; i < sources.length; i++) {
    sourcesList += `${i+1}. ${sources[i] || `Source ${i+1}`}: ${urls[i] || 'URL not available'}\n`;
    if (snippets[i]) {
      sourcesList += `   ${snippets[i].substring(0, 150)}${snippets[i].length > 150 ? '...' : ''}\n\n`;
    }
  }
  return sourcesList;
}

// Add this function to help extract reports (attempt to)
function extractReportContent(text) {
  // Look for the first heading (# or ##) and extract everything from there to the end
  const headingMatch = text.match(/(^|\n)# .*[\s\S]*$/);
  if (headingMatch) {
    return headingMatch[0].trim();
  }
  
  // If no heading found, try to find any content after instructions
  const afterInstructions = text.split(/Write a detailed analysis that:.+?format\./s)[1];
  if (afterInstructions) {
    return afterInstructions.trim();
  }
  
  return text; // Return original if nothing works
}



// Enhanced function to search the web with full content fetching
export const searchWeb = async (topic, communityName, countryName) => {
  console.log("Search function called with:", { topic, communityName, countryName });
  
  // Debug log to check if API keys are properly loaded
  console.log("API Key available:", !!process.env.NEXT_PUBLIC_SEARCH_API_KEY);
  console.log("Engine ID available:", !!process.env.NEXT_PUBLIC_SEARCH_ENGINE_ID);
  
  // Check if search API key is available
  if (SEARCH_API_KEY === 'your-search-api-key' || SEARCH_ENGINE_ID === 'your-search-engine-id') {
    throw new Error('Search API key and engine ID must be configured for research functionality');
  }

  try {
    // Array to store our search results
    let allSearchResults = [];
    
    // First search - exact community name with quotes for precision
    try {
      console.log("Attempting first search - village specific with quotes");
      const response1 = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: SEARCH_API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: `"${communityName}" ${countryName} ${topic}`, // Added quotes around the village name
            num: 5
          }
        }
      );
      
      console.log("First search response received, info:", {
        totalResults: response1.data.searchInformation?.totalResults,
        hasItems: !!response1.data.items,
        itemCount: response1.data.items?.length || 0
      });
      
      if (response1.data.items && response1.data.items.length > 0) {
        console.log("First search found results:", response1.data.items.length);
        
        allSearchResults = allSearchResults.concat(
          response1.data.items.map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet || "",
            pagemap: item.pagemap,
            htmlSnippet: item.htmlSnippet,
            metatags: item.pagemap?.metatags?.[0] || {},
            source: "specific",
            confidence: "high",
            relevance: "village-specific"
          }))
        );
      } else {
        console.log("No results found in first search");
      }
    } catch (error) {
      console.warn('Error in specific village search:', error.message);
      // Continue with other searches
    }
    
    // Second search - without quotes, more general
    if (allSearchResults.length < 3) {
      try {
        console.log("Attempting second search - village without quotes");
        const response1b = await axios.get(
          'https://www.googleapis.com/customsearch/v1',
          {
            params: {
              key: SEARCH_API_KEY,
              cx: SEARCH_ENGINE_ID,
              q: `${communityName} ${countryName} ${topic}`, // No quotes for broader search
              num: 5
            }
          }
        );
        
        console.log("Second search response received, info:", {
          totalResults: response1b.data.searchInformation?.totalResults,
          hasItems: !!response1b.data.items,
          itemCount: response1b.data.items?.length || 0
        });
        
        if (response1b.data.items && response1b.data.items.length > 0) {
          console.log("Second search found results:", response1b.data.items.length);
          
          allSearchResults = allSearchResults.concat(
            response1b.data.items.map(item => ({
              title: item.title,
              link: item.link,
              snippet: item.snippet || "",
              pagemap: item.pagemap,
              htmlSnippet: item.htmlSnippet,
              metatags: item.pagemap?.metatags?.[0] || {},
              source: "general-village",
              confidence: "medium-high",
              relevance: "general-village"
            }))
          );
        } else {
          console.log("No results found in second search");
        }
      } catch (error) {
        console.warn('Error in general village search:', error.message);
        // Continue with other searches
      }
    }
    
    // If we still have no results at all
    if (allSearchResults.length === 0) {
      console.log("No search results found at all");
      throw new Error(`No search results found for ${topic} in ${communityName}, ${countryName}`);
    }
    
    console.log(`Found ${allSearchResults.length} search results, proceeding with detailed analysis`);
    
    // Limit to top 5 results
    const topResults = allSearchResults.slice(0, 5);
    
    // Extract additional context from each result
    const enhancedResults = topResults.map((result, index) => {
      // Create an enhanced context string with all available info
      return {
        ...result,
        index: index + 1,
        domainName: getDomainName(result.link)
      };
    });
    
    // Step 2: Generate detailed summaries using AI with better analysis focus
    const summaryPrompt = `You are analyzing search result snippets about ${topic} in ${communityName}, ${countryName}. Your task is to write a comprehensive, detailed research report.
    
    Search results:
    ${enhancedResults.map((result) => `
    SOURCE ${result.index}:
    TITLE: ${result.title}
    URL: ${result.link}
    SNIPPET: ${result.snippet}
    `).join('\n\n')}
    
    Create a detailed research report that:
    1. Thoroughly analyzes all available information about ${topic} in ${communityName}
    2. Extracts specific data, statistics, and facts from the snippets
    3. Makes reasonable inferences where information is limited
    4. Organizes findings into coherent sections with clear headings
    5. Cites sources using [Source X] format
    
    Your report MUST include:
    - An overview section summarizing key findings
    - 2-4 topic-specific sections analyzing different aspects
    - A conclusion with implications or recommendations if possible
    - Complete citations of all sources
    
    FORMAT:
    # ${topic.charAt(0).toUpperCase() + topic.slice(1)} in ${communityName}, ${countryName}
    
    ## Overview
    [Comprehensive overview]
    
    ## [First Aspect]
    [Detailed analysis]
    
    ## [Second Aspect]
    [Detailed analysis]
    
    [Additional sections as needed]
    
    ## References
    [Numbered list of sources]
    
    The report should be written for development researchers who need comprehensive information. Make it substantive and informative.`;

    // Get the summaries from AI with increased token limit
    console.log("Sending prompt to AI for detailed summaries");
    const summariesResponse = await queryOpenAI(summaryPrompt, {
      max_new_tokens: 2500,
      temperature: 0.3
    });
    
    // Process and return the summaries
    if (summariesResponse && summariesResponse[0] && summariesResponse[0].generated_text) {
      console.log("AI summaries complete");
      const responseText = summariesResponse[0].generated_text;
      console.log("Response length:", responseText.length);
      
      // Try to extract a heading, but if not found, generate our own report
      const extractedReport = extractReportContent(responseText);
      
      // Check if we successfully extracted a proper report with a heading
      if (extractedReport.startsWith('# ')) {
        console.log("Extracted report with heading");
        return extractedReport;
      } else {
        // Generate our own report directly from the data
        console.log("Generating custom report from data");
        return generateReportFromData(responseText, topic, communityName, countryName);
      }
    } else if (typeof summariesResponse === 'string') {
      console.log("AI returned string response");
      const extractedReport = extractReportContent(summariesResponse);
      
      if (extractedReport.startsWith('# ')) {
        return extractedReport;
      } else {
        return generateReportFromData(summariesResponse, topic, communityName, countryName);
      }
    }
    
    console.log("Unable to generate summaries from AI response");
    throw new Error(`Unable to generate summaries for ${topic} in ${communityName}, ${countryName}`);
    
  } catch (error) {
    console.error('Error in web search process:', error);
    
    // Return a simplified error message
    return `# ${topic.charAt(0).toUpperCase() + topic.slice(1)} in ${communityName}, ${countryName}

We were unable to generate detailed summaries due to technical issues.

Error: ${error.message}

Please try again later or try with alternative search terms.`;
  }
};

// Helper function to extract domain name from URL
function getDomainName(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
}



// Helper function to try extracting a date from a snippet
function extractDateFromSnippet(snippet) {
  if (!snippet) return "";
  
  // Look for common date patterns
  const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}/i;
  const match = snippet.match(dateRegex);
  return match ? match[0] : "";
};

// Other functions from your original API.js
export const generateComprehensiveAnalysis = async (villageInfo, allResearchData) => {
  console.log("Generating comprehensive analysis of all research data");
  
  try {
    // Extract all the research data into a consolidated format
    const topicSummaries = {};
    let consolidatedResearch = "";
    
    // Process each research topic
    Object.entries(allResearchData).forEach(([topic, data]) => {
      if (data.webResearch) {
        // Create a summary for each topic
        topicSummaries[topic] = data.webResearch.split('\n').slice(0, 5).join('\n');
        
        // Add to consolidated research
        consolidatedResearch += `\n\n## ${topic.toUpperCase()} RESEARCH:\n${data.webResearch.substring(0, 1500)}...\n`;
      }
    });
    
    // If there's not enough research data, return a message
    if (Object.keys(topicSummaries).length === 0) {
      return "Insufficient research data available for comprehensive analysis. Please conduct research on more topics.";
    }
    
    // Create a prompt for the AI to generate a comprehensive analysis - keeping the instructions internal
    const analysisPrompt = `You are a development research specialist analyzing data about ${villageInfo.name}, ${villageInfo.country}. Generate a comprehensive analysis report based on the following research data:

${consolidatedResearch}

Your report should include:
- A title: # Comprehensive Analysis of ${villageInfo.name}, ${villageInfo.country}
- Executive summary with key findings across all research areas
- 3-5 cross-cutting themes that emerge from the research
- Analysis of how different aspects of community life interact
- 3-5 integrated recommendations that address multiple sectors
- Knowledge gaps and suggested approaches

Use markdown formatting with ## for section headers and * for bullet points.
Your response should ONLY include the final report content without repeating these instructions.`;
    
    // Get the comprehensive analysis from AI
    console.log("Sending prompt to AI for comprehensive analysis");
    const analysisResponse = await queryOpenAI(analysisPrompt, {
      max_new_tokens: 3000,
      temperature: 0.3
    });
    

    // Process the comprehensive analysis response
    let processedResponse = "";
    
    if (analysisResponse && analysisResponse[0] && analysisResponse[0].generated_text) {
      console.log("AI comprehensive analysis complete");
      processedResponse = cleanResponseText(analysisResponse[0].generated_text);
    } else if (typeof analysisResponse === 'string') {
      processedResponse = cleanResponseText(analysisResponse);
    }
    
    // Return the cleaned response
    return processedResponse;
    
  } catch (error) {
    console.error("Error generating comprehensive analysis:", error);
    return `# Comprehensive Analysis Error

We apologize, but an error occurred while generating the comprehensive analysis for ${villageInfo.name}.

Please try again later or contact support if the problem persists.

Error details: ${error.message}`;
  }
};

// Function to get recommended data sources by country and topic
export const getRecommendedSources = (topic, countryName) => {
  // Base sources applicable to most countries
  const baseSources = {
    demographics: [
      { name: "UN Population Division", url: "https://population.un.org/wpp/" },
      { name: "World Bank Data", url: "https://data.worldbank.org/country/" },
      { name: "UNICEF Data", url: "https://data.unicef.org/country/" }
    ],
    agriculture: [
      { name: "FAO Country Profiles", url: "http://www.fao.org/countryprofiles/en/" },
      { name: "IFAD Rural Development Report", url: "https://www.ifad.org/en/web/knowledge/publications" },
      { name: "World Bank Agriculture Data", url: "https://data.worldbank.org/topic/agriculture-and-rural-development" }
    ],
    power: [
      { name: "World Bank Sustainable Energy for All", url: "https://datacatalog.worldbank.org/dataset/sustainable-energy-all" },
      { name: "IRENA Renewable Energy Statistics", url: "https://www.irena.org/Statistics" },
      { name: "IEA Africa Energy Outlook", url: "https://www.iea.org/reports/africa-energy-outlook-2019" }
    ],
    education: [
      { name: "UNESCO Institute for Statistics", url: "http://uis.unesco.org/" },
      { name: "Global Partnership for Education", url: "https://www.globalpartnership.org/where-we-work/" },
      { name: "World Bank Education Statistics", url: "https://datatopics.worldbank.org/education/" }
    ],
    livelihoods: [
      { name: "ILO Country Profiles", url: "https://www.ilo.org/global/statistics-and-databases/lang--en/index.htm" },
      { name: "World Bank Poverty and Equity Data", url: "https://datatopics.worldbank.org/poverty/" },
      { name: "UNDP Human Development Reports", url: "http://hdr.undp.org/en/countries/" }
    ],
    healthcare: [
      { name: "WHO Country Profiles", url: "https://www.who.int/countries/" },
      { name: "Global Health Data Exchange", url: "http://ghdx.healthdata.org/" },
      { name: "UNICEF Health Data", url: "https://data.unicef.org/topic/health/" }
    ],
    political: [
      { name: "Bertelsmann Transformation Index", url: "https://www.bti-project.org/en/home.html" },
      { name: "Freedom House Reports", url: "https://freedomhouse.org/countries/freedom-world/scores" },
      { name: "International Crisis Group", url: "https://www.crisisgroup.org/africa/" }
    ],
    food: [
      { name: "WFP Hunger Map", url: "https://www.wfp.org/hunger-map" },
      { name: "FAO Food Security Data", url: "http://www.fao.org/faostat/en/#home" },
      { name: "FEWS NET", url: "https://fews.net/" }
    ],
    leadership: [
      { name: "Afrobarometer", url: "https://www.afrobarometer.org/" },
      { name: "Mo Ibrahim Foundation", url: "https://mo.ibrahim.foundation/iiag" },
      { name: "World Bank Governance Indicators", url: "https://info.worldbank.org/governance/wgi/" }
    ]
  };
  
  // Function to get country-specific sources
  const getCountrySources = (country) => {
    // Map of country-specific statistical sources
    const countrySources = {
      "Kenya": {
        base: { name: "Kenya National Bureau of Statistics", url: "https://www.knbs.or.ke/" },
        demographics: { name: "Kenya Population and Housing Census", url: "https://www.knbs.or.ke/census-2019/" },
        agriculture: { name: "Kenya Agricultural Research Institute", url: "https://www.kalro.org/" }
      },
      "Tanzania": {
        base: { name: "Tanzania National Bureau of Statistics", url: "https://www.nbs.go.tz/" },
        demographics: { name: "Tanzania Population and Housing Census", url: "https://www.nbs.go.tz/index.php/en/census-surveys/population-and-housing-census" }
      },
      "Uganda": {
        base: { name: "Uganda Bureau of Statistics", url: "https://www.ubos.org/" }
      },
      "Ethiopia": {
        base: { name: "Ethiopia Central Statistical Agency", url: "https://www.statsethiopia.gov.et/" }
      },
      "Rwanda": {
        base: { name: "National Institute of Statistics Rwanda", url: "https://www.statistics.gov.rw/" }
      },
      "Nigeria": {
        base: { name: "National Bureau of Statistics Nigeria", url: "https://nigerianstat.gov.ng/" }
      },
      "Ghana": {
        base: { name: "Ghana Statistical Services", url: "https://www.statsghana.gov.gh/" }
      },
      "Senegal": {
        base: { name: "Agence Nationale de la Statistique et de la Démographie", url: "https://www.ansd.sn/" }
      }
    };
    
    return countrySources[country] || null;
  };
  
  // Get the sources for the given topic
  const topicSources = baseSources[topic] || [];
  
  // Add country-specific sources if available
  const countrySources = getCountrySources(countryName);
  if (countrySources) {
    // Add the base country statistical source
    if (countrySources.base) {
      topicSources.unshift(countrySources.base);
    }
    
    // Add topic-specific country source if available
    if (countrySources[topic]) {
      topicSources.unshift(countrySources[topic]);
    }
  }
  
  return topicSources;
};

// Simple test function to check if search is working
export const testSearch = async (query) => {
  try {
    console.log("Test search for:", query);
    const response = await axios.get(
      'https://www.googleapis.com/customsearch/v1',
      {
        params: {
          key: SEARCH_API_KEY,
          cx: SEARCH_ENGINE_ID,
          q: query,
          num: 3
        }
      }
    );
    
    return {
      success: true,
      query: query,
      totalResults: response.data.searchInformation?.totalResults,
      items: response.data.items || []
    };
  } catch (error) {
    return {
      success: false,
      query: query,
      error: error.message,
      details: error.response?.data
    };
  }
};

// Function to generate prompts for search purposes
export const generateResearchPrompt = (topic, communityName, countryName = '') => {
  const countryContext = countryName ? ` in ${countryName}` : '';
  
  const basePrompt = `Provide detailed information about ${topic} for ${communityName}${countryContext} based on search results.`;
  
  const prompts = {
    demographics: `${basePrompt} Focus on population size, age distribution, gender ratio, household composition, and migration patterns.`,
    
    agriculture: `${basePrompt} Focus on crops grown, farming methods, irrigation, livestock, land use, and agricultural challenges.`,
    
    power: `${basePrompt} Focus on electricity access, power sources, reliability, alternative energy adoption, and energy infrastructure.`,
    
    education: `${basePrompt} Focus on schools, enrollment rates, educational quality, teacher availability, and educational challenges.`,
    
    livelihoods: `${basePrompt} Focus on income sources, employment patterns, economic activities, youth employment, and financial inclusion.`,
    
    healthcare: `${basePrompt} Focus on health facilities, disease burden, maternal and child health, water and sanitation, and healthcare access.`,
    
    political: `${basePrompt} Focus on governance structures, political stability, civic participation, and local administration.`,
    
    food: `${basePrompt} Focus on food availability, nutrition, dietary diversity, food production, and food security challenges.`,
    
    leadership: `${basePrompt} Focus on traditional and formal leadership structures, decision-making processes, and community organization.`
  };

  return prompts[topic] || basePrompt;
};

// Function to generate conversation starter questions
export const generateConversationStarter = (topic) => {
  const starters = {
    demographics: "Could you tell me about the population of your community? How many people live there?",
    agriculture: "What are the main agricultural activities in your community? What crops do people grow?",
    power: "What is the current situation regarding electricity and power in your community?",
    education: "Could you describe the education system and schools in your community?",
    livelihoods: "What are the main ways people earn a living in your community?",
    healthcare: "How do people access healthcare in your community? What facilities are available?",
    political: "Could you tell me about the political situation in your region? How stable is it?",
    food: "What is the food situation in your community? Do people have consistent access to adequate nutrition?",
    leadership: "Could you explain how leadership works in your community? Who makes decisions?"
  };

  return starters[topic] || `Could you tell me more about ${topic} in your community?`;
};

// Function to generate aspiration questions
export const generateAspirationQuestion = (topic) => {
  const questions = {
    demographics: "What are your community's hopes for population growth or stability? What challenges do you face in this area?",
    agriculture: "What are your community's aspirations for agriculture and animal production? What prevents achieving these goals?",
    power: "What are your hopes regarding electricity and power access? What obstacles prevent reaching these goals?",
    education: "What are your community's aspirations for education? What barriers prevent achieving these educational goals?",
    livelihoods: "What are your hopes for jobs and livelihoods in your community? What obstacles prevent economic development?",
    healthcare: "What are your community's aspirations for healthcare? What prevents achieving better health outcomes?",
    political: "What are your hopes regarding political stability and governance? What challenges exist in this area?",
    food: "What are your community's aspirations for food security? What prevents achieving consistent access to nutrition?",
    leadership: "What are your hopes for leadership development in your community? What challenges exist in this area?"
  };

  return questions[topic] || `What are your community's hopes and aspirations regarding ${topic}? What prevents these aspirations from being realized?`;
};

// Helper functions
function extractNumber(text, regex) {
  const match = text.match(regex);
  if (match && match[1]) {
    return match[1].replace(/,/g, '');
  }
  return null;
}

function formatNumber(num) {
  if (!num) return '';
  return parseInt(num, 10).toLocaleString();
}


function cleanReportContent(text) {
  // If the AI output contains a repeated block starting with a known instruction marker,
  // remove everything from that marker onward.
  const marker = "Create a detailed research report";
  const index = text.indexOf(marker);
  if (index !== -1) {
    return text.substring(0, index).trim();
  }
  return text;
}


function getDemographicsPayload(communityName, snippets) {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful development research assistant." },
      { role: "user", content: `
Generate a detailed research report on demographics in ${communityName}, Kenya based on the following snippets. The report must be comprehensive and written for development researchers.

Include the following sections:
1. **Overview** – Summarize the key demographic characteristics.
2. **Population Details** – Provide any available data on total population, orphan counts, age distribution, etc.
3. **Organizational Structure** – Describe any relevant information on local leadership or community organizations related to demographics.

After the main report, append a **Snippets** section that simply lists the raw snippet texts provided.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output; only include the final report.
` }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 1,
  };
}

function getAgriculturePayload(communityName, snippets) {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful development research assistant." },
      { role: "user", content: `
Generate a detailed research report on agriculture in ${communityName}, Kenya based on the following snippets. The report must be comprehensive and written for development researchers.

Include the following sections:
1. **Overview** – Summarize the key agricultural characteristics.
2. **Agricultural Practices** – Describe details on crop production, farming methods, livestock rearing, and any sustainable techniques mentioned.
3. **Challenges and Opportunities** – Highlight any challenges and potential opportunities for the agricultural sector.

After the main report, append a **Snippets** section that lists the raw snippet texts.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output.
` }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 1,
  };
}


function getEducationAccessPayload(communityName, snippets) {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful development research assistant." },
      { role: "user", content: `
Generate a detailed research report on education access in ${communityName}, Kenya based on the following snippets. The report must be comprehensive and written for development researchers.

Include the following sections:
1. **Overview** – Summarize the key findings regarding education access.
2. **Educational Infrastructure** – Describe details on schools, enrollment rates, teacher availability, and any relevant educational initiatives.
3. **Challenges and Opportunities** – Identify challenges to education access and potential areas for improvement.

After the main report, append a **Snippets** section that lists the raw snippet texts.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output.
` }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 1,
  };
}

function getHealthcareAccessPayload(communityName, snippets) {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful development research assistant." },
      { role: "user", content: `
Generate a detailed research report on healthcare access in ${communityName}, Kenya based on the following snippets. The report must be comprehensive and written for development researchers.

Include the following sections:
1. **Overview** – Summarize the key findings regarding healthcare access.
2. **Healthcare Facilities and Services** – Describe details on available health facilities, services provided, and public health initiatives.
3. **Challenges and Opportunities** – Outline any challenges in accessing healthcare and potential opportunities for improvement.

After the main report, append a **Snippets** section that lists the raw snippet texts.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output.
` }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 1,
  };
}

function getFoodSecurityPayload(communityName, snippets) {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful development research assistant." },
      { role: "user", content: `
Generate a detailed research report on food security in ${communityName}, Kenya based on the following snippets. The report must be comprehensive and written for development researchers.

Include the following sections:
1. **Overview** – Summarize the key findings regarding food security.
2. **Food Availability and Nutrition** – Describe details on food production, distribution, and nutritional aspects.
3. **Challenges and Interventions** – Identify any challenges to food security and potential interventions.

After the main report, append a **Snippets** section that lists the raw snippet texts.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output.
` }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 1,
  };
}

function getLivelihoodAndJobsPayload(communityName, snippets) {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful development research assistant." },
      { role: "user", content: `
Generate a detailed research report on livelihoods and jobs in ${communityName}, Kenya based on the following snippets. The report must be comprehensive and written for development researchers.

Include the following sections:
1. **Overview** – Summarize the key findings regarding local livelihoods and employment.
2. **Economic Activities and Job Opportunities** – Describe details on predominant industries, employment patterns, and any job creation initiatives.
3. **Challenges and Opportunities** – Identify challenges in the local job market and potential areas for economic growth.

After the main report, append a **Snippets** section that lists the raw snippet texts.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output.
` }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 1,
  };
}

function getPoliticalStabilityPayload(communityName, snippets) {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful development research assistant." },
      { role: "user", content: `
Generate a detailed research report on political stability in ${communityName}, Kenya based on the following snippets. The report must be comprehensive and written for development researchers.

Include the following sections:
1. **Overview** – Summarize the key findings regarding political stability.
2. **Governance and Civic Participation** – Describe details on local governance, civic engagement, and community participation.
3. **Challenges and Insights** – Outline any political challenges and potential areas for improvement.

After the main report, append a **Snippets** section that lists the raw snippet texts.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output.
` }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 1,
  };
}

function getLeadershipStructuresPayload(communityName, snippets) {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful development research assistant." },
      { role: "user", content: `
Generate a detailed research report on leadership structures in ${communityName}, Kenya based on the following snippets. The report must be comprehensive and written for development researchers.

Include the following sections:
1. **Overview** – Summarize the key findings regarding leadership.
2. **Leadership and Governance Structures** – Describe details on both traditional and formal leadership, decision-making processes, and community organization roles.
3. **Challenges and Opportunities** – Identify challenges in the leadership dynamics and potential opportunities for enhanced governance.

After the main report, append a **Snippets** section that lists the raw snippet texts.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output.
` }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    top_p: 1,
  };
}

function getPayloadForTopic(topic, communityName, snippets) {
  const normalizedTopic = topic.toLowerCase();
  if (normalizedTopic === "demographics") {
    return getDemographicsPayload(communityName, snippets);
  } else if (normalizedTopic === "agriculture") {
    return getAgriculturePayload(communityName, snippets);
  } else if (normalizedTopic === "education access") {
    return getEducationAccessPayload(communityName, snippets);
  } else if (normalizedTopic === "healthcare access") {
    return getHealthcareAccessPayload(communityName, snippets);
  } else if (normalizedTopic === "food security") {
    return getFoodSecurityPayload(communityName, snippets);
  } else if (normalizedTopic === "livelihood and jobs") {
    return getLivelihoodAndJobsPayload(communityName, snippets);
  } else if (normalizedTopic === "political stability") {
    return getPoliticalStabilityPayload(communityName, snippets);
  } else if (normalizedTopic === "leadership structures") {
    return getLeadershipStructuresPayload(communityName, snippets);
  } else {
    // For any other topic, you could create a generic payload function
    return {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful development research assistant." },
        { role: "user", content: `
Generate a detailed research report on ${topic} in ${communityName}, Kenya based on the following snippets. The report should be comprehensive and written for development researchers.

Include a clear overview and any key findings that emerge from the snippets.

After the main report, append a **Snippets** section that lists the raw snippet texts provided.

Use Markdown formatting for clear headings and bullet points.

Snippets:
${snippets.join("\n\n")}

Do not repeat these instructions in the final output.
` }
      ],
      max_tokens: 4000,
      temperature: 0.3,
      top_p: 1,
    };
  }
}

async function generateReport(topic, communityName, snippets) {
  const payload = getPayloadForTopic(topic, communityName, snippets);
  try {
    const response = await axios.post(
      OPENAI_API_URL, // e.g., 'https://api.openai.com/v1/chat/completions'
      payload,
      {
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    // Extract the generated report from the API response.
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
}

export const generateAssetPrompt = (topic, villageName) => {
  return `
Generate a detailed analysis of the assets related to ${topic} in ${villageName}.
Include information on:
- Local and national government programs,
- NGOs or community initiatives,
- Available funding or support mechanisms,
- Local resources and any unique assets.
The report should be structured with clear headings and be written for development researchers.
`;
};