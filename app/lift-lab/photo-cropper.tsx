"use client";

import { ChangeEvent, useRef, useState } from "react";

type Props = {
  onCrop: (file: File | null) => void;
};

export default function PhotoCropper({ onCrop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [ready, setReady] = useState(false);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    onCrop(null); setReady(false);
    if (!file) { setSource(null); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { setSource(image); URL.revokeObjectURL(url); };
    image.src = url;
  }

  async function applyCrop() {
    if (!source || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const outputWidth = 960;
    const outputHeight = 1200;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const baseScale = Math.max(outputWidth / source.naturalWidth, outputHeight / source.naturalHeight);
    const scale = baseScale * zoom;
    const drawWidth = source.naturalWidth * scale;
    const drawHeight = source.naturalHeight * scale;
    const overflowX = Math.max(0, drawWidth - outputWidth);
    const overflowY = Math.max(0, drawHeight - outputHeight);
    const drawX = -(overflowX * x / 100);
    const drawY = -(overflowY * y / 100);
    ctx.clearRect(0, 0, outputWidth, outputHeight);
    ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .82));
    if (!blob) return;
    onCrop(new File([blob], `progress-${Date.now()}.jpg`, { type: "image/jpeg" }));
    setReady(true);
  }

  return <div className="lift-photo-cropper">
    <label>Private photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} /></label>
    {source ? <>
      <div className="lift-photo-cropper__preview" style={{ backgroundImage: `url(${source.src})`, backgroundSize: `${zoom * 100}% auto`, backgroundPosition: `${x}% ${y}%` }} role="img" aria-label="Photo crop preview" />
      <div className="lift-photo-cropper__controls">
        <label>Zoom<input type="range" min="1" max="2.5" step=".05" value={zoom} onChange={event => { setZoom(Number(event.target.value)); setReady(false); onCrop(null); }} /></label>
        <label>Left / right<input type="range" min="0" max="100" value={x} onChange={event => { setX(Number(event.target.value)); setReady(false); onCrop(null); }} /></label>
        <label>Up / down<input type="range" min="0" max="100" value={y} onChange={event => { setY(Number(event.target.value)); setReady(false); onCrop(null); }} /></label>
      </div>
      <button type="button" className="lift-preview__small" onClick={applyCrop}>{ready ? "Crop Applied ✓" : "Apply Crop"}</button>
      <canvas ref={canvasRef} hidden />
    </> : null}
  </div>;
}
