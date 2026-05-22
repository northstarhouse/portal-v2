'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Check, List, Tags } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DonorList, Tag } from '@/lib/types'

interface Props {
  donorIds: string[]
  onClose: () => void
  onDone: () => void
}

const goldBtn = { background: 'var(--gold)' }
const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 text-stone-700"
const TAG_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899']

export default function AddToListModal({ donorIds, onClose, onDone }: Props) {
  const [lists, setLists] = useState<DonorList[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [createMode, setCreateMode] = useState<'list' | 'tag'>('list')
  const [newListName, setNewListName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5])
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: listData }, { data: tagData }] = await Promise.all([
      supabase.from('lists').select('id, name, created_at').order('created_at', { ascending: false }),
      supabase.from('tags').select('id, name, color, created_at').order('name'),
    ])
    setLists(listData ?? [])
    setTags(tagData ?? [])
    setLoading(false)
  }

  async function createAndSelect() {
    if (!newListName.trim()) return
    setCreating(true)
    const { data, error: err } = await supabase
      .from('lists')
      .insert({ name: newListName.trim() })
      .select('id, name, created_at')
      .single()
    if (err) { setError(err.message); setCreating(false); return }
    setLists(prev => [data, ...prev])
    setSelectedListId(data.id)
    setNewListName('')
    setCreating(false)
  }

  async function createTag() {
    if (!newTagName.trim()) return
    setCreating(true)
    setError('')
    const { data, error: err } = await supabase
      .from('tags')
      .insert({ name: newTagName.trim(), color: newTagColor })
      .select()
      .single()
    if (err) { setError(err.message); setCreating(false); return }
    if (data && donorIds.length > 0) {
      await supabase.from('donor_tags').upsert(
        donorIds.map(id => ({ donor_id: id, tag_id: data.id })),
        { onConflict: 'donor_id,tag_id' }
      )
    }
    setNewTagName('')
    setCreating(false)
    setDone(true)
    setTimeout(() => { onDone(); onClose() }, 800)
  }

  async function addToList() {
    if (!selectedListId) return
    setSaving(true)
    setError('')
    const rows = donorIds.map(donor_id => ({ list_id: selectedListId, donor_id }))
    const { error: err } = await supabase.from('list_donors').upsert(rows, { onConflict: 'list_id,donor_id' })
    if (err) { setError(err.message); setSaving(false); return }
    setDone(true)
    setTimeout(() => { onDone(); onClose() }, 800)
  }

  async function addToTag() {
    if (!selectedTagId) return
    setSaving(true)
    setError('')
    const rows = donorIds.map(donor_id => ({ tag_id: selectedTagId, donor_id }))
    const { error: err } = await supabase.from('donor_tags').upsert(rows, { onConflict: 'donor_id,tag_id' })
    if (err) { setError(err.message); setSaving(false); return }
    setDone(true)
    setTimeout(() => { onDone(); onClose() }, 800)
  }

  const selectedList = lists.find(l => l.id === selectedListId)
  const selectedTag = tags.find(t => t.id === selectedTagId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-stone-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-800">Add to List</h2>
            <p className="text-xs text-stone-400 mt-0.5">{donorIds.length} donor{donorIds.length !== 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Create new list or tag */}
          <div>
            <div className="flex items-center gap-1 mb-3">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider mr-1">New</span>
              <button
                onClick={() => setCreateMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${createMode === 'list' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
              >
                <List size={11} /> List
              </button>
              <button
                onClick={() => setCreateMode('tag')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${createMode === 'tag' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
              >
                <Tags size={11} /> Tag
              </button>
            </div>

            {createMode === 'list' ? (
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="List name..."
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createAndSelect() }}
                />
                <button
                  onClick={createAndSelect}
                  disabled={!newListName.trim() || creating}
                  className="flex items-center gap-1 px-3 py-2 text-white text-sm rounded-lg disabled:opacity-40 whitespace-nowrap"
                  style={goldBtn}
                >
                  <Plus size={13} /> Create
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className={inputCls}
                    placeholder="Tag name..."
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createTag() }}
                  />
                  <button
                    onClick={createTag}
                    disabled={!newTagName.trim() || creating || done}
                    className="flex items-center gap-1 px-3 py-2 text-white text-sm rounded-lg disabled:opacity-40 whitespace-nowrap"
                    style={{ background: newTagColor }}
                  >
                    {done ? <Check size={13} /> : <><Plus size={13} /> Create</>}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {TAG_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      className="w-5 h-5 rounded-full flex-shrink-0 transition-all"
                      style={{ background: c, outline: newTagColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Existing lists */}
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 block">Existing Lists</label>
            {loading ? (
              <p className="text-sm text-stone-400 py-2">Loading...</p>
            ) : lists.length === 0 ? (
              <p className="text-sm text-stone-400 italic py-2">No lists yet — create one above.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {lists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => { setSelectedListId(list.id === selectedListId ? null : list.id); setSelectedTagId(null) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors border ${
                      selectedListId === list.id
                        ? 'border-amber-300 bg-amber-50 text-stone-800'
                        : 'border-transparent hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <List size={13} className="text-stone-400 flex-shrink-0" />
                    <span className="flex-1 font-medium">{list.name}</span>
                    {selectedListId === list.id && <Check size={13} className="text-amber-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Existing tags */}
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 block">Existing Tags</label>
            {loading ? (
              <p className="text-sm text-stone-400 py-2">Loading...</p>
            ) : tags.length === 0 ? (
              <p className="text-sm text-stone-400 italic py-2">No tags yet — create one above.</p>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => { setSelectedTagId(tag.id === selectedTagId ? null : tag.id); setSelectedListId(null) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors border ${
                      selectedTagId === tag.id
                        ? 'border-amber-300 bg-amber-50 text-stone-800'
                        : 'border-transparent hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tag.color }} />
                    <span className="flex-1 font-medium">{tag.name}</span>
                    {selectedTagId === tag.id && <Check size={13} className="text-amber-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="border-t border-stone-100 px-5 py-3 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Cancel</button>
          <button
            onClick={selectedTagId ? addToTag : addToList}
            disabled={(!selectedListId && !selectedTagId) || saving || done}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg disabled:opacity-40 font-medium"
            style={goldBtn}
          >
            {done ? <><Check size={13} /> Added!</> : saving ? 'Adding...' : selectedTagId ? `Add to "${selectedTag?.name ?? ''}"` : selectedListId ? `Add to "${selectedList?.name ?? ''}"` : 'Select a list or tag'}
          </button>
        </div>
      </div>
    </div>
  )
}
