import type {
  DiscoveryFacet,
  InterestDimension,
  PreferenceImportance,
  PreferenceScore,
  ScenarioFrequency,
  ScenarioReaction
} from "../types";

export interface DiscoveryFacetDefinition {
  id: DiscoveryFacet;
  label: string;
  shortLabel: string;
  dimension: InterestDimension;
  family: "WORK_CONTENT" | "WORK_DESIGN" | "LEADERSHIP_SOCIAL";
  description: string;
  defaultImportance: PreferenceImportance;
}

export interface ScenarioTemplate {
  id: string;
  facet: DiscoveryFacet;
  title: string;
  situation: string;
  responsibility: string;
  tension: string;
  purpose: string;
  includePatterns: string[];
  optionalPatterns?: string[];
  excludePatterns?: string[];
  evidencePatterns: string[];
  frequencyAssumption: string;
  conditionOptions: string[];
  reflectionPrompt: string;
  priority: number;
}

export const DISCOVERY_FACETS: DiscoveryFacetDefinition[] = [
  { id: "STRATEGIC_FRAMING", label: "Strategic problem framing", shortLabel: "Strategy", dimension: "STRATEGY", family: "WORK_CONTENT", description: "Defining the problem, setting direction, and making choices before execution begins.", defaultImportance: 3 },
  { id: "ANALYTICAL_PROBLEM_SOLVING", label: "Analytical problem solving", shortLabel: "Analytics", dimension: "ANALYTICS", family: "WORK_CONTENT", description: "Using data, models, and structured reasoning to diagnose and shape decisions.", defaultImportance: 2 },
  { id: "BUILDING_SYSTEMS", label: "Building new systems", shortLabel: "Build", dimension: "BUILDING_NEW", family: "WORK_DESIGN", description: "Creating a new capability, operating model, process, or way of working.", defaultImportance: 3 },
  { id: "RUNNING_CADENCE", label: "Running recurring cadence", shortLabel: "Cadence", dimension: "RECURRING_OPERATIONS", family: "WORK_DESIGN", description: "Owning recurring planning, reporting, review, and follow-through rhythms.", defaultImportance: 3 },
  { id: "AMBIGUITY_NAVIGATION", label: "Navigating ambiguity", shortLabel: "Ambiguity", dimension: "AMBIGUITY", family: "WORK_DESIGN", description: "Working when the goal, path, or operating model is not yet clear.", defaultImportance: 2 },
  { id: "AUTONOMY_AND_AUTHORITY", label: "Autonomy and decision authority", shortLabel: "Autonomy", dimension: "AUTONOMY", family: "WORK_DESIGN", description: "Having the mandate, resources, and decision rights needed to shape the work.", defaultImportance: 2 },
  { id: "WORK_VARIETY", label: "Variety of work", shortLabel: "Variety", dimension: "VARIETY", family: "WORK_DESIGN", description: "Moving across different problems, stakeholders, and types of contribution.", defaultImportance: 2 },
  { id: "AI_TRANSFORMATION", label: "AI and technology transformation", shortLabel: "AI", dimension: "AI_INNOVATION", family: "WORK_CONTENT", description: "Using AI or emerging technology as a central part of the business mandate.", defaultImportance: 3 },
  { id: "CUSTOMER_IMPACT", label: "Customer impact", shortLabel: "Customer", dimension: "CUSTOMER_IMPACT", family: "WORK_CONTENT", description: "Connecting work directly to customer experience, adoption, or outcomes.", defaultImportance: 1 },
  { id: "PRODUCT_OWNERSHIP", label: "Product ownership", shortLabel: "Product", dimension: "PRODUCT", family: "WORK_CONTENT", description: "Making product choices, shaping roadmaps, and owning product outcomes.", defaultImportance: 1 },
  { id: "BUSINESS_OWNERSHIP", label: "Direct business ownership", shortLabel: "Ownership", dimension: "BUSINESS_OWNERSHIP", family: "WORK_CONTENT", description: "Being directly accountable for revenue, cost, or operating outcomes.", defaultImportance: 1 },
  { id: "SETTING_TEAM_DIRECTION", label: "Setting team direction", shortLabel: "Direction", dimension: "PEOPLE_LEADERSHIP", family: "LEADERSHIP_SOCIAL", description: "Translating strategy into priorities and creating clarity for a team.", defaultImportance: 3 },
  { id: "COACHING_AND_DEVELOPMENT", label: "Coaching and development", shortLabel: "Coaching", dimension: "PEOPLE_DEVELOPMENT", family: "LEADERSHIP_SOCIAL", description: "Helping capable people grow through feedback, coaching, and stretch opportunities.", defaultImportance: 2 },
  { id: "DELEGATION_AND_ACCOUNTABILITY", label: "Delegation and accountability", shortLabel: "Delegation", dimension: "PEOPLE_LEADERSHIP", family: "LEADERSHIP_SOCIAL", description: "Trusting others to own work while maintaining clear standards and follow-through.", defaultImportance: 2 },
  { id: "PERFORMANCE_MANAGEMENT", label: "Performance management", shortLabel: "Performance", dimension: "PEOPLE_LEADERSHIP", family: "LEADERSHIP_SOCIAL", description: "Addressing persistent underperformance, difficult feedback, and accountability.", defaultImportance: 2 },
  { id: "HIRING_AND_TEAM_DESIGN", label: "Hiring and team design", shortLabel: "Team design", dimension: "PEOPLE_LEADERSHIP", family: "LEADERSHIP_SOCIAL", description: "Recruiting, structuring, and reshaping a team around the work.", defaultImportance: 2 },
  { id: "PEOPLE_ADMINISTRATION", label: "People-management administration", shortLabel: "People admin", dimension: "RECURRING_OPERATIONS", family: "LEADERSHIP_SOCIAL", description: "One-on-ones, reviews, staffing processes, approvals, and recurring management administration.", defaultImportance: 2 },
  { id: "EXECUTIVE_INFLUENCE", label: "Executive influence", shortLabel: "Executives", dimension: "EXECUTIVE_INFLUENCE", family: "LEADERSHIP_SOCIAL", description: "Framing recommendations and changing senior leaders' decisions.", defaultImportance: 2 },
  { id: "PEER_ALIGNMENT", label: "Cross-functional alignment", shortLabel: "Alignment", dimension: "EXECUTIVE_INFLUENCE", family: "LEADERSHIP_SOCIAL", description: "Resolving competing priorities and creating alignment across functions.", defaultImportance: 2 },
  { id: "INFLUENCE_WITHOUT_AUTHORITY", label: "Influence without authority", shortLabel: "Influence", dimension: "INDIVIDUAL_CONTRIBUTOR", family: "LEADERSHIP_SOCIAL", description: "Delivering outcomes through people and teams who do not report to you.", defaultImportance: 3 },
  { id: "ORGANIZATIONAL_COMMUNICATION", label: "Organizational communication", shortLabel: "Communication", dimension: "EXECUTIVE_INFLUENCE", family: "LEADERSHIP_SOCIAL", description: "Creating alignment through narratives, meetings, town halls, or leadership forums.", defaultImportance: 1 }
];

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "strategy-choice",
    facet: "STRATEGIC_FRAMING",
    title: "Frame a consequential strategic choice",
    situation: "Senior leaders agree that performance needs to improve, but they disagree about the real problem and which priorities should change.",
    responsibility: "You must define the decision, structure the analysis, recommend a direction, and help leaders commit to trade-offs.",
    tension: "The work is intellectually open-ended, but progress may be slow because alignment matters as much as the answer.",
    purpose: "Clarify whether you enjoy problem framing and strategic choice-making—not only executing a plan after the decision is made.",
    includePatterns: ["strategy", "strategic planning", "priorities", "annual planning", "long-term goals", "frame decisions"],
    evidencePatterns: ["strategic planning", "strategy", "frame decisions", "priorities", "long-term goals"],
    frequencyAssumption: "Imagine this is a recurring part of the role, not a one-time project.",
    conditionOptions: ["Quality of the executive sponsor", "Clarity of decision rights", "Access to data", "Time available for thinking", "How often priorities change"],
    reflectionPrompt: "Recall a time you had to define the problem before solving it. Did you enjoy the ambiguity, the influence, the analysis, or only the outcome?",
    priority: 100
  },
  {
    id: "analytics-diagnosis",
    facet: "ANALYTICAL_PROBLEM_SOLVING",
    title: "Diagnose why performance is off track",
    situation: "A major initiative is missing its targets. The available data is incomplete and different teams have competing explanations.",
    responsibility: "You personally synthesize the data, build a decision model, and identify the few changes most likely to improve outcomes.",
    tension: "The analysis must be rigorous enough to influence leaders, but the role may not provide a dedicated analytics team.",
    purpose: "Explore how much hands-on analytical work you want to own personally.",
    includePatterns: ["analysis", "data-driven", "analytics", "financial model", "kpi", "metrics", "business performance"],
    evidencePatterns: ["data-driven", "analysis", "financial", "analytical", "kpi", "metrics"],
    frequencyAssumption: "Assume one to two substantial analytical questions appear each month.",
    conditionOptions: ["Availability of analytical support", "Quality of data", "Decision relevance", "Amount of spreadsheet work", "Time pressure"],
    reflectionPrompt: "Think about an analysis you were proud of. Did the act of modeling energize you, or did you mainly value the influence it created?",
    priority: 82
  },
  {
    id: "build-operating-model",
    facet: "BUILDING_SYSTEMS",
    title: "Build a new operating model",
    situation: "The organization is growing, but teams work differently and decisions take too long.",
    responsibility: "You design a new operating model, clarify decision rights, introduce planning rhythms, and help teams adopt the change.",
    tension: "Design is creative and strategic; adoption requires patient follow-through and repeated reinforcement.",
    purpose: "Separate enjoyment of building a system from enjoyment of operating it after launch.",
    includePatterns: ["operating model", "ways of working", "process improvement", "organizational design", "scale", "operational excellence"],
    evidencePatterns: ["operating model", "ways of working", "process", "scale", "operational excellence"],
    frequencyAssumption: "Imagine the first six months are design-heavy, followed by sustained adoption work.",
    conditionOptions: ["Authority to change the model", "Sponsor commitment", "Ability to hand off recurring operations", "Scale of the change", "Resistance from teams"],
    reflectionPrompt: "Have you enjoyed creating a process or operating system before? How did your energy change once the work became maintenance?",
    priority: 92
  },
  {
    id: "run-operating-cadence",
    facet: "RUNNING_CADENCE",
    title: "Run the recurring operating cadence",
    situation: "The strategy is set, but execution is inconsistent across several teams.",
    responsibility: "You run quarterly reviews, monitor KPIs, chase follow-ups, surface risks, and repeatedly bring owners back to commitments.",
    tension: "The cadence creates visible impact, but much of the work repeats on a predictable cycle.",
    purpose: "Test whether you want to own recurring operating discipline or mainly design the system and transition it to others.",
    includePatterns: ["monitor", "kpi", "quarterly", "operating rhythm", "planning process", "execution", "goals", "reporting"],
    evidencePatterns: ["monitor", "kpi", "quarterly", "planning", "execution", "goals"],
    frequencyAssumption: "Assume this occupies a meaningful part of every week.",
    conditionOptions: ["Ability to automate reporting", "Whether reviews drive real decisions", "Support from program managers", "Percentage of the week", "Opportunity to improve the system"],
    reflectionPrompt: "When have you run a recurring business rhythm? Did consistency feel satisfying, neutral, or draining over time?",
    priority: 96
  },
  {
    id: "navigate-ambiguity",
    facet: "AMBIGUITY_NAVIGATION",
    title: "Create clarity where the mandate is unclear",
    situation: "Leadership believes the area needs to improve but has not defined the problem, success metric, or operating model.",
    responsibility: "You establish the mandate, identify the stakeholders, define success, and create a path that others can follow.",
    tension: "You gain freedom to shape the work, but expectations may shift and accountability can arrive before authority is clear.",
    purpose: "Explore whether ambiguity is energizing only when paired with sponsorship and authority.",
    includePatterns: ["ambiguity", "shape", "define", "build", "new", "evolving", "creative problem solver"],
    evidencePatterns: ["ambiguity", "shape", "define", "creative problem", "new strategic"],
    frequencyAssumption: "Assume the first three to six months contain substantial uncertainty.",
    conditionOptions: ["Strength of sponsorship", "Decision authority", "Access to stakeholders", "Clarity of outcomes", "Stability of leadership"],
    reflectionPrompt: "Describe an ambiguous assignment you enjoyed and one you did not. What conditions made the difference?",
    priority: 88
  },
  {
    id: "authority-accountability",
    facet: "AUTONOMY_AND_AUTHORITY",
    title: "Own the outcome with incomplete authority",
    situation: "You are accountable for improving a business outcome, but many required decisions sit with other leaders.",
    responsibility: "You must negotiate resources, influence priorities, and create momentum without formal control over every dependency.",
    tension: "The scope is meaningful, but accountability may exceed decision rights.",
    purpose: "Clarify how much authority you need to enjoy broad ownership.",
    includePatterns: ["own", "drive", "accountable", "partner", "cross-functional", "stakeholders", "ensure"],
    evidencePatterns: ["drive", "partner", "cross-functional", "stakeholder", "ensure"],
    frequencyAssumption: "Assume this tension is a structural feature of the role.",
    conditionOptions: ["Executive sponsorship", "Formal decision rights", "Access to resources", "Clarity of escalation", "Strength of peer relationships"],
    reflectionPrompt: "When have you been accountable without full authority? Did the influence challenge feel engaging or frustrating?",
    priority: 77
  },
  {
    id: "varied-portfolio",
    facet: "WORK_VARIETY",
    title: "Switch across a portfolio of urgent problems",
    situation: "Several high-visibility issues compete for attention: planning, an executive decision, a process failure, and a leadership meeting.",
    responsibility: "You repeatedly change context, decide where to intervene, and maintain quality across different kinds of work.",
    tension: "The role offers variety and exposure, but deep focus can be difficult.",
    purpose: "Test whether variety energizes you or creates fragmentation.",
    includePatterns: ["multiple", "critical initiatives", "top priorities", "cross-functional", "variety", "broad", "throughout"],
    evidencePatterns: ["critical initiatives", "priorities", "cross-functional", "throughout"],
    frequencyAssumption: "Assume priorities shift several times during a normal week.",
    conditionOptions: ["Ability to delegate", "Number of simultaneous priorities", "Quality of prioritization", "Protected focus time", "Support team"],
    reflectionPrompt: "Think about your most varied role. Did the range create energy, or did constant switching reduce satisfaction?",
    priority: 63
  },
  {
    id: "ai-change",
    facet: "AI_TRANSFORMATION",
    title: "Lead AI adoption without owning the technical build",
    situation: "The organization wants meaningful AI adoption, but teams vary in readiness and the technical roadmap is owned elsewhere.",
    responsibility: "You shape the business use cases, operating model, adoption plan, and executive alignment needed to turn technology into impact.",
    tension: "The topic is innovative, but much of the work may be change leadership rather than hands-on product or technical creation.",
    purpose: "Clarify which part of AI work attracts you: technology, transformation, business strategy, or organizational adoption.",
    includePatterns: ["artificial intelligence", "generative ai", "ai", "machine learning", "automation"],
    evidencePatterns: ["artificial intelligence", "generative ai", "ai ", "machine learning", "automation"],
    frequencyAssumption: "Assume AI is a central business theme, while technical delivery remains cross-functional.",
    conditionOptions: ["Proximity to product teams", "Ability to shape use cases", "Technical learning opportunity", "Executive sponsorship", "Level of hands-on ownership"],
    reflectionPrompt: "Would you still want the role if AI were primarily the context for transformation rather than the work you personally build?",
    priority: 95
  },
  {
    id: "customer-outcomes",
    facet: "CUSTOMER_IMPACT",
    title: "Translate internal change into customer outcomes",
    situation: "Internal teams are focused on process and execution, but the organization needs a clearer connection to customer value.",
    responsibility: "You define how operating choices affect customers and use that perspective to influence priorities.",
    tension: "Customer impact is meaningful, but you may be several layers removed from direct customer interaction.",
    purpose: "Explore whether indirect customer impact is motivating enough or whether you need closer customer proximity.",
    includePatterns: ["customer", "client", "user", "customer success", "customer experience"],
    evidencePatterns: ["customer", "client", "user"],
    frequencyAssumption: "Assume customer outcomes shape decisions, but direct customer interaction is occasional.",
    conditionOptions: ["Direct customer exposure", "Visibility of impact", "Type of customer problem", "Decision influence", "Measurement quality"],
    reflectionPrompt: "When has customer impact made work more meaningful for you? Did you need direct interaction to feel that connection?",
    priority: 67
  },
  {
    id: "product-roadmap",
    facet: "PRODUCT_OWNERSHIP",
    title: "Choose what a product team should build",
    situation: "Customer needs, technical constraints, and business priorities point in different directions.",
    responsibility: "You shape the roadmap, make trade-offs, and own the logic behind product investment choices.",
    tension: "The role offers tangible ownership, but requires sustained attention to delivery details and stakeholder negotiation.",
    purpose: "Test attraction to product decision-making versus broader enterprise strategy.",
    includePatterns: ["product strategy", "product management", "roadmap", "product vision", "product development"],
    evidencePatterns: ["product strategy", "product", "roadmap", "product vision"],
    frequencyAssumption: "Assume roadmap and delivery trade-offs are a weekly responsibility.",
    conditionOptions: ["Customer proximity", "Technical partnership", "Decision authority", "Delivery detail", "Product maturity"],
    reflectionPrompt: "Have you enjoyed making product trade-offs, or do you prefer shaping the operating environment around product teams?",
    priority: 78
  },
  {
    id: "business-results",
    facet: "BUSINESS_OWNERSHIP",
    title: "Own a measurable business outcome",
    situation: "A revenue, cost, or customer metric is below target and leadership expects one accountable owner.",
    responsibility: "You set the plan, make trade-offs, and remain directly accountable for results over multiple quarters.",
    tension: "Ownership creates clarity and influence, but the pressure persists even when dependencies sit elsewhere.",
    purpose: "Explore whether direct business accountability is motivating or mainly a useful context for strategy work.",
    includePatterns: ["revenue", "p&l", "business outcomes", "growth", "cost", "operational performance", "accountable"],
    evidencePatterns: ["revenue", "p&l", "growth", "cost", "business outcome", "performance"],
    frequencyAssumption: "Assume the metric is visible and reviewed frequently by senior leadership.",
    conditionOptions: ["Control over key levers", "Nature of the metric", "Time horizon", "Team support", "Risk tolerance"],
    reflectionPrompt: "When have you owned a metric directly? Did accountability sharpen your motivation or create pressure without enough meaning?",
    priority: 70
  },
  {
    id: "set-team-direction",
    facet: "SETTING_TEAM_DIRECTION",
    title: "Set direction for a team",
    situation: "A capable team is busy, but priorities are fragmented and people are unclear about what matters most.",
    responsibility: "You translate strategy into team priorities, make trade-offs, and create a clear narrative for why the work matters.",
    tension: "The work is strategic, but your effectiveness depends on repeated communication and follow-through with individuals.",
    purpose: "Separate attraction to setting direction from attraction to all other aspects of people management.",
    includePatterns: ["lead a team", "manage a team", "direct reports", "people leader", "team leadership", "develop the team"],
    optionalPatterns: ["leader", "team", "people agenda", "culture"],
    evidencePatterns: ["lead a team", "manage a team", "direct reports", "people", "team", "culture"],
    frequencyAssumption: "Assume you are accountable for creating clarity every week, not only at annual planning.",
    conditionOptions: ["Team capability", "Size of team", "Authority over priorities", "Quality of strategy", "Manager support"],
    reflectionPrompt: "Have you enjoyed turning broad goals into clarity for others? Which part felt most rewarding?",
    priority: 90
  },
  {
    id: "coach-capable-people",
    facet: "COACHING_AND_DEVELOPMENT",
    title: "Coach capable people through growth",
    situation: "Several strong team members are ready for bigger scope but need candid feedback and deliberate development opportunities.",
    responsibility: "You invest time in coaching, calibrate strengths and gaps, and create assignments that help people grow.",
    tension: "The work can be deeply rewarding, but progress is gradual and requires sustained attention to individual needs.",
    purpose: "Explore interest in development work separately from hierarchy or team size.",
    includePatterns: ["coach", "develop talent", "people development", "mentor", "career development", "team culture"],
    optionalPatterns: ["lead a team", "people leader", "team"],
    evidencePatterns: ["coach", "develop", "mentor", "people", "culture"],
    frequencyAssumption: "Assume several hours each week are dedicated to coaching and development.",
    conditionOptions: ["Team maturity", "Motivation of team members", "Time available", "Quality of feedback culture", "Ability to offer growth opportunities"],
    reflectionPrompt: "Think of someone you helped grow. Did you enjoy the coaching process itself, or mainly the eventual result?",
    priority: 74
  },
  {
    id: "delegate-accountability",
    facet: "DELEGATION_AND_ACCOUNTABILITY",
    title: "Delegate meaningful ownership",
    situation: "A high-stakes initiative would be faster if you kept control, but a team member needs the opportunity to lead it.",
    responsibility: "You delegate the outcome, establish checkpoints, and resist stepping back in unless the risk becomes material.",
    tension: "Delegation develops capability but requires accepting different approaches and temporary inefficiency.",
    purpose: "Test comfort with achieving results through others rather than personal control.",
    includePatterns: ["lead a team", "manage", "develop", "delegate", "accountability", "team outcomes"],
    optionalPatterns: ["leader", "team"],
    evidencePatterns: ["lead", "manage", "develop", "accountability", "team"],
    frequencyAssumption: "Assume your role is judged partly by the team's independent performance.",
    conditionOptions: ["Experience of the team", "Risk of the work", "Clarity of standards", "Time to coach", "Trust in team members"],
    reflectionPrompt: "When have you enjoyed enabling someone else to own the result? When did delegation feel frustrating?",
    priority: 68
  },
  {
    id: "performance-conversation",
    facet: "PERFORMANCE_MANAGEMENT",
    title: "Address persistent underperformance",
    situation: "A well-liked team member has missed expectations for several months despite prior coaching.",
    responsibility: "You deliver direct feedback, establish consequences, document the plan, and make a difficult staffing decision if performance does not improve.",
    tension: "The conversation protects the team and standards, but it can be emotionally demanding and administratively heavy.",
    purpose: "Explore the less attractive but unavoidable side of direct people leadership.",
    includePatterns: ["people leader", "manage a team", "performance management", "direct reports", "team leadership"],
    optionalPatterns: ["lead a team", "team"],
    evidencePatterns: ["people", "team", "manage", "lead"],
    frequencyAssumption: "Assume difficult performance situations arise several times a year.",
    conditionOptions: ["HR support", "Clarity of expectations", "Frequency of cases", "Team size", "Authority to make staffing decisions"],
    reflectionPrompt: "How have you reacted to difficult performance conversations in the past? Did the responsibility feel meaningful, draining, or both?",
    priority: 65
  },
  {
    id: "hire-team-design",
    facet: "HIRING_AND_TEAM_DESIGN",
    title: "Build and reshape a team",
    situation: "The current team structure no longer matches the strategy and several critical capabilities are missing.",
    responsibility: "You redesign roles, recruit talent, make trade-offs about structure, and help existing employees adapt.",
    tension: "You can shape capability and culture, but hiring and reorganization consume significant time and emotional energy.",
    purpose: "Explore whether team building is an energizing leadership activity or an occasional burden.",
    includePatterns: ["build a team", "hire", "recruit", "organizational design", "team design", "people strategy"],
    optionalPatterns: ["people leader", "lead a team", "team"],
    evidencePatterns: ["build", "hire", "team", "organization", "people"],
    frequencyAssumption: "Assume team design and hiring are major priorities during the first year.",
    conditionOptions: ["Recruiting support", "Authority over structure", "Labor market", "Scale of hiring", "Change impact on existing team"],
    reflectionPrompt: "Have you enjoyed hiring or designing teams? Which part—assessment, persuasion, structure, or onboarding—created energy?",
    priority: 61
  },
  {
    id: "people-admin",
    facet: "PEOPLE_ADMINISTRATION",
    title: "Sustain the management operating system",
    situation: "Your team is performing, but one-on-ones, reviews, calibration, staffing approvals, and management meetings fill a predictable part of every week.",
    responsibility: "You maintain the routines that keep people aligned, supported, and accountable.",
    tension: "The work supports a healthy team but can feel repetitive compared with strategy or transformation projects.",
    purpose: "Separate attraction to developing people from tolerance for recurring management administration.",
    includePatterns: ["people leader", "manage a team", "direct reports", "team leadership"],
    optionalPatterns: ["team", "people agenda", "culture"],
    evidencePatterns: ["people", "team", "culture", "manage"],
    frequencyAssumption: "Assume 20–30% of the week is recurring people-management activity.",
    conditionOptions: ["Team size", "Administrative support", "Quality of systems", "Percentage of the week", "Maturity of managers below you"],
    reflectionPrompt: "Would regular people routines feel like meaningful leadership infrastructure or a tax on the work you most enjoy?",
    priority: 60
  },
  {
    id: "executive-influence",
    facet: "EXECUTIVE_INFLUENCE",
    title: "Change a senior leader's decision",
    situation: "A senior executive favors a visible initiative, but your analysis suggests a different investment would create more value.",
    responsibility: "You build a concise narrative, anticipate objections, and influence the decision without damaging the relationship.",
    tension: "The work offers enterprise impact but requires political judgment and comfort with disagreement.",
    purpose: "Explore whether executive influence is energizing in practice, not just attractive in title descriptions.",
    includePatterns: ["senior leadership", "executive", "leadership team", "communicate results", "frame decisions", "high visibility"],
    evidencePatterns: ["senior", "executive", "leadership", "frame decisions", "high visibility"],
    frequencyAssumption: "Assume you influence senior leaders several times each month.",
    conditionOptions: ["Trust with the leader", "Quality of evidence", "Organizational politics", "Executive openness", "Your formal standing"],
    reflectionPrompt: "When have you changed a senior person's mind? Did the challenge create energy or anxiety?",
    priority: 93
  },
  {
    id: "peer-alignment",
    facet: "PEER_ALIGNMENT",
    title: "Resolve cross-functional conflict",
    situation: "Two functions have rational but incompatible priorities, and neither reports to you.",
    responsibility: "You surface the real trade-off, facilitate disagreement, and create a decision that both teams will support.",
    tension: "The work is relational and strategic, but progress can require many conversations and repeated alignment.",
    purpose: "Explore tolerance for stakeholder complexity and the social work of alignment.",
    includePatterns: ["cross-functional", "stakeholder", "alignment", "partner", "conflicting interests", "relationships"],
    evidencePatterns: ["cross-functional", "stakeholder", "alignment", "partner", "conflicting"],
    frequencyAssumption: "Assume stakeholder alignment is a major route to results.",
    conditionOptions: ["Decision authority", "Quality of relationships", "Number of stakeholders", "Conflict intensity", "Clarity of shared goals"],
    reflectionPrompt: "Think of a cross-functional conflict you helped resolve. Did the conversations feel engaging or exhausting?",
    priority: 91
  },
  {
    id: "influence-no-authority",
    facet: "INFLUENCE_WITHOUT_AUTHORITY",
    title: "Lead without direct reports",
    situation: "The role has broad visibility and enterprise scope, but most contributors sit in other organizations.",
    responsibility: "You create direction, build commitment, and deliver outcomes through influence rather than formal management authority.",
    tension: "You can affect the enterprise, but may not receive the identity or control that comes with leading a team.",
    purpose: "Distinguish attraction to enterprise influence from a need for direct people leadership.",
    includePatterns: ["cross-functional", "influence", "stakeholder", "partner", "principal", "without authority"],
    evidencePatterns: ["cross-functional", "influence", "stakeholder", "partner", "principal"],
    frequencyAssumption: "Assume this is the primary leadership model for the role.",
    conditionOptions: ["Promotion path", "Executive sponsorship", "Scope of influence", "Decision authority", "Opportunity to lead a team later"],
    reflectionPrompt: "Would broad influence feel like leadership in its own right, or would you eventually feel limited without a team?",
    priority: 99
  },
  {
    id: "org-communication",
    facet: "ORGANIZATIONAL_COMMUNICATION",
    title: "Create alignment through leadership communication",
    situation: "A strategic change is sound, but employees do not understand what it means for their work.",
    responsibility: "You shape the narrative, prepare leadership forums, and coordinate town halls or off-sites that turn strategy into shared understanding.",
    tension: "The work creates visibility and alignment, but includes detailed preparation and event-like execution.",
    purpose: "Explore whether high-visibility communication work is energizing or feels like coordination-heavy support.",
    includePatterns: ["town hall", "off site", "leadership meeting", "communicate", "people agenda", "culture agenda"],
    evidencePatterns: ["town hall", "off site", "leadership meeting", "communicate", "agenda"],
    frequencyAssumption: "Assume leadership communications recur throughout the year.",
    conditionOptions: ["Strategic substance", "Amount of event logistics", "Access to leaders", "Writing support", "Audience size"],
    reflectionPrompt: "Have you enjoyed creating leadership narratives and forums, or did the logistics overshadow the impact?",
    priority: 72
  }
];

