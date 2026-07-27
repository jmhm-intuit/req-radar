import type { JobReq } from "../types";

const createdAt = new Date().toISOString();

export const demoJobs: JobReq[] = [
  {
    id: "demo-backend-payments",
    jobId: "DEMO-1001",
    title: "Senior Backend Engineer - Payments",
    normalizedTitle: "Senior Backend Engineer - Payments",
    category: "Software Engineering",
    team: "Payments Platform",
    locations: ["Remote - US", "San Diego, California"],
    hiringManager: "Jordan Lee",
    recruiter: "Demo Recruiter",
    datePosted: "Jul 10, 2026",
    seniority: "Senior",
    minYears: 6,
    descriptionText: "Fictional demo requisition for a senior backend engineer on a payments platform.",
    responsibilities: [
      "Design reliable services for payment authorization and settlement.",
      "Partner with product and risk teams to deliver secure customer experiences."
    ],
    qualifications: [
      "Six or more years of backend engineering experience.",
      "Experience with Java, AWS, microservices, REST APIs, and distributed systems."
    ],
    skills: ["Java", "AWS", "Microservices", "REST APIs", "Distributed systems"],
    status: "PURSUING",
    decisionReason: "Strong role and skills match",
    notes: "Fictional demo data. Safe to remove.",
    sourceFileName: "demo-data",
    sourceHash: "demo-hash-1001",
    createdAt,
    updatedAt: createdAt,
    isDemo: true
  },
  {
    id: "demo-backend-billing",
    jobId: "DEMO-1002",
    title: "Senior Software Engineer - Billing",
    normalizedTitle: "Senior Software Engineer - Billing",
    category: "Software Engineering",
    team: "Billing Platform",
    locations: ["Remote - US", "San Diego, California"],
    hiringManager: "Morgan Patel",
    recruiter: "Demo Recruiter",
    datePosted: "Jul 12, 2026",
    seniority: "Senior",
    minYears: 5,
    descriptionText: "Fictional demo requisition for a billing platform software engineer.",
    responsibilities: [
      "Build scalable billing services and APIs.",
      "Improve reliability across distributed financial workflows."
    ],
    qualifications: [
      "Five or more years of software engineering experience.",
      "Strong Java, AWS, microservices, API, and distributed systems experience."
    ],
    skills: ["Java", "AWS", "Microservices", "REST APIs", "Distributed systems"],
    status: "MAYBE",
    decisionReason: "Need more information about team scope",
    notes: "Fictional demo data. Safe to remove.",
    sourceFileName: "demo-data",
    sourceHash: "demo-hash-1002",
    createdAt,
    updatedAt: createdAt,
    isDemo: true
  },
  {
    id: "demo-bizops-cs",
    jobId: "DEMO-2001",
    title: "Principal, Business Operations - Customer Success",
    normalizedTitle: "Principal, Business Operations - Customer Success",
    category: "Program Management and Business Operations",
    team: "Customer Success Operations",
    locations: ["Mountain View, California", "Remote - US"],
    hiringManager: "Taylor Brooks",
    recruiter: "Demo Recruiter",
    datePosted: "Jul 15, 2026",
    seniority: "Principal",
    minYears: 8,
    descriptionText: "Fictional demo requisition for a principal business operations leader.",
    responsibilities: [
      "Lead strategic and annual planning with senior leaders.",
      "Improve the operating model and monitor execution against key priorities."
    ],
    qualifications: [
      "Eight or more years in strategy, operations, consulting, finance, or analytics.",
      "Strong executive communication, financial modeling, and stakeholder management skills."
    ],
    skills: [
      "Strategic planning",
      "Business operations",
      "Operating model design",
      "Data analysis",
      "Financial modeling",
      "Stakeholder management",
      "Executive communication",
      "KPI management"
    ],
    status: "NEW",
    decisionReason: "",
    notes: "Fictional demo data. Safe to remove.",
    sourceFileName: "demo-data",
    sourceHash: "demo-hash-2001",
    createdAt,
    updatedAt: createdAt,
    isDemo: true
  },
  {
    id: "demo-product-ops",
    jobId: "DEMO-2002",
    title: "Senior Manager, Product Operations",
    normalizedTitle: "Senior Manager, Product Operations",
    category: "Program Management and Business Operations",
    team: "Product Operations",
    locations: ["Mountain View, California"],
    hiringManager: "Casey Nguyen",
    recruiter: "Demo Recruiter",
    datePosted: "Jul 18, 2026",
    seniority: "Senior",
    minYears: 7,
    descriptionText: "Fictional demo requisition for a product operations manager.",
    responsibilities: [
      "Develop planning rhythms for a multi-product organization.",
      "Use data to improve prioritization, execution, and decision making."
    ],
    qualifications: [
      "Seven or more years in product operations, business operations, or consulting.",
      "Strong cross-functional leadership and change management experience."
    ],
    skills: [
      "Strategic planning",
      "Business operations",
      "Product management",
      "Data analysis",
      "Change management",
      "Cross-functional leadership",
      "Decision making"
    ],
    status: "NOT_PURSUING",
    decisionReason: "Role scope is not the right fit",
    notes: "Fictional demo data. Safe to remove.",
    sourceFileName: "demo-data",
    sourceHash: "demo-hash-2002",
    createdAt,
    updatedAt: createdAt,
    isDemo: true
  }
];
