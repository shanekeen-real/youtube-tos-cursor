import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*&v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Analyze page structure and extract form information
function analyzePageStructure(html: string, domain: string) {
  const analysis = {
    forms: [] as any[],
    inputs: [] as any[],
    buttons: [] as any[],
    potentialEndpoints: [] as string[],
    hasJavaScript: false,
    hasReact: false,
    hasVue: false
  };

  // Look for forms
  const formMatches = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi);
  if (formMatches) {
    analysis.forms = formMatches.map(form => {
      const actionMatch = form.match(/action="([^"]*)"/i);
      const methodMatch = form.match(/method="([^"]*)"/i);
      return {
        action: actionMatch ? actionMatch[1] : '',
        method: methodMatch ? methodMatch[1] : 'GET',
        html: form
      };
    });
  }

  // Look for input fields
  const inputMatches = html.match(/<input[^>]*>/gi);
  if (inputMatches) {
    analysis.inputs = inputMatches.map(input => {
      const nameMatch = input.match(/name="([^"]*)"/i);
      const typeMatch = input.match(/type="([^"]*)"/i);
      const valueMatch = input.match(/value="([^"]*)"/i);
      return {
        name: nameMatch ? nameMatch[1] : '',
        type: typeMatch ? typeMatch[1] : 'text',
        value: valueMatch ? valueMatch[1] : ''
      };
    });
  }

  // Look for buttons
  const buttonMatches = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi);
  if (buttonMatches) {
    analysis.buttons = buttonMatches.map(button => {
      const textMatch = button.match(/<button[^>]*>([\s\S]*?)<\/button>/i);
      return {
        text: textMatch ? textMatch[1].trim() : '',
        html: button
      };
    });
  }

  // Look for JavaScript frameworks
  analysis.hasJavaScript = html.includes('<script') || html.includes('javascript:');
  analysis.hasReact = html.includes('react') || html.includes('React') || html.includes('__NEXT_DATA__');
  analysis.hasVue = html.includes('vue') || html.includes('Vue');

  // Look for potential API endpoints
  const endpointMatches = html.match(/["'](\/api\/[^"']+)["']/g);
  if (endpointMatches) {
    analysis.potentialEndpoints = endpointMatches.map(match => match.replace(/["']/g, ''));
  }

  return analysis;
}

// Test youtube-transcript.io - Advanced web scraping approach
async function testYoutubeTranscriptIO(videoId: string) {
  try {
    console.log(`Testing youtube-transcript.io advanced web scraping for video ${videoId}...`);
    
    // Step 1: Get the main page and analyze structure
    const pageResponse = await axios.get('https://www.youtube-transcript.io/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 30000
    });

    const html = pageResponse.data;
    console.log(`Page loaded, length: ${html.length} characters`);
    
    // Step 2: Analyze page structure
    const analysis = analyzePageStructure(html, 'youtube-transcript.io');
    console.log(`Page analysis:`, {
      forms: analysis.forms.length,
      inputs: analysis.inputs.length,
      hasJavaScript: analysis.hasJavaScript,
      hasReact: analysis.hasReact,
      potentialEndpoints: analysis.potentialEndpoints
    });

    // Step 3: Try different approaches based on analysis
    
    // Approach 1: Try direct API call (common pattern)
    try {
      console.log(`Trying direct API call...`);
      const apiResponse = await axios.post('https://www.youtube-transcript.io/api/extract', {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        language: 'en'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.youtube-transcript.io/',
          'Origin': 'https://www.youtube-transcript.io'
        },
        timeout: 30000
      });

      if (apiResponse.data && apiResponse.data.transcript) {
        console.log(`Success via direct API: ${apiResponse.data.transcript.length} characters`);
        return {
          success: true,
          transcript: apiResponse.data.transcript,
          length: apiResponse.data.transcript.length,
          source: 'youtube-transcript.io (direct API)',
          approach: 'Direct API call'
        };
      }
    } catch (error: any) {
      console.log(`Direct API failed: ${error.message}`);
    }

    // Approach 2: Try form submission with discovered form action
    if (analysis.forms.length > 0) {
      for (const form of analysis.forms) {
        try {
          console.log(`Trying form submission to: ${form.action}`);
          
          const formData = new URLSearchParams();
          formData.append('url', `https://www.youtube.com/watch?v=${videoId}`);
          
          // Add any other inputs found
          analysis.inputs.forEach(input => {
            if (input.name && input.value) {
              formData.append(input.name, input.value);
            }
          });
          
          const submitResponse = await axios.post(`https://www.youtube-transcript.io${form.action}`, formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.youtube-transcript.io/',
              'Origin': 'https://www.youtube-transcript.io'
            },
            timeout: 30000,
            maxRedirects: 5
          });
          
          const responseText = submitResponse.data;
          if (typeof responseText === 'string') {
            // Look for transcript content
            const transcriptMatch = responseText.match(/<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                                   responseText.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i) ||
                                   responseText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) ||
                                   responseText.match(/<div[^>]*id="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            
            if (transcriptMatch && transcriptMatch[1].trim().length > 100) {
              const transcript = transcriptMatch[1].replace(/<[^>]*>/g, '').trim();
              console.log(`Success via form submission: ${transcript.length} characters`);
              return {
                success: true,
                transcript: transcript,
                length: transcript.length,
                source: `youtube-transcript.io (${form.action})`,
                approach: 'Form submission'
              };
            }
          }
        } catch (error: any) {
          console.log(`Form submission to ${form.action} failed: ${error.message}`);
        }
      }
    }

    // Approach 3: Try potential endpoints from analysis
    for (const endpoint of analysis.potentialEndpoints) {
      try {
        console.log(`Trying discovered endpoint: ${endpoint}`);
        
        const response = await axios.post(`https://www.youtube-transcript.io${endpoint}`, {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          language: 'en'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.youtube-transcript.io/',
            'Origin': 'https://www.youtube-transcript.io'
          },
          timeout: 30000
        });

        if (response.data && response.data.transcript) {
          console.log(`Success via discovered endpoint: ${response.data.transcript.length} characters`);
          return {
            success: true,
            transcript: response.data.transcript,
            length: response.data.transcript.length,
            source: `youtube-transcript.io (${endpoint})`,
            approach: 'Discovered endpoint'
          };
        }
      } catch (error: any) {
        console.log(`Discovered endpoint ${endpoint} failed: ${error.message}`);
      }
    }
    
    return {
      success: false,
      error: 'All approaches failed',
      source: 'youtube-transcript.io',
      approach: 'Advanced web scraping',
      debug: {
        pageLength: html.length,
        forms: analysis.forms.length,
        inputs: analysis.inputs.length,
        hasJavaScript: analysis.hasJavaScript,
        hasReact: analysis.hasReact,
        potentialEndpoints: analysis.potentialEndpoints
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      source: 'youtube-transcript.io',
      approach: 'Advanced web scraping'
    };
  }
}