export const REACTION_LABELS: Record<ScenarioReaction, string> = {
  SEEK_MORE: "I would actively seek more of this",
  ENERGIZING: "This would usually energize me",
  COMFORTABLE: "I would be comfortable doing this",
  TOLERATE: "I can do it, but would not want it frequently",
  DRAINING: "This would usually drain me",
  AVOID: "I would strongly avoid this",
  DEPENDS: "It depends on the conditions"
};

export const FREQUENCY_LABELS: Record<ScenarioFrequency, string> = {
  MAJOR: "A major part of my role",
  RECURRING: "A recurring responsibility",
  OCCASIONAL: "Occasionally",
  NECESSARY_ONLY: "Only when necessary",
  NOT_IDEAL: "Not part of my ideal role"
};

export const REACTION_SCORE: Record<ScenarioReaction, number> = {
  SEEK_MORE: 2,
  ENERGIZING: 1.4,
  COMFORTABLE: 0.6,
  TOLERATE: -0.5,
  DRAINING: -1.4,
  AVOID: -2,
  DEPENDS: 0
};

export const FREQUENCY_SCORE: Record<ScenarioFrequency, number> = {
  MAJOR: 0.45,
  RECURRING: 0.2,
  OCCASIONAL: 0,
  NECESSARY_ONLY: -0.25,
  NOT_IDEAL: -0.45
};

export function facetDefinition(facet: DiscoveryFacet): DiscoveryFacetDefinition {
  return DISCOVERY_FACETS.find((item) => item.id === facet) || DISCOVERY_FACETS[0];
}

export function scoreToPreference(value: number): PreferenceScore {
  if (value >= 1.25) return 2;
  if (value >= 0.35) return 1;
  if (value <= -1.25) return -2;
  if (value <= -0.35) return -1;
  return 0;
}
