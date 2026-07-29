import type {
  CareerPreference,
  InterestDimension,
  InterviewQuestion,
  PreferenceImportance,
  PreferenceScore,
  SkillCategory
} from "../types";

export interface SkillDefinition {
  name: string;
  category: SkillCategory;
  aliases: string[];
  related: string[];
}

export interface ThemeDefinition {
  id: string;
  label: string;
  description: string;
  patterns: string[];
}

export interface RoleGroupDefinition {
  id: string;
  label: string;
  description: string;
  titlePatterns: string[];
  bodyPatterns: string[];
  themeIds: string[];
}

export interface WorkDimensionDefinition {
  id: InterestDimension;
  label: string;
  shortLabel: string;
  description: string;
  patterns: string[];
  counterPatterns?: string[];
}

export const SKILL_TAXONOMY: SkillDefinition[] = [
  { name: "Strategic planning", category: "STRATEGY", aliases: ["strategic planning", "annual planning", "quarterly planning", "long-term planning"], related: ["Business strategy", "Portfolio strategy"] },
  { name: "Business strategy", category: "STRATEGY", aliases: ["business strategy", "corporate strategy", "strategic direction", "strategy development"], related: ["Strategic planning", "Product strategy"] },
  { name: "Portfolio strategy", category: "STRATEGY", aliases: ["portfolio strategy", "portfolio planning", "investment prioritization", "portfolio prioritization"], related: ["Strategic planning", "Program portfolio management"] },
  { name: "Market analysis", category: "STRATEGY", aliases: ["market analysis", "competitive analysis", "market research", "competitive landscape"], related: ["Business strategy", "Go-to-market"] },
  { name: "Business operations", category: "OPERATIONS", aliases: ["business operations", "bizops", "business ops", "operational excellence"], related: ["Operating model design", "Program management"] },
  { name: "Operating model design", category: "TRANSFORMATION", aliases: ["operating model", "organizational design", "ways of working", "operating rhythm", "operating cadence"], related: ["Business operations", "Process improvement", "Transformation"] },
  { name: "Process improvement", category: "TRANSFORMATION", aliases: ["process improvement", "process optimization", "continuous improvement", "simplify processes", "streamline processes"], related: ["Operating model design", "Operational excellence"] },
  { name: "Transformation", category: "TRANSFORMATION", aliases: ["business transformation", "organizational transformation", "digital transformation", "transformation initiative", "transform the business"], related: ["Change management", "Operating model design"] },
  { name: "Change management", category: "TRANSFORMATION", aliases: ["change management", "change adoption", "organizational change", "change strategy"], related: ["Transformation", "Stakeholder management"] },
  { name: "Program management", category: "OPERATIONS", aliases: ["program management", "program manager", "program delivery", "program execution"], related: ["Project management", "Portfolio strategy"] },
  { name: "Project management", category: "OPERATIONS", aliases: ["project management", "project manager", "project delivery", "project plan"], related: ["Program management"] },
  { name: "Program portfolio management", category: "OPERATIONS", aliases: ["program portfolio", "portfolio management", "portfolio governance", "initiative portfolio"], related: ["Program management", "Portfolio strategy"] },
  { name: "KPI management", category: "OPERATIONS", aliases: ["kpi", "kpis", "key performance indicator", "performance metric", "business performance"], related: ["Business operations", "Data analysis"] },
  { name: "Governance", category: "OPERATIONS", aliases: ["governance", "decision rights", "steering committee", "program governance"], related: ["Program management", "Operating model design"] },
  { name: "Data analysis", category: "ANALYTICS", aliases: ["data analysis", "data-driven analysis", "analytics", "analytical insights", "analyze data"], related: ["Business intelligence", "SQL", "Financial modeling"] },
  { name: "Business intelligence", category: "ANALYTICS", aliases: ["business intelligence", "bi reporting", "dashboarding", "tableau", "power bi"], related: ["Data analysis"] },
  { name: "Financial modeling", category: "FINANCE", aliases: ["financial model", "financial modeling", "financial modelling", "analytical model", "business case"], related: ["Finance", "Data analysis"] },
  { name: "Finance", category: "FINANCE", aliases: ["financial acumen", "finance", "financial planning", "budgeting", "forecasting"], related: ["Financial modeling", "P&L ownership"] },
  { name: "P&L ownership", category: "FINANCE", aliases: ["p&l", "profit and loss", "revenue ownership", "business ownership", "financial ownership"], related: ["Finance", "Business strategy"] },
  { name: "Executive communication", category: "COMMUNICATION", aliases: ["executive communication", "executive presentation", "senior executives", "executive leadership", "board presentation"], related: ["Influencing", "Stakeholder management"] },
  { name: "Written communication", category: "COMMUNICATION", aliases: ["written communication", "writing skills", "written narratives", "executive memo"], related: ["Executive communication"] },
  { name: "Storytelling", category: "COMMUNICATION", aliases: ["storytelling", "data storytelling", "strategic narrative", "compelling narrative"], related: ["Executive communication"] },
  { name: "Stakeholder management", category: "LEADERSHIP", aliases: ["stakeholder management", "manage stakeholders", "stakeholder alignment", "stakeholder interests"], related: ["Influencing", "Cross-functional leadership"] },
  { name: "Influencing", category: "LEADERSHIP", aliases: ["influence stakeholders", "influencing", "influence without authority", "persuade leaders"], related: ["Stakeholder management", "Executive communication"] },
  { name: "Cross-functional leadership", category: "LEADERSHIP", aliases: ["cross-functional", "cross functional", "matrixed organization", "lead across teams"], related: ["Stakeholder management", "Influencing"] },
  { name: "People leadership", category: "LEADERSHIP", aliases: ["people leadership", "team leadership", "lead a team", "manage a team", "direct reports", "people manager"], related: ["Talent development", "Coaching"] },
  { name: "Talent development", category: "LEADERSHIP", aliases: ["talent development", "develop talent", "career development", "succession planning", "build capability"], related: ["People leadership", "Coaching"] },
  { name: "Coaching", category: "LEADERSHIP", aliases: ["coach", "coaching", "mentor", "mentoring"], related: ["Talent development", "People leadership"] },
  { name: "Decision making", category: "LEADERSHIP", aliases: ["decision-making", "decision making", "frame decisions", "decision support"], related: ["Business strategy", "Data analysis"] },
  { name: "Problem solving", category: "STRATEGY", aliases: ["problem solver", "problem solving", "problem-solving", "solve complex problems", "structured problem solving"], related: ["Business strategy", "Data analysis"] },
  { name: "Management consulting", category: "DOMAIN", aliases: ["management consulting", "strategy consulting", "consulting firm", "consulting experience"], related: ["Business strategy", "Problem solving"] },
  { name: "Product strategy", category: "PRODUCT", aliases: ["product strategy", "product vision", "product roadmap", "product portfolio"], related: ["Product management", "Business strategy"] },
  { name: "Product management", category: "PRODUCT", aliases: ["product management", "product manager", "product lifecycle", "product development"], related: ["Product strategy", "Customer discovery"] },
  { name: "Product operations", category: "PRODUCT", aliases: ["product operations", "product ops", "product planning", "product operating model"], related: ["Product management", "Business operations"] },
  { name: "Customer discovery", category: "CUSTOMER", aliases: ["customer discovery", "customer research", "user research", "voice of customer"], related: ["Product management", "Customer experience"] },
  { name: "Customer experience", category: "CUSTOMER", aliases: ["customer experience", "client experience", "customer journey", "customer outcomes"], related: ["Customer success", "Customer discovery"] },
  { name: "Customer success", category: "CUSTOMER", aliases: ["customer success", "client success", "customer adoption", "customer retention"], related: ["Customer experience", "Account management"] },
  { name: "Account management", category: "CUSTOMER", aliases: ["account management", "client management", "strategic accounts"], related: ["Customer success", "Sales"] },
  { name: "Go-to-market", category: "STRATEGY", aliases: ["go-to-market", "go to market", "gtm strategy", "commercialization"], related: ["Sales operations", "Market analysis"] },
  { name: "Sales operations", category: "OPERATIONS", aliases: ["sales operations", "revenue operations", "revops", "sales planning"], related: ["Go-to-market", "Business operations"] },
  { name: "Sales", category: "CUSTOMER", aliases: ["sales", "business development", "commercial leadership", "selling"], related: ["Account management", "Go-to-market"] },
  { name: "Artificial intelligence", category: "TECHNOLOGY", aliases: ["artificial intelligence", "generative ai", "gen ai", "genai", "ai adoption", "ai strategy"], related: ["Machine learning", "AI transformation"] },
  { name: "AI transformation", category: "TRANSFORMATION", aliases: ["ai transformation", "ai adoption", "ai enablement", "responsible ai", "ai operating model"], related: ["Artificial intelligence", "Transformation"] },
  { name: "Machine learning", category: "TECHNOLOGY", aliases: ["machine learning", "ml models", "predictive model", "deep learning"], related: ["Artificial intelligence", "Data science"] },
  { name: "Data science", category: "TECHNOLOGY", aliases: ["data science", "data scientist", "statistical modeling", "predictive analytics"], related: ["Machine learning", "Data analysis"] },
  { name: "SQL", category: "TECHNOLOGY", aliases: ["sql", "structured query language"], related: ["Data analysis"] },
  { name: "Python", category: "TECHNOLOGY", aliases: ["python"], related: ["Data science", "Software engineering"] },
  { name: "Java", category: "TECHNOLOGY", aliases: ["java", "spring boot"], related: ["Software engineering", "Backend engineering"] },
  { name: "JavaScript", category: "TECHNOLOGY", aliases: ["javascript", "node.js", "nodejs"], related: ["TypeScript", "Software engineering"] },
  { name: "TypeScript", category: "TECHNOLOGY", aliases: ["typescript"], related: ["JavaScript", "Software engineering"] },
  { name: "React", category: "TECHNOLOGY", aliases: ["react", "react.js", "reactjs"], related: ["JavaScript", "Frontend engineering"] },
  { name: "Software engineering", category: "TECHNOLOGY", aliases: ["software engineering", "software development", "engineering leadership", "software systems"], related: ["Backend engineering", "Frontend engineering"] },
  { name: "Backend engineering", category: "TECHNOLOGY", aliases: ["backend engineering", "back-end", "server-side", "microservices"], related: ["Software engineering", "Distributed systems"] },
  { name: "Frontend engineering", category: "TECHNOLOGY", aliases: ["frontend engineering", "front-end", "web application", "user interface"], related: ["Software engineering", "React"] },
  { name: "Cloud platforms", category: "TECHNOLOGY", aliases: ["aws", "amazon web services", "azure", "google cloud", "gcp", "cloud platform"], related: ["Software engineering", "Distributed systems"] },
  { name: "Distributed systems", category: "TECHNOLOGY", aliases: ["distributed systems", "distributed architecture", "scalable systems", "microservices"], related: ["Backend engineering", "Cloud platforms"] },
  { name: "Cybersecurity", category: "TECHNOLOGY", aliases: ["cybersecurity", "information security", "security engineering", "security controls"], related: ["Risk management"] },
  { name: "Risk management", category: "DOMAIN", aliases: ["risk management", "risk strategy", "operational risk", "controls"], related: ["Governance", "Cybersecurity"] },
  { name: "Compliance", category: "DOMAIN", aliases: ["compliance", "regulatory", "regulations", "regulatory requirements"], related: ["Risk management", "Legal"] },
  { name: "Legal", category: "DOMAIN", aliases: ["legal", "law", "attorney", "counsel"], related: ["Compliance"] },
  { name: "Agile", category: "OPERATIONS", aliases: ["agile", "scrum", "kanban", "iterative delivery"], related: ["Product management", "Program management"] },
  { name: "Licensed attorney", category: "CREDENTIAL", aliases: ["licensed attorney", "bar admission", "bar membership", "juris doctor", "j.d."], related: ["Legal"] },
  { name: "CPA certification", category: "CREDENTIAL", aliases: ["certified public accountant", "cpa certification", "active cpa"], related: ["Finance"] },
  { name: "Medical license", category: "CREDENTIAL", aliases: ["medical license", "licensed physician", "registered nurse", "rn license", "m.d."], related: [] },
  { name: "Security clearance", category: "CREDENTIAL", aliases: ["security clearance", "top secret clearance", "secret clearance"], related: ["Cybersecurity"] }
];

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  { id: "strategy", label: "Strategy", description: "Setting direction, framing choices, and defining priorities.", patterns: ["strategy", "strategic", "long-term goals", "priorities", "planning"] },
  { id: "transformation", label: "Transformation", description: "Changing organizations, systems, or ways of working.", patterns: ["transformation", "change management", "operating model", "redesign", "modernize", "adoption"] },
  { id: "ai", label: "AI & innovation", description: "AI adoption, emerging technology, and experimentation.", patterns: ["artificial intelligence", "generative ai", "genai", "ai strategy", "machine learning", "innovation"] },
  { id: "people-leadership", label: "People leadership", description: "Managing, coaching, or developing people.", patterns: ["direct reports", "people manager", "lead a team", "develop talent", "coach", "team culture"] },
  { id: "executive-influence", label: "Executive influence", description: "Shaping decisions with senior leaders.", patterns: ["executive", "senior leadership", "c-suite", "influence", "leadership team"] },
  { id: "operating-systems", label: "Operating systems", description: "Building planning, governance, and operating rhythms.", patterns: ["operating rhythm", "operating cadence", "governance", "planning process", "business operations"] },
  { id: "analytics", label: "Analytics", description: "Using data and models to guide decisions.", patterns: ["data-driven", "analytics", "analysis", "modeling", "metrics", "insights"] },
  { id: "product", label: "Product", description: "Creating products, roadmaps, and customer value.", patterns: ["product strategy", "product management", "roadmap", "product development", "product portfolio"] },
  { id: "customer", label: "Customer impact", description: "Improving customer outcomes, journeys, or adoption.", patterns: ["customer success", "customer experience", "customer outcomes", "customer journey", "client"] },
  { id: "program-delivery", label: "Program delivery", description: "Coordinating execution across initiatives and teams.", patterns: ["program management", "project management", "delivery", "milestones", "execution"] },
  { id: "commercial", label: "Commercial growth", description: "Revenue, go-to-market, and market growth.", patterns: ["revenue", "go-to-market", "sales", "growth", "commercial"] },
  { id: "risk", label: "Risk & compliance", description: "Risk, controls, legal, and regulatory work.", patterns: ["risk", "compliance", "regulatory", "legal", "controls"] },
  { id: "technical", label: "Technical depth", description: "Engineering, architecture, and technical delivery.", patterns: ["software engineering", "architecture", "technical", "cloud", "microservices", "machine learning"] },
  { id: "finance", label: "Finance", description: "Financial planning, modeling, and business cases.", patterns: ["financial", "finance", "budget", "forecast", "p&l"] },
  { id: "ambiguity", label: "Ambiguous problems", description: "Defining problems where the path is not predetermined.", patterns: ["ambiguity", "undefined", "complex problems", "build from scratch", "new capability"] }
];

