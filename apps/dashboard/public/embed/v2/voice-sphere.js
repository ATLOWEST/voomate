/* global ResizeObserver, cancelAnimationFrame, devicePixelRatio, matchMedia, requestAnimationFrame */

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function normalizeAudioLevel(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const normalized = value <= 1 ? value : value / 100;
  return clamp(Math.log1p(normalized * 12) / Math.log(13), 0, 1);
}

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_energy;
  uniform float u_state;
  uniform vec3 u_spectrum;
  varying vec2 v_uv;

  float hash21(vec2 point) {
    vec3 mixed = fract(vec3(point.xyx) * vec3(0.1031, 0.1030, 0.0973));
    mixed += dot(mixed, mixed.yzx + 33.33);
    return fract((mixed.x + mixed.y) * mixed.z);
  }

  float hash31(vec3 point) {
    point = fract(point * 0.1031);
    point += dot(point, point.zyx + 31.32);
    return fract((point.x + point.y) * point.z);
  }

  float noise3(vec3 point) {
    vec3 cell = floor(point);
    vec3 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(
        mix(hash31(cell), hash31(cell + vec3(1.0, 0.0, 0.0)), local.x),
        mix(hash31(cell + vec3(0.0, 1.0, 0.0)), hash31(cell + vec3(1.0, 1.0, 0.0)), local.x),
        local.y
      ),
      mix(
        mix(hash31(cell + vec3(0.0, 0.0, 1.0)), hash31(cell + vec3(1.0, 0.0, 1.0)), local.x),
        mix(hash31(cell + vec3(0.0, 1.0, 1.0)), hash31(cell + vec3(1.0)), local.x),
        local.y
      ),
      local.z
    );
  }

  float fbm3(vec3 point) {
    float value = 0.0;
    float amplitude = 0.52;
    mat3 rotation = mat3(
      0.00, 0.80, 0.60,
      -0.80, 0.36, -0.48,
      -0.60, -0.48, 0.64
    );
    for (int index = 0; index < 4; index++) {
      value += amplitude * noise3(point);
      point = rotation * point * 2.03 + vec3(0.17, 0.11, 0.13);
      amplitude *= 0.49;
    }
    return value;
  }

  vec3 toneMap(vec3 color) {
    color = max(vec3(0.0), color);
    color = color / (color + vec3(0.72));
    return pow(color, vec3(0.4545));
  }

  void main() {
    vec2 point = v_uv * 2.0 - 1.0;
    point.x *= u_resolution.x / max(u_resolution.y, 1.0);

    float time = u_time;
    float energy = smoothstep(0.0, 1.0, u_energy);
    vec3 spectrum = clamp(u_spectrum, 0.0, 1.0);
    float distanceFromCenter = length(point);
    float angle = atan(point.y, point.x);

    vec3 boundaryPoint = vec3(cos(angle) * 1.35, sin(angle) * 1.35, time * 0.24);
    float boundaryFlow = fbm3(boundaryPoint);
    float lowLobe = sin(angle * 3.0 - time * (0.76 + spectrum.x * 0.46));
    float highRipple = sin(angle * 7.0 + time * (1.36 + spectrum.z * 1.8));
    float radius = 0.83;
    radius += (boundaryFlow - 0.51) * (0.040 + energy * 0.052);
    radius += lowLobe * (0.009 + spectrum.x * 0.020);
    radius += highRipple * spectrum.z * 0.009;
    radius += energy * 0.022;

    float signedDistance = distanceFromCenter - radius;
    #ifdef VOOMATE_DERIVATIVES
      float edgeWidth = max(fwidth(signedDistance) * 1.4, 1.2 / min(u_resolution.x, u_resolution.y));
    #else
      float edgeWidth = 1.8 / min(u_resolution.x, u_resolution.y);
    #endif
    float body = 1.0 - smoothstep(-edgeWidth, edgeWidth, signedDistance);
    float aura = exp(-max(signedDistance, 0.0) * (8.8 - energy * 1.8)) * (1.0 - body);

    vec2 sphereUv = point / max(radius, 0.001);
    float sphereDepth = sqrt(max(0.0, 1.0 - dot(sphereUv, sphereUv)));
    vec3 spherePoint = normalize(vec3(sphereUv, sphereDepth));

    vec3 drift = vec3(time * 0.12, -time * 0.085, time * 0.066);
    vec3 counterDrift = vec3(-time * 0.058, time * 0.092, -time * 0.11);
    float broadMaterial = fbm3(spherePoint * (2.25 + spectrum.x * 0.42) + drift);
    float fineMaterial = fbm3(spherePoint * (5.1 + spectrum.z * 1.5) + counterDrift);
    float material = broadMaterial * 0.72 + fineMaterial * 0.28;
    float silk = 0.5 + 0.5 * sin(
      material * 12.0 + spherePoint.y * 4.2 - spherePoint.x * 2.8 + time * (0.72 + spectrum.y)
    );
    float filament = pow(smoothstep(0.58, 0.96, silk), 1.7);

    vec3 normal = normalize(vec3(sphereUv, sphereDepth));
    #ifdef VOOMATE_DERIVATIVES
      vec2 materialSlope = vec2(dFdx(material), dFdy(material));
      normal = normalize(normal + vec3(-materialSlope * (25.0 + spectrum.z * 18.0), 0.0));
    #endif

    float speakingMix = smoothstep(0.73, 0.98, u_state);
    float thinkingMix = clamp(1.0 - abs(u_state - 0.52) * 3.5, 0.0, 1.0);
    vec3 shadowColor = mix(vec3(0.006, 0.009, 0.024), vec3(0.055, 0.006, 0.012), speakingMix);
    vec3 bodyColor = mix(vec3(0.09, 0.18, 0.78), vec3(0.88, 0.055, 0.10), speakingMix);
    vec3 refractedColor = mix(vec3(0.38, 0.88, 1.0), vec3(1.0, 0.38, 0.12), speakingMix);
    bodyColor = mix(bodyColor, vec3(0.42, 0.16, 0.86), thinkingMix * 0.50);
    refractedColor = mix(refractedColor, vec3(0.85, 0.66, 1.0), thinkingMix * 0.42);

    vec3 color = mix(shadowColor, bodyColor, smoothstep(0.20, 0.82, material));
    color = mix(color, refractedColor, filament * (0.46 + spectrum.y * 0.22));

    vec3 viewDirection = vec3(0.0, 0.0, 1.0);
    vec3 keyLight = normalize(vec3(-0.52, 0.66, 0.70));
    vec3 fillLight = normalize(vec3(0.68, -0.35, 0.58));
    vec3 halfVector = normalize(keyLight + viewDirection);
    float diffuse = max(dot(normal, keyLight), 0.0);
    float fill = max(dot(normal, fillLight), 0.0);
    float specular = pow(max(dot(normal, halfVector), 0.0), 58.0 - spectrum.z * 18.0);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.65);
    float transmission = pow(max(dot(-normal, fillLight), 0.0), 2.0);
    color *= 0.36 + diffuse * 0.68 + fill * 0.17;
    color += vec3(1.0, 0.96, 0.92) * specular * (0.72 + spectrum.z * 0.24);
    color += refractedColor * fresnel * (0.54 + energy * 0.24);
    color += bodyColor * transmission * 0.24;

    float interiorGlow = exp(-dot(sphereUv + vec2(0.12, -0.14), sphereUv + vec2(0.12, -0.14)) * 2.9);
    color += refractedColor * interiorGlow * filament * 0.16;
    color = toneMap(color);
    float dither = (hash21(gl_FragCoord.xy + floor(time * 24.0)) - 0.5) / 255.0;
    color += vec3(dither);

    vec3 auraColor = mix(vec3(0.20, 0.31, 0.94), vec3(0.96, 0.10, 0.11), speakingMix);
    auraColor = mix(auraColor, vec3(0.52, 0.22, 0.96), thinkingMix * 0.56);
    float alpha = body * 0.985 + aura * (0.045 + energy * 0.075);
    color = mix(toneMap(auraColor * 0.72), color, body);
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

