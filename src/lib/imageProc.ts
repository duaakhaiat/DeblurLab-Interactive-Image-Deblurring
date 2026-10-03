import { fft2, ifft2, fftShift, magnitude, Complex2D } from "./fft";

export type KernelType = "gaussian" | "motion" | "defocus";
export const SIZE = 128;
export const PAD = 256;

export interface ImageData3 {
  r: Float64Array;
  g: Float64Array;
  b: Float64Array;
  size: number;
}

export function imageElToData(img: HTMLImageElement, size: number = SIZE): ImageData3 {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  const id = ctx.getImageData(0, 0, size, size);
  const r = new Float64Array(size * size);
  const g = new Float64Array(size * size);
  const b = new Float64Array(size * size);
  for (let i = 0, j = 0; i < id.data.length; i += 4, j++) {
    r[j] = id.data[i] / 255;
    g[j] = id.data[i + 1] / 255;
    b[j] = id.data[i + 2] / 255;
  }
  return { r, g, b, size };
}

export function dataToCanvas(data: ImageData3, canvas: HTMLCanvasElement) {
  const { r, g, b, size } = data;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const id = ctx.createImageData(size, size);
  for (let i = 0, j = 0; i < id.data.length; i += 4, j++) {
    id.data[i] = clamp255(r[j] * 255);
    id.data[i + 1] = clamp255(g[j] * 255);
    id.data[i + 2] = clamp255(b[j] * 255);
    id.data[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
}

export function grayscale(d: ImageData3): Float64Array {
  const out = new Float64Array(d.size * d.size);
  for (let i = 0; i < out.length; i++) {
    out[i] = 0.299 * d.r[i] + 0.587 * d.g[i] + 0.114 * d.b[i];
  }
  return out;
}

function clamp255(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function makePSF(type: KernelType, strength: number, size: number = SIZE): Float64Array {
  const psf = new Float64Array(size * size);
  const cx = size >> 1;
  const cy = size >> 1;
  let sum = 0;

  if (type === "gaussian") {
    const sigma = Math.max(0.5, strength);
    const radius = Math.ceil(3 * sigma);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const v = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        const yi = (cy + dy + size) % size;
        const xi = (cx + dx + size) % size;
        psf[yi * size + xi] = v;
        sum += v;
      }
    }
  } else if (type === "motion") {
    const len = Math.max(2, Math.round(strength * 2));
    const angle = (30 * Math.PI) / 180;
    for (let i = -len / 2; i <= len / 2; i++) {
      const x = Math.round(cx + i * Math.cos(angle));
      const y = Math.round(cy + i * Math.sin(angle));
      const xi = ((x % size) + size) % size;
      const yi = ((y % size) + size) % size;
      psf[yi * size + xi] += 1;
      sum += 1;
    }
  } else {
    const r = Math.max(1, strength);
    const ri = Math.ceil(r);
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const yi = (cy + dy + size) % size;
          const xi = (cx + dx + size) % size;
          psf[yi * size + xi] = 1;
          sum += 1;
        }
      }
    }
  }
  if (sum > 0) for (let i = 0; i < psf.length; i++) psf[i] /= sum;
  return psf;
}

export function psfForFFT(psfCentered: Float64Array, size: number = SIZE): Float64Array {
  return fftShift(psfCentered, size);
}

export function convolveFFT(channel: Float64Array, psfShifted: Float64Array, size: number): Float64Array {
  const F = fft2(channel, size);
  const H = fft2(psfShifted, size);
  const re = new Float64Array(size * size);
  const im = new Float64Array(size * size);
  for (let i = 0; i < re.length; i++) {
    re[i] = F.re[i] * H.re[i] - F.im[i] * H.im[i];
    im[i] = F.re[i] * H.im[i] + F.im[i] * H.re[i];
  }
  return ifft2({ re, im, size });
}

export function addNoise(channel: Float64Array, sigma: number): Float64Array {
  const out = new Float64Array(channel.length);
  for (let i = 0; i < out.length; i++) {
    const u1 = Math.max(1e-9, Math.random());
    const u2 = Math.random();
    const n = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    out[i] = channel[i] + sigma * n;
  }
  return out;
}