export const ROLE_GROUPS: RoleGroupDefinition[] = [
  { id: "ai-transformation", label: "AI Transformation Leadership", description: "Leading AI adoption, capability building, and enterprise transformation.", titlePatterns: ["ai", "artificial intelligence", "transformation"], bodyPatterns: ["ai adoption", "generative ai", "responsible ai", "ai strategy", "ai transformation"], themeIds: ["ai", "transformation", "executive-influence"] },
  { id: "business-operations", label: "Business Operations & Chief of Staff", description: "Connecting strategy, planning, operating rhythms, and leadership priorities.", titlePatterns: ["business operations", "bizops", "chief of staff", "strategy and operations"], bodyPatterns: ["annual planning", "operating rhythm", "leadership agenda", "business operations", "organizational alignment"], themeIds: ["strategy", "operating-systems", "executive-influence"] },
  { id: "operating-model", label: "Operating Model & Transformation", description: "Redesigning organizations, processes, and ways of working.", titlePatterns: ["transformation", "operating model", "organizational effectiveness", "change"], bodyPatterns: ["operating model", "change management", "process improvement", "organizational design", "transformation"], themeIds: ["transformation", "operating-systems", "ambiguity"] },
  { id: "product-strategy", label: "Product Strategy & Operations", description: "Shaping product direction and the systems that enable product teams.", titlePatterns: ["product strategy", "product operations", "product manager", "product lead"], bodyPatterns: ["product strategy", "roadmap", "product portfolio", "product operations", "customer discovery"], themeIds: ["product", "strategy", "customer"] },
  { id: "customer-success", label: "Customer Success Strategy", description: "Improving customer adoption, value realization, and customer operations.", titlePatterns: ["customer success", "customer experience", "client success"], bodyPatterns: ["customer outcomes", "customer success", "customer journey", "customer adoption", "retention"], themeIds: ["customer", "strategy", "operating-systems"] },
  { id: "program-leadership", label: "Program & Portfolio Leadership", description: "Leading complex programs, portfolios, governance, and cross-functional delivery.", titlePatterns: ["program", "portfolio", "program management", "program lead"], bodyPatterns: ["program management", "portfolio", "governance", "milestones", "cross-functional delivery"], themeIds: ["program-delivery", "executive-influence", "operating-systems"] },
  { id: "analytics-strategy", label: "Analytics & Strategic Planning", description: "Using analysis, models, and planning to guide business decisions.", titlePatterns: ["analytics", "strategy", "planning", "insights"], bodyPatterns: ["data-driven", "analytics", "financial modeling", "strategic planning", "decision support"], themeIds: ["analytics", "strategy", "finance"] },
  { id: "people-organization", label: "People & Organization Leadership", description: "Leading teams, talent, culture, and organizational effectiveness.", titlePatterns: ["people", "talent", "organization", "workforce"], bodyPatterns: ["people leadership", "talent development", "team culture", "organizational effectiveness", "workforce strategy"], themeIds: ["people-leadership", "transformation", "executive-influence"] },
  { id: "commercial-growth", label: "Commercial & Growth Strategy", description: "Driving revenue, go-to-market strategy, and commercial operations.", titlePatterns: ["growth", "commercial", "go-to-market", "revenue", "sales"], bodyPatterns: ["revenue growth", "go-to-market", "sales strategy", "commercial", "market growth"], themeIds: ["commercial", "strategy", "customer"] },
  { id: "technical-product", label: "Technical & Product Leadership", description: "Leading technical products, engineering systems, or technology programs.", titlePatterns: ["engineering", "technical", "software", "platform", "technology"], bodyPatterns: ["software engineering", "architecture", "technical roadmap", "cloud", "platform"], themeIds: ["technical", "product", "program-delivery"] },
  { id: "risk-compliance", label: "Risk, Legal & Compliance", description: "Managing regulatory, legal, risk, and control requirements.", titlePatterns: ["risk", "legal", "counsel", "compliance"], bodyPatterns: ["regulatory", "compliance", "risk management", "legal", "controls"], themeIds: ["risk", "strategy"] },
  { id: "general-management", label: "General Management", description: "Broad business leadership spanning strategy, operations, people, and outcomes.", titlePatterns: ["general manager", "business leader", "vice president", "director"], bodyPatterns: ["business performance", "p&l", "lead the organization", "business unit", "general management"], themeIds: ["strategy", "people-leadership", "commercial"] },
  { id: "other", label: "Other / Emerging Pattern", description: "Roles that do not yet form a strong recurring family.", titlePatterns: [], bodyPatterns: [], themeIds: [] }
];