function compileShader(context, type, source) {
  const shader = context.createShader(type);
  if (!shader) throw new Error('Unable to create the voice visual shader.');
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const message = context.getShaderInfoLog(shader) || 'Voice visual shader compilation failed.';
    context.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createCanvasFallback(canvas) {
  const context = canvas.getContext('2d', { alpha: true });
  let frame = 0;
  let active = false;
  let state = 'connecting';
  let userLevel = 0;
  let assistantLevel = 0;
  let energy = 0;
  let width = 1;
  let height = 1;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const draw = (time) => {
    if (!context || !active) return;
    const target =
      state === 'speaking'
        ? assistantLevel
        : state === 'listening'
          ? Math.max(userLevel, 0.045)
          : 0.075;
    energy += (target - energy) * (target > energy ? 0.26 : 0.072);
    userLevel *= 0.9;
    assistantLevel *= 0.9;
    context.clearRect(0, 0, width, height);
    const size = Math.min(width, height);
    const radius = size * (0.32 + energy * 0.028);
    const hot = state === 'speaking';
    const gradient = context.createRadialGradient(
      width * 0.42,
      height * 0.39,
      radius * 0.04,
      width * 0.5,
      height * 0.5,
      radius * 1.22,
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.18, hot ? '#ff8a67' : '#bfefff');
    gradient.addColorStop(0.5, hot ? '#ef1f35' : '#3151e8');
    gradient.addColorStop(0.82, hot ? '#260008' : '#070a25');
    gradient.addColorStop(1, 'rgba(3,4,18,0)');
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(Math.sin(time * 0.0012) * 0.075);
    context.scale(1 + energy * 0.09, 0.975 + Math.sin(time * 0.0018) * 0.026);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius * 1.22, 0, Math.PI * 2);
    context.fill();
    context.restore();
    frame = requestAnimationFrame(draw);
  };

  return {
    setActive(value) {
      if (active === value) return;
      active = value;
      if (active) frame = requestAnimationFrame(draw);
      else {
        cancelAnimationFrame(frame);
        context?.clearRect(0, 0, width, height);
      }
    },
    setState(value) {
      state = value;
    },
    setLevel(source, value) {
      const normalized = normalizeAudioLevel(value);
      if (source === 'assistant') assistantLevel = Math.max(assistantLevel, normalized);
      else userLevel = Math.max(userLevel, normalized);
      return normalized;
    },
    setSpectrum() {},
    destroy() {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}

function createWebGlSphere(canvas, context) {
  const derivatives = context.getExtension('OES_standard_derivatives');
  const fragmentSource = derivatives
    ? `#extension GL_OES_standard_derivatives : enable\n#define VOOMATE_DERIVATIVES 1\n${fragmentShaderSource}`
    : fragmentShaderSource;
  const vertexShader = compileShader(context, context.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(context, context.FRAGMENT_SHADER, fragmentSource);
  const program = context.createProgram();
  if (!program) throw new Error('Unable to create the voice visual program.');
  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    throw new Error(context.getProgramInfoLog(program) || 'Voice visual program linking failed.');
  }

  const buffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    context.STATIC_DRAW,
  );
  const position = context.getAttribLocation(program, 'a_position');
  const resolution = context.getUniformLocation(program, 'u_resolution');
  const timeUniform = context.getUniformLocation(program, 'u_time');
  const energyUniform = context.getUniformLocation(program, 'u_energy');
  const stateUniform = context.getUniformLocation(program, 'u_state');
  const spectrumUniform = context.getUniformLocation(program, 'u_spectrum');
  context.useProgram(program);
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
  context.enable(context.BLEND);
  context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stateValues = { connecting: 0.28, listening: 0, thinking: 0.52, speaking: 1, ended: 0.2 };
  const levels = { user: 0, assistant: 0 };
  const spectra = { user: [0, 0, 0], assistant: [0, 0, 0] };
  const renderedSpectrum = [0, 0, 0];
  let frame = 0;
  let active = false;
  let state = 'connecting';
  let energy = 0;
  let startTime = 0;
  let lastFrameTime = 0;
  let averageFrameTime = 16.7;
  let measuredFrames = 0;
  let renderScale = 1;

  const resize = (entries = []) => {
    const entry = entries[0];
    const deviceSize = entry?.devicePixelContentBoxSize?.[0];
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(
      1,
      Math.round((deviceSize?.inlineSize ?? bounds.width * ratio) * renderScale),
    );
    const height = Math.max(
      1,
      Math.round((deviceSize?.blockSize ?? bounds.height * ratio) * renderScale),
    );
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      context.viewport(0, 0, width, height);
    }
  };

  const observer = new ResizeObserver(resize);
  try {
    observer.observe(canvas, { box: 'device-pixel-content-box' });
  } catch {
    observer.observe(canvas);
  }
  resize();

  const draw = (timestamp) => {
    if (!active) return;
    if (!startTime) startTime = timestamp;
    if (lastFrameTime) {
      const frameTime = timestamp - lastFrameTime;
      if (frameTime < 60) {
        averageFrameTime += (frameTime - averageFrameTime) * 0.045;
        measuredFrames += 1;
      }
    }
    lastFrameTime = timestamp;
    if (measuredFrames >= 90) {
      const nextScale = averageFrameTime > 21 && renderScale > 0.8 ? 0.78 : 1;
      if (nextScale !== renderScale && (nextScale < renderScale || averageFrameTime < 15.2)) {
        renderScale = nextScale;
        resize();
      }
      measuredFrames = 0;
    }
    const source = state === 'speaking' ? 'assistant' : 'user';
    const baseEnergy = state === 'thinking' ? 0.12 : state === 'connecting' ? 0.075 : 0.048;
    const target = Math.max(levels[source], baseEnergy);
    energy += (target - energy) * (target > energy ? 0.31 : 0.068);
    const liveSpectrum = spectra[source];
    const spectrumTotal = liveSpectrum[0] + liveSpectrum[1] + liveSpectrum[2];
    const targetSpectrum =
      spectrumTotal > 0.035 ? liveSpectrum : [target * 0.72, target * 0.58, target * 0.38];
    for (let index = 0; index < 3; index += 1) {
      const speed = targetSpectrum[index] > renderedSpectrum[index] ? 0.34 : 0.075;
      renderedSpectrum[index] += (targetSpectrum[index] - renderedSpectrum[index]) * speed;
      spectra.user[index] *= 0.92;
      spectra.assistant[index] *= 0.92;
    }
    levels.user *= 0.9;
    levels.assistant *= 0.9;

    context.clearColor(0, 0, 0, 0);
    context.clear(context.COLOR_BUFFER_BIT);
    context.useProgram(program);
    context.uniform2f(resolution, canvas.width, canvas.height);
    context.uniform1f(timeUniform, ((timestamp - startTime) / 1000) * (reducedMotion ? 0.24 : 1));
    context.uniform1f(energyUniform, reducedMotion ? energy * 0.34 : energy);
    context.uniform1f(stateUniform, stateValues[state] ?? 0.28);
    context.uniform3f(
      spectrumUniform,
      reducedMotion ? renderedSpectrum[0] * 0.35 : renderedSpectrum[0],
      reducedMotion ? renderedSpectrum[1] * 0.35 : renderedSpectrum[1],
      reducedMotion ? renderedSpectrum[2] * 0.35 : renderedSpectrum[2],
    );
    context.drawArrays(context.TRIANGLES, 0, 6);
    frame = requestAnimationFrame(draw);
  };

  const contextLost = (event) => {
    event.preventDefault();
    active = false;
    cancelAnimationFrame(frame);
  };
  canvas.addEventListener('webglcontextlost', contextLost);

  return {
    setActive(value) {
      if (active === value) return;
      active = value;
      if (active) {
        resize();
        frame = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(frame);
        startTime = 0;
        lastFrameTime = 0;
        averageFrameTime = 16.7;
        measuredFrames = 0;
        context.clearColor(0, 0, 0, 0);
        context.clear(context.COLOR_BUFFER_BIT);
      }
    },
    setState(value) {
      state = value;
    },
    setLevel(source, value) {
      const normalized = normalizeAudioLevel(value);
      levels[source] = Math.max(levels[source], normalized);
      return normalized;
    },
    setSpectrum(source, value) {
      const next = [value.bass, value.mid, value.treble];
      for (let index = 0; index < 3; index += 1) {
        const normalized = clamp(Number.isFinite(next[index]) ? next[index] : 0, 0, 1);
        spectra[source][index] = Math.max(spectra[source][index], normalized);
      }
    },
    destroy() {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      context.deleteBuffer(buffer);
      context.deleteProgram(program);
      context.deleteShader(vertexShader);
      context.deleteShader(fragmentShader);
    },
  };
}

function createLevelOnlyFallback(context) {
  return {
    setActive(value) {
      if (!value) {
        context.clearColor(0, 0, 0, 0);
        context.clear(context.COLOR_BUFFER_BIT);
      }
    },
    setState() {},
    setLevel(_source, value) {
      return normalizeAudioLevel(value);
    },
    setSpectrum() {},
    destroy() {
      context.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export function createVoiceSphere(canvas) {
  const context = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    depth: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!context) return createCanvasFallback(canvas);
  try {
    return createWebGlSphere(canvas, context);
  } catch {
    return createLevelOnlyFallback(context);
  }
}