function padReflect(channel: Float64Array, size: number, padded: number): Float64Array {
  const out = new Float64Array(padded * padded);
  const offset = (padded - size) >> 1;
  for (let y = 0; y < padded; y++) {
    let sy = y - offset;
    if (sy < 0) sy = -sy - 1;
    if (sy >= size) sy = 2 * size - sy - 1;
    sy = Math.max(0, Math.min(size - 1, sy));
    for (let x = 0; x < padded; x++) {
      let sx = x - offset;
      if (sx < 0) sx = -sx - 1;
      if (sx >= size) sx = 2 * size - sx - 1;
      sx = Math.max(0, Math.min(size - 1, sx));
      out[y * padded + x] = channel[sy * size + sx];
    }
  }
  return out;
}

function cropCenter(padded: Float64Array, paddedSize: number, size: number): Float64Array {
  const out = new Float64Array(size * size);
  const offset = (paddedSize - size) >> 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      out[y * size + x] = padded[(y + offset) * paddedSize + (x + offset)];
    }
  }
  return out;
}

function cropImage3(padded: ImageData3, size: number): ImageData3 {
  return {
    r: cropCenter(padded.r, padded.size, size),
    g: cropCenter(padded.g, padded.size, size),
    b: cropCenter(padded.b, padded.size, size),
    size,
  };
}

export function applyBlurAndNoise(
  src: ImageData3,
  type: KernelType,
  strength: number,
  noise: number
): {
  blurred: ImageData3;
  paddedBlurred: ImageData3;
  psfCentered: Float64Array;
  psfShiftedPadded: Float64Array;
} {
  const psfDisplay = makePSF(type, strength, src.size);
  const psfBig = makePSF(type, strength, PAD);
  const psfShiftedPadded = psfForFFT(psfBig, PAD);

  const proc = (chan: Float64Array): Float64Array => {
    const padded = padReflect(chan, src.size, PAD);
    const blurred = convolveFFT(padded, psfShiftedPadded, PAD);
    return addNoise(blurred, noise);
  };

  const rPad = proc(src.r);
  const gPad = proc(src.g);
  const bPad = proc(src.b);

  const paddedBlurred: ImageData3 = { r: rPad, g: gPad, b: bPad, size: PAD };
  return {
    blurred: cropImage3(paddedBlurred, src.size),
    paddedBlurred,
    psfCentered: psfDisplay,
    psfShiftedPadded,
  };
}

export function wienerDeconv(
  paddedBlurred: ImageData3,
  psfShiftedPadded: Float64Array,
  K: number,
  outSize: number = SIZE
): ImageData3 {
  const size = paddedBlurred.size;
  const H = fft2(psfShiftedPadded, size);
  const denom = new Float64Array(size * size);
  for (let i = 0; i < denom.length; i++) {
    denom[i] = H.re[i] * H.re[i] + H.im[i] * H.im[i] + K;
  }
  const restoreChannel = (chan: Float64Array): Float64Array => {
    const G = fft2(chan, size);
    const re = new Float64Array(size * size);
    const im = new Float64Array(size * size);
    for (let i = 0; i < re.length; i++) {
      const wr = H.re[i] / denom[i];
      const wi = -H.im[i] / denom[i];
      re[i] = G.re[i] * wr - G.im[i] * wi;
      im[i] = G.re[i] * wi + G.im[i] * wr;
    }
    return ifft2({ re, im, size });
  };
  const padded: ImageData3 = {
    r: restoreChannel(paddedBlurred.r),
    g: restoreChannel(paddedBlurred.g),
    b: restoreChannel(paddedBlurred.b),
    size,
  };
  return cropImage3(padded, outSize);
}

