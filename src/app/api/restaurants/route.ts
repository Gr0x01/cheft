import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const revalidate = 3600;

export async function GET() {
  try {
    const restaurants = await db.getRestaurants();
    return NextResponse.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}
