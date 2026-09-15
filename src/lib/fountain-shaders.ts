import { fountainTimingGLSL } from "./fountain";

const noiseGLSL = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    return noise(p) * .57 + noise(p * 2.07 + 7.3) * .28 + noise(p * 4.13) * .15;
  }
`;

export const sparkVertexShader = `
  attribute vec4 aSeed;
  attribute float aBranch;
  uniform float uTime;
  uniform float uReveal;
  uniform float uGroundY;
  uniform vec2 uResolution;
  uniform float uRatio;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vWidth;
  varying float vStreak;
  varying float vRadius;
  varying float vGlint;
  ${fountainTimingGLSL}

  vec3 flight(float t, vec3 velocity, float drag) {
    float travel = (1.0 - exp(-drag * t)) / drag;
    return vec3(velocity.x * travel + .075 * t * t,
      (velocity.y + 4.8 / drag) * travel - 4.8 * t / drag,
      velocity.z * travel);
  }

  void main() {
    vUv = uv;
    bool dust = aSeed.w < .60;
    float interval = dust ? 1.25 + aSeed.z * .9 : 2.6 + aSeed.z * .8;
    float offset = aSeed.x * interval;
    float generation = floor((uTime + offset) / interval);
    float birth = generation * interval - offset;
    float age = uTime - birth;
    // Every generation has a different launch direction and speed. Power is
    // sampled at birth: a dying jet does not pull airborne sparks back down.
    float r = fract(aSeed.y * 17.71 + generation * .618034);
    float power = burnPower(birth) * uReveal;
    float surge = .94 + .06 * sin(birth * 17.0) + .035 * sin(birth * 41.0);
    float angle = aSeed.x * 628.318 + generation * 2.39996;
    float spread = (.10 + pow(r, 2.2) * 1.15) * sqrt(power);
    float speed = (dust ? 3.0 + r * 4.3 : 4.8 + r * 2.8) * sqrt(power) * surge;
    vec3 velocity = vec3(cos(angle) * spread + .18 * sqrt(power), speed,
      sin(angle) * spread * .65);
    float drag = dust ? 1.65 : .95 + aSeed.y * .5;
    float life = dust ? .65 + aSeed.z * .70 : 1.45 + aSeed.z * 1.2;
    float splitAt = .42 + aSeed.z * .48;
    float branchAge = age - splitAt;
    float exposure = dust ? .018 : .022 + aSeed.y * .030;
    float tailAge = max(0.0, age - exposure);
    vec3 head = flight(age, velocity, drag);
    vec3 tail = flight(tailAge, velocity, drag);
    float branchFade = 1.0;
    if (aBranch > .5) {
      float branchAngle = aBranch * 2.0944 + angle;
      vec3 origin = flight(splitAt, velocity, drag);
      float t = max(0.0, branchAge);
      vec3 scatter = vec3(cos(branchAngle), sin(branchAngle) * .6,
        sin(branchAngle + 1.0) * .4) * (.7 + r * 1.2);
      scatter.y += .25;
      head = origin + flight(t, scatter, 2.2);
      tail = origin + flight(max(0.0, t - .018), scatter, 2.2);
      branchFade = step(0.0, branchAge) * (1.0 - smoothstep(.08, .30, branchAge));
      life = splitAt + .30;
    }
    vec4 headClip = projectionMatrix * modelViewMatrix * vec4(head, 1.0);
    vec4 tailClip = projectionMatrix * modelViewMatrix * vec4(tail, 1.0);
    vec2 headPx = headClip.xy / headClip.w * uResolution * .5;
    vec2 tailPx = tailClip.xy / tailClip.w * uResolution * .5;
    vec2 axis = headPx - tailPx;
    float streak = length(axis);
    axis = streak > .01 ? axis / streak : vec2(0.0, 1.0);
    float silver = step(.85, aSeed.w);
    float twinkle = .66 + .34 * sin(age * (39.0 + aSeed.x * 31.0) + aSeed.y * 100.0);
    float width = (dust ? .65 : .95 + aSeed.z * .85) * uRatio;
    if (aBranch > .5) width *= .85;
    float glint = (silver + step(.76, aSeed.w) * .35) * pow(twinkle, 9.0);
    float radius = width * (2.0 + glint * 3.5);
    float lengthPx = max(width, streak);
    vec2 center = mix(tailPx, headPx, .5);
    vec2 pixel = center + axis * position.y * (lengthPx + radius * 2.0)
      + vec2(-axis.y, axis.x) * position.x * radius * 2.0;
    gl_Position = headClip;
    gl_Position.xy = pixel * 2.0 / uResolution * headClip.w;
    float cooling = smoothstep(.12, life, age);
    vec3 gold = mix(vec3(1.0, .49, .075), vec3(1.0, .16, .018), cooling);
    vColor = mix(gold, mix(vec3(1.0, .96, .84), gold, cooling * .65), silver);
    vWidth = width;
    vStreak = lengthPx;
    vRadius = radius;
    vGlint = glint;
    float grain = mix(.95, twinkle, smoothstep(.18, .65, age));
    float density = step(aSeed.z * .26, power);
    vAlpha = step(0.0, birth) * density * smoothstep(0.0, .06, power)
      * (1.0 - smoothstep(life * .50, life, age)) * grain * branchFade
      * smoothstep(uGroundY, uGroundY + .06, head.y);
    if (dust) vAlpha *= .9;
  }
