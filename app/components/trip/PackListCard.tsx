'use client'

import { useState } from 'react'

interface PackItem {
  id: string
  title: string
  isPacked: boolean
}

interface PackListCardProps {
  items: PackItem[]
  tripId: string
  isAdmin: boolean
}

export default function PackListCard({
  items,
  tripId,
  isAdmin,
}: PackListCardProps) {
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!newTitle.trim()) return

    setIsAdding(true)
    try {
      const response = await fetch(`/api/trip/${tripId}/pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })

      if (response.ok) {
        setNewTitle('')
        window.location.reload()
      } else {
        alert('Failed to add item')
      }
    } catch (error) {
      console.error('Error adding pack item:', error)
      alert('Failed to add item')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggle = async (id: string, isPacked: boolean) => {
    try {
      await fetch(`/api/trip/${tripId}/pack`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPacked: !isPacked }),
      })
      window.location.reload()
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return

    try {
      await fetch(`/api/trip/${tripId}/pack?id=${id}`, {
        method: 'DELETE',
      })
      window.location.reload()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const packedCount = items.filter((item) => item.isPacked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (packedCount / totalCount) * 100 : 0

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">What to Pack</h2>
        {totalCount > 0 && (
          <span className="text-sm text-gray-600">
            {packedCount} / {totalCount} packed
          </span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add item to pack..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || !newTitle.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500">No items to pack yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
            >
              <input
                type="checkbox"
                checked={item.isPacked}
                onChange={() => handleToggle(item.id, item.isPacked)}
                className="w-5 h-5"
              />
              <span
                className={
                  item.isPacked
                    ? 'line-through text-gray-500 flex-1'
                    : 'text-gray-800 flex-1'
                }
              >
                {item.title}
              </span>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700 text-xl"
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

