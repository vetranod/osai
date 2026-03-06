export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; text: string };

export type Article = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  publishedAt: string;
  readingMinutes: number;
  category: string;
  intro: string;
  body: ArticleBlock[];
  relatedSlugs: string[];
  relatedGuideHrefs: string[];
};

export const articles: Article[] = [
  {
    slug: "what-an-ai-governance-framework-should-include",
    title: "What an AI Governance Framework Should Include",
    description:
      "Most organizations conflate AI policy with AI governance. Here is what a real framework actually contains and why the difference matters for teams adopting AI tools.",
    keywords: [
      "ai governance framework",
      "what should an ai governance framework include",
      "ai governance components",
      "ai governance structure",
    ],
    publishedAt: "2026-03-06",
    readingMinutes: 6,
    category: "Governance Fundamentals",
    intro:
      "Most conversations about AI governance end up in the same place: a list of principles or a policy memo that says something like 'be careful.' That is not a governance framework. A governance framework is the operational system that turns good intentions into actual behavior at the team level.",
    body: [
      {
        type: "p",
        text: "Most conversations about AI governance end up in the same place: a list of principles or a policy memo that says something like 'be careful.' That is not a governance framework. A governance framework is the operational system that turns good intentions into actual behavior at the team level.",
      },
      {
        type: "p",
        text: "The difference matters more than people expect. A policy document tells people what the rules are. A governance framework tells people how to actually operate within those rules, who is responsible for enforcement, and what happens as the situation changes. One is a statement. The other is a system.",
      },
      {
        type: "h2",
        text: "Usage boundaries",
      },
      {
        type: "p",
        text: "When AI tools spread inside a firm, usage norms emerge on their own. Someone decides it is fine to paste client summaries into a language model. Someone else decides it is not fine. Nobody has the same answer.",
      },
      {
        type: "p",
        text: "A real framework defines which tasks AI can support, which require supervision, and which should remain human-only. Not as a vague category but as specific guidance tied to the kind of work the organization actually does. Without that specificity, you are not governing AI use. You are hoping it works out.",
      },
      {
        type: "h2",
        text: "Review standards",
      },
      {
        type: "p",
        text: "The question is not whether people review AI outputs. Most of them do, at least some of the time. The question is how, and whether that review is consistent across the team.",
      },
      {
        type: "p",
        text: "A governance framework defines the review expectation by output type. Internal drafts might require only a light read. Client-facing content might require sign-off from someone other than the drafter. Regulated materials might require escalation before use. That structure has to be written down, not assumed.",
      },
      {
        type: "p",
        text: "When review standards are informal, they are only as reliable as each individual's judgment on any given day. That is not a system. It is a hope.",
      },
      {
        type: "h2",
        text: "Ownership",
      },
      {
        type: "p",
        text: "Every real rollout needs a named person responsible for it. Not 'the team.' Not 'leadership.' A person.",
      },
      {
        type: "p",
        text: "Ownership covers the decisions that accumulate as AI use grows: which tools are permitted, what happens when someone uses a tool outside its approved context, how the review expectation changes when a new use case appears, and when to pause or reverse adoption if something is not working.",
      },
      {
        type: "p",
        text: "Without clear ownership, governance becomes everyone's responsibility and therefore no one's. Things fall through the gaps not because people are negligent but because no one was explicitly responsible for catching them.",
      },
      {
        type: "h2",
        text: "Rollout pacing",
      },
      {
        type: "p",
        text: "Staged adoption is not about being slow. It is about being deliberate. A governance framework should define which use cases are appropriate to start with, what conditions trigger expansion into new areas, and what signals indicate that a pause or review is warranted.",
      },
      {
        type: "p",
        text: "Not every organization needs to reach the same endpoint. Some firms will adopt AI tools broadly across their operations. Others will keep AI use to a narrow set of low-risk tasks. Both can be correct depending on the organization's risk tolerance and the nature of their work.",
      },
      {
        type: "p",
        text: "What matters is that the organization knows what phase it is in, what it takes to move to the next one, and who decides when that threshold has been reached.",
      },
      {
        type: "h2",
        text: "Documentation",
      },
      {
        type: "p",
        text: "The framework needs to exist somewhere other than people's heads. That means a written governance packet covering the above: what is allowed, who reviews it, who owns it, and what the rollout phases look like.",
      },
      {
        type: "p",
        text: "Documentation serves two purposes. Operationally, it gives team members a reference point when they face a decision and are not sure of the right answer. Strategically, it creates accountability. If leadership signs off on a governance packet, they are committing to something specific, not just a general orientation toward being careful.",
      },
      {
        type: "h3",
        text: "What it is not",
      },
      {
        type: "p",
        text: "A governance framework is not an AI ethics statement. It is not a vendor assessment checklist. It is not a training module for employees or a section of the staff handbook.",
      },
      {
        type: "p",
        text: "It is the operating plan for responsible AI adoption inside your organization. That is a specific thing. It answers specific questions: What can we use? Who reviews it? Who decides? How do we expand? Where is the line?",
      },
      {
        type: "p",
        text: "Firms that try to substitute a general statement of values for an operational plan often discover the gap the hard way, when something goes wrong and there is no clear procedure to fall back on.",
      },
    ],
    relatedSlugs: ["ai-policy-vs-governance-framework", "how-to-classify-ai-use-cases-by-risk"],
    relatedGuideHrefs: ["/ai-governance-for-law-firms", "/how-it-works"],
  },

  {
    slug: "how-to-introduce-ai-at-a-small-firm",
    title: "How to Introduce AI at a Small Firm Without Creating a Mess",
    description:
      "AI adoption at small firms tends to follow a predictable pattern. Here is how to get in front of it before informal use becomes your de facto governance model.",
    keywords: [
      "how to introduce ai at work",
      "ai adoption small firm",
      "implementing ai small business",
      "ai rollout plan small team",
    ],
    publishedAt: "2026-03-06",
    readingMinutes: 5,
    category: "Getting Started",
    intro:
      "It always starts the same way. Someone discovers a tool that saves them two hours a week. They tell a colleague. Within a month, half the team is using it. By the time leadership notices, no one knows what is in the prompts, what data has been shared, or what the review standard is for AI-assisted outputs.",
    body: [
      {
        type: "p",
        text: "It always starts the same way. Someone discovers a tool that saves them two hours a week. They tell a colleague. Within a month, half the team is using it. By the time leadership notices, no one knows what is in the prompts, what data has been shared, or what the review standard is for AI-assisted outputs.",
      },
      {
        type: "p",
        text: "The mess does not happen because people are careless. It happens because there was no plan. The tools arrive faster than the norms do, and norms established under pressure are rarely the ones you would choose deliberately.",
      },
      {
        type: "p",
        text: "Small firms are particularly susceptible to this pattern. There is no dedicated IT function, no compliance team, no AI steering committee. The people making decisions about AI use are the same people doing the work. That is fine. It just means the governance has to come from somewhere practical, not from a corporate framework designed for a firm ten times the size.",
      },
      {
        type: "h2",
        text: "Start with one use case",
      },
      {
        type: "p",
        text: "Trying to govern AI in the abstract is too vague to be useful. Pick one category of work where AI is already being used or is most likely to start. Internal documentation, research summaries, client communication drafts. One thing.",
      },
      {
        type: "p",
        text: "Get that use case right. Define what is acceptable, what requires a check, and what the output looks like before it leaves that person's hands. Once you have real norms for one thing, extending them to the next category is much easier.",
      },
      {
        type: "h2",
        text: "Define the review expectation before it is needed",
      },
      {
        type: "p",
        text: "The worst time to decide whether an AI output needs review is after someone has already relied on it for something important.",
      },
      {
        type: "p",
        text: "Before anyone uses a tool for a given type of work, write down the review expectation for that type. It does not have to be elaborate. 'All client-facing drafts require a second read before they go out.' 'Research summaries used in proposals need to be fact-checked before they land in the document.' Simple, specific, written down.",
      },
      {
        type: "p",
        text: "The goal is to remove judgment calls from situations where the pressure to move fast will override the judgment call anyway.",
      },
      {
        type: "h2",
        text: "Assign ownership early",
      },
      {
        type: "p",
        text: "Someone needs to be responsible for how AI is used inside the firm. Not in a formal sense, necessarily, but in the sense that when a question comes up, there is a clear person to ask.",
      },
      {
        type: "p",
        text: "This person handles tool access decisions, adjusts the review expectation when a new use case appears, and makes the call when something is unclear or potentially out of bounds. Small firms can handle all of this with one person. They just need to name one.",
      },
      {
        type: "p",
        text: "Without ownership, questions get answered inconsistently, and inconsistent answers become inconsistent practices. That is how informal AI use becomes your de facto governance model.",
      },
      {
        type: "h2",
        text: "Expand deliberately",
      },
      {
        type: "p",
        text: "Once the first use case has clear norms and an identified owner, there will be pressure to expand. Good. But expand with intention.",
      },
      {
        type: "p",
        text: "Add a new use case when the previous one is running smoothly. Check that the review expectation for the new category makes sense given the data involved and the stakes of getting it wrong. Do not let expansion happen by default, where tools just quietly start being used in new contexts without anyone deciding it is appropriate.",
      },
      {
        type: "h2",
        text: "When informal notes are not enough",
      },
      {
        type: "p",
        text: "For a while, informal alignment among a small team is sufficient. But there is a point where informal stops working. When the team grows. When client obligations increase. When the stakes of inconsistent AI use become meaningful.",
      },
      {
        type: "p",
        text: "At that point, the value of a structured governance framework is not the formality. It is the clarity. Writing things down in a consistent format forces decisions that informal conversations keep deferring. Usage rules. Review standards. Ownership. Rollout phases. All of it becomes explicit instead of assumed.",
      },
      {
        type: "p",
        text: "Most small firms find that this moment arrives earlier than expected.",
      },
    ],
    relatedSlugs: ["ai-policy-vs-governance-framework", "when-ai-output-needs-human-review"],
    relatedGuideHrefs: ["/ai-policy-for-small-business"],
  },

  {
    slug: "ai-policy-vs-governance-framework",
    title: "AI Policy vs AI Governance Framework: Why the Difference Matters",
    description:
      "An AI policy and an AI governance framework solve different problems. Most organizations have one and believe they have both. Here is the distinction and why it matters in practice.",
    keywords: [
      "ai policy vs ai governance",
      "ai governance framework vs policy",
      "difference between ai policy and governance",
      "ai governance vs ai policy",
    ],
    publishedAt: "2026-03-06",
    readingMinutes: 5,
    category: "Governance Fundamentals",
    intro:
      "An AI policy and an AI governance framework are not the same thing. Most organizations have one and think they have both. The confusion is understandable. The consequences are not.",
    body: [
      {
        type: "p",
        text: "An AI policy and an AI governance framework are not the same thing. Most organizations have one and think they have both. The confusion is understandable. The consequences are not.",
      },
      {
        type: "h2",
        text: "What a policy does",
      },
      {
        type: "p",
        text: "A policy is a statement of rules and expectations. It defines what is and is not allowed. It may describe consequences for violations. It answers the question: what does the organization expect of its people?",
      },
      {
        type: "p",
        text: "That is genuinely useful. A firm with no AI policy has no documented position on what tools are permitted, what data can be used, or what obligations employees have when using AI for work. Getting to a policy is a meaningful step.",
      },
      {
        type: "p",
        text: "But it is not enough on its own.",
      },
      {
        type: "h2",
        text: "What a policy does not do",
      },
      {
        type: "p",
        text: "A policy does not tell anyone how to actually roll out AI tools. It does not define who reviews outputs, who owns the adoption process, or how usage is supposed to expand over time. It sets the rules. It does not create the operating system for following them.",
      },
      {
        type: "p",
        text: "Think about it this way. A firm can have a policy against sending unsecured client data over email. That policy does not build the secure workflow. It does not train the team. It does not define an exception process. Someone still has to do all of that.",
      },
      {
        type: "p",
        text: "The same gap applies to AI. A policy that says 'do not use AI with regulated data' does not define what counts as regulated data in practice, who decides when something is borderline, or what happens when someone makes the wrong call. Those gaps fill themselves with individual judgment, which is inconsistent by nature.",
      },
      {
        type: "h2",
        text: "What a governance framework adds",
      },
      {
        type: "p",
        text: "A governance framework builds on the policy. It defines the operational structure: which use cases are appropriate to start with, what the review checkpoints look like, who is responsible for adoption decisions, and what signals indicate the framework itself needs to be updated.",
      },
      {
        type: "p",
        text: "It is the difference between a rule and a system. Rules describe intent. Systems create behavior.",
      },
      {
        type: "p",
        text: "Concretely, a governance framework answers questions a policy leaves open:",
      },
      {
        type: "list",
        items: [
          "Which team members are authorized to use which tools for which tasks?",
          "Who reviews AI-assisted outputs before they leave the firm, and by what standard?",
          "Who owns the rollout and has authority to expand or restrict AI use as circumstances change?",
          "What are the phases of adoption, and what triggers a move from one phase to the next?",
          "What documentation exists so that a new hire can understand how the firm operates around AI?",
        ],
      },
      {
        type: "h2",
        text: "Both have a role",
      },
      {
        type: "p",
        text: "This is not an argument against policies. They are necessary. Documented rules matter for accountability, onboarding, and creating a shared understanding of what is acceptable.",
      },
      {
        type: "p",
        text: "But a policy memo on the shared drive does not stop informal AI adoption from running ahead of leadership awareness. It does not prevent inconsistent review practices from compounding over time. It gives you documentation. It does not give you operating discipline.",
      },
      {
        type: "p",
        text: "A working governance framework, even a simple one, turns the policy from a statement into a practice. That is the difference between managing AI adoption and only describing your intentions.",
      },
      {
        type: "h2",
        text: "Where firms usually get stuck",
      },
      {
        type: "p",
        text: "Most small firms write an AI policy first, which is the right starting point. The next step is translating that policy into something operational.",
      },
      {
        type: "p",
        text: "That translation requires decisions. Named owners. Defined review standards. A clear rollout plan. Written documentation that reflects those decisions. It is more specific and more effortful than writing principles.",
      },
      {
        type: "p",
        text: "It is also what makes governance real rather than ceremonial.",
      },
    ],
    relatedSlugs: ["what-an-ai-governance-framework-should-include", "how-to-introduce-ai-at-a-small-firm"],
    relatedGuideHrefs: ["/ai-governance-framework-vs-ai-policy"],
  },

  {
    slug: "how-to-classify-ai-use-cases-by-risk",
    title: "How to Classify AI Use Cases by Risk",
    description:
      "Not all AI use carries the same risk. A workable classification system lets you match review standards to actual stakes rather than applying the same rules to everything.",
    keywords: [
      "ai use case risk classification",
      "ai risk assessment",
      "classifying ai use cases",
      "ai risk levels",
      "how to assess ai risk",
    ],
    publishedAt: "2026-03-06",
    readingMinutes: 6,
    category: "Risk and Review",
    intro:
      "Not all AI use carries the same risk. That sounds obvious, but most firms treat it as binary. Either AI is allowed or it is not. The reality is more graduated, and getting the classification right is what makes governance workable rather than restrictive.",
    body: [
      {
        type: "p",
        text: "Not all AI use carries the same risk. That sounds obvious, but most firms treat it as binary. Either AI is allowed or it is not. The reality is more graduated, and getting the classification right is what makes governance workable rather than restrictive.",
      },
      {
        type: "p",
        text: "A blanket restriction on AI is easy to write and hard to enforce. People will use tools anyway when the tools are genuinely useful, and the restriction will erode quietly. A classification system that matches oversight requirements to actual stakes is harder to design but much more durable in practice.",
      },
      {
        type: "h2",
        text: "The variables that drive risk",
      },
      {
        type: "p",
        text: "Risk in AI use cases comes down to three things: what data is involved, how the output is used, and how reversible the decision is.",
      },
      {
        type: "p",
        text: "An internal draft using anonymized project notes is very different from a summary that goes directly to a client. A brainstormed list of marketing angles is very different from a proposed contract clause. The difference is not the tool. It is the context: the sensitivity of the input, the stakes of the output, and how much a human can correct the situation if something is wrong.",
      },
      {
        type: "h2",
        text: "Lower-risk use cases",
      },
      {
        type: "p",
        text: "These involve non-sensitive data, internal-only outputs, and meaningful human review before anything consequential happens. Examples:",
      },
      {
        type: "list",
        items: [
          "Drafting internal knowledge base articles or SOPs from existing notes",
          "Brainstorming and ideation where the human filters and selects",
          "Summarizing internal meeting notes or project updates",
          "Editing and formatting help on non-sensitive content",
          "Research compilation on topics with no confidential source material",
        ],
      },
      {
        type: "p",
        text: "Most firms can operate in this category without heavy governance overhead. A basic review norm and light documentation is sufficient.",
      },
      {
        type: "h2",
        text: "Moderate-risk use cases",
      },
      {
        type: "p",
        text: "These involve internal business data or outputs that could influence client-facing decisions or external communications. Examples:",
      },
      {
        type: "list",
        items: [
          "Drafting client communications from internal notes or context",
          "Proposal and pitch language developed with AI assistance",
          "Research summaries that shape recommendations to clients",
          "Data analysis outputs referenced in reports or presentations",
        ],
      },
      {
        type: "p",
        text: "This category needs a defined review standard. Not sign-off on every word, but a clear expectation about what gets checked before use. The common failure mode here is an informal assumption that review is happening without ever specifying what that review looks like.",
      },
      {
        type: "h2",
        text: "Higher-risk use cases",
      },
      {
        type: "p",
        text: "These involve regulated data, confidential client information, or outputs where errors carry significant consequences. Examples:",
      },
      {
        type: "list",
        items: [
          "Legal document drafting, contract language, or compliance filings",
          "Financial projections or analysis used in client deliverables",
          "Any output where the firm's professional judgment is on the line",
          "Materials involving data subject to legal, regulatory, or confidentiality obligations",
        ],
      },
      {
        type: "p",
        text: "High-risk use cases require explicit review, defined escalation paths, and often a clear rule that AI support stays in the drafting and assistance phase rather than the final output phase. The human professional is still responsible for everything that leaves the firm.",
      },
      {
        type: "h2",
        text: "Using the classification in practice",
      },
      {
        type: "p",
        text: "Once you have categorized your firm's actual use cases, governance becomes a matter of matching review standards to risk levels. Low-risk uses get light oversight. High-risk uses get defined checkpoints. The same principle applies as AI tools and use cases evolve.",
      },
      {
        type: "p",
        text: "The classification does not have to be exhaustive from the start. Start with the use cases that are already active or most likely to appear. Add new categories as the need arises. A living classification system is more useful than a comprehensive one that is out of date.",
      },
      {
        type: "p",
        text: "The goal is a workable answer to the question every team member should be able to answer: given this task and this data, what level of review does this require before I act on or share the output?",
      },
    ],
    relatedSlugs: ["what-an-ai-governance-framework-should-include", "when-ai-output-needs-human-review"],
    relatedGuideHrefs: ["/ai-governance-for-law-firms", "/ai-governance-for-consulting-firms"],
  },

  {
    slug: "when-ai-output-needs-human-review",
    title: "When AI Output Needs Human Review",
    description:
      "The answer is not always, and it is not use your judgment. Here is a practical framework for deciding when human review is required and what that review should actually look like.",
    keywords: [
      "when to review ai output",
      "ai output review policy",
      "human review of ai generated content",
      "ai review standard",
    ],
    publishedAt: "2026-03-06",
    readingMinutes: 5,
    category: "Risk and Review",
    intro:
      "Every organization using AI tools eventually faces this question. The instinct is to say 'always' or to say 'use your judgment.' Both answers fail. Always review is too slow to be practical. Use your judgment creates the inconsistency that makes risk compound quietly over time.",
    body: [
      {
        type: "p",
        text: "Every organization using AI tools eventually faces this question. The instinct is to say 'always' or to say 'use your judgment.' Both answers fail. Always review is too slow to be practical. Use your judgment creates the inconsistency that makes risk compound quietly over time.",
      },
      {
        type: "p",
        text: "The better answer is a defined standard that people can actually apply without needing to make a fresh judgment call every time.",
      },
      {
        type: "h2",
        text: "When the answer is always",
      },
      {
        type: "p",
        text: "Client-facing output should always get a human read before it leaves the firm. That is not a statement about AI accuracy. It is a statement about professional responsibility. The firm owns what it sends, and the review is how the firm confirms that the output represents its judgment rather than the model's.",
      },
      {
        type: "p",
        text: "The same applies to any output that carries the firm's formal authority. Signed documents. Legal advice. Formal recommendations. Regulatory filings. When the organization's name goes on something, someone inside that organization needs to have read it with real attention.",
      },
      {
        type: "h2",
        text: "When the output stage changes the answer",
      },
      {
        type: "p",
        text: "A first draft is not the same as a final draft. AI assistance in the drafting phase does not require the same review as AI assistance in the delivery phase.",
      },
      {
        type: "p",
        text: "A reasonable general standard: the closer to the point of delivery, the more review. AI-generated research used to inform a human-written document carries low review pressure. An AI-generated client email sent with minor edits carries high review pressure. The output is practically the same type of document. The difference is what happens next with it.",
      },
      {
        type: "p",
        text: "Firms that apply the same review standard regardless of output stage will either over-review low-stakes drafts or under-review high-stakes final outputs. Getting the stage right matters.",
      },
      {
        type: "h2",
        text: "When the data type changes the answer",
      },
      {
        type: "p",
        text: "If the source material is sensitive, the review bar goes up regardless of how the output looks.",
      },
      {
        type: "p",
        text: "A clean, well-formatted AI summary of confidential client information still requires careful review, because the quality of the writing tells you nothing about whether the substance is accurate, complete, or appropriate to share. The model does not know what should be emphasized, what should be left out, or what interpretation serves the client's interest. That judgment belongs to the professional.",
      },
      {
        type: "p",
        text: "Regulated data, confidential client records, financial information, legally sensitive content: all of these call for explicit human review regardless of where in the output lifecycle they appear.",
      },
      {
        type: "h2",
        text: "Making this a policy rather than a feeling",
      },
      {
        type: "p",
        text: "In most firms right now, review decisions are made case by case, based on individual judgment. That works reasonably well when the team is small and everyone shares similar instincts. It becomes a problem as usage scales and the stakes of individual decisions increase.",
      },
      {
        type: "p",
        text: "A defined review standard has two components: what type of output it applies to, and what the review actually looks like. Broad categories are fine for a start. 'Client-facing drafts require a read from someone other than the drafter before they go out' is a policy. 'Be careful with AI outputs' is not.",
      },
      {
        type: "p",
        text: "The first is enforceable. The second only creates the impression of governance.",
      },
      {
        type: "h3",
        text: "Writing it down is the point",
      },
      {
        type: "p",
        text: "When review expectations exist only in people's heads, they shift based on workload, confidence, and deadline pressure. Written standards do not eliminate judgment, but they give people a reference point when pressure would otherwise override it.",
      },
      {
        type: "p",
        text: "The goal is not to create bureaucracy. It is to make the expected behavior legible enough that a new team member can understand it from a document rather than needing to absorb it by osmosis over months.",
      },
    ],
    relatedSlugs: ["how-to-classify-ai-use-cases-by-risk", "ai-policy-vs-governance-framework"],
    relatedGuideHrefs: ["/ai-governance-for-law-firms", "/ai-governance-for-consulting-firms"],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getRelatedArticles(currentSlug: string, relatedSlugs: string[]): Article[] {
  return relatedSlugs
    .map((slug) => articles.find((a) => a.slug === slug))
    .filter((a): a is Article => a !== undefined);
}