`;

export const sparkFragmentShader = `
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vWidth;
  varying float vStreak;
  varying float vRadius;
  varying float vGlint;
  void main() {
    vec2 p = vec2((vUv.x - .5) * vRadius * 2.0,
      (vUv.y - .5) * (vStreak + vRadius * 2.0));
    float distance = length(vec2(p.x, max(abs(p.y) - vStreak * .5, 0.0))) / vWidth;
    float core = exp(-distance * distance * 4.0);
    float halo = exp(-distance * distance * .7) * .22;
    vec2 star = vec2(p.x, p.y - vStreak * .30) / vWidth;
    float rays = (exp(-abs(star.x) * 3.8 - abs(star.y) * .6)
      + exp(-abs(star.y) * 3.8 - abs(star.x) * .6)) * vGlint;
    float alpha = (core + halo + rays) * vAlpha;
    vec3 color = mix(vColor, vec3(1.0, .95, .78), clamp(rays * .6 + core * .16, 0.0, .85));
    gl_FragColor = vec4(color, alpha);
  }
`;

export const smokeVertexShader = `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uReveal;
  varying vec2 vUv;
  varying float vAge;
  varying float vAlpha;
  varying float vSeed;
  ${fountainTimingGLSL}
  void main() {
    float life = 4.0 + aSeed.z * 1.8;
    float offset = aSeed.x * life;
    float birth = floor((uTime + offset) / life) * life - offset;
    float age = uTime - birth;
    float t = age / life;
    float power = burnPower(birth) * uReveal;
    vec3 p = vec3(.15 * age + sin(aSeed.y * 60.0 + age * .6) * .14 * age,
      age * (.50 + aSeed.z * .18), -.20 - aSeed.y * .25);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float size = .14 + t * (1.1 + aSeed.z * .6);
    float angle = aSeed.y * 6.283 + age * .08;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    mv.xy += rotation * position.xy * size;
    gl_Position = projectionMatrix * mv;
    vUv = uv;
    vAge = t;
    vSeed = aSeed.y;
    vAlpha = step(0.0, birth) * smoothstep(0.0, .12, t)
      * (1.0 - smoothstep(.45, 1.0, t)) * power * .12;
  }
`;

export const smokeFragmentShader = `
  varying vec2 vUv;
  varying float vAge;
  varying float vAlpha;
  varying float vSeed;
  ${noiseGLSL}
  void main() {
    vec2 uv = vUv - .5;
    float cloud = fbm(uv * 5.0 + vSeed * 30.0 + vec2(vAge * .7, -vAge));
    float edge = 1.0 - smoothstep(.12, .5, length(uv));
    float alpha = edge * smoothstep(.23, .76, cloud) * vAlpha;
    vec3 color = mix(vec3(.50, .32, .17), vec3(.30, .34, .40), smoothstep(.0, .40, vAge));
    gl_FragColor = vec4(color, alpha);
  }
`;

export const jetVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const jetFragmentShader = `
  uniform float uTime;
  uniform float uPower;
  uniform float uGreen;
  varying vec2 vUv;
  ${noiseGLSL}
  void main() {
    float y = vUv.y;
    float turbulence = fbm(vec2(vUv.x * 8.0, y * 6.0 - uTime * 9.0));
    float center = .50 + sin(y * 8.0 - uTime * 8.0) * .018 * y;
    float width = mix(.070, .21, y) * (1.0 - smoothstep(.25, 1.0, y));
    float distance = abs(vUv.x - center) / max(.005, width);
    float envelope = (1.0 - smoothstep(.15, 1.0, y)) * smoothstep(0.0, .025, y);
    float core = exp(-distance * distance * 3.0);
    float glow = exp(-distance * distance * .45) * .3;
    float alpha = (core + glow) * envelope * (.5 + turbulence * .8) * uPower;
    vec3 outer = mix(vec3(1.0, .34, .025), vec3(.40, 1.0, .06), uGreen);
    vec3 color = mix(outer, vec3(1.0, .98, .76), core * .87);
    gl_FragColor = vec4(color, alpha);
  }
`;
