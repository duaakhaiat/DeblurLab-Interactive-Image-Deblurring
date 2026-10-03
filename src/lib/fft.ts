import FFT from "fft.js";

export interface Complex2D {
  re: Float64Array;
  im: Float64Array;
  size: number;
}

export function fft2(real: Float64Array, size: number): Complex2D {
  const fft = new FFT(size);
  const tmp = fft.createComplexArray();
  const out = fft.createComplexArray();
  const re = new Float64Array(size * size);
  const im = new Float64Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      tmp[2 * x] = real[y * size + x];
      tmp[2 * x + 1] = 0;
    }
    fft.transform(out, tmp);
    for (let x = 0; x < size; x++) {
      re[y * size + x] = out[2 * x];
      im[y * size + x] = out[2 * x + 1];
    }
  }

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      tmp[2 * y] = re[y * size + x];
      tmp[2 * y + 1] = im[y * size + x];
    }
    fft.transform(out, tmp);
    for (let y = 0; y < size; y++) {
      re[y * size + x] = out[2 * y];
      im[y * size + x] = out[2 * y + 1];
    }
  }
  return { re, im, size };
}

export function ifft2(c: Complex2D): Float64Array {
  const { re, im, size } = c;
  const fft = new FFT(size);
  const tmp = fft.createComplexArray();
  const out = fft.createComplexArray();
  const reMid = new Float64Array(size * size);
  const imMid = new Float64Array(size * size);

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      tmp[2 * y] = re[y * size + x];
      tmp[2 * y + 1] = im[y * size + x];
    }
    fft.inverseTransform(out, tmp);
    for (let y = 0; y < size; y++) {
      reMid[y * size + x] = out[2 * y];
      imMid[y * size + x] = out[2 * y + 1];
    }
  }

  const result = new Float64Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      tmp[2 * x] = reMid[y * size + x];
      tmp[2 * x + 1] = imMid[y * size + x];
    }
    fft.inverseTransform(out, tmp);
    for (let x = 0; x < size; x++) {
      result[y * size + x] = out[2 * x];
    }
  }
  return result;
}

export function fftShift(input: Float64Array, size: number): Float64Array {
  const out = new Float64Array(size * size);
  const half = size >> 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sy = (y + half) % size;
      const sx = (x + half) % size;
      out[sy * size + sx] = input[y * size + x];
    }
  }
  return out;
}

export function magnitude(c: Complex2D): Float64Array {
  const out = new Float64Array(c.re.length);
  for (let i = 0; i < c.re.length; i++) {
    out[i] = Math.hypot(c.re[i], c.im[i]);
  }
  return out;
}
