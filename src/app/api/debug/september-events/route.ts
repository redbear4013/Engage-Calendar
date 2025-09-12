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
    
    // Look for all September-related content
    const septemberEvents = []
    
    if (source === 'mgto') {
      // Check for September content in MGTO structure
      $('*').each((i, el) => {
        const text = $(el).text()
        if (text.toLowerCase().includes('september') || text.toLowerCase().includes('sep ')) {
          const cleanText = text.trim().replace(/\s+/g, ' ').substring(0, 200)
          if (cleanText.length > 10 && !cleanText.includes('简体中文') && !cleanText.includes('繁體中文')) {
            septemberEvents.push({
              element: el.tagName,
              selector: el.attribs?.class ? `.${el.attribs.class.split(' ').join('.')}` : el.tagName,
              text: cleanText
            })
          }
        }
      })
    } else if (source === 'venetian' || source === 'londoner') {
      // Check for September 2025 events
      $('div').each((i, el) => {
        const text = $(el).text()
        if (/\b\d{1,2}\s+(September|Sep)\s+2025\b/i.test(text) || 
            /\b\d{1,2}\s*-\s*\d{1,2}\s+(September|Sep)\s+2025\b/i.test(text)) {
          const cleanText = text.trim().replace(/\s+/g, ' ').substring(0, 300)
          septemberEvents.push({
            element: 'div',
            selector: el.attribs?.class ? `.${el.attribs.class.split(' ').join('.')}` : 'div',
            text: cleanText
          })
        }
      })
    }
    
    // Remove duplicates
    const uniqueEvents = septemberEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.text === event.text)
    )
    
    return NextResponse.json({
      url,
      source,
      total_september_events: uniqueEvents.length,
      events: uniqueEvents.slice(0, 20) // Limit to first 20
    })
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      url
    }, { status: 500 })
  }
}