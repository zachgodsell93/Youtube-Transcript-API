import { YoutubeTranscriptError } from './errors';

export function retrieveVideoId(videoId: string): string {
  if (videoId.length === 11) {
    return videoId;
  }
  const matchId = videoId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/);
  if (matchId && matchId.length > 1) {
    return matchId[1];
  }
  throw new YoutubeTranscriptError('Impossible to retrieve Youtube video ID.');
}

export function decodeHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10))) // Numeric entities
    .replace(/&nbsp;/g, ' ')
    .trim();
}
