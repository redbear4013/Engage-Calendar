import { NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source') || 'mgto'
  
  try {
    let url = ''
    switch (source) {
      case 'mgto':
        url = 'https://www.macaotourism.gov.mo/en/events/calendar'
        break
      case 'galaxy':
        url = 'https://www.galaxymacau.com/ticketing/event-list/'
        break
      case 'venetian':
        url = 'https://www.venetianmacao.com/entertainment.html'
        break
      case 'londoner':
        url = 'https://www.londonermacao.com/macau-events-shows'
        break
      default:
        return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
    }

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    const $ = cheerio.load(response.data)
    
    // Look for various event-related selectors
    const eventSelectors = [
      'a[href*="/events/"]',
      '.event',
      '.event-item', 
      '.calendar-event',
      '[data-event]',
      '.event-title',
      '.event-link'
    ]
    
    const foundElements = {}
    
    for (const selector of eventSelectors) {
      const elements = $(selector)
      foundElements[selector] = {
        count: elements.length,
        sample_texts: elements.slice(0, 10).map((i, el) => $(el).text().trim()).get()
      }
    }
    
    // Also check for September-specific content
    const septemberContent = []
    $('*').each((i, el) => {
      const text = $(el).text()
      if (text.toLowerCase().includes('september') || text.toLowerCase().includes('sep')) {
        septemberContent.push({
          element: el.tagName,
          text: text.trim().substring(0, 200)
        })
      }
    })
    
    return NextResponse.json({
      url,
      status: response.status,
      title: $('title').text(),
      event_selectors: foundElements,
      september_content: septemberContent.slice(0, 20),
      total_links: $('a').length,
      page_size: response.data.length
    })
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      url
    }, { status: 500 })
  }
}