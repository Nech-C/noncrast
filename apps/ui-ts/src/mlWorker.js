// mlWorker.js
import { parentPort } from 'node:worker_threads';
import { pipeline } from '@huggingface/transformers';
import path from 'node:path';
import Module from 'node:module';

// Ensure native deps resolve from the unpacked node_modules when packaged
try {
  const unpackedNodeModules = path.resolve(__dirname, '..', '..', 'node_modules');
  if (!Module.globalPaths.includes(unpackedNodeModules)) {
    Module.globalPaths.unshift(unpackedNodeModules);
  }
} catch (err) {
  // non-fatal; fallback to default resolution
  console.warn('[ML worker] failed to adjust module paths', err);
}

// Ensure we actually have a parentPort (i.e., we're in a worker)
if (!parentPort) {
  throw new Error('No parentPort in worker');
}

// Labels you want the model to choose from
const CANDIDATES = [
  'screenshot of user watching a video',
  'screenshot of user playing a video game',
  'screenshot of user working',
  'screenshot of the home screen',
  'screenshot of user using social media',
  'unknown',
];

// Create the pipeline once and reuse it.
// This returns either a pipeline or a Promise<pipeline>, so we always `await` it later.
console.log('[ML worker] initializing pipeline...');
const sendLog = (event, data) => {
  try {
    parentPort.postMessage({ type: 'ml:log', event, data });
  } catch (err) {
    // ignore
  }
};

const classifierPromise = pipeline(
  'zero-shot-image-classification',
  'Xenova/clip-vit-base-patch32'
)
  .then((p) => {
    console.log('[ML worker] pipeline ready');
    sendLog('pipeline_ready');
    return p;
  })
  .catch((err) => {
    console.error('[ML worker] pipeline init failed', err);
    sendLog('pipeline_error', { message: err?.message, stack: err?.stack });
    throw err;
  });

// Decide if a label means “off track”
function isOffTrack(label) {
  const offTrackLabels = [
    'Screenshot of user watching a video',
    'screenshot of user playing a video game',
    'screenshot of the home screen',
    'screenshot of user using social media',
  ];
  const lower = label.toLowerCase();
  return offTrackLabels.some((target) => target.toLowerCase() === lower);
}

// Actually run classification
async function classifyImage(imageBuffer) {
  console.log('[ML worker] classify start');
  sendLog('classify_start');
  const classifier = await classifierPromise;

  // The pipeline expects something RawImage.read can handle (Blob/URL/Canvas/etc).
  // When coming across worker boundaries we usually receive a plain object
  // like { type: 'Buffer', data: [...] }. Normalize it to a Blob.
  const bytes = Buffer.isBuffer(imageBuffer)
    ? imageBuffer
    : Buffer.from(imageBuffer?.data ?? imageBuffer);
  const blob = new Blob([bytes], { type: 'image/png' });

  // `blob` now matches the supported inputs for zero-shot-image-classification.
  const results = await classifier(blob, CANDIDATES);
  // results is an array [{ label, score }, ...] sorted by score desc
  const best = Array.isArray(results) ? results[0] : results;

  const offTrack = isOffTrack(best.label);

  console.log('[ML worker] classify result', { best, offTrack });
  sendLog('classify_result', { best, offTrack });
  return {
    label: best.label,
    score: best.score,
    offTrack,
  };
}

// Listen for messages from the main thread
parentPort.on('message', async (msg) => {
  try {
    if (!msg || msg.type !== 'classify') return;

    const { id, image } = msg;

    const result = await classifyImage(image);
    console.log('[ML worker] classify done', id, result);
    parentPort.postMessage({
      id,
      ...result,
    });
  } catch (err) {
    console.error('[ML worker] classify error', err);
    parentPort.postMessage({
      id: msg && msg.id,
      error: err && err.message ? err.message : String(err),
    });
  }
});
