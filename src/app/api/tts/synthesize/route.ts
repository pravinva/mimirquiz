import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, languageCode = 'en-US', voiceName = 'en-US-Neural2-D', speakingRate = 1.0, pitch = 0 } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Cloud TTS API key not configured' }, { status: 500 });
    }

    // Call Google Cloud Text-to-Speech API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate,
            pitch,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Google TTS API error:', error);
      return NextResponse.json(
        { error: 'Failed to synthesize speech' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioContent, 'base64');

    // Return audio as MP3
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS synthesis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

