# DeblurLab

### Explore image deblurring with Fourier transforms and Wiener filtering

DeblurLab is an interactive, browser-based image restoration demo. Choose a
sample image or upload your own, add a simulated blur and noise, then watch a
frequency-domain Wiener deconvolution pipeline attempt to restore the image.

All image processing runs locally in your browser; no backend or image upload
service is required.

## Features

- Try Gaussian, motion, and defocus blur kernels.
- Adjust blur strength, noise, and Wiener regularization.
- Upload an image or start with one of four built-in samples.
- Follow a six-stage animated walkthrough, from input to reconstruction.
- Compare blurred and restored images with an interactive before/after slider.
- View frequency spectra, restoration metrics, and explanatory equations.

Images are resampled to **128 × 128 pixels** for processing. The transform
selector changes the displayed notation; the implementation uses a 2D FFT
followed by inverse FFT and Wiener deconvolution. The animated “AI Brain” is a
visual explanation, not a trained machine-learning model.

## Getting started

### Requirements

- Node.js 20.19 or newer
- pnpm 9 or newer

### Install and run

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Create a production build in `dist/` |
| `pnpm serve` | Preview the production build locally |
| `pnpm typecheck` | Run the TypeScript check |

## How it works

1. The selected image is resized and converted into pixel data.
2. A point-spread function simulates the selected blur kernel; noise can be added.
3. The image and blur kernel are transformed into the frequency domain.
4. Wiener deconvolution estimates the original image while regularization helps limit noise amplification.
5. An inverse transform reconstructs the restored image, which is compared with the blurred input.

## Built with

- React and TypeScript
- Vite
- `fft.js` for 2D FFT operations
- Tailwind CSS
- KaTeX for rendered equations
