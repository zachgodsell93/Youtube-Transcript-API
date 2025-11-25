export class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YoutubeTranscriptError';
  }
}

export class TranscriptDisabledError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`Transcript is disabled for video ${videoId}`);
    this.name = 'TranscriptDisabledError';
  }
}

export class VideoUnavailableError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`Video ${videoId} is unavailable`);
    this.name = 'VideoUnavailableError';
  }
}

export class NoTranscriptAvailableError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`No transcript available for video ${videoId}`);
    this.name = 'NoTranscriptAvailableError';
  }
}
