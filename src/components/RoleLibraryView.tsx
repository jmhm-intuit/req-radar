import { useState } from "react";
import { BarChart3, GitCompareArrows, Library, ListFilter, Target, TrendingUp } from "lucide-react";
import type { AppSettings, JobAssessment, JobReq } from "../types";
import { CompetencyHeatmapView } from "./CompetencyHeatmapView";
import { EvidencePortfolioView } from "./EvidencePortfolioView";
import { PortfolioDemandView } from "./PortfolioDemandView";
import { PortfolioNavigator } from "./PortfolioNavigator";
import { RoleComparisonView } from "./RoleComparisonView";

type LibraryTab = "ALL" | "FIT" | "HEATMAP" | "DEMAND" | "COMPARE";

interface RoleLibraryViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onOpenJob: (jobId: string) => void;
  onUpdateJob: (jobId: string, changes: Partial<JobReq>) => void;
}

export function RoleLibraryView({ jobs, assessments, settings, onSettingsChange, onOpenJob, onUpdateJob }: RoleLibraryViewProps) {
  const [tab, setTab] = useState<LibraryTab>("ALL");

  return <div className="v4-library">
    <section className="v4-library-intro"><div><span className="eyebrow">Complete role library</span><h2>Advanced analysis and every uploaded opportunity</h2><p>This is the power-user area. The main experience starts with the candidate baseline, opportunity families, shortlist, and application pipeline.</p></div><Library /></section>
    <nav className="v4-library-tabs">
      <button className={tab === "ALL" ? "active" : ""} onClick={() => setTab("ALL")}><ListFilter /> All roles</button>
      <button className={tab === "FIT" ? "active" : ""} onClick={() => setTab("FIT")}><BarChart3 /> Fit signatures</button>
      <button className={tab === "HEATMAP" ? "active" : ""} onClick={() => setTab("HEATMAP")}><Target /> Heatmap</button>
      <button className={tab === "DEMAND" ? "active" : ""} onClick={() => setTab("DEMAND")}><TrendingUp /> Portfolio demand</button>
      <button className={tab === "COMPARE" ? "active" : ""} onClick={() => setTab("COMPARE")}><GitCompareArrows /> Compare roles</button>
    </nav>
    {tab === "ALL" && <PortfolioNavigator jobs={jobs} assessments={assessments} settings={settings} onSettingsChange={onSettingsChange} onOpen={onOpenJob} onUpdate={onUpdateJob} />}
    {tab === "FIT" && <EvidencePortfolioView jobs={jobs} assessments={assessments} onOpen={onOpenJob} onUpdate={onUpdateJob} onOpenHeatmap={() => setTab("HEATMAP")} onOpenDemand={() => setTab("DEMAND")} onOpenCompare={() => setTab("COMPARE")} />}
    {tab === "HEATMAP" && <CompetencyHeatmapView jobs={jobs} assessments={assessments} onOpen={onOpenJob} />}
    {tab === "DEMAND" && <PortfolioDemandView jobs={jobs} assessments={assessments} onOpen={onOpenJob} />}
    {tab === "COMPARE" && <RoleComparisonView jobs={jobs} assessments={assessments} onOpen={onOpenJob} />}
  </div>;
}
