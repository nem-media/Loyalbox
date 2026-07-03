import { Stars } from "@/components/ui/stars";

// Builds a decorative QR-like matrix: three finder squares + deterministic fill.
function buildQrMatrix(n = 21) {
  const m: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  const placeFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[r0 + r][c0 + c] = edge || core;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  const inFinderZone = (r: number, c: number) =>
    (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!inFinderZone(r, c)) {
        m[r][c] = (r * 13 + c * 7 + r * c) % 3 === 0;
      }
    }
  }
  return m;
}

function FakeQR() {
  const n = 21;
  const matrix = buildQrMatrix(n);
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      className="h-full w-full"
      shapeRendering="crispEdges"
      fill="#0a0a0a"
      aria-hidden="true"
    >
      {matrix.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} /> : null,
        ),
      )}
    </svg>
  );
}

// A stylised physical review stand with an example business logo, for the hero.
export function HeroStand() {
  return (
    <div className="mx-auto w-full max-w-[16rem] select-none">
      {/* The stand sign */}
      <div className="box-shape border border-border bg-card p-6 text-foreground shadow-[0_30px_60px_-25px_rgba(0,0,0,0.4)]">
        {/* Example business logo */}
        <div className="flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-white shadow-sm">
            CA
          </span>
          <p className="mt-3 text-sm font-bold tracking-tight">Café Aurora</p>
          <p className="text-xs text-muted">Scan &amp; anmeld os</p>
        </div>

        {/* QR code */}
        <div className="mx-auto mt-4 w-28 rounded-xl border border-border bg-white p-2">
          <FakeQR />
        </div>

        <div className="mt-4 flex justify-center">
          <Stars value={5} />
        </div>
      </div>

      {/* Stand neck + base */}
      <div className="mx-auto h-5 w-4 bg-border/70" />
      <div className="mx-auto h-2.5 w-28 rounded-b-xl rounded-t-sm bg-border" />
      {/* Soft floor shadow */}
      <div className="mx-auto mt-2 h-3 w-36 rounded-[50%] bg-foreground/10 blur-md" />
    </div>
  );
}
