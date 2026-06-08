'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  getActiveNavGroupId,
  isNavActive,
  NAV_FEATURE_GROUPS,
  NAV_TOP_LEVEL,
} from '@/lib/app-nav-features'

export default function AppSidebar() {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    const activeGroup = getActiveNavGroupId(pathname)
    if (activeGroup) {
      setExpandedGroups(new Set([activeGroup]))
    }
  }, [pathname])

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const linkClass = (active: boolean) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition ${
      active
        ? 'bg-sky-100 text-sky-800'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <nav className="p-2 flex-1 space-y-1 pt-4">
        <Link
          href="/home"
          className={linkClass(pathname === '/home')}
        >
          Dashboard
        </Link>

        {NAV_FEATURE_GROUPS.map((group) => {
          const expanded = expandedGroups.has(group.id)
          const groupActive = group.features.some((f) =>
            isNavActive(pathname, f.path, f.prefix)
          )
          return (
            <div key={group.id} className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  groupActive
                    ? 'text-sky-800 bg-sky-50'
                    : 'text-gray-800 hover:bg-gray-100'
                }`}
              >
                <span>{group.name}</span>
                <span className="text-gray-400 text-xs">{expanded ? '−' : '+'}</span>
              </button>
              {expanded ? (
                <div className="ml-2 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                  {group.features.map((feature) => (
                    <Link
                      key={feature.id}
                      href={feature.path}
                      className={linkClass(
                        isNavActive(pathname, feature.path, feature.prefix)
                      )}
                    >
                      {feature.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}

        {NAV_TOP_LEVEL.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className={linkClass(isNavActive(pathname, item.path, item.prefix))}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
