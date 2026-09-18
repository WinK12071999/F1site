/**
 * Home cinema — seamless forward loop.
 */
(function () {
  'use strict';

  var body = document.body;
  if (!body || body.getAttribute('data-page') !== 'home') return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VIDEO_SRC = 'assets/cinema/atelier-loop.mp4?v=studio';
  var POSTER = 'assets/cinema/atelier-loop.jpg?v=studio';
  var RATE = 1;
  var FADE_SEC = 0.55;
  var LIVERIES = [
    { hue: 0, sat: 1 }
  ];

  body.classList.add('has-circuit');
  body.classList.add('has-cinema');

  var root;
  var camera;
  var canvas;
  var painter;
  var videos = [];
  var live = 0;
  var duration = 0;
  var swapping = false;
  var swapStarted = 0;
  var started = false;
  var colorIndex = 0;
  var hueLive = LIVERIES[0].hue;
  var satLive = LIVERIES[0].sat;
  var hueNext = LIVERIES[0].hue;
  var satNext = LIVERIES[0].sat;
  var raf = 0;
  var camRaf = 0;
  var mouseX = 0;
  var mouseY = 0;
  var targetMX = 0;
  var targetMY = 0;
  var introBlend = 0;

  try {
    var liveryParam = /(?:\?|&)livery=(\d+)/.exec(location.search);
    if (liveryParam) {
      colorIndex = (parseInt(liveryParam[1], 10) - 1 + LIVERIES.length) % LIVERIES.length;
    }
  } catch (err) {}

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function introActive() {
    var el = document.documentElement;
    return el.classList.contains('cin-playing') || el.classList.contains('cin-pending');
  }

  function liveryAt(index) {
    return LIVERIES[index % LIVERIES.length];
  }

  function videoHtml(extraClass) {
    return (
      '<video class="rain-drive ' + extraClass + '" muted playsinline webkit-playsinline preload="auto" ' +
      'disablePictureInPicture controlslist="nodownload nofullscreen noremoteplayback" ' +
      'poster="' + POSTER + '">' +
        '<source src="' + VIDEO_SRC + '" type="video/mp4">' +
      '</video>'
    );
  }

  function ensureStage() {
    root = document.querySelector('.rain-cinema');
    if (!root) {
      root = document.createElement('div');
      root.className = 'rain-cinema';
      root.setAttribute('aria-hidden', 'true');
      root.innerHTML =
        '<div class="rain-bars rain-bars-top"></div>' +
        '<div class="rain-bloom"></div>' +
        '<div class="rain-camera">' +
          '<canvas class="rain-paint"></canvas>' +
          videoHtml('is-live') +
          videoHtml('') +
        '</div>' +
        '<div class="rain-veil"></div>' +
        '<div class="rain-vignette"></div>' +
        (reduced ? '' : '<div class="rain-grain"></div>') +
        '<div class="rain-bars rain-bars-bot"></div>';
      body.insertBefore(root, body.firstChild);
    }

    camera = root.querySelector('.rain-camera');
    if (camera && !root.querySelector('.rain-paint')) {
      camera.insertAdjacentHTML('afterbegin', '<canvas class="rain-paint"></canvas>');
    }
    if (camera && !root.querySelector('.rain-drive')) {
      camera.insertAdjacentHTML('beforeend', videoHtml('is-live') + videoHtml(''));
    }
    if (!root.querySelector('.rain-bars')) {
      root.insertAdjacentHTML('afterbegin', '<div class="rain-bars rain-bars-top"></div>');
      root.insertAdjacentHTML('beforeend', '<div class="rain-bars rain-bars-bot"></div>');
    }

    canvas = root.querySelector('.rain-paint');
    videos = [].slice.call(root.querySelectorAll('.rain-drive'));
    if (videos.length === 1) {
      videos[0].insertAdjacentHTML('afterend', videoHtml(''));
      videos = [].slice.call(root.querySelectorAll('.rain-drive'));
    }
  }

  function prep(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.controls = false;
    video.loop = false;
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    try {
      video.playbackRate = RATE;
    } catch (err) {}
    if (!video.querySelector('source') && !video.getAttribute('src')) {
      video.src = VIDEO_SRC;
    }
  }

  function applyLivery(index, asNext) {
    var paint = liveryAt(index);
    if (asNext) {
      hueNext = paint.hue;
      satNext = paint.sat;
    } else {
      hueLive = paint.hue;
      satLive = paint.sat;
    }
    if (root) root.setAttribute('data-livery', String((index % LIVERIES.length) + 1));
  }

  function nextLivery() {
    colorIndex = (colorIndex + 1) % LIVERIES.length;
    return colorIndex;
  }

  function playClip(video, at) {
    if (!video) return;
    if (typeof at === 'number' && Math.abs((video.currentTime || 0) - at) > 0.12) {
      try {
        video.currentTime = at;
      } catch (err) {}
    }
    if (video.paused || video.ended) {
      var attempt = video.play();
      if (attempt && attempt.catch) attempt.catch(function () {});
    }
  }

  function compileShader(gl, type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function makeTexture(gl) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return texture;
  }

  function createPainter(el) {
    if (!el) return null;
    var gl = el.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });
    if (!gl) return null;

    var vertSrc =
      'attribute vec2 a_pos;' +
      'varying vec2 v_uv;' +
      'void main(){' +
      '  v_uv = vec2(a_pos.x * 0.5 + 0.5, a_pos.y * 0.5 + 0.5);' +
      '  gl_Position = vec4(a_pos, 0.0, 1.0);' +
      '}';

    var fragSrc =
      'precision mediump float;' +
      'varying vec2 v_uv;' +
      'uniform sampler2D u_a;' +
      'uniform sampler2D u_b;' +
      'uniform float u_mix;' +
      'uniform vec2 u_live;' +
      'uniform vec2 u_next;' +
      'vec3 rgb2hsv(vec3 c){' +
      '  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);' +
      '  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));' +
      '  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));' +
      '  float d = q.x - min(q.w, q.y);' +
      '  float e = 1.0e-10;' +
      '  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);' +
      '}' +
      'vec3 hsv2rgb(vec3 c){' +
      '  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);' +
      '  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);' +
      '  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);' +
      '}' +
      'vec3 paint(vec3 rgb, vec2 livery){' +
      '  vec3 hsv = rgb2hsv(rgb);' +
      '  float chroma = max(rgb.r, max(rgb.g, rgb.b)) - min(rgb.r, min(rgb.g, rgb.b));' +
      '  float hueDist = min(abs(hsv.x - 0.57), 1.0 - abs(hsv.x - 0.57));' +
      '  float mask = (1.0 - smoothstep(0.035, 0.09, hueDist));' +
      '  mask *= smoothstep(0.32, 0.48, hsv.y);' +
      '  mask *= smoothstep(0.14, 0.26, hsv.z);' +
      '  mask *= 1.0 - smoothstep(0.88, 0.97, hsv.z);' +
      '  mask *= smoothstep(0.12, 0.22, chroma);' +
      '  mask *= smoothstep(0.05, 0.12, rgb.b - rgb.r);' +
      '  mask *= smoothstep(0.0, 0.08, rgb.b - rgb.g);' +
      '  vec3 shifted = hsv;' +
      '  shifted.x = fract(hsv.x + livery.x);' +
      '  shifted.y = clamp(hsv.y * livery.y, 0.0, 1.0);' +
      '  return mix(rgb, hsv2rgb(shifted), clamp(mask, 0.0, 1.0));' +
      '}' +
      'void main(){' +
      '  vec3 a = paint(texture2D(u_a, v_uv).rgb, u_live);' +
      '  if (u_mix < 0.001) {' +
      '    gl_FragColor = vec4(a, 1.0);' +
      '    return;' +
      '  }' +
      '  vec3 b = paint(texture2D(u_b, v_uv).rgb, u_next);' +
      '  gl_FragColor = vec4(mix(a, b, clamp(u_mix, 0.0, 1.0)), 1.0);' +
      '}';

    var vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return null;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'a_pos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var locA = gl.getUniformLocation(program, 'u_a');
    var locB = gl.getUniformLocation(program, 'u_b');
    var locMix = gl.getUniformLocation(program, 'u_mix');
    var locLive = gl.getUniformLocation(program, 'u_live');
    var locNext = gl.getUniformLocation(program, 'u_next');
    gl.uniform1i(locA, 0);
    gl.uniform1i(locB, 1);

    var texA = makeTexture(gl);
    var texB = makeTexture(gl);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    function bindVideo(unit, texture, video) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (video && video.readyState >= 2) {
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        } catch (err) {}
      }
    }

    function resize(video) {
      var w = (video && video.videoWidth) || 1280;
      var h = (video && video.videoHeight) || 720;
      var maxW = 1280;
      if (w > maxW) {
        h = Math.round(h * maxW / w);
        w = maxW;
      }
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    return {
      draw: function (videoA, videoB, mix, livePair, nextPair) {
        resize(videoA || videoB);
        gl.useProgram(program);
        bindVideo(0, texA, videoA);
        bindVideo(1, texB, mix > 0.001 ? videoB : null);
        gl.uniform1f(locMix, mix || 0);
        gl.uniform2f(locLive, livePair[0], livePair[1]);
        gl.uniform2f(locNext, nextPair[0], nextPair[1]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };
  }

  function fadeAmount() {
    if (!swapping) return 0;
    return clamp((performance.now() - swapStarted) / (FADE_SEC * 1000), 0, 1);
  }

  function paintFrame() {
    if (!painter) return;
    var a = videos[live];
    var b = videos[1 - live];
    painter.draw(a, b, fadeAmount(), [hueLive, satLive], [hueNext, satNext]);
  }

  function startCinema() {
    if (reduced || !videos.length) return;
    if (root) root.classList.add('is-driving');
    if (!started) {
      started = true;
      live = 0;
      videos[0].classList.add('is-live');
      if (videos[1]) videos[1].classList.remove('is-live');
      applyLivery(colorIndex, false);
      playClip(videos[0], 0);
    } else {
      playClip(videos[live]);
    }
    if (!raf) {
      function tick() {
        tickLoop();
        paintFrame();
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }
  }

  function tickLoop() {
    var a = videos[live];
    var b = videos[1 - live];
    if (!a || document.hidden) return;

    if (a.paused && !document.hidden) playClip(a);

    if (!duration || duration < 0.4) {
      if (a.duration && isFinite(a.duration)) duration = a.duration;
      return;
    }

    var now = a.currentTime || 0;
    var remain = duration - now;
    if (!swapping && remain <= FADE_SEC && now > 1) {
      swapping = true;
      swapStarted = performance.now();
      if (b) {
        applyLivery(nextLivery(), true);
        playClip(b, 0);
        b.classList.add('is-live');
        a.classList.remove('is-live');
        window.setTimeout(function () {
          try {
            a.pause();
            a.currentTime = 0;
          } catch (err) {}
          live = 1 - live;
          hueLive = hueNext;
          satLive = satNext;
          swapping = false;
        }, Math.round(FADE_SEC * 900));
      } else {
        playClip(a, 0);
        applyLivery(nextLivery(), false);
        swapping = false;
      }
    }
  }

  function applyCamera() {
    if (!camera) return;
    mouseX = lerp(mouseX, targetMX, 0.05);
    mouseY = lerp(mouseY, targetMY, 0.05);
    introBlend = lerp(introBlend, introActive() ? 1 : 0, 0.05);
    var px = mouseX * 0.7;
    var py = mouseY * 0.4 + introBlend * 1.1;
    var scale = 1.08 + introBlend * 0.12;
    camera.style.transform =
      'translate3d(' + px.toFixed(2) + '%, ' + py.toFixed(2) + '%, 0) scale(' + scale.toFixed(4) + ')';
  }

  ready(function () {
    ensureStage();
    introBlend = introActive() ? 1 : 0;
    videos.forEach(prep);
    painter = createPainter(canvas);
    if (painter && root) root.classList.add('has-paint');

    if (videos[0]) {
      videos[0].addEventListener('loadedmetadata', function () {
        if (videos[0].duration && isFinite(videos[0].duration)) duration = videos[0].duration;
      });
      videos[0].addEventListener('canplay', startCinema);
      if (videos[0].readyState >= 2) startCinema();
    }

    if (!reduced) {
      function camLoop() {
        applyCamera();
        camRaf = requestAnimationFrame(camLoop);
      }
      camRaf = requestAnimationFrame(camLoop);
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        window.addEventListener('pointermove', function (e) {
          targetMX = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
          targetMY = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1);
        }, { passive: true });
      }
    } else {
      applyCamera();
    }

    window.addEventListener('f1site:intro-done', function () {
      introBlend = 0;
      startCinema();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        videos.forEach(function (v) {
          try { v.pause(); } catch (err) {}
        });
      } else {
        startCinema();
      }
    });
  });
})();
