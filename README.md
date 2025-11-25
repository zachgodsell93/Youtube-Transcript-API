# Youtube Transcript API

![NPM Version](https://img.shields.io/npm/v/youtube-transcript-api)
![License](https://img.shields.io/npm/l/youtube-transcript-api)
![Downloads](https://img.shields.io/npm/dm/youtube-transcript-api)

A robust, dependency-light Node.js library to fetch transcripts/subtitles for YouTube videos. 

This library is a faithful port of the popular Python [youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api). It allows you to retrieve transcripts without an API key, supports multiple languages, and offers optional proxy support for heavy usage.

## 🚀 Features

*   **Zero Configuration:** Works out of the box for standard usage.
*   **No API Key Required:** Scrapes the video page just like a web browser.
*   **Multi-Language Support:** Automatically finds transcripts in your preferred language(s).
*   **Auto-Generated Captions:** Falls back to auto-generated captions if manual ones aren't available.
*   **Optional Proxy Support:** Easily integrate your own proxy (HTTP/HTTPS) to avoid rate limits during high-volume scraping.
*   **Lightweight:** Minimal dependencies (`node-fetch`, `@xmldom/xmldom`, `https-proxy-agent`).

## 📦 Installation

```bash
npm install youtube-transcript-api
```

## 🛠 Usage

### 1. Basic Usage (No Proxy Needed)

For most use cases, you don't need any special configuration. Just pass the video ID or URL.

```typescript
import { YoutubeTranscript } from 'youtube-transcript-api';

// Fetch transcript for a video
try {
  const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ');
  
  console.log(transcript[0]); 
  // { text: "We're no strangers to love", start: 0.1, duration: 2.3 }
  
} catch (error) {
  console.error(error);
}
```

### 2. Language Preference

You can specify a list of preferred languages. The API will try them in order.

```typescript
const options = {
  lang: ['de', 'es', 'en'] // Try German, then Spanish, then English
};

const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ', options);
```

### 3. Using a Proxy (Optional)

If you are scraping thousands of videos and hitting rate limits (HTTP 429), you can provide a proxy URL. The library handles the connection details for you.

> **Note:** We do not provide free proxies. You must supply your own proxy string from a provider like Webshare, BrightData, etc.

```typescript
const options = {
  // Format: protocol://user:pass@host:port
  proxy: 'http://myuser:mypassword@123.45.67.89:8080' 
};

try {
  const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ', options);
  console.log('Fetched via proxy!');
} catch (error) {
  console.error('Proxy failed:', error);
}
```

## 📚 API Reference

### `YoutubeTranscript.fetchTranscript(videoId, options?)`

#### Parameters

| Param | Type | Description |
| :--- | :--- | :--- |
| `videoId` | `string` | The YouTube Video ID (e.g., `dQw4w9WgXcQ`) or full URL. |
| `options` | `object` | Optional configuration object. |

#### Options Object

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `lang` | `string[]` | `['en']` | Priority list of language codes to search for. |
| `proxy` | `string` | `undefined` | Proxy connection string (e.g., `http://user:pass@host:port`). |

#### Return Value

Returns a `Promise` that resolves to an array of `TranscriptItem` objects:

```typescript
interface TranscriptItem {
  text: string;     // The subtitle text content
  start: number;    // Start time in seconds (float)
  duration: number; // Duration in seconds (float)
}
```

## ⚠️ Error Handling

The library throws specific error classes to help you handle different failure scenarios.

```typescript
import { 
  YoutubeTranscript, 
  YoutubeTranscriptError, 
  VideoUnavailableError, 
  TranscriptDisabledError 
} from 'youtube-transcript-api';

try {
  await YoutubeTranscript.fetchTranscript(videoId);
} catch (error) {
  if (error instanceof VideoUnavailableError) {
    console.error("Video is private or deleted.");
  } else if (error instanceof TranscriptDisabledError) {
    console.error("Transcripts are disabled for this video.");
  } else {
    console.error("General error:", error.message);
  }
}
```

## 📄 License

MIT © [Zach Godsell](https://github.com/zachgodsell)