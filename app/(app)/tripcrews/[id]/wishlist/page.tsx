'use client'

import { useParams } from 'next/navigation'
import WishlistView from '@/app/components/wishlist/WishlistView'

export default function WishlistPage() {
  const params = useParams()
  return (
    <WishlistView wishlistBackHref={`/tripcrews/${params.id as string}/wishlist`} />
  )
}
