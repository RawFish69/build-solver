import { ArrowRight, Boxes, Database, GitBranch, ShieldCheck, Terminal, Workflow } from "lucide-react"
import { Button } from "@/components/ui"

const FLOATING_TILES = [
  { icon: Boxes, opacity: 1 },
  { icon: Database, opacity: 0.6 },
  { icon: Workflow, opacity: 1 },
  { icon: GitBranch, opacity: 0.4 },
  { icon: ShieldCheck, opacity: 0.7 },
  { icon: Terminal, opacity: 1 },
]

export function ControlRoomHeroSection() {
  return (
    <section className="py-12 w-full flex justify-center items-center px-4 md:px-6">
      <div className="w-full max-w-7xl relative">
        <div className="relative overflow-hidden rounded-[24px] border border-border bg-card min-h-[600px] flex flex-col items-center justify-center">
          {/* Floating icon tiles — decorative depth, no photography per spec */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            {FLOATING_TILES.map(({ icon: Icon, opacity }, i) => (
              <div
                key={i}
                className="absolute flex items-center justify-center rounded-[8.77px] border"
                style={{
                  width: 56,
                  height: 56,
                  top: `${12 + i * 13}%`,
                  left: i % 2 === 0 ? `${6 + i * 4}%` : undefined,
                  right: i % 2 === 1 ? `${6 + i * 3}%` : undefined,
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.08)",
                  opacity,
                  filter: opacity < 0.7 ? "blur(1px)" : undefined,
                }}
              >
                <Icon size={24} className="text-muted-foreground" strokeWidth={1.5} />
              </div>
            ))}
          </div>

          <div className="relative z-10 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Status badge */}
            <div
              className="mb-8 inline-flex items-center gap-2 rounded-[5.26px] border px-2.5 py-1 text-[10px] font-medium tracking-wide"
              style={{
                borderColor: "var(--wb-success-border)",
                background: "var(--wb-success-muted)",
                color: "var(--wb-success)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--wb-success)" }} />
              ALL SYSTEMS OPERATIONAL
            </div>

            {/* Headline — weight 400, whisper against the matte background */}
            <h2 className="text-foreground mb-6 font-normal text-[44px] leading-[1] tracking-[-1.1px] md:text-[64px] md:leading-[0.94] md:tracking-[-1.28px]">
              Infrastructure,
              <br />
              <span className="text-muted-foreground">rendered legible.</span>
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-base md:text-[18px] md:leading-[1.5] max-w-2xl mb-10 font-normal">
              One control plane for every workflow, agent, and data source —
              built for teams who read logs, not landing pages.
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-3">
              <Button variant="primary" className="rounded-[10px]! px-5! py-2! text-sm! group">
                Request a demo
                <ArrowRight className="ml-2 h-4 w-4 inline transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <button
                type="button"
                className="inline-flex items-center rounded-[10px] px-4 py-2 text-sm font-normal text-foreground transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                Read the docs
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