export const WORK_DIMENSIONS: WorkDimensionDefinition[] = [
  { id: "PEOPLE_LEADERSHIP", label: "People leadership", shortLabel: "Lead people", description: "Direct responsibility for a team or leaders.", patterns: ["direct reports", "manage a team", "people manager", "lead a team", "team of", "people leadership"] },
  { id: "PEOPLE_DEVELOPMENT", label: "People development", shortLabel: "Develop people", description: "Coaching, mentoring, and building talent.", patterns: ["coach", "mentor", "develop talent", "career development", "succession", "team culture"] },
  { id: "STRATEGY", label: "Strategy", shortLabel: "Set strategy", description: "Defining direction, priorities, and choices.", patterns: ["strategy", "strategic", "long-term goals", "set direction", "define priorities"] },
  { id: "TRANSFORMATION", label: "Transformation", shortLabel: "Transform", description: "Changing systems, processes, or organizations.", patterns: ["transformation", "change management", "operating model", "redesign", "modernize"] },
  { id: "AI_INNOVATION", label: "AI & innovation", shortLabel: "AI / innovate", description: "AI adoption, experimentation, and emerging technology.", patterns: ["artificial intelligence", "generative ai", "genai", "machine learning", "innovation", "ai adoption"] },
  { id: "EXECUTIVE_INFLUENCE", label: "Executive influence", shortLabel: "Influence executives", description: "Working with and influencing senior leaders.", patterns: ["executive", "senior leadership", "c-suite", "leadership team", "influence"] },
  { id: "AMBIGUITY", label: "Ambiguity", shortLabel: "Define ambiguity", description: "Solving undefined problems and creating the path.", patterns: ["ambiguity", "ambiguous", "build from scratch", "new capability", "complex problem", "undefined"] },
  { id: "ANALYTICS", label: "Analytical intensity", shortLabel: "Analyze", description: "Frequent data, modeling, and structured analysis.", patterns: ["data-driven", "analytics", "analysis", "modeling", "metrics", "insights"] },
  { id: "PRODUCT", label: "Product work", shortLabel: "Build products", description: "Product strategy, roadmaps, discovery, and delivery.", patterns: ["product strategy", "product management", "roadmap", "product development", "customer discovery"] },
  { id: "CUSTOMER_IMPACT", label: "Customer impact", shortLabel: "Impact customers", description: "Direct connection to customer outcomes and value.", patterns: ["customer outcomes", "customer success", "customer experience", "customer journey", "client"] },
  { id: "AUTONOMY", label: "Autonomy", shortLabel: "Own decisions", description: "Decision rights and freedom to define the approach.", patterns: ["own", "ownership", "decision rights", "independently", "self-directed", "autonomy"] },
  { id: "VARIETY", label: "Variety", shortLabel: "Varied work", description: "A changing mix of problems, stakeholders, and initiatives.", patterns: ["multiple initiatives", "variety", "dynamic", "fast-paced", "broad range", "across the business"] },
  { id: "BUILDING_NEW", label: "Building new", shortLabel: "Build new", description: "Creating new systems, capabilities, or teams.", patterns: ["build", "create", "launch", "new capability", "from scratch", "establish"] },
  { id: "BUSINESS_OWNERSHIP", label: "Business ownership", shortLabel: "Own outcomes", description: "Direct accountability for revenue, P&L, or operating results.", patterns: ["p&l", "revenue ownership", "business owner", "accountable for results", "operational performance"] },
  { id: "RECURRING_OPERATIONS", label: "Recurring operations", shortLabel: "Run cadence", description: "Recurring reporting, governance, and administrative cadence.", patterns: ["weekly reporting", "monthly reporting", "status reporting", "operating cadence", "town halls", "calendar management", "recurring meetings"] },
  { id: "INDIVIDUAL_CONTRIBUTOR", label: "Individual contributor", shortLabel: "Lead as IC", description: "Influence and ownership without direct people management.", patterns: ["individual contributor", "principal", "influence without authority", "matrixed", "no direct reports"] }
];