export function spectrumImage(channel: Float64Array, size: number, hue: string = "190 100% 60%"): string {
  const F = fft2(channel, size);
  const mag = magnitude(F);
  const shifted = fftShift(mag, size);
  let max = 0;
  const log = new Float64Array(shifted.length);
  for (let i = 0; i < shifted.length; i++) {
    log[i] = Math.log(1 + shifted[i]);
    if (log[i] > max) max = log[i];
  }
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const id = ctx.createImageData(size, size);
  const [h, s, l] = hue.split(" ").map((x) => parseFloat(x));
  for (let i = 0, j = 0; i < id.data.length; i += 4, j++) {
    const t = max > 0 ? log[j] / max : 0;
    const rgb = hslToRgb(h / 360, s / 100, (l / 100) * t);
    id.data[i] = rgb[0];
    id.data[i + 1] = rgb[1];
    id.data[i + 2] = rgb[2];
    id.data[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c.toDataURL("image/png");
}

export function psfImage(psfCentered: Float64Array, size: number): string {
  let max = 0;
  for (let i = 0; i < psfCentered.length; i++) if (psfCentered[i] > max) max = psfCentered[i];
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const id = ctx.createImageData(size, size);
  for (let i = 0, j = 0; i < id.data.length; i += 4, j++) {
    const t = max > 0 ? psfCentered[j] / max : 0;
    const rgb = hslToRgb(260 / 360, 1, 0.6 * t);
    id.data[i] = rgb[0];
    id.data[i + 1] = rgb[1];
    id.data[i + 2] = rgb[2];
    id.data[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c.toDataURL("image/png");
}

export function dataToDataURL(d: ImageData3): string {
  const c = document.createElement("canvas");
  dataToCanvas(d, c);
  return c.toDataURL("image/png");
}

export function computeMetrics(orig: ImageData3, restored: ImageData3) {
  const n = orig.r.length;
  let mse = 0;
  for (let i = 0; i < n; i++) {
    mse += (orig.r[i] - restored.r[i]) ** 2;
    mse += (orig.g[i] - restored.g[i]) ** 2;
    mse += (orig.b[i] - restored.b[i]) ** 2;
  }
  mse /= n * 3;
  const psnr = mse > 0 ? 10 * Math.log10(1 / mse) : 99;
  const detail = detailEnergy(restored);
  const edge = edgeRecovery(orig, restored);
  return { mse, psnr, sharpness: detail, edgeRecovery: edge };
}

function detailEnergy(d: ImageData3): number {
  const g = smooth3(grayscale(d), d.size);
  const sob = sobelMag(g, d.size);
  let sum = 0;
  for (let i = 0; i < sob.length; i++) sum += sob[i];
  return sum / sob.length;
}

function smooth3(g: Float64Array, s: number): Float64Array {
  const out = new Float64Array(g.length);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      let sum = 0;
      let cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yi = y + dy;
          const xi = x + dx;
          if (yi >= 0 && yi < s && xi >= 0 && xi < s) {
            sum += g[yi * s + xi];
            cnt++;
          }
        }
      }
      out[y * s + x] = sum / cnt;
    }
  }
  return out;
}

function edgeRecovery(a: ImageData3, b: ImageData3): number {
  const ga = sobelMag(grayscale(a), a.size);
  const gb = sobelMag(grayscale(b), b.size);
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < ga.length; i++) {
    sa += ga[i];
    sb += gb[i];
  }
  if (sa === 0) return 0;
  return Math.min(100, (sb / sa) * 100);
}

function sobelMag(g: Float64Array, s: number): Float64Array {
  const out = new Float64Array(g.length);
  for (let y = 1; y < s - 1; y++) {
    for (let x = 1; x < s - 1; x++) {
      const i = y * s + x;
      const gx =
        -g[i - s - 1] - 2 * g[i - 1] - g[i + s - 1] + g[i - s + 1] + 2 * g[i + 1] + g[i + s + 1];
      const gy =
        -g[i - s - 1] - 2 * g[i - s] - g[i - s + 1] + g[i + s - 1] + 2 * g[i + s] + g[i + s + 1];
      out[i] = Math.hypot(gx, gy);
    }
  }
  return out;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
