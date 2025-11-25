import { YoutubeTranscript } from '../src/YoutubeTranscript';
import { VideoUnavailableError, NoTranscriptAvailableError } from '../src/errors';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

// Helper to create a mock response
const mockFetch = fetch as unknown as jest.Mock;

describe('YoutubeTranscript', () => {
  const VIDEO_ID = 'dQw4w9WgXcQ';
  const API_KEY = 'TEST_API_KEY';

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch and parse a transcript successfully', async () => {
    // 1. Mock Video Page HTML (Strict JSON format for regex match)
    mockFetch.mockResolvedValueOnce(new Response(
      `<html><body><script>var ytcfg = {"INNERTUBE_API_KEY":"${API_KEY}"};</script></body></html>`
    ));

    // 2. Mock Innertube API Response
    const mockInnertubeResponse = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              baseUrl: 'https://youtube.com/api/timedtext?v=123',
              languageCode: 'en',
              kind: 'standard'
            }
          ]
        }
      }
    };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockInnertubeResponse)));

    // 3. Mock XML Transcript
    const mockXml = `
      <transcript>
        <text start="0" dur="2.5">Hello World</text>
        <text start="2.5" dur="1.5">This is a test</text>
      </transcript>
    `;
    mockFetch.mockResolvedValueOnce(new Response(mockXml));

    const transcript = await YoutubeTranscript.fetchTranscript(VIDEO_ID);

    expect(transcript).toHaveLength(2);
    expect(transcript[0]).toEqual({
      text: 'Hello World',
      start: 0,
      duration: 2.5
    });
    expect(transcript[1]).toEqual({
      text: 'This is a test',
      start: 2.5,
      duration: 1.5
    });

    // Verify fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should handle different XML format (paragraph/s tags)', async () => {
    // 1. HTML
    mockFetch.mockResolvedValueOnce(new Response(`"INNERTUBE_API_KEY":"${API_KEY}"`));
    
    // 2. Innertube
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: 'http://xml', languageCode: 'en' }] } }
    })));

    // 3. XML (New format)
    const mockXml = `
      <transcript>
        <p t="1000" d="2000"><s>Hello</s><s> World</s></p>
      </transcript>
    `;
    mockFetch.mockResolvedValueOnce(new Response(mockXml));

    const transcript = await YoutubeTranscript.fetchTranscript(VIDEO_ID);

    expect(transcript[0]).toEqual({
      text: 'Hello World',
      start: 1.0,
      duration: 2.0
    });
  });

  it('should throw VideoUnavailableError if video page fails to load', async () => {
    mockFetch.mockResolvedValueOnce(new Response('', { status: 404 }));

    await expect(YoutubeTranscript.fetchTranscript(VIDEO_ID))
      .rejects.toThrow(VideoUnavailableError);
  });

  it('should throw NoTranscriptAvailableError if no captions found', async () => {
    // 1. HTML
    mockFetch.mockResolvedValueOnce(new Response(`"INNERTUBE_API_KEY":"${API_KEY}"`));

    // 2. Innertube (No captions)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [] // Empty
        }
      }
    })));

    await expect(YoutubeTranscript.fetchTranscript(VIDEO_ID))
      .rejects.toThrow(NoTranscriptAvailableError);
  });

  it('should respect language preference', async () => {
    // 1. HTML
    mockFetch.mockResolvedValueOnce(new Response(`"INNERTUBE_API_KEY":"${API_KEY}"`));

    // 2. Innertube (Multiple languages)
    const mockInnertubeResponse = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            { baseUrl: 'http://en', languageCode: 'en' },
            { baseUrl: 'http://de', languageCode: 'de' },
            { baseUrl: 'http://es', languageCode: 'es' }
          ]
        }
      }
    };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockInnertubeResponse)));

    // 3. XML
    mockFetch.mockResolvedValueOnce(new Response('<transcript><text start="0" dur="1">German Text</text></transcript>'));

    // Request German
    await YoutubeTranscript.fetchTranscript(VIDEO_ID, { lang: ['de', 'en'] });

    // Verify it fetched the German URL
    expect(mockFetch).toHaveBeenLastCalledWith('http://de', expect.anything());
  });
  
  it('should handle auto-generated captions correctly', async () => {
       // 1. HTML
      mockFetch.mockResolvedValueOnce(new Response(`"INNERTUBE_API_KEY":"${API_KEY}"`));
  
      // 2. Innertube (Auto-generated only)
      const mockInnertubeResponse = {
        captions: {
          playerCaptionsTracklistRenderer: {
            captionTracks: [
              { baseUrl: 'http://auto-en', languageCode: 'en', kind: 'asr' }
            ]
          }
        }
      };
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockInnertubeResponse)));
  
      // 3. XML
      mockFetch.mockResolvedValueOnce(new Response('<transcript><text start="0" dur="1">Auto Text</text></transcript>'));
  
      await YoutubeTranscript.fetchTranscript(VIDEO_ID);
      
      expect(mockFetch).toHaveBeenLastCalledWith('http://auto-en', expect.anything());
  });
});