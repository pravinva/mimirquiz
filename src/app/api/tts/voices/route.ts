import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Cloud TTS API key not configured' }, { status: 500 });
    }

    const languageCode = req.nextUrl.searchParams.get('languageCode') || 'en-US';

    // Fetch available voices from Google Cloud TTS API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}&languageCode=${languageCode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Google TTS Voices API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch voices' },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Google TTS API returns { voices: [...] }
    // Ensure we return the voices array properly
    return NextResponse.json({ voices: data.voices || [] });
  } catch (error) {
    console.error('TTS voices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

