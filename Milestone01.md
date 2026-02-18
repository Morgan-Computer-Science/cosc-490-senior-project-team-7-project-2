<hr/>

<h2>Milestone 1: Research and Mockup Design</h2>

<p>
Milestone 1 focuses on grounding the SENTINEL system in real-world executive
decision-making practices and translating those findings into validated interface
mockups and interaction flows. All wireframes, high-fidelity mockups, and interaction
prototypes are produced in
<img alt="Figma" src="https://img.shields.io/badge/Figma-F24E1E?logo=figma&logoColor=white"/>
<strong>Figma</strong>.
</p>

<hr/>

<h3>1.1 Research Objectives</h3>
<ul>
  <li>Understand how presidential and executive decisions are traditionally supported</li>
  <li>Identify the role of software systems versus human coordination</li>
  <li>Determine gaps between existing tools and executive-level decision needs</li>
  <li>Translate findings into a decision-first, low-cognitive-load interface design</li>
</ul>

<hr/>

<h3>1.2 Research Findings: Executive Decision Support Landscape</h3>

<ul>
  <li>
    <strong>No unified presidential decision-support application exists.</strong>
    <ul>
      <li>Public documentation indicates that executive decision making is supported through a combination of briefings, analytic tools, and human coordination rather than a single integrated system.</li>
      <li>No publicly available platform performs cross-domain synthesis (economy, security, diplomacy, law) into automated policy options for presidential review.</li>
    </ul>
  </li>

  <li>
    <strong>Presidential decision inputs are delivered through structured briefings, not automated recommendations.</strong>
    <ul>
      <li>The Presidential Daily Brief focuses on intelligence synthesis, uncertainty, and situational awareness rather than policy recommendation.</li>
      <li>Policy options and recommendations are produced by human staff through deliberative processes.</li>
      <li>
        Source:
        <a href="https://www.dni.gov/index.php/what-we-do/briefings/presidential-daily-brief" target="_blank">
          Office of the Director of National Intelligence – Presidential Daily Brief
        </a>
      </li>
    </ul>
  </li>

  <li>
    <strong>National Security Council processes are human-coordinated and document-driven.</strong>
    <ul>
      <li>Decision options are developed through staff coordination, interagency input, and structured option papers.</li>
      <li>Software systems support document management and coordination rather than autonomous reasoning.</li>
      <li>
        Source:
        <a href="https://www.whitehouse.gov/nsc/" target="_blank">
          White House – National Security Council
        </a>
      </li>
    </ul>
  </li>

  <li>
    <strong>Existing government and enterprise platforms emphasize data integration and situational awareness.</strong>
    <ul>
      <li>Platforms such as Palantir Gotham are used for intelligence fusion, operational dashboards, and scenario exploration.</li>
      <li>These systems do not generate executive policy recommendations or structured decision memoranda.</li>
      <li>
        Source:
        <a href="https://www.palantir.com/platforms/gotham/" target="_blank">
          Palantir Gotham Platform Overview
        </a>
      </li>
    </ul>
  </li>

  <li>
    <strong>Economic and crisis modeling tools operate within narrow domains.</strong>
    <ul>
      <li>Agencies rely on specialized models for economic forecasting, disaster response, and crisis simulation.</li>
      <li>Outputs require expert interpretation and are not integrated into unified executive decision artifacts.</li>
      <li>
        Source:
        <a href="https://www.cbo.gov/about/products/budget-economic-data" target="_blank">
          Congressional Budget Office – Economic Data and Models
        </a>
      </li>
    </ul>
  </li>

  <li>
    <strong>Human judgment remains central to executive decision making.</strong>
    <ul>
      <li>Synthesis of tradeoffs, legal authority, political constraints, and risk remains a human responsibility.</li>
      <li>Existing systems support analysis but do not replace institutional decision processes.</li>
    </ul>
  </li>

  <li>
    <strong>Identified gap motivating SENTINEL.</strong>
    <ul>
      <li>Current tools lack unified, cross-domain synthesis into structured decision memos.</li>
      <li>There is no system designed specifically to support executive-level option comparison with transparent assumptions and uncertainty.</li>
      <li>SENTINEL is positioned as a conceptual design exploration to investigate how coordinated AI agents could augment existing workflows while preserving human authority.</li>
    </ul>
  </li>
</ul>

<h3>1.3 UX Implications</h3>
<ul>
  <li>Executive interfaces must prioritize clarity and option comparison over raw data</li>
  <li>Decision artifacts should mirror traditional option memo structures</li>
  <li>Trust indicators such as confidence, disagreement, and data freshness are critical</li>
  <li>AI capabilities must remain advisory and interpretable</li>
</ul>

<hr/>

<h3>1.4 Design Artifacts (Figma)</h3>
<ul>
  <li>Low-fidelity wireframes for Presidential Home and Decision Brief views</li>
  <li>High-fidelity mockups emphasizing one-minute decision comprehension</li>
  <li>Reusable component library for option cards, risk badges, and confidence indicators</li>
  <li>Clickable interaction flows implemented as Figma prototypes</li>
</ul>

<hr/>

<h3>1.5 Interaction Flows</h3>
<ol>
  <li><strong>New Decision Flow:</strong> Home → Enter policy question → Generate Draft Response → Review options</li>
  <li><strong>Review Flow:</strong> Home → Open Draft Response → Compare Option A/B/C → Expand risks and constraints</li>
  <li><strong>What-If Flow:</strong> Decision Brief → Select scenario toggle → Update impacts and confidence</li>
</ol>

<hr/>

<h3>1.6 Milestone 1 Deliverables</h3>
<ul>
  <li>Research summary documenting existing executive decision-support practices</li>
  <li>Personas and role definitions</li>
  <li>Information architecture map</li>
  <li>Wireframes and high-fidelity mockups (Figma)</li>
  <li>Clickable interaction flow prototypes (Figma)</li>
</ul>

<hr/>

<h3>1.7 Exit Criteria</h3>
<ul>
  <li>Mockups reflect real-world executive briefing structures</li>
  <ul>
    <li> Figma (User Flow): <a href="https://www.figma.com/board/8Txl30SeviNtEHjAytEAs1/490--Design-Diagram?node-id=0-1&t=kROLenbJARP9rM2y-1" target="_blank">
    </ul>
  <li>Presidential Home supports one-minute decision comprehension</li>
  <li>Options are comparable without additional navigation</li>
  <li>Findings are grounded in publicly verifiable sources</li>
</ul>