export const DIMENSION_LABELS: Record<InterestDimension, string> = Object.fromEntries(
  WORK_DIMENSIONS.map((item) => [item.id, item.label])
) as Record<InterestDimension, string>;

function pref(
  dimension: InterestDimension,
  score: PreferenceScore,
  importance: PreferenceImportance,
  rationale: string
): CareerPreference {
  return { dimension, score, importance, source: "DEFAULT", rationale };
}

export const DEFAULT_PREFERENCES: Record<InterestDimension, CareerPreference> = {
  PEOPLE_LEADERSHIP: pref("PEOPLE_LEADERSHIP", 1, 3, "Draft preference: people leadership is attractive."),
  PEOPLE_DEVELOPMENT: pref("PEOPLE_DEVELOPMENT", 1, 2, "Draft preference: developing others can be energizing."),
  STRATEGY: pref("STRATEGY", 2, 3, "Draft preference: strategy and problem framing are highly attractive."),
  TRANSFORMATION: pref("TRANSFORMATION", 2, 3, "Draft preference: transformation is a priority theme."),
  AI_INNOVATION: pref("AI_INNOVATION", 2, 3, "Draft preference: AI-related work is a top interest."),
  EXECUTIVE_INFLUENCE: pref("EXECUTIVE_INFLUENCE", 2, 2, "Draft preference: executive influence is attractive."),
  AMBIGUITY: pref("AMBIGUITY", 2, 2, "Draft preference: defining the problem is preferred."),
  ANALYTICS: pref("ANALYTICS", 1, 2, "Draft preference: analytical problem solving is energizing."),
  PRODUCT: pref("PRODUCT", 1, 1, "Draft preference: product-related work is somewhat attractive."),
  CUSTOMER_IMPACT: pref("CUSTOMER_IMPACT", 0, 1, "No strong preference recorded yet."),
  AUTONOMY: pref("AUTONOMY", 1, 2, "Draft preference: meaningful ownership and autonomy are attractive."),
  VARIETY: pref("VARIETY", 2, 2, "Draft preference: varied work is preferred over repetitive work."),
  BUILDING_NEW: pref("BUILDING_NEW", 2, 2, "Draft preference: building operating systems and new capabilities is attractive."),
  BUSINESS_OWNERSHIP: pref("BUSINESS_OWNERSHIP", -1, 1, "Draft preference: direct P&L ownership is not a primary motivator."),
  RECURRING_OPERATIONS: pref("RECURRING_OPERATIONS", -2, 3, "Draft preference: repetitive operations are strongly avoided."),
  INDIVIDUAL_CONTRIBUTOR: pref("INDIVIDUAL_CONTRIBUTOR", 0, 1, "Principal IC roles remain acceptable when they support growth.")
};

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "strategy-execution",
    prompt: "Which kind of responsibility would give you more energy?",
    context: "Choose the work you would rather spend a meaningful part of the week doing.",
    choices: [
      { id: "define", label: "Define strategy and frame the problem", description: "Clarify the question, set direction, and align leaders.", impacts: { STRATEGY: 2, AMBIGUITY: 2, EXECUTIVE_INFLUENCE: 1 } },
      { id: "execute", label: "Execute a clear operating plan", description: "Drive milestones, cadence, and consistent delivery.", impacts: { STRATEGY: -1, RECURRING_OPERATIONS: 1, BUSINESS_OWNERSHIP: 1 } },
      { id: "balanced", label: "A deliberate mix of both", description: "Define enough of the strategy, then stay close to implementation.", impacts: { STRATEGY: 1, TRANSFORMATION: 1, BUSINESS_OWNERSHIP: 1 } }
    ]
  },
  {
    id: "leadership-mode",
    prompt: "Which leadership model is more compelling?",
    context: "Think about the kind of accountability you want, not just the title.",
    choices: [
      { id: "people", label: "Lead and develop a team", description: "Own team outcomes, coaching, and talent growth.", impacts: { PEOPLE_LEADERSHIP: 2, PEOPLE_DEVELOPMENT: 2, INDIVIDUAL_CONTRIBUTOR: -1 } },
      { id: "influence", label: "Lead through influence across teams", description: "Shape decisions without formal authority.", impacts: { EXECUTIVE_INFLUENCE: 2, INDIVIDUAL_CONTRIBUTOR: 1, PEOPLE_LEADERSHIP: 0 } },
      { id: "either", label: "Either, if the scope is meaningful", description: "Role content matters more than the reporting structure.", impacts: { PEOPLE_LEADERSHIP: 1, EXECUTIVE_INFLUENCE: 1, INDIVIDUAL_CONTRIBUTOR: 0 } }
    ]
  },
  {
    id: "build-optimize",
    prompt: "Which environment sounds more attractive?",
    context: "Consider what you want to create or improve.",
    choices: [
      { id: "build", label: "Build a new capability or operating model", description: "Create the system, team, or approach from the beginning.", impacts: { BUILDING_NEW: 2, TRANSFORMATION: 2, AMBIGUITY: 1 } },
      { id: "optimize", label: "Optimize an established operation", description: "Improve reliability, efficiency, and performance over time.", impacts: { BUILDING_NEW: -1, RECURRING_OPERATIONS: 1, ANALYTICS: 1 } },
      { id: "transform", label: "Transform something that already exists", description: "Redesign a mature system with visible constraints.", impacts: { TRANSFORMATION: 2, BUILDING_NEW: 1, ANALYTICS: 1 } }
    ]
  },
  {
    id: "ambiguity-clarity",
    prompt: "How much ambiguity do you want?",
    context: "Choose the environment where you are most likely to perform and stay engaged.",
    choices: [
      { id: "high", label: "High ambiguity: define the problem and model", description: "The goals, structure, and path need to be created.", impacts: { AMBIGUITY: 2, STRATEGY: 1, AUTONOMY: 1 } },
      { id: "moderate", label: "Moderate ambiguity with clear outcomes", description: "The goal is known, but the path is open.", impacts: { AMBIGUITY: 1, AUTONOMY: 1, BUSINESS_OWNERSHIP: 1 } },
      { id: "low", label: "Clear goals and an established model", description: "Focus on execution and measurable delivery.", impacts: { AMBIGUITY: -2, RECURRING_OPERATIONS: 1, BUSINESS_OWNERSHIP: 1 } }
    ]
  },
  {
    id: "technology-theme",
    prompt: "How central should AI or emerging technology be?",
    context: "This is about the subject matter of the role, not whether you personally code.",
    choices: [
      { id: "central", label: "A central theme of the role", description: "AI adoption or transformation should be a major part of the mandate.", impacts: { AI_INNOVATION: 2, TRANSFORMATION: 1 } },
      { id: "enabler", label: "An important enabler, not the whole job", description: "Technology should support a broader business agenda.", impacts: { AI_INNOVATION: 1, STRATEGY: 1 } },
      { id: "optional", label: "Optional", description: "The nature of the leadership challenge matters more.", impacts: { AI_INNOVATION: 0 } }
    ]
  },
  {
    id: "work-rhythm",
    prompt: "Which weekly rhythm is more attractive?",
    context: "Think about the work you want to repeat, not just the outcome.",
    choices: [
      { id: "varied", label: "A varied mix of high-priority problems", description: "Different topics, stakeholders, and decisions each week.", impacts: { VARIETY: 2, AMBIGUITY: 1, RECURRING_OPERATIONS: -2 } },
      { id: "cadence", label: "A predictable operating cadence", description: "Recurring planning, reporting, and performance reviews.", impacts: { VARIETY: -1, RECURRING_OPERATIONS: 2 } },
      { id: "hybrid", label: "Stable cadence plus changing strategic work", description: "Enough structure to execute, with room for new problems.", impacts: { VARIETY: 1, RECURRING_OPERATIONS: 0, STRATEGY: 1 } }
    ]
  },
  {
    id: "impact-mode",
    prompt: "Which kind of impact feels more meaningful?",
    context: "Choose the outcome you would be proud to own.",
    choices: [
      { id: "people", label: "Develop people and strengthen a team", description: "Build capability, careers, and culture.", impacts: { PEOPLE_DEVELOPMENT: 2, PEOPLE_LEADERSHIP: 1 } },
      { id: "customer", label: "Improve customer outcomes", description: "Create visible value for customers or users.", impacts: { CUSTOMER_IMPACT: 2, PRODUCT: 1 } },
      { id: "enterprise", label: "Improve how the enterprise operates", description: "Create leverage across functions and leaders.", impacts: { TRANSFORMATION: 2, EXECUTIVE_INFLUENCE: 1, BUILDING_NEW: 1 } }
    ]
  },
  {
    id: "ownership",
    prompt: "What kind of ownership do you prefer?",
    context: "Consider whether direct business metrics are motivating or simply useful context.",
    choices: [
      { id: "direct", label: "Direct ownership of revenue or operating outcomes", description: "Accountability for measurable business performance.", impacts: { BUSINESS_OWNERSHIP: 2, AUTONOMY: 1 } },
      { id: "influence", label: "Influence outcomes through strategy and systems", description: "Shape the decisions and operating model used by others.", impacts: { BUSINESS_OWNERSHIP: -1, STRATEGY: 2, EXECUTIVE_INFLUENCE: 1 } },
      { id: "mixed", label: "A mix of influence and measurable ownership", description: "Own a clear outcome while working through the organization.", impacts: { BUSINESS_OWNERSHIP: 1, EXECUTIVE_INFLUENCE: 1, AUTONOMY: 1 } }
    ]
  },
  {
    id: "analytical-intensity",
    prompt: "How analytical should the role be?",
    context: "Think about the amount of modeling and data work you want personally.",
    choices: [
      { id: "high", label: "Highly analytical", description: "Frequent modeling, data synthesis, and quantitative decisions.", impacts: { ANALYTICS: 2 } },
      { id: "moderate", label: "Analytical enough to guide strategy", description: "Use data to frame decisions, without making it the whole role.", impacts: { ANALYTICS: 1, STRATEGY: 1 } },
      { id: "light", label: "Primarily qualitative leadership", description: "Use analysis from others and focus on people and influence.", impacts: { ANALYTICS: -1, PEOPLE_LEADERSHIP: 1, EXECUTIVE_INFLUENCE: 1 } }
    ]
  },
  {
    id: "product-business",
    prompt: "Which problem space is more attractive?",
    context: "Choose the work domain you would like to learn more deeply.",
    choices: [
      { id: "product", label: "Product and customer problems", description: "Roadmaps, discovery, adoption, and customer value.", impacts: { PRODUCT: 2, CUSTOMER_IMPACT: 1 } },
      { id: "business", label: "Enterprise strategy and operating systems", description: "Organization-wide priorities, planning, and transformation.", impacts: { STRATEGY: 2, TRANSFORMATION: 1, BUILDING_NEW: 1 } },
      { id: "both", label: "The intersection of product and operations", description: "Translate product strategy into scalable execution.", impacts: { PRODUCT: 1, STRATEGY: 1, TRANSFORMATION: 1 } }
    ]
  }
];
