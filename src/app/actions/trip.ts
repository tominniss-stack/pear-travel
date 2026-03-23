'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Toggle the 'Planning' vs 'Booked' status
export async function toggleTripBookingStatus(tripId: string, currentStatus: boolean) {
  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { isBooked: !currentStatus },
    })
    revalidatePath(`/itinerary/${tripId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to toggle booking status:', error)
    return { success: false }
  }
}

// Rename a trip (from our feature backlog!)
export async function renameTrip(tripId: string, newTitle: string) {
  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { title: newTitle },
    })
    revalidatePath(`/itinerary/${tripId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}