// Test youtubetotranscript.com - Advanced web scraping approach
async function testYoutubeToTranscript(videoId: string) {
  try {
    console.log(`Testing youtubetotranscript.com advanced web scraping for video ${videoId}...`);
    
    // Step 1: Get the main page and analyze structure
    const pageResponse = await axios.get('https://youtubetotranscript.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 30000
    });

    const html = pageResponse.data;
    console.log(`Page loaded, length: ${html.length} characters`);
    
    // Step 2: Analyze page structure
    const analysis = analyzePageStructure(html, 'youtubetotranscript.com');
    console.log(`Page analysis:`, {
      forms: analysis.forms.length,
      inputs: analysis.inputs.length,
      hasJavaScript: analysis.hasJavaScript,
      hasReact: analysis.hasReact,
      potentialEndpoints: analysis.potentialEndpoints
    });

    // Step 3: Try multiple approaches to get the transcript
    
    // Approach 1: Try the direct transcript URL with query parameter
    try {
      console.log(`Trying direct transcript URL with query parameter...`);
      
      const directResponse = await axios.get(`https://youtubetotranscript.com/transcript?youtube_url=https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://youtubetotranscript.com/'
        },
        timeout: 30000,
        maxRedirects: 5
      });
      
      console.log(`Direct URL response status: ${directResponse.status}`);
      console.log(`Direct URL response length: ${directResponse.data?.length || 0}`);
      
      const responseText = directResponse.data;
      if (typeof responseText === 'string') {
        // Debug: Log the first 500 characters of the response
        console.log(`Direct URL response preview: ${responseText.substring(0, 500)}`);
        
        const transcript = extractTranscriptFromResponse(responseText);
        if (transcript) {
          console.log(`Success via direct URL: ${transcript.length} characters`);
          return {
            success: true,
            transcript: transcript,
            length: transcript.length,
            source: 'youtubetotranscript.com (direct URL)',
            approach: 'Direct URL with query parameter'
          };
        } else {
          console.log(`Direct URL returned content but no transcript extracted`);
        }
      }
    } catch (error: any) {
      console.log(`Direct URL approach failed: ${error.message}`);
    }

    // Approach 2: Try form submission to /transcript
    try {
      console.log(`Trying form submission to /transcript...`);
      
      const formData = new URLSearchParams();
      formData.append('youtube_url', `https://www.youtube.com/watch?v=${videoId}`);
      formData.append('url', `https://www.youtube.com/watch?v=${videoId}`);
      
      // Add any other inputs found
      analysis.inputs.forEach(input => {
        if (input.name && input.value) {
          formData.append(input.name, input.value);
        }
      });
      
      const submitResponse = await axios.post('https://youtubetotranscript.com/transcript', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://youtubetotranscript.com/',
          'Origin': 'https://youtubetotranscript.com'
        },
        timeout: 30000,
        maxRedirects: 5
      });
      
      console.log(`Form submission response status: ${submitResponse.status}`);
      console.log(`Form submission response length: ${submitResponse.data?.length || 0}`);
      
      const responseText = submitResponse.data;
      if (typeof responseText === 'string') {
        // Debug: Log the first 500 characters of the response
        console.log(`Form submission response preview: ${responseText.substring(0, 500)}`);
        
        const transcript = extractTranscriptFromResponse(responseText);
        if (transcript) {
          console.log(`Success via form submission: ${transcript.length} characters`);
          return {
            success: true,
            transcript: transcript,
            length: transcript.length,
            source: 'youtubetotranscript.com (/transcript)',
            approach: 'Form submission'
          };
        } else {
          console.log(`Form submission returned content but no transcript extracted`);
        }
      }
    } catch (error: any) {
      console.log(`Form submission to /transcript failed: ${error.message}`);
    }

    // Approach 3: Try to find the actual transcript generation endpoint
    try {
      console.log(`Trying to find transcript generation endpoint...`);
      
      // Look for any JavaScript that might reveal the actual API endpoint
      const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches) {
        for (const script of scriptMatches) {
          const apiMatch = script.match(/["'](\/api\/[^"']+)["']/g);
          if (apiMatch) {
            console.log(`Found potential API endpoints in script:`, apiMatch);
            
            for (const endpoint of apiMatch) {
              const cleanEndpoint = endpoint.replace(/["']/g, '');
              try {
                console.log(`Trying discovered endpoint: ${cleanEndpoint}`);
                
                const response = await axios.post(`https://youtubetotranscript.com${cleanEndpoint}`, {
                  youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
                  url: `https://www.youtube.com/watch?v=${videoId}`
                }, {
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://youtubetotranscript.com/',
                    'Origin': 'https://youtubetotranscript.com'
                  },
                  timeout: 30000
                });

                if (response.data && response.data.transcript) {
                  console.log(`Success via discovered endpoint: ${response.data.transcript.length} characters`);
                  return {
                    success: true,
                    transcript: response.data.transcript,
                    length: response.data.transcript.length,
                    source: `youtubetotranscript.com (${cleanEndpoint})`,
                    approach: 'Discovered API endpoint'
                  };
                }
              } catch (error: any) {
                console.log(`Discovered endpoint ${cleanEndpoint} failed: ${error.message}`);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.log(`Script analysis failed: ${error.message}`);
    }

    // Approach 4: Try to simulate the actual form submission process
    try {
      console.log(`Trying to simulate actual form submission process...`);
      
      // Extract any CSRF tokens or hidden fields from the form
      const csrfMatch = html.match(/<input[^>]*name="[^"]*csrf[^"]*"[^>]*value="([^"]*)"[^>]*>/i) ||
                       html.match(/<input[^>]*value="([^"]*)"[^>]*name="[^"]*csrf[^"]*"[^>]*>/i) ||
                       html.match(/<meta[^>]*name="[^"]*csrf[^"]*"[^>]*content="([^"]*)"[^>]*>/i);
      
      const csrfToken = csrfMatch ? csrfMatch[1] : null;
      console.log(`CSRF token found: ${csrfToken ? 'Yes' : 'No'}`);
      
      // Try different form submission approaches
      const formApproaches = [
        {
          url: 'https://youtubetotranscript.com/transcript',
          data: {
            youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            ...(csrfToken && { _token: csrfToken })
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://youtubetotranscript.com/',
            'Origin': 'https://youtubetotranscript.com',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        },
        {
          url: 'https://youtubetotranscript.com/',
          data: {
            youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            action: 'transcript',
            ...(csrfToken && { _token: csrfToken })
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://youtubetotranscript.com/',
            'Origin': 'https://youtubetotranscript.com',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      ];
      
      for (const approach of formApproaches) {
        try {
          console.log(`Trying form approach: ${approach.url}`);
          
          const formData = new URLSearchParams();
          Object.entries(approach.data).forEach(([key, value]) => {
            if (value) formData.append(key, value as string);
          });
          
          const response = await axios.post(approach.url, formData, {
            headers: approach.headers,
            timeout: 30000,
            maxRedirects: 5
          });
          
          console.log(`Form approach response status: ${response.status}`);
          console.log(`Form approach response length: ${response.data?.length || 0}`);
          
          const responseText = response.data;
          if (typeof responseText === 'string') {
            const transcript = extractTranscriptFromResponse(responseText);
            if (transcript) {
              console.log(`Success via form approach: ${transcript.length} characters`);
              return {
                success: true,
                transcript: transcript,
                length: transcript.length,
                source: 'youtubetotranscript.com (form simulation)',
                approach: 'Form simulation'
              };
            }
          }
        } catch (error: any) {
          console.log(`Form approach failed: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.log(`Form simulation failed: ${error.message}`);
    }
    
    return {
      success: false,
      error: 'All approaches failed',
      source: 'youtubetotranscript.com',
      approach: 'Advanced web scraping',
      debug: {
        pageLength: html.length,
        forms: analysis.forms.length,
        inputs: analysis.inputs.length,
        hasJavaScript: analysis.hasJavaScript,
        hasReact: analysis.hasReact,
        potentialEndpoints: analysis.potentialEndpoints
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      source: 'youtubetotranscript.com',
      approach: 'Advanced web scraping'
    };
  }
}

// Helper function to extract transcript from response
function extractTranscriptFromResponse(responseText: string): string | null {
  console.log(`Extracting transcript from response of length: ${responseText.length}`);
  
  // Check if this is a processed transcript page (contains video-specific data)
  const isProcessedPage = responseText.includes('data-video_id=') || 
                         responseText.includes('data-current_language_code=') ||
                         responseText.includes('data-transcript_categories=');
  
  if (isProcessedPage) {
    console.log(`Response appears to be a processed transcript page`);
  } else {
    // Only check for homepage if it's not a processed page
    const isHomepage = responseText.includes('Get YouTube Transcript for FREE') || 
                      responseText.includes('Bookmark us') ||
                      responseText.includes('cmd+d') ||
                      responseText.includes('youtubetotranscript.png') ||
                      responseText.includes('YouTubeToTranscript.com') ||
                      responseText.includes('Generate YouTube Transcript');
    
    if (isHomepage) {
      console.log(`Response appears to be homepage, not transcript result`);
      return null;
    }
  }
  
  console.log(`Response does not appear to be homepage, proceeding with extraction...`);
  
  // Look for transcript content with more specific patterns
  // First, try to find the main content area
  const mainContentMatch = responseText.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                          responseText.match(/<div[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                          responseText.match(/<div[^>]*id="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  const searchArea = mainContentMatch ? mainContentMatch[1] : responseText;
  console.log(`Search area length: ${searchArea.length}`);
  
  // Look for transcript content with multiple patterns
  const transcriptMatch = searchArea.match(/<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                         searchArea.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i) ||
                         searchArea.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) ||
                         searchArea.match(/<div[^>]*id="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                         searchArea.match(/<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                         searchArea.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                         searchArea.match(/<div[^>]*class="[^"]*output[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                         searchArea.match(/<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  if (transcriptMatch && transcriptMatch[1].trim().length > 100) {
    const transcript = transcriptMatch[1].replace(/<[^>]*>/g, '').trim();
    console.log(`Found transcript match, length: ${transcript.length}`);
    
    // Debug: Show first 200 characters of the transcript
    console.log(`Transcript preview: ${transcript.substring(0, 200)}`);
    
    // More flexible validation: check if it looks like a real transcript
    const hasRealContent = transcript.length > 200 && 
                          !transcript.includes('Bookmark us') &&
                          !transcript.includes('cmd+d') &&
                          !transcript.includes('ctrl+d') &&
                          !transcript.includes('YouTubeToTranscript.com') &&
                          // More flexible punctuation check - some transcripts might not have periods
                          (transcript.includes('.') || transcript.includes('!') || transcript.includes('?') || 
                           transcript.includes(',') || transcript.includes(':') || transcript.includes(';') ||
                           // Check for common transcript patterns
                           transcript.includes('[') || transcript.includes(']') || 
                           transcript.includes('(') || transcript.includes(')') ||
                           // Check for time stamps or speaker indicators
                           /\d{1,2}:\d{2}/.test(transcript) || // Time stamps like 1:23
                           /^[A-Z][a-z]+:/.test(transcript) || // Speaker indicators like "Speaker:"
                           transcript.split('\n').length > 5); // Multiple lines
    
    if (hasRealContent) {
      console.log(`Transcript validation passed`);
      return transcript;
    } else {
      console.log(`Transcript validation failed: length=${transcript.length}, hasRealContent=${hasRealContent}`);
      console.log(`Validation details: hasPeriod=${transcript.includes('.')}, hasComma=${transcript.includes(',')}, hasTimeStamp=${/\d{1,2}:\d{2}/.test(transcript)}, lines=${transcript.split('\n').length}`);
    }
  } else {
    console.log(`No transcript match found with specific patterns`);
  }
  
  // Try to find any text content that might be the transcript
  const allTextContent = responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`All text content length: ${allTextContent.length}`);
  
  // Look for content that appears after "transcript" or similar keywords
  const transcriptKeywords = ['transcript', 'subtitle', 'caption', 'text'];
  for (const keyword of transcriptKeywords) {
    const keywordIndex = allTextContent.toLowerCase().indexOf(keyword);
    if (keywordIndex !== -1) {
      const potentialTranscript = allTextContent.substring(keywordIndex + keyword.length);
      console.log(`Found keyword "${keyword}", potential transcript length: ${potentialTranscript.length}`);
      
      if (potentialTranscript.length > 500) {
        // Additional validation for the extracted content
        const hasRealContent = potentialTranscript.length > 200 && 
                              !potentialTranscript.includes('Bookmark us') &&
                              !potentialTranscript.includes('cmd+d') &&
                              !potentialTranscript.includes('ctrl+d') &&
                              !potentialTranscript.includes('YouTubeToTranscript.com') &&
                              (potentialTranscript.includes('.') || potentialTranscript.includes('!') || potentialTranscript.includes('?'));
        
        if (hasRealContent) {
          console.log(`Potential transcript validation passed`);
          return potentialTranscript;
        } else {
          console.log(`Potential transcript validation failed: length=${potentialTranscript.length}, hasRealContent=${hasRealContent}`);
        }
      }
    }
  }
  
  console.log(`No valid transcript content found`);
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }

    console.log(`Testing external transcript APIs for video ID: ${videoId}`);

    // Test both APIs with advanced web scraping approach
    const [youtubeTranscriptIO, youtubeToTranscript] = await Promise.all([
      testYoutubeTranscriptIO(videoId),
      testYoutubeToTranscript(videoId)
    ]);

    return NextResponse.json({
      videoId,
      tests: {
        youtubeTranscriptIO,
        youtubeToTranscript
      },
      summary: {
        youtubeTranscriptIO_working: youtubeTranscriptIO.success,
        youtubeToTranscript_working: youtubeToTranscript.success,
        working_apis: [youtubeTranscriptIO.success && youtubeTranscriptIO.source, youtubeToTranscript.success && youtubeToTranscript.source].filter(Boolean)
      }
    });

  } catch (error: any) {
    console.error('Test endpoint failed:', error);
    return NextResponse.json({
      error: 'Test endpoint failed',
      details: error.message
    }, { status: 500 });
  }
} 