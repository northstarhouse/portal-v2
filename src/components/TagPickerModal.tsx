'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Tag } from '@/lib/types'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
]

interface Props {
  donorIds: string[]
  onClose: () => void
  onDone: (newTags: Tag[]) => void
}

export default function TagPickerModal({ donorIds, onClose, onDone }: Props) {
  const [tags, setTags] = useState<Tag[]>([])
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[5])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('tags').select('*').order('name').then(({ data, error }) => {
      if (error) setError(`Could not load tags: ${error.message}`)
      else setTags(data ?? [])
    })
    if (donorIds.length === 1) {
      supabase.from('donor_tags').select('tag_id').eq('donor_id', donorIds[0])
        .then(({ data }) => setApplied(new Set((data ?? []).map((r: { tag_id: string }) => r.tag_id))))
    }
  }, [])

  async function toggleTag(tag: Tag) {
    setSaving(tag.id)
    if (applied.has(tag.id)) {
      await Promise.all(donorIds.map(id =>
        supabase.from('donor_tags').delete().eq('donor_id', id).eq('tag_id', tag.id)
      ))
      setApplied(prev => { const n = new Set(prev); n.delete(tag.id); return n })
    } else {
      await supabase.from('donor_tags').upsert(
        donorIds.map(id => ({ donor_id: id, tag_id: tag.id })),
        { onConflict: 'donor_id,tag_id' }
      )
      setApplied(prev => new Set([...prev, tag.id]))
    }
    setSaving(null)
  }

  async function createTag() {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const { data, error: insertErr } = await supabase.from('tags').insert({ name: newName.trim(), color: newColor }).select().single()
    if (insertErr) {
      setError(`Failed to create tag: ${insertErr.message}`)
      setCreating(false)
      return
    }
    if (data) {
      setTags(prev => [...prev, data as Tag].sort((a, b) => a.name.localeCompare(b.name)))
      const { error: upsertErr } = await supabase.from('donor_tags').upsert(
        donorIds.map(id => ({ donor_id: id, tag_id: data.id })),
        { onConflict: 'donor_id,tag_id' }
      )
      if (upsertErr) setError(`Tag created but could not assign: ${upsertErr.message}`)
      else setApplied(prev => new Set([...prev, data.id]))
    }
    setNewName(''); setShowCreate(false); setCreating(false)
  }

  const appliedTags = tags.filter(t => applied.has(t.id))

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800 text-sm">
            {donorIds.length > 1 ? `Tag ${donorIds.length} donors` : 'Manage Tags'}
          </h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {tags.length === 0 && !showCreate && !error && (
            <p className="text-sm text-stone-400 text-center py-4">No tags yet — create one below.</p>
          )}
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag)}
              disabled={saving === tag.id}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors text-left disabled:opacity-50"
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tag.color }} />
              <span className="flex-1 text-sm text-stone-700">{tag.name}</span>
              {applied.has(tag.id) && <Check size={14} className="text-emerald-500 flex-shrink-0" />}
            </button>
          ))}
        </div>

        {showCreate ? (
          <div className="px-5 pb-4 space-y-3 border-t border-stone-100 pt-4">
            <input
              autoFocus
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="Tag name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createTag(); if (e.key === 'Escape') setShowCreate(false) }}
            />
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-full flex-shrink-0 ring-offset-1 transition-all"
                  style={{ background: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createTag} disabled={creating || !newName.trim()}
                className="flex-1 py-2 text-white text-sm rounded-xl font-medium disabled:opacity-40"
                style={{ background: newColor }}>
                {creating ? 'Creating…' : 'Create & Apply'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-stone-100 text-stone-600 text-sm rounded-xl hover:bg-stone-200">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-4 border-t border-stone-100 pt-3 flex items-center justify-between">
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors">
              <Plus size={14} /> New tag
            </button>
            <button onClick={() => onDone(appliedTags)}
              className="px-4 py-1.5 text-white text-sm rounded-xl font-medium"
              style={{ background: 'var(--gold)' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
