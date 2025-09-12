'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Source {
  id: string
  type: 'rss' | 'newsapi' | 'web_scraper'
  name: string
  url?: string
  active: boolean
  created_at: string
  updated_at: string
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [newSource, setNewSource] = useState({
    type: 'web_scraper' as const,
    name: '',
    url: '',
    active: true
  })

  useEffect(() => {
    fetchSources()
  }, [])

  async function fetchSources() {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSources(data || [])
    } catch (error) {
      console.error('Error fetching sources:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addSource() {
    if (!newSource.name || (newSource.type === 'web_scraper' && !newSource.url)) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { error } = await supabase
        .from('sources')
        .insert([newSource])

      if (error) throw error

      setNewSource({
        type: 'web_scraper',
        name: '',
        url: '',
        active: true
      })
      fetchSources()
    } catch (error) {
      console.error('Error adding source:', error)
      alert('Failed to add source')
    }
  }

  async function toggleSourceStatus(sourceId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('sources')
        .update({ active: !currentStatus })
        .eq('id', sourceId)

      if (error) throw error
      fetchSources()
    } catch (error) {
      console.error('Error updating source:', error)
    }
  }

  async function deleteSource(sourceId: string) {
    if (!confirm('Are you sure you want to delete this source?')) return

    try {
      const { error } = await supabase
        .from('sources')
        .delete()
        .eq('id', sourceId)

      if (error) throw error
      fetchSources()
    } catch (error) {
      console.error('Error deleting source:', error)
    }
  }

  async function testSource(source: Source) {
    try {
      if (source.type === 'web_scraper') {
        const response = await fetch('/api/scrape-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: source.url,
            sourceName: source.name
          })
        })

        const result = await response.json()
        if (result.success) {
          alert(`✅ Successfully scraped ${result.count} events from ${source.name}`)
        } else {
          alert(`❌ Failed to scrape: ${result.error}`)
        }
      } else {
        alert(`Testing ${source.type} sources is not yet implemented`)
      }
    } catch (error) {
      console.error('Error testing source:', error)
      alert('Failed to test source')
    }
  }

  function getSourceTypeLabel(type: string) {
    switch (type) {
      case 'rss': return 'RSS Feed'
      case 'newsapi': return 'News API'
      case 'web_scraper': return 'Web Scraper'
      default: return type
    }
  }

  function getSourceTypeColor(type: string) {
    switch (type) {
      case 'rss': return 'bg-blue-100 text-blue-800'
      case 'newsapi': return 'bg-green-100 text-green-800'
      case 'web_scraper': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-6">Loading sources...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Event Sources</h1>
        <p className="text-gray-600">Manage your event data sources</p>
      </div>

      {/* Add New Source */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Source</CardTitle>
          <CardDescription>Configure a new event data source</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={newSource.type}
              onChange={(e) => setNewSource({ ...newSource, type: e.target.value as any })}
              className="border rounded-md px-3 py-2"
            >
              <option value="rss">RSS Feed</option>
              <option value="newsapi">News API</option>
              <option value="web_scraper">Web Scraper</option>
            </select>
            
            <Input
              placeholder="Source Name"
              value={newSource.name}
              onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
            />
            
            <Input
              placeholder={newSource.type === 'newsapi' ? 'API Key (optional)' : 'URL'}
              value={newSource.url}
              onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
            />
            
            <Button onClick={addSource} className="w-full">
              Add Source
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sources List */}
      <div className="space-y-4">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge className={getSourceTypeColor(source.type)}>
                    {getSourceTypeLabel(source.type)}
                  </Badge>
                  
                  <div>
                    <h3 className="font-semibold">{source.name}</h3>
                    {source.url && (
                      <p className="text-sm text-gray-600">{source.url}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant={source.active ? 'default' : 'secondary'}>
                    {source.active ? 'Active' : 'Inactive'}
                  </Badge>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testSource(source)}
                  >
                    Test
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSourceStatus(source.id, source.active)}
                  >
                    {source.active ? 'Disable' : 'Enable'}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSource(source.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Created: {new Date(source.created_at).toLocaleDateString()}
                {source.updated_at !== source.created_at && (
                  <> • Updated: {new Date(source.updated_at).toLocaleDateString()}</>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {sources.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No sources configured yet. Add your first source above.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
