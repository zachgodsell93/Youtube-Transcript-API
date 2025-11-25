import { retrieveVideoId, decodeHtml } from '../src/utils';
import { YoutubeTranscriptError } from '../src/errors';

describe('Utils', () => {
  describe('retrieveVideoId', () => {
    it('should return the video ID if it is already 11 characters', () => {
      expect(retrieveVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from standard URL', () => {
      expect(retrieveVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from short URL', () => {
      expect(retrieveVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL', () => {
      expect(retrieveVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from mobile URL', () => {
      expect(retrieveVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should throw an error for invalid URLs', () => {
      expect(() => retrieveVideoId('https://www.google.com')).toThrow(YoutubeTranscriptError);
    });
  });

  describe('decodeHtml', () => {
    it('should decode standard HTML entities', () => {
      expect(decodeHtml('&amp; &lt; &gt; &quot; &apos;')).toBe('& < > " \'');
    });

    it('should decode numeric entities', () => {
      expect(decodeHtml('&#39; &#32;')).toBe("'");
    });

    it('should handle non-breaking spaces', () => {
      expect(decodeHtml('Hello&nbsp;World')).toBe('Hello World');
    });

    it('should return empty string for null/undefined', () => {
      // @ts-ignore
      expect(decodeHtml(null)).toBe('');
      // @ts-ignore
      expect(decodeHtml(undefined)).toBe('');
    });
  });
});
