import './style.css';
import {
  draw,
  nets,
  createCanvasFromMedia,
  matchDimensions,
  detectAllFaces,
  TinyFaceDetectorOptions,
  resizeResults,
} from 'face-api.js';

const video = document.querySelector<HTMLVideoElement>('#video')!;
const select = document.querySelector<HTMLSelectElement>('#select')!;
const figure = document.querySelector<HTMLElement>('#figure')!;
video.width = 720;
video.height = 540;
video.autoplay = true;
video.muted = true;

const getCameraSelection = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === 'videoinput');
  console.log(videoDevices);
  videoDevices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label || `Camera ${index + 1}`;
    select.append(option);
  });
  select.onchange = () => startVideo(select.value);
};

const startVideo = async (exact?: string) => {
  const handleErr = (err: Error) => (console.error(err), null);
  const devices = navigator.mediaDevices;
  const constraints = { video: exact ? { deviceId: { exact } } : undefined };
  const stream = await devices.getUserMedia(constraints).catch(handleErr);
  if (video.srcObject instanceof MediaStream)
    video.srcObject.getTracks().forEach((track) => track.stop());
  video.srcObject = stream;
  document.querySelector('#canvas')?.remove();
};

const loadModels = async () => {
  await nets.tinyFaceDetector.loadFromUri('/models');
  await nets.faceLandmark68Net.loadFromUri('/models');
  await nets.faceRecognitionNet.loadFromUri('/models');
  await nets.faceExpressionNet.loadFromUri('/models');
};

const onPlay = () => {
  const canvas = createCanvasFromMedia(video);
  canvas.id = 'canvas';
  figure.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  matchDimensions(canvas, displaySize);
  const update = async () => {
    await new Promise(requestAnimationFrame);
    const detectAllTask = detectAllFaces(video, new TinyFaceDetectorOptions());
    const detections = await detectAllTask
      .withFaceLandmarks()
      .withFaceExpressions();
    const resizedDetections = resizeResults(detections, displaySize);
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    draw.drawDetections(canvas, resizedDetections);
    draw.drawFaceLandmarks(canvas, resizedDetections);
    draw.drawFaceExpressions(canvas, resizedDetections);
    if (figure.contains(canvas)) update();
  };
  update();
};

await loadModels();
await getCameraSelection();
video.addEventListener('play', onPlay);
