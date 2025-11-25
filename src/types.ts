export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

export interface YoutubeTranscriptOptions {
  /**
   * Optional: A proxy URL to use for fetching. E.g., 'http://localhost:8080' or 'socks5://myproxy.com:9000'.
   */
  proxy?: string;
  /**
   * Optional: Array of language codes in descending priority. Defaults to ['en'].
   * Example: ['de', 'en'] will try German first, then English.
   */
  lang?: string[];
}
