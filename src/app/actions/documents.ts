'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { unlink } from 'fs/promises';
import path from 'path';

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

export async function fetchAllUserDocuments(username: string) {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return [];

    // Query using the correct ownerId and collaborators fields
    const trips = await prisma.trip.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { collaborators: { some: { id: user.id } } }
        ]
      },
      select: { id: true, destination: true }
    });

    const tripMap = new Map(trips.map(t => [t.id, t.destination]));

    const docs = await prisma.document.findMany({
      where: { tripId: { in: Array.from(tripMap.keys()) } },
      orderBy: { uploadedAt: 'desc' }
    });

    // Type cast to handle dynamic addition of tripDestination
    return docs.map((doc: any) => ({
      ...doc,
      tripDestination: tripMap.get(doc.tripId) || 'Unknown Trip'
    }));
  } catch (error) {
    console.error('Failed to fetch user documents:', error);
    return [];
  }
}

export async function deleteDocument(documentId: string) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return { success: false, error: 'Document not found' };

    await prisma.document.delete({ where: { id: documentId } });

    if (doc.fileUrl) {
      const filepath = path.join(process.cwd(), 'public', doc.fileUrl); 
      await unlink(filepath).catch(err => console.warn('File already deleted:', err));
    }

    revalidatePath('/settings', 'page');
    revalidatePath('/itinerary/[id]', 'page');
    revalidatePath('/itinerary/[id]/ledger', 'page');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete document:', error);
    return { success: false, error: 'Failed to delete document' };
  }
}