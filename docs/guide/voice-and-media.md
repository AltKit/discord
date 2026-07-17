# Voice and media

The repository includes voice connection, playback, receive, recording, and video helpers. This is the most environment-sensitive part of the library: codecs, native tools, media devices, network paths, and Discord behavior can all affect results.

## Voice messages versus voice channels

A voice message is an Ogg/Opus attachment sent to a text-based channel. It does not require joining a voice channel. See [messages and polls](./messages-and-polls#voice-messages).

Voice-channel playback establishes a gateway and UDP voice connection, then dispatches encoded audio or video.

## Join a channel

```js
const channel = await client.channels.fetch(process.env.VOICE_CHANNEL_ID);
const connection = await client.voice.joinChannel(channel, {
  selfMute: false,
  selfDeaf: false,
  selfVideo: false,
});
```

The exact join and dispatcher options are documented under [ClientVoiceManager](/api/classes/clientvoicemanager) and [VoiceConnection](/api/classes/voiceconnection).

## Optional dependencies

Media examples may require packages or system tools that are intentionally not runtime dependencies of the core library. Read each file header under `examples/VoiceChannel/` before running it. Common requirements include:

- FFmpeg for probing, decoding, or transcoding;
- Opus support for audio;
- VP8/VP9 or H.264 tooling for video paths;
- native build tools for packages that do not provide a binary for the host platform;
- permission to use microphone, camera, or output devices.

Pin and audit optional dependencies in production just like direct dependencies.

## Resource cleanup

Stop dispatchers, recorders, receive streams, and voice connections when a workflow ends. Also clean them up on process shutdown and after errors. Otherwise the process may retain sockets, file descriptors, codec processes, or large buffers.

```js
try {
  // Join, create a dispatcher, and await completion.
} finally {
  connection?.disconnect();
}
```

Consult the concrete object API for its supported cleanup method; not every media object uses the same verb.

## Recording and privacy

Recording other users may require consent and may be regulated by local law. Clearly indicate when recording is active, minimize retention, restrict access to output, and avoid recording channels where participants have not agreed.

## Troubleshooting media

When voice connects but media does not play:

1. Confirm the input exists and can be decoded outside the application.
2. Verify FFmpeg and optional package versions.
3. Check that the selected dispatcher matches the input codec and container.
4. Inspect voice debug output with credentials and personal data redacted.
5. Check firewall, NAT, and UDP reachability.
6. Reproduce with the smallest corresponding example in `examples/VoiceChannel/`.

Voice and video can break independently: a successful gateway connection does not prove UDP media is flowing.
