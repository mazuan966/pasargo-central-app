
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    return new NextResponse('Endpoint not found.', { status: 404 });
}
