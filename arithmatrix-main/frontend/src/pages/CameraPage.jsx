import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { solveMathQuestion } from '../api/assistantApi.js';
import { createHistoryEntry } from '../api/historyApi.js';

function extractMathExpression(rawText) {
  return String(rawText || '')
    .replace(/\s+/g, '')
    .replace(/[xX×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[^0-9+\-*/().%]/g, '');
}

export function CameraPage() {
  const [params] = useSearchParams();
  const [recognizedText, setRecognizedText] = useState(params.get('expression') || '');
  const [extractedExpression, setExtractedExpression] = useState('');
  const [result, setResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isSecure = useMemo(
    () => window.isSecureContext || window.location.hostname === 'localhost',
    []
  );
  const solutionParagraphs = useMemo(
    () =>
      String(result || '')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
    [result]
  );

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
    setCameraReady(false);
  }

  async function startCamera() {
    if (!isSecure) {
      setError('Camera requires a secure context (https or localhost).');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API is not supported in this browser.');
      return;
    }

    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      setCameraOn(true);
      setCameraReady(true);
    } catch (_err) {
      setError('Could not access camera. Allow camera permission and retry.');
      stopCamera();
    }
  }

  async function processImageBlob(blob, nextPreviewUrl) {
    setIsProcessing(true);
    setError('');
    setSaveWarning('');
    setProgress(0);

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreviewUrl || '';
    });

    try {
      const { data } = await Tesseract.recognize(blob, 'eng', {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setProgress(Math.round((message.progress || 0) * 100));
          }
        }
      });

      const rawText = String(data?.text || '')
        .replace(/\s+/g, ' ')
        .trim();
      const extracted = extractMathExpression(rawText);

      setRecognizedText(rawText);
      setExtractedExpression(extracted);

      if (!rawText) {
        throw new Error('No text detected');
      }

      const solved = await solveMathQuestion({ question: rawText });
      const finalReply = solved?.reply || 'No solution generated.';
      setResult(finalReply);

      try {
        await createHistoryEntry({
          expression: rawText,
          result: finalReply,
          source: 'CAMERA'
        });
      } catch (_saveErr) {
        setSaveWarning('Captured successfully, but could not save to history (API not reachable).');
      }
    } catch (err) {
      setResult('Error');
      if (err?.message === 'No text detected') {
        setError('No readable text detected. Try a clearer image.');
      } else {
        setError('Could not solve this image question. Try a clearer image, crop the question area, or keep equation text clear.');
      }
    } finally {
      setIsProcessing(false);
    }
  }

  async function onFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    await processImageBlob(file, localUrl);
  }

  async function onCaptureFromCamera() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) {
      setError('Camera is not ready yet.');
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not capture frame from camera.');
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setError('Failed to capture image from camera.');
      return;
    }

    const localUrl = URL.createObjectURL(blob);
    await processImageBlob(blob, localUrl);
  }

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>Camera Math Solver (OCR)</h2>
        <Link className="ghost-btn" to="/history?source=CAMERA">
          Camera History
        </Link>
      </div>

      <div className="button-row">
        {!cameraOn ? (
          <button type="button" className="action-btn" onClick={startCamera}>
            Start Camera
          </button>
        ) : (
          <>
            <button type="button" className="action-btn" onClick={onCaptureFromCamera} disabled={isProcessing}>
              Capture & Solve Question
            </button>
            <button type="button" className="ghost-btn" onClick={stopCamera}>
              Stop Camera
            </button>
          </>
        )}
      </div>

      <div className="camera-preview">
        <video ref={videoRef} autoPlay playsInline muted className={cameraOn ? 'camera-video-active' : ''} />
      </div>
      <canvas ref={canvasRef} className="camera-canvas" />

      <label className="upload-label" htmlFor="camera-input">
        Upload or Capture Question Image
      </label>
      <input
        id="camera-input"
        className="file-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
      />

      {previewUrl ? <img className="preview-image" src={previewUrl} alt="Uploaded expression" /> : null}

      {isProcessing ? <p className="hint-text">Processing image... {progress}%</p> : null}

      <div className="display-block">
        <p className="expression-line">{recognizedText || 'Recognized question text appears here'}</p>
        {extractedExpression ? (
          <p className="hint-text camera-expression-preview">Expression detected: {extractedExpression}</p>
        ) : null}
        <div className="camera-solution-text">
          {solutionParagraphs.length ? (
            solutionParagraphs.map((line, index) => (
              <p className="camera-solution-paragraph" key={`${index}-${line.slice(0, 24)}`}>
                {line}
              </p>
            ))
          ) : (
            <p className="camera-solution-paragraph">Solution will appear here.</p>
          )}
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {saveWarning ? <p className="hint-text">{saveWarning}</p> : null}
    </section>
  );
}
