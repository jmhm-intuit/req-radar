import type { JobAssessment, JobReq } from "../types";

interface PortfolioMapProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpen: (jobId: string) => void;
}

function groupClass(id: string): string {
  return `group-${id.replace(/[^a-z0-9-]/g, "-")}`;
}

export function PortfolioMap({ jobs, assessments, onOpen }: PortfolioMapProps) {
  if (!jobs.length) {
    return <div className="map-empty">Upload job requisitions to build your Capability Fit × Interest Fit portfolio map.</div>;
  }

  return (
    <div className="portfolio-map-wrap">
      <div className="map-axis-label y">Interest Fit</div>
      <svg className="portfolio-map" viewBox="0 0 760 430" role="img" aria-label="Capability Fit versus Interest Fit map">
        <defs>
          <filter id="bubbleShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.16" />
          </filter>
        </defs>
        <rect x="66" y="28" width="660" height="340" rx="18" className="map-bg" />
        <rect x="396" y="28" width="330" height="170" className="quadrant q-pursue" />
        <rect x="66" y="28" width="330" height="170" className="quadrant q-stretch" />
        <rect x="396" y="198" width="330" height="170" className="quadrant q-capable" />
        <rect x="66" y="198" width="330" height="170" className="quadrant q-low" />
        <line x1="396" y1="28" x2="396" y2="368" className="map-midline" />
        <line x1="66" y1="198" x2="726" y2="198" className="map-midline" />
        <text x="707" y="48" textAnchor="end" className="quadrant-label">Pursue</text>
        <text x="84" y="48" className="quadrant-label">Stretch / explore</text>
        <text x="707" y="350" textAnchor="end" className="quadrant-label">Capable, lower interest</text>
        <text x="84" y="350" className="quadrant-label">Do not prioritize</text>
        {[0, 25, 50, 75, 100].map((tick) => {
          const x = 66 + tick * 6.6;
          const y = 368 - tick * 3.4;
          return <g key={tick}><line x1={x} y1="368" x2={x} y2="375" className="axis-tick" /><text x={x} y="393" textAnchor="middle" className="axis-text">{tick}</text><line x1="59" y1={y} x2="66" y2={y} className="axis-tick" /><text x="49" y={y + 4} textAnchor="end" className="axis-text">{tick}</text></g>;
        })}
        {jobs.map((job, index) => {
          const assessment = assessments.get(job.id);
          if (!assessment) return null;
          const x = 66 + assessment.capabilityScore * 6.6;
          const y = 368 - assessment.interestScore * 3.4;
          const radius = 8 + assessment.directionScore / 18;
          const stale = assessment.ageDays !== null && assessment.ageDays > 90 && !job.ageOverride && !job.verifiedActiveAt;
          return <g key={job.id} className={`map-point ${groupClass(assessment.fingerprint.primaryGroupId)} ${job.status === "NOT_PURSUING" || job.status === "CLOSED" ? "muted" : ""}`} role="button" tabIndex={0} onClick={() => onOpen(job.id)} onKeyDown={(event) => event.key === "Enter" && onOpen(job.id)}>
            <circle cx={x} cy={y} r={radius + (job.pinned ? 3 : 0)} className={`bubble ${stale ? "stale" : ""}`} filter="url(#bubbleShadow)" />
            {job.pinned && <text x={x} y={y + 3} textAnchor="middle" className="pin-mark">★</text>}
            <title>{`${index + 1}. ${job.title}\nCapability ${assessment.capabilityScore}% · Interest ${assessment.interestScore}%\n${assessment.fingerprint.primaryGroupLabel}`}</title>
          </g>;
        })}
      </svg>
      <div className="map-axis-label x">Capability Fit</div>
      <div className="map-legend"><span><i className="legend-dot" /> Bubble color = role family</span><span><i className="legend-ring" /> Red ring = older than 90 days</span><span>Bubble size = career direction fit</span></div>
    </div>
  );
}
