/**
 * Carga el video solo cuando el visitante lo pide (click-to-load):
 * nada de YouTube ni MP4 en la carga inicial.
 *
 * Para publicar el video, en index.html poné:
 *   data-youtube-id="ABC123"      → video de YouTube
 *   data-video-src="assets/mi.mp4" → archivo propio
 */
(function () {
  'use strict';

  var YOUTUBE_HOST = 'https://www.youtube-nocookie.com/embed/';

  function buildYoutube(id) {
    var frame = document.createElement('iframe');
    frame.src = YOUTUBE_HOST + encodeURIComponent(id) + '?autoplay=1&rel=0&modestbranding=1';
    frame.title = 'Video de presentación de Blue Phoenix Lab';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    return frame;
  }

  function buildVideo(src) {
    var video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    return video;
  }

  function setUp(embed) {
    var youtubeId = (embed.getAttribute('data-youtube-id') || '').trim();
    var videoSrc = (embed.getAttribute('data-video-src') || '').trim();
    var play = embed.querySelector('.video-embed__play');
    var placeholder = embed.querySelector('[data-video-placeholder]');

    if (!play) { return; }

    if (!youtubeId && !videoSrc) {
      play.disabled = true;
      play.setAttribute('aria-disabled', 'true');
      return;
    }

    if (placeholder) { placeholder.hidden = true; }

    play.addEventListener('click', function () {
      var media = youtubeId ? buildYoutube(youtubeId) : buildVideo(videoSrc);
      embed.replaceChildren(media);
    });
  }

  document.querySelectorAll('.video-embed').forEach(setUp);
})();
