'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Loader2, X, CalendarOff } from 'lucide-react'

interface Member {
  id: string
  name: string
}

interface Block {
  id: string
  member_id: string
  blocked_date: string
  reason: string | null
  member: { name: string }
}

export default function BloqueiosPage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [blocksRes, membersRes] = await Promise.all([
      supabase
        .from('member_blocks')
        .select('*, member:members(name)')
        .order('blocked_date', { ascending: false }),
      supabase.from('members').select('id, name').order('name'),
    ])
    setBlocks((blocksRes.data as unknown as Block[]) || [])
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  async function deleteBlock(id: string) {
    await supabase.from('member_blocks').delete().eq('id', id)
    setBlocks(blocks.filter(b => b.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Bloqueios Específicos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-white text-black font-semibold px-3 py-2 rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo
        </button>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">
        Bloqueie membros em datas específicas para que não sejam escalados nesses dias.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <CalendarOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum bloqueio específico cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block) => (
            <div key={block.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">{block.member?.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {format(new Date(block.blocked_date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  {block.reason && ` — ${block.reason}`}
                </p>
              </div>
              <button
                onClick={() => deleteBlock(block.id)}
                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BlockForm
          members={members}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadData() }}
        />
      )}
    </div>
  )
}

function BlockForm({
  members,
  onClose,
  onSave,
}: {
  members: Member[]
  onClose: () => void
  onSave: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedMembers.length === 0 || !date) return
    setLoading(true)

    const inserts = selectedMembers.map(member_id => ({
      member_id,
      blocked_date: date,
      reason: reason || null,
    }))

    await supabase.from('member_blocks').insert(inserts)
    setLoading(false)
    onSave()
  }

  function toggleMember(id: string) {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--card)] w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-lg">Novo Bloqueio</h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Motivo (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: viagem, compromisso..."
            />
          </div>

          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-2 block">
              Membros ({selectedMembers.length} selecionados)
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 bg-[var(--background)] rounded-lg p-2">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[var(--accent)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || selectedMembers.length === 0}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Bloqueio'}
          </button>
        </form>
      </div>
    </div>
  )
}
