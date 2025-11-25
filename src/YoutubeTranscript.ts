import fetch, { RequestInit, Response } from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { DOMParser } from '@xmldom/xmldom';
import { TranscriptItem, YoutubeTranscriptOptions } from './types';
import { YoutubeTranscriptError, VideoUnavailableError, NoTranscriptAvailableError } from './errors';
import { retrieveVideoId, decodeHtml } from './utils';

const WATCH_URL = "https://www.youtube.com/watch?v={videoId}";
const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?key={apiKey}";
const INNERTUBE_CONTEXT = {
  client: {
    clientName: "ANDROID",
    clientVersion: "19.30.36" // Updated to a more recent version similar to backend but ensuring validity
  }
};

export class YoutubeTranscript {
  /**
   * Fetch the transcript for a given YouTube video.
   * @param videoId The YouTube video ID or URL.
   * @param options Configuration options (proxy, language).
   */
  public static async fetchTranscript(videoId: string, options?: YoutubeTranscriptOptions): Promise<TranscriptItem[]> {
    const id = retrieveVideoId(videoId);
    const instance = new YoutubeTranscript(id, options);
    return await instance.getTranscript();
  }

  private videoId: string;
  private options: YoutubeTranscriptOptions;

  constructor(videoId: string, options?: YoutubeTranscriptOptions) {
    this.videoId = videoId;
    this.options = options || {};
  }

  private async getTranscript(): Promise<TranscriptItem[]> {
    try {
      // 1. Fetch Video HTML to get API Key
      const html = await this.fetchVideoHtml();
      
      // 2. Extract Innertube API Key
      const apiKey = this.extractInnertubeApiKey(html);
      if (!apiKey) {
        throw new YoutubeTranscriptError('Could not extract YouTube API key from video page.');
      }

      // 3. Fetch Player Data (Innertube)
      const data = await this.fetchInnertubeData(apiKey);

      // 4. Extract Caption Track URL
      const captionTrack = this.extractCaptionTrack(data);
      if (!captionTrack) {
        // Double check for playability errors
        if (data.playabilityStatus && data.playabilityStatus.status === 'ERROR') {
             throw new VideoUnavailableError(this.videoId);
        }
        throw new NoTranscriptAvailableError(this.videoId);
      }

      // 5. Fetch Transcript XML
      const transcriptXml = await this.fetchTranscriptXml(captionTrack.baseUrl);

      // 6. Parse XML
      return this.parseTranscriptXml(transcriptXml);

    } catch (error) {
      if (error instanceof YoutubeTranscriptError) {
        throw error;
      }
      throw new YoutubeTranscriptError(`Failed to fetch transcript: ${(error as Error).message}`);
    }
  }

  private async fetchVideoHtml(): Promise<string> {
    const url = WATCH_URL.replace('{videoId}', this.videoId);
    const response = await this.fetch(url);
    if (!response.ok) {
      throw new VideoUnavailableError(this.videoId);
    }
    return await response.text();
  }

  private extractInnertubeApiKey(html: string): string | null {
    // Regex matching the backend implementation
    const match = html.match(/"INNERTUBE_API_KEY":"([a-zA-Z0-9_-]+)"/);
    return match ? match[1] : null;
  }

  private async fetchInnertubeData(apiKey: string): Promise<any> {
    const url = INNERTUBE_API_URL.replace('{apiKey}', apiKey);
    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context: INNERTUBE_CONTEXT,
        videoId: this.videoId,
      })
    });

    if (!response.ok) {
      throw new YoutubeTranscriptError(`Failed to fetch player data: ${response.statusText}`);
    }

    return await response.json();
  }

  private extractCaptionTrack(data: any): { baseUrl: string; languageCode: string } | null {
    const captions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) return null;

    const preferredLangs = this.options.lang || ['en'];

    // Try to find the first matching language from the user's list
    for (const lang of preferredLangs) {
        const manual = captions.find((c: any) => c.languageCode === lang && c.kind !== 'asr');
        if (manual) return manual;
        const auto = captions.find((c: any) => c.languageCode === lang && c.kind === 'asr');
        if (auto) return auto;
    }

    // Fallback to the first available if no preference matches
    return captions[0];
  }

  private async fetchTranscriptXml(url: string): Promise<string> {
    const response = await this.fetch(url);
    if (!response.ok) {
      throw new YoutubeTranscriptError(`Failed to fetch transcript XML`);
    }
    return await response.text();
  }

  private parseTranscriptXml(xml: string): TranscriptItem[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');

    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      throw new YoutubeTranscriptError('XML parsing error');
    }

    let paragraphElements = xmlDoc.getElementsByTagName('p');
    let textElements = xmlDoc.getElementsByTagName('text');

    const items: TranscriptItem[] = [];

    // Handle timedtext format (YouTube's current format)
    if (paragraphElements.length > 0) {
      for (let i = 0; i < paragraphElements.length; i++) {
        const p = paragraphElements[i];
        const timeMs = p.getAttribute('t');
        const durationMs = p.getAttribute('d') || '0';

        if (!timeMs) continue;

        const sentences = p.getElementsByTagName('s');
        const textParts: string[] = [];

        for (let j = 0; j < sentences.length; j++) {
          const sentenceText = sentences[j].textContent || '';
          if (sentenceText.trim()) {
            textParts.push(sentenceText);
          }
        }

        const text = textParts.length > 0 ? textParts.join('') : (p.textContent || '');

        if (text.trim()) {
          items.push({
            start: parseFloat(timeMs) / 1000,
            duration: parseFloat(durationMs) / 1000,
            text: decodeHtml(text.trim()),
          });
        }
      }
    }
    // Handle old <text> format
    else if (textElements.length > 0) {
      for (let i = 0; i < textElements.length; i++) {
        const element = textElements[i];
        const start = element.getAttribute('start');
        const dur = element.getAttribute('dur') || element.getAttribute('duration') || '0';
        const text = element.textContent || '';

        if (!start) continue;

        items.push({
          start: parseFloat(start),
          duration: parseFloat(dur),
          text: decodeHtml(text.trim()),
        });
      }
    }

    return items;
  }

  private async fetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(init?.headers || {})
    };

    const fetchOptions: RequestInit = {
        ...init,
        headers
    };

    if (this.options.proxy) {
        const agent = new HttpsProxyAgent(this.options.proxy);
        // @ts-ignore - node-fetch types might not perfectly align with HttpsProxyAgent but it works
        fetchOptions.agent = agent;
    }

    return fetch(url, fetchOptions);
  }
}
