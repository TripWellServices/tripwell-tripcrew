'use client'

import { useState } from 'react'

interface LogisticItem {
  id: string
  title: string
  detail?: string | null
  isComplete: boolean
}

interface LogisticsCardProps {
  items: LogisticItem[]
  tripId: string
  isAdmin: boolean
}

export default function LogisticsCard({
  items,
  tripId,
  isAdmin,
}: LogisticsCardProps) {
  const [newTitle, setNewTitle] = useState('')
  const [newDetail, setNewDetail] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!newTitle.trim()) return

    setIsAdding(true)
    try {
      const response = await fetch(`/api/trip/${tripId}/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, detail: newDetail || null }),
      })

      if (response.ok) {
        setNewTitle('')
        setNewDetail('')
        window.location.reload()
      } else {
        alert('Failed to add item')
      }
    } catch (error) {
      console.error('Error adding logistics item:', error)
      alert('Failed to add item')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggle = async (id: string, isComplete: boolean) => {
    try {
      await fetch(`/api/trip/${tripId}/logistics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isComplete: !isComplete }),
      })
      window.location.reload()
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return

    try {
      await fetch(`/api/trip/${tripId}/logistics?id=${id}`, {
        method: 'DELETE',
      })
      window.location.reload()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Logistics</h2>

      {isAdmin && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Item title..."
            className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
          />
          <textarea
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            placeholder="Details (optional)..."
            className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
            rows={2}
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || !newTitle.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Add Item
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500">No logistics items yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
            >
              <input
                type="checkbox"
                checked={item.isComplete}
                onChange={() => handleToggle(item.id, item.isComplete)}
                className="mt-1"
                disabled={!isAdmin}
              />
              <div className="flex-1">
                <p
                  className={
                    item.isComplete
                      ? 'line-through text-gray-500'
                      : 'text-gray-800'
                  }
                >
                  {item.title}
                </p>
                {item.detail && (
                  <p className="text-sm text-gray-600 mt-1">{item.detail}</p>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

