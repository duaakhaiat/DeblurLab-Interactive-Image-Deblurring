import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MathEquation } from "@/components/MathEquation";
import { ImageComparison } from "@/components/ImageComparison";
import { NeuralNetAnim } from "@/components/NeuralNetAnim";
import {
  ImageData3,
  KernelType,
  SIZE,
  applyBlurAndNoise,
  computeMetrics,
  dataToDataURL,
  grayscale,
  imageElToData,
  psfImage,
  spectrumImage,
  wienerDeconv,
} from "@/lib/imageProc";
import sample1 from "@/assets/samples/sample-1.png";
import sample2 from "@/assets/samples/sample-2.png";
import sample3 from "@/assets/samples/sample-3.png";
import sample4 from "@/assets/samples/sample-4.png";

const SAMPLES = [sample1, sample2, sample3, sample4];

const STEPS = [
  { id: 0, name: "Input", short: "Capture y(x)" },
  { id: 1, name: "Analyze", short: "Estimate H" },
  { id: 2, name: "Transform", short: "FFT → freq" },
  { id: 3, name: "AI Brain", short: "Refine kernel" },
  { id: 4, name: "Deconvolve", short: "Wiener filter" },
  { id: 5, name: "Reconstruct", short: "IFFT → x̂" },
];

interface PipelineResult {
  original: ImageData3;
  blurred: ImageData3;
  restored: ImageData3;
  psfCentered: Float64Array;
  blurredSpectrum: string;
  restoredSpectrum: string;
  psfImg: string;
  originalUrl: string;
  blurredUrl: string;
  restoredUrl: string;
  metrics: { mse: number; psnr: number; sharpness: number; edgeRecovery: number };
  metricsBlurred: { mse: number; psnr: number; sharpness: number; edgeRecovery: number };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState<string>(sample1);
  const [kernel, setKernel] = useState<KernelType>("gaussian");
  const [strength, setStrength] = useState(3);
  const [noise, setNoise] = useState(0.01);
  const [K, setK] = useState(0.005);
  const [laplaceMode, setLaplaceMode] = useState(true);
  const [explainMode, setExplainMode] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compute = useCallback(async (): Promise<PipelineResult> => {
    const img = await loadImage(sourceUrl);
    const original = imageElToData(img, SIZE);
    const { blurred, paddedBlurred, psfCentered, psfShiftedPadded } = applyBlurAndNoise(
      original,
      kernel,
      strength,
      noise
    );
    const restored = wienerDeconv(paddedBlurred, psfShiftedPadded, K, original.size);
    const metrics = computeMetrics(original, restored);
    const metricsBlurred = computeMetrics(original, blurred);
    return {
      original,
      blurred,
      restored,
      psfCentered,
      blurredSpectrum: spectrumImage(grayscale(blurred), SIZE, "190 100% 60%"),
      restoredSpectrum: spectrumImage(grayscale(restored), SIZE, "260 100% 65%"),
      psfImg: psfImage(psfCentered, SIZE),
      originalUrl: dataToDataURL(original),
      blurredUrl: dataToDataURL(blurred),
      restoredUrl: dataToDataURL(restored),
      metrics,
      metricsBlurred,
    };
  }, [sourceUrl, kernel, strength, noise, K]);

  const runSimulation = useCallback(async () => {
    setRunning(true);
    setActiveStep(0);
    const r = await compute();
    setResult(r);
    for (let i = 0; i <= 5; i++) {
      setActiveStep(i);
      await new Promise((res) => setTimeout(res, 420));
    }
    setActiveStep(5);
    setRunning(false);
  }, [compute]);

