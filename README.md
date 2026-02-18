<!-- [![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=22438071&assignment_repo_type=AssignmentRepo)
 -->



<!-- READ ME : PROJECT  -->

<h1>SENTINEL</h1>
<p>
  <strong>Presidential Decision Support System</strong><br/>
  Simulation Project for Educational Use
</p>

<hr/>

<h2>Overview</h2>
<p>
SENTINEL is a multi-agent AI decision support system designed to assist
executive-level decision making. The system synthesizes analysis across
multiple national interest domains and produces structured decision memoranda
that present policy options, tradeoffs, risks, and recommendations.
</p>

<p>
SENTINEL is advisory by design. It does not make decisions, issue directives,
or replace institutional authority. Final decision-making responsibility
remains with the human decision maker.
</p>

<p>
<strong>Disclaimer:</strong><br/>
This project is a fictional simulation created solely for academic and research
purposes. It does not represent any real government system, policy, or authority.
</p>

<hr/>

<h2>Project Objectives</h2>
<ul>
  <li>Model traditional executive decision-making workflows using AI agents</li>
  <li>Explore multi-agent orchestration and coordination</li>
  <li>Design a human-centered interface for high-stakes decision contexts</li>
  <li>Improve transparency, traceability, and consistency in advisory systems</li>
  <li>Demonstrate responsible AI use in governance-oriented scenarios</li>
</ul>

<hr/>

<h2>System Concept</h2>
<p>
High-level executive decisions are traditionally informed through layered staff
coordination, agency input, and structured decision memoranda. SENTINEL models
this process digitally using coordinated AI agents that emulate advisory roles
while preserving human authority.
</p>

<p>
The primary system output is a <strong>Draft Response</strong>, a structured
decision memo equivalent to what a President would review prior to making a
final decision.
</p>

<hr/>

<h2>System Architecture</h2>

<h3>High-Level Workflow</h3>
<ol>
  <li>A policy question is introduced into the system</li>
  <li>SENTINEL classifies the decision context</li>
  <li>Relevant advisory agents are activated</li>
  <li>Agents analyze the issue independently within domain boundaries</li>
  <li>Conflicts, risks, and uncertainties are identified</li>
  <li>A Draft Response is assembled for executive review</li>
</ol>

<hr/>

<h2>Advisory Agents</h2>

<h3>Top-Level Agents</h3>
<ul>
  <li>Economic Stability Agent</li>
  <li>Inflation and Prices Agent</li>
  <li>Jobs and Labor Agent</li>
  <li>National Security Agent</li>
  <li>International Relations Agent</li>
  <li>Energy and Infrastructure Agent</li>
  <li>Cybersecurity Agent</li>
  <li>Public Health and Resilience Agent</li>
  <li>Immigration and Border Operations Agent</li>
  <li>Civil Rights and Social Stability Agent</li>
</ul>

<h3>Shared Sub-Agent Structure</h3>
<ul>
  <li>Evidence Retrieval</li>
  <li>Scenario and Forecast Analysis</li>
  <li>Policy Options Generation</li>
  <li>Risk and Second-Order Effects Analysis</li>
  <li>Metrics and Monitoring</li>
  <li>Legal and Authority Review</li>
  <li>Red Team Challenge</li>
</ul>

<hr/>

<h2>Project Milestones</h2>

<h3>Milestone 1: Research and Mockup Design</h3>
<ul>
  <li>Study traditional executive decision-making workflows</li>
  <li>Analyze advisory structures and policy memo formats</li>
  <li>Define system scope and agent responsibilities</li>
  <li>Design low-fidelity and high-fidelity UI mockups</li>
  <li>Establish user roles and interaction flows</li>
</ul>

<h3>Milestone 2: Agent Architecture Design</h3>
<ul>
  <li>Define top-level and sub-agent responsibilities</li>
  <li>Design agent orchestration and routing logic</li>
  <li>Establish conflict detection and resolution strategies</li>
</ul>

<h3>Milestone 3: Draft Response Assembly</h3>
<ul>
  <li>Design structured decision memo templates</li>
  <li>Integrate multi-agent outputs into a unified response</li>
  <li>Surface tradeoffs, risks, and uncertainty explicitly</li>
</ul>

<h3>Milestone 4: Governance and Safety Controls</h3>
<ul>
  <li>Legal and authority constraint enforcement</li>
  <li>Red team challenge integration</li>
  <li>Transparency and traceability mechanisms</li>
</ul>

<h3>Milestone 5: System Evaluation and Refinement</h3>
<ul>
  <li>Scenario-based testing</li>
  <li>Consistency and coherence review</li>
  <li>User-centered iteration and refinement</li>
</ul>

<hr/>

<h2>Technology Stack</h2>
<p>
SENTINEL is designed using a layered technology stack that separates
user experience design, system orchestration, agent reasoning, data grounding,
and governance.
</p>

<h3>Interface Layer</h3>
<ul>
  <li>
    <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white"/>
    <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white"/>
    <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000"/>
    <span>Web-based user interface for Presidential and Analyst views</span>
  </li>
  <li>
    <img alt="React" src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=000"/>
    <span>Optional component-based UI architecture for role-based layouts</span>
  </li>
</ul>

<h3>Design and Prototyping</h3>
<ul>
  <li>
    <img alt="Figma" src="https://img.shields.io/badge/Figma-F24E1E?logo=figma&logoColor=white"/>
    <span>
      Primary tool for wireframes, high-fidelity mockups, component libraries,
      and interactive prototypes used throughout Milestone 1.
    </span>
  </li>
</ul>

<h3>Orchestration Layer</h3>
<ul>
  <li>
    <img alt="Python" src="https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white"/>
    <span>Coordinator service for agent routing, conflict resolution, and Draft Response assembly</span>
  </li>
  <li>
    <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white"/>
    <span>Optional API layer for agent execution and UI integration</span>
  </li>
</ul>

<h3>Agent and Model Layer</h3>
<ul>
  <li>
    <img alt="Google Cloud" src="https://img.shields.io/badge/Google%20Cloud-4285F4?logo=googlecloud&logoColor=white"/>
    <span>Cloud platform for model access, agent runtime, and managed services</span>
  </li>
  <li>
    <img alt="Vertex AI" src="https://img.shields.io/badge/Vertex%20AI-1A73E8?logo=googlecloud&logoColor=white"/>
    <span>Managed AI services for model hosting and agent execution</span>
  </li>
  <li>
    <img alt="Gemini" src="https://img.shields.io/badge/Gemini-0F9D58?logo=google&logoColor=white"/>
    <span>Large language models for reasoning, synthesis, and memo generation</span>
  </li>
</ul>

<h3>Data Grounding and Knowledge Layer</h3>
<ul>
  <li>
    <img alt="BigQuery" src="https://img.shields.io/badge/BigQuery-669DF6?logo=googlebigquery&logoColor=white"/>
    <span>Structured indicators and time-series policy data (optional)</span>
  </li>
  <li>
    <img alt="Cloud Storage" src="https://img.shields.io/badge/Cloud%20Storage-4285F4?logo=googlecloud&logoColor=white"/>
    <span>Document storage for source bundles and memo artifacts (optional)</span>
  </li>
  <li>
    <img alt="Firestore" src="https://img.shields.io/badge/Firestore-FFCA28?logo=firebase&logoColor=000"/>
    <span>Session state, Draft Response versions, and metadata (optional)</span>
  </li>
</ul>

<h3>Governance and Observability</h3>
<ul>
  <li>
    <img alt="IAM" src="https://img.shields.io/badge/IAM-4285F4?logo=googlecloud&logoColor=white"/>
    <span>Role-based access control and permissions</span>
  </li>
  <li>
    <img alt="Cloud Logging" src="https://img.shields.io/badge/Cloud%20Logging-4285F4?logo=googlecloud&logoColor=white"/>
    <span>Audit logging of agent activity and Draft Response lineage</span>
  </li>
  <li>
    <img alt="Cloud Monitoring" src="https://img.shields.io/badge/Cloud%20Monitoring-4285F4?logo=googlecloud&logoColor=white"/>
    <span>System health, latency, and performance metrics (optional)</span>
  </li>
</ul>

<hr/>

<h2>Author</h2>
<p>
Team 7: Amyra Harry, Elijah Ballou, Daniel Onyejiekwe, Jaden Reeves
</p>