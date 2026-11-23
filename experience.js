const root = document.documentElement;
const dusk = document.querySelector(".dusk");
const duskTime = document.querySelector("[data-dusk-time]");
const duskReading = document.querySelector("[data-dusk-reading]");
const duskMessage = document.querySelector("[data-dusk-message]");
const transcript = document.querySelector(".transcript");
const bedside = document.querySelector(".bedside");
const bedsideReading = document.querySelector("[data-bedside-reading]");
const signalCut = document.querySelector(".signal-cut");
const report = document.querySelector(".report");
const feedRun = document.querySelector(".feed-run");
const feed = document.querySelector(".feed");
const ending = document.querySelector(".ending");
const timecode = document.querySelector("[data-time]");
const feedStatus = document.querySelector("[data-feed-status]");
const audioControls = [...document.querySelectorAll("[data-audio]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const AudioEngine = window.AudioContext || window.webkitAudioContext;

let frame = 0;
let scene = 0;
let closeBreath = 0;
let finalVisible = false;
let audio;
let soundOn = false;
let soundRequest = 0;
let impactPlayed = false;

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function setProgress(name, value) {
  root.style.setProperty(name, value.toFixed(3));
}

function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function sceneProgress(rect, viewport) {
  const holdDistance = rect.height - viewport;
  if (holdDistance < 1) return clamp(1 - rect.top / viewport);
  return clamp(-rect.top / holdDistance);
}

function renderScroll() {
  frame = 0;

  const viewport = window.innerHeight;
  const duskProgress = sceneProgress(dusk.getBoundingClientRect(), viewport);
  const reportProgress = clamp(1 - report.getBoundingClientRect().top / viewport);
  const feedRect = feedRun.getBoundingClientRect();
  const cutTop = signalCut.getBoundingClientRect().top;
  const transcriptProgress = clamp(1 - transcript.getBoundingClientRect().top / viewport);
  const bedsideProgress = sceneProgress(bedside.getBoundingClientRect(), viewport);
  const endingRect = ending.getBoundingClientRect();
  const dread = sceneProgress(endingRect, viewport);
  const watchDistance = Math.max(viewport * 0.8, feedRect.height - feed.offsetHeight - viewport * 0.10);
  const watch = clamp((viewport * 0.22 - feedRect.top) / watchDistance);

  const interruption = clamp(1 - Math.abs(cutTop - viewport * 0.44) / (viewport * 0.5));
  const fadeOut = clamp(endingRect.bottom / (viewport * 0.82));
  const cameraTension = clamp(1 - feedRect.top / viewport) * 0.16 + watch * 0.25;
  closeBreath = Math.max(transcriptProgress * 0.46, bedsideProgress) * fadeOut;
  scene = Math.max(cameraTension, closeBreath * 0.70, dread) * (1 - interruption * 0.88) * fadeOut;
  finalVisible = dread > 0.67 && endingRect.bottom > viewport * 0.84;

  setProgress("--dusk", duskProgress);
  setProgress("--report-progress", reportProgress);
  setProgress("--watch", watch);
  setProgress("--transcript", transcriptProgress);
  setProgress("--bedside", bedsideProgress);
  setProgress("--dread", dread);
  feed.classList.toggle("feed-corrupted", watch > 0.72 && !reduceMotion.matches);

  if (duskProgress > 0.82) {
    setText(duskTime, "03:16");
    setText(duskReading, "黑暗中检测到移动");
    setText(duskMessage, "灯熄灭了。但房间里的某个东西还在移动。");
  } else if (duskProgress > 0.45) {
    setText(duskTime, "00:41");
    setText(duskReading, "光线低于阈值");
    setText(duskMessage, "灯光渐暗，Morrow 依然陪着你。");
  } else {
    setText(duskTime, "22:42");
    setText(duskReading, "灯光正在渐暗");
    setText(duskMessage, "灯光渐暗，Morrow 依然陪着你。");
  }

  setText(timecode, "03:17:0" + (4 + Math.min(4, Math.floor(watch * 5))));
  const status = watch > 0.80
    ? "目标正在靠近床边"
    : watch > 0.47 ? "目标正在靠近" : "检测到移动";
  setText(feedStatus, status);
  setText(bedsideReading, bedsideProgress > 0.56 ? "不要动" : "正在校准灯光");

  if (endingRect.top > viewport * 0.6) impactPlayed = false;
  updateAudio();
}

function requestRender() {
  if (!frame) frame = requestAnimationFrame(renderScroll);
}

function createSoundscape() {
  const context = new AudioEngine();
  const output = context.createGain();
  output.gain.value = 0;
  output.connect(context.destination);

  const noiseBuffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < samples.length; i++) {
    previous = (previous + Math.random() * 0.034 - 0.017) / 1.018;
    samples[i] = previous * 4;
  }

  const air = context.createBufferSource();
  air.buffer = noiseBuffer;
  air.loop = true;
  const airFilter = context.createBiquadFilter();
  airFilter.type = "bandpass";
  airFilter.frequency.value = 430;
  airFilter.Q.value = 0.8;
  const breathe = context.createGain();
  breathe.gain.value = 0.17;
  const breathRate = context.createOscillator();
  breathRate.frequency.value = 0.31;
  const breathDepth = context.createGain();
  breathDepth.gain.value = 0.15;
  breathRate.connect(breathDepth).connect(breathe.gain);
  air.connect(airFilter).connect(breathe).connect(output);

  const rumble = context.createOscillator();
  rumble.type = "triangle";
  rumble.frequency.value = 54;
  const rumbleVolume = context.createGain();
  rumbleVolume.gain.value = 0.32;
  rumble.connect(rumbleVolume).connect(output);

  const secondAir = context.createBufferSource();
  secondAir.buffer = noiseBuffer;
  secondAir.loop = true;
  const secondFilter = context.createBiquadFilter();
  secondFilter.type = "lowpass";
  secondFilter.frequency.value = 860;

  const nearby = context.createGain();
  nearby.gain.value = 0;
  const unevenBreath = context.createOscillator();
  unevenBreath.frequency.value = 0.19;
  const breathGate = context.createGain();
  breathGate.gain.value = 0.48;
  const unevenDepth = context.createGain();
  unevenDepth.gain.value = 0.42;
  unevenBreath.connect(unevenDepth).connect(breathGate.gain);
  secondAir.connect(secondFilter).connect(breathGate).connect(nearby);

  const panner = typeof context.createStereoPanner === "function" ? context.createStereoPanner() : null;
  if (panner) nearby.connect(panner).connect(output);
  else nearby.connect(output);

  air.start();
  secondAir.start(0, 1.7);
  unevenBreath.start();
  breathRate.start();
  rumble.start();
  return { context, output, airFilter, breathRate, rumble, nearby, panner };
}

function playImpact() {
  const { context, output } = audio;
  const now = context.currentTime;
  const hit = context.createOscillator();
  const envelope = context.createGain();

  hit.type = "triangle";
  hit.frequency.setValueAtTime(120, now);
  hit.frequency.exponentialRampToValueAtTime(42, now + 0.52);
  envelope.gain.setValueAtTime(0.001, now);
  envelope.gain.exponentialRampToValueAtTime(0.54, now + 0.04);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
  hit.connect(envelope).connect(output);
  hit.start(now);
  hit.stop(now + 0.85);
  hit.onended = () => {
    hit.disconnect();
    envelope.disconnect();
  };
}

function updateAudio() {
  if (!audio) return;

  const { context, output, airFilter, breathRate, rumble, nearby, panner } = audio;
  const now = context.currentTime;
  output.gain.setTargetAtTime(soundOn ? scene * 0.26 : 0, now, 0.17);
  airFilter.frequency.setTargetAtTime(280 + scene * 570, now, 0.19);
  breathRate.frequency.setTargetAtTime(0.27 + scene * 0.3, now, 0.21);
  rumble.frequency.setTargetAtTime(48 + scene * 15, now, 0.31);

  nearby.gain.setTargetAtTime(closeBreath * 0.85, now, 0.26);
  if (panner) panner.pan.setTargetAtTime(0.52 - closeBreath * 1.02, now, 0.36);

  if (finalVisible && soundOn && !impactPlayed) {
    impactPlayed = true;
    playImpact();
  }
}

function displayAudioState() {
  for (const button of audioControls) {
    button.setAttribute("aria-pressed", String(soundOn));
    button.querySelector("[data-audio-label]").textContent = soundOn ? "关闭声音" : "开启声音";
  }
  updateAudio();
}

async function toggleSound() {
  const request = ++soundRequest;
  if (soundOn) {
    soundOn = false;
    displayAudioState();
    return;
  }

  try {
    audio ??= createSoundscape();
    await audio.context.resume();
    if (request !== soundRequest) return;
    soundOn = true;
    displayAudioState();
  } catch {
    for (const button of audioControls) button.hidden = true;
  }
}

if (AudioEngine) {
  for (const button of audioControls) {
    button.hidden = false;
    button.addEventListener("click", toggleSound);
  }
}

document.querySelector("[data-restart]").addEventListener("click", () => {
  ++soundRequest;
  soundOn = false;
  displayAudioState();
});

window.addEventListener("scroll", requestRender, { passive: true });
window.addEventListener("resize", requestRender);
window.addEventListener("pageshow", requestRender);
reduceMotion.addEventListener("change", requestRender);
renderScroll();