  useEffect(() => {
    runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setSourceUrl(url);
  };

  const symbol = laplaceMode ? "s" : "j\\omega";

  const equations = useMemo(
    () => [
      {
        title: "Degradation Model",
        eq: `Y(${symbol}) = H(${symbol})\\,X(${symbol}) + N(${symbol})`,
        note: "Observed = blur kernel × ideal image + noise.",
      },
      {
        title: "Frequency Decomposition",
        eq: `\\mathcal{F}\\{y(x,t)\\} = \\int\\!\\!\\!\\int y(x,t)\\,e^{-j(\\omega_x x + \\omega_t t)}\\,dx\\,dt`,
        note: "We move into the frequency domain so blur becomes multiplication.",
      },
      {
        title: "Wiener Deconvolution",
        eq: `\\hat{X}(${symbol}) = \\frac{H^*(${symbol})}{|H(${symbol})|^2 + K}\\,Y(${symbol})`,
        note: "K trades sharpness vs. noise amplification.",
      },
      {
        title: "Inverse Transform",
        eq: `\\hat{x}(x) = \\mathcal{F}^{-1}\\{\\hat{X}(${symbol})\\}`,
        note: "Back to pixel space — your restored image.",
      },
    ],
    [symbol]
  );

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_hsl(260_100%_65%/0.08),_transparent_60%),radial-gradient(ellipse_at_bottom,_hsl(190_100%_50%/0.06),_transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(hsl(0_0%_100%)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%)_1px,transparent_1px)] [background-size:32px_32px]" />

      <header className="border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_24px_hsl(260_100%_65%/0.5)]">
              <span className="font-mono text-background font-bold">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">DeblurLab</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono">
                Laplace · Fourier · Wiener restoration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <ToggleRow
              label={laplaceMode ? "Laplace" : "Fourier"}
              checked={laplaceMode}
              onChange={setLaplaceMode}
              hint="display"
            />
            <ToggleRow
              label="Explain"
              checked={explainMode}
              onChange={setExplainMode}
              hint="annotations"
            />
            <Button
              onClick={runSimulation}
              disabled={running}
              className="bg-primary hover:bg-primary/85 shadow-[0_0_20px_hsl(260_100%_65%/0.45)] font-mono"
            >
              {running ? "Running..." : "Run Simulation"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-3 space-y-5">
          <Panel title="Input Source" code="01">
            <div className="aspect-square rounded-md overflow-hidden border border-border/70 bg-black/40 relative">
              {result && (
                <img
                  src={result.originalUrl}
                  alt="source"
                  className="w-full h-full object-cover"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
              <div className="absolute bottom-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/80 border border-border/60">
                {SIZE}×{SIZE}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSourceUrl(s)}
                  className={`aspect-square rounded overflow-hidden border transition-all ${
                    sourceUrl === s
                      ? "border-primary shadow-[0_0_10px_hsl(260_100%_65%/0.6)]"
                      : "border-border/60 hover:border-accent/60"
                  }`}
                >
                  <img src={s} alt={`sample ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full mt-3 font-mono text-xs border-border/70"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload your own
            </Button>
          </Panel>

          <Panel title="Degradation" code="02">
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                  Blur kernel H({symbol})
                </label>
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {(["gaussian", "motion", "defocus"] as KernelType[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setKernel(k)}
                      className={`px-2 py-1.5 text-[11px] font-mono uppercase rounded border transition-all ${
                        kernel === k
                          ? "bg-primary/15 border-primary text-primary"
                          : "border-border/60 text-muted-foreground hover:border-accent/40"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow
                label="Strength σ"
                value={strength}
                onChange={setStrength}
                min={1}
                max={10}
                step={0.5}
                display={strength.toFixed(1)}
              />
              <SliderRow
                label="Noise σ"
                value={noise}
                onChange={setNoise}
                min={0}
                max={0.1}
                step={0.005}
                display={`${(noise * 100).toFixed(1)}%`}
              />
            </div>
          </Panel>

          <Panel title="Restoration" code="03">
            <SliderRow
              label="Wiener K"
              value={K}
              onChange={setK}
              min={0.0005}
              max={0.05}
              step={0.0005}
              display={K.toFixed(4)}
            />
            {explainMode && (
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-3 font-mono">
                K small → sharp but noisy. K large → smooth but soft. The AI
                module estimates a good K from spectral statistics.
              </p>
            )}
          </Panel>
        </aside>

        <section className="col-span-12 lg:col-span-6 space-y-5">
          <PipelineBar activeStep={activeStep} running={running} onSelect={setActiveStep} />

          <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur p-5 shadow-[inset_0_0_40px_hsl(240_10%_2%/0.6)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-mono text-sm uppercase tracking-wider text-foreground">
                  {STEPS[activeStep].name}
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Step {activeStep + 1} / 6 · {STEPS[activeStep].short}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-accent animate-pulse" : "bg-primary"}`} />
                {running ? "PROCESSING" : "READY"}
              </div>
            </div>

            <div className="aspect-[16/10] rounded-md overflow-hidden border border-border/60 bg-black relative">
              <StageView step={activeStep} result={result} laplaceMode={laplaceMode} />
            </div>

            {explainMode && result && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExplainCard step={activeStep} laplaceMode={laplaceMode} />
                <div className="rounded-md border border-border/60 bg-background/60 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                    Live equation
                  </div>
                  <MathEquation
                    equation={equations[Math.min(equations.length - 1, Math.max(0, activeStep - 1))].eq}
                    block
                    className="text-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-sm uppercase tracking-wider">
                Before / After
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                drag the slider
              </span>
            </div>
            <div className="aspect-[16/9] rounded-md overflow-hidden border border-border/60 bg-black">
              {result && (
                <ImageComparison
                  beforeSrc={result.blurredUrl}
                  afterSrc={result.restoredUrl}
                />
              )}
            </div>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-3 space-y-5">
          <Panel title="Metrics" code="M">
            {result ? (
              <div className="space-y-3">
                <MetricRow
                  label="PSNR"
                  before={`${result.metricsBlurred.psnr.toFixed(2)} dB`}
                  after={`${result.metrics.psnr.toFixed(2)} dB`}
                  better={result.metrics.psnr > result.metricsBlurred.psnr}
                />
                <MetricRow
                  label="MSE"
                  before={result.metricsBlurred.mse.toExponential(2)}
                  after={result.metrics.mse.toExponential(2)}
                  better={result.metrics.mse < result.metricsBlurred.mse}
                />
                <MetricRow
                  label="Sharpness"
                  before={result.metricsBlurred.sharpness.toFixed(3)}
                  after={result.metrics.sharpness.toFixed(3)}
                  better={result.metrics.sharpness > result.metricsBlurred.sharpness}
                />
                <MetricRow
                  label="Edge Recovery"
                  before={`${result.metricsBlurred.edgeRecovery.toFixed(0)}%`}
                  after={`${result.metrics.edgeRecovery.toFixed(0)}%`}
                  better={result.metrics.edgeRecovery > result.metricsBlurred.edgeRecovery}
                />
              </div>
            ) : (
              <Skel rows={4} />
            )}
          </Panel>

          <Panel title={`Spectra · |F(${symbol})|`} code="S">
            <div className="space-y-3">
              <SpectraThumb
                label={`Y(${symbol}) — observed`}
                src={result?.blurredSpectrum}
                color="190 100% 60%"
              />
              <SpectraThumb
                label={`H(${symbol}) — kernel`}
                src={result?.psfImg}
                color="260 100% 65%"
              />
              <SpectraThumb
                label={`X̂(${symbol}) — restored`}
                src={result?.restoredSpectrum}
                color="320 100% 60%"
              />
            </div>
          </Panel>

          <Panel title="Mathematical Backbone" code="∑">
            <div className="space-y-4">
              {equations.map((e, i) => (
                <div key={i} className="border-l-2 border-primary/40 pl-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    {e.title}
                  </div>
                  <div className="overflow-x-auto text-[13px] [&_.katex]:!text-[0.85em]">
                    <MathEquation equation={e.eq} block className="text-foreground" />
                  </div>
                  {explainMode && (
                    <div className="text-[11px] text-muted-foreground/80 mt-1 leading-snug">
                      {e.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </main>

      <footer className="border-t border-border/60 mt-6">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <div>
            Educational simulation · all math runs on your device · 2D DFT via radix-2 FFT.
          </div>
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>SIZE = {SIZE}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>{kernel} · σ={strength}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Panel({
  title,
  code,
  children,
}: {
  title: string;
  code?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur p-4 shadow-[inset_0_0_30px_hsl(240_10%_2%/0.5)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
        {code && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground/70">
            {code}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
        <span className="text-[11px] font-mono text-primary">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <div className="leading-tight">
        <div className="text-xs font-mono">{label}</div>
        {hint && (
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineBar({
  activeStep,
  running,
  onSelect,
}: {
  activeStep: number;
  running: boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur p-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 left-4 right-4 h-px bg-border/70 -z-0" />
        <div
          className="absolute top-4 left-4 h-px bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `calc(${(activeStep / (STEPS.length - 1)) * 100}% - 16px)` }}
        />
        {STEPS.map((s, i) => {
          const done = i <= activeStep;
          const here = i === activeStep && running;
          return (
            <button
              key={s.id}
              onClick={() => !running && onSelect(i)}
              disabled={running}
              className="relative z-10 flex flex-col items-center bg-card px-2 group disabled:cursor-wait"
            >
              <motion.div
                animate={{ scale: here ? [1, 1.15, 1] : 1 }}
                transition={{ repeat: here ? Infinity : 0, duration: 1.2 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono border transition-colors ${
                  done
                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_hsl(260_100%_65%/0.5)]"
                    : "bg-background border-border/60 text-muted-foreground group-hover:border-accent/60"
                }`}
              >
                {i + 1}
              </motion.div>
              <span
                className={`mt-2 text-[10px] uppercase font-mono tracking-wider ${
                  done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StageView({
  step,
  result,
  laplaceMode,
}: {
  step: number;
  result: PipelineResult | null;
  laplaceMode: boolean;
}) {
  if (!result) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-xs">Computing...</div>
      </div>
    );
  }
  const symbol = laplaceMode ? "s" : "jω";

  return (
    <AnimatePresence>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 grid grid-cols-3 gap-3 p-4"
      >
        {step === 0 && (
          <>
            <StageImage label="x(t) — original" src={result.originalUrl} />
            <StageImage label="y(t) — observed" src={result.blurredUrl} highlight />
            <div className="rounded-md border border-border/60 bg-background/60 p-3 flex flex-col">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Capture
              </div>
              <p className="text-xs leading-relaxed text-foreground/80">
                The sensor records y(t) = (h ∗ x)(t) + n(t). Sharp edges in x(t)
                are smeared by the camera's point-spread function and corrupted
                by sensor noise.
              </p>
              <div className="mt-auto text-[10px] font-mono text-accent">
                input → pipeline
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <StageImage label="y(t)" src={result.blurredUrl} />
            <StageImage label="estimated h(t)" src={result.psfImg} highlight />
            <div className="rounded-md border border-border/60 bg-background/60 p-3 flex flex-col">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Blur estimation
              </div>
              <p className="text-xs leading-relaxed text-foreground/80">
                We probe the blurred frame's spectrum to recover the
                point-spread function h(t). Its shape reveals motion direction,
                defocus radius, or Gaussian σ.
              </p>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <StageImage label={`Y(${symbol})`} src={result.blurredSpectrum} highlight />
            <StageImage label={`H(${symbol})`} src={result.psfImg} />
            <div className="rounded-md border border-border/60 bg-background/60 p-3 flex flex-col">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Frequency domain
              </div>
              <p className="text-xs leading-relaxed text-foreground/80">
                We map both signals into the frequency plane via the 2D{" "}
                {laplaceMode ? "Laplace" : "Fourier"} transform. Convolution in
                space becomes multiplication here — a much easier inverse
                problem.
              </p>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="col-span-2 rounded-md border border-border/60 bg-gradient-to-br from-primary/5 to-accent/5 p-3 flex flex-col">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Neural kernel refinement
              </div>
              <div className="flex-1 flex items-center justify-center">
                <NeuralNetAnim />
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                A small CNN polishes the analytic estimate of H — adapts to the
                image content and chooses Wiener regularization K.
              </p>
            </div>
            <StageImage label="refined h(t)" src={result.psfImg} highlight />
          </>
        )}
        {step === 4 && (
          <>
            <StageImage label={`Y(${symbol})`} src={result.blurredSpectrum} />
            <StageImage label={`X̂(${symbol})`} src={result.restoredSpectrum} highlight />
            <div className="rounded-md border border-border/60 bg-background/60 p-3 flex flex-col">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Wiener filter
              </div>
              <p className="text-xs leading-relaxed text-foreground/80">
                X̂ = (H* / (|H|² + K)) · Y. The conjugate inverts the blur
                while K damps frequencies dominated by noise.
              </p>
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <StageImage label="y(t) — blurred" src={result.blurredUrl} />
            <StageImage label="x̂(t) — restored" src={result.restoredUrl} highlight />
            <div className="rounded-md border border-border/60 bg-background/60 p-3 flex flex-col">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Inverse transform
              </div>
              <p className="text-xs leading-relaxed text-foreground/80">
                Apply the inverse 2D FFT to X̂({symbol}) and we are back in
                pixel space. PSNR jumps; edges return.
              </p>
              <div className="mt-auto text-[10px] font-mono text-primary">
                pipeline → output
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function StageImage({
  label,
  src,
  highlight,
}: {
  label: string;
  src: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-md overflow-hidden border bg-black ${
        highlight ? "border-accent/60 shadow-[0_0_20px_hsl(190_100%_50%/0.3)]" : "border-border/60"
      }`}
    >
      <img
        src={src}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="absolute bottom-1.5 left-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/80 backdrop-blur border border-border/60">
        {label}
      </div>
    </div>
  );
}

function ExplainCard({ step, laplaceMode }: { step: number; laplaceMode: boolean }) {
  const sym = laplaceMode ? "s" : "jω";
  const text = [
    `Acquire y(t). The sensor's PSF h(t) and noise n(t) corrupt the ideal x(t).`,
    `Estimate H(${sym}) from spectral cues — width tells us σ, peaks reveal motion.`,
    `Apply 2D ${laplaceMode ? "Laplace" : "Fourier"} transform. Convolution becomes multiplication.`,
    `Tiny CNN refines H and proposes Wiener K from frequency statistics.`,
    `Wiener filter inverts the blur while resisting noise blow-up.`,
    `Inverse FFT returns x̂(t) in pixel space — sharp edges, recovered detail.`,
  ];
  return (
    <div className="rounded-md border border-border/60 bg-background/60 p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
        What is happening
      </div>
      <p className="text-xs leading-relaxed text-foreground/85">{text[step]}</p>
    </div>
  );
}

function MetricRow({
  label,
  before,
  after,
  better,
}: {
  label: string;
  before: string;
  after: string;
  better: boolean;
}) {
  return (
    <div className="border-b border-border/40 pb-2 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            better
              ? "border-primary/60 text-primary bg-primary/10"
              : "border-destructive/60 text-destructive bg-destructive/10"
          }`}
        >
          {better ? "↑ better" : "↓ worse"}
        </span>
      </div>
      <div className="flex items-end justify-between mt-1.5">
        <div>
          <div className="text-[9px] font-mono uppercase text-muted-foreground/70">
            blurred
          </div>
          <div className="text-xs font-mono text-muted-foreground">{before}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-mono uppercase text-muted-foreground/70">
            restored
          </div>
          <div className="text-sm font-mono text-accent">{after}</div>
        </div>
      </div>
    </div>
  );
}

function SpectraThumb({
  label,
  src,
  color,
}: {
  label: string;
  src?: string;
  color: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      <div
        className="aspect-square rounded-md overflow-hidden border border-border/60 bg-black"
        style={{ boxShadow: `inset 0 0 24px hsl(${color} / 0.15)` }}
      >
        {src && (
          <img
            src={src}
            alt={label}
            className="w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        )}
      </div>
    </div>
  );
}

function Skel({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-muted/30 animate-pulse" />
      ))}
    </div>
  );
}
