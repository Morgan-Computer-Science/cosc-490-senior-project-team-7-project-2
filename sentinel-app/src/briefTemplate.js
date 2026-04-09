export function buildOnePageBrief({
  title,
  whatChanged = [],
  whyItMatters = "",
  options = [],
  risks = [],
  watchNext = [],
  unknowns = [],
  sources = [],
  confidenceNotes = [],
}) {
  const lines = [];

  lines.push(title || "Decision Brief");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");

  lines.push("What changed");
  pushBullets(lines, whatChanged, 3);

  lines.push("");
  lines.push("Why it matters");
  lines.push(`- ${whyItMatters || "Not provided."}`);

  lines.push("");
  lines.push("Options (2 to 3)");
  pushBullets(lines, options, 3);

  lines.push("");
  lines.push("Main risks");
  pushBullets(lines, risks, 5);

  lines.push("");
  lines.push("What to watch next");
  pushBullets(lines, watchNext, 3);

  lines.push("");
  lines.push("Unknowns Box");
  pushBullets(lines, unknowns, 5);

  lines.push("");
  lines.push("Confidence Dial");
  pushBullets(lines, confidenceNotes, 6);

  lines.push("");
  lines.push("Sources");
  pushBullets(lines, sources, 6);

  lines.push("");
  lines.push("Human in the loop note");
  lines.push("- Final decision remains with the human decision maker.");

  return lines.join("\n");
}

function pushBullets(lines, items, max) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (list.length === 0) {
    lines.push("- None.");
    return;
  }
  list.slice(0, max).forEach((x) => lines.push(`- ${x}`));
}
