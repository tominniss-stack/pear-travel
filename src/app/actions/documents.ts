'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function linkDocumentToPOI(documentId: string, poiId: string) {
  try {
    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: { poiId: poiId }
    });
    
    revalidatePath('/itinerary/[id]', 'page');
    return { success: true, document: updatedDoc };
  } catch (error) {
    console.error('Failed to link document:', error);
    throw new Error('Could not link document to activity.');
  }
}

export async function fetchTripDocuments(tripId: string) {
  try {
    const docs = await prisma.document.findMany({
      where: { tripId },
      orderBy: { uploadedAt: 'desc' }
    });
    return docs;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
}