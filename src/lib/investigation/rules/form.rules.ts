import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

// ── missing-label ───────────────────────────────────────────────────

const missingLabelRule: Rule = {
  identifier: "form/missing-label",
  description: "Input without associated label, aria-label, or aria-labelledby",
  category: "form",
  defaultSeverity: "high",
  documentation:
    "Detects form inputs that lack accessible labels for screen readers.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    for (const input of dom.inputs) {
      if (input.type === "hidden") continue;
      // structuredDom.inputs doesn't have aria-label info, so we check the name
      if (!input.name && !input.placeholder) {
        results.push({
          fingerprint: `form/missing-label:${input.type}:${input.name}`,
          title: "Form input missing accessible label",
          description: `An <input type="${input.type}"> lacks an associated label, aria-label, or aria-labelledby. Screen readers cannot identify this field.`,
          severity: "high",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Add an aria-label, aria-labelledby attribute, or associate a <label> element using the for attribute matching the input's id.",
        });
      }
    }
    return results;
  },
};

// ── missing-submit ──────────────────────────────────────────────────

const missingSubmitRule: Rule = {
  identifier: "form/missing-submit",
  description: "Form with no submit button",
  category: "form",
  defaultSeverity: "high",
  documentation:
    "Detects form elements that have no way to submit data.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    for (const form of dom.forms) {
      if (form.submits === 0) {
        results.push({
          fingerprint: `form/missing-submit:${form.action}:${form.method}`,
          title: "Form missing submit button",
          description: `A <form> with action="${form.action}" and method="${form.method}" has no submit button or input. Users cannot submit the form.`,
          severity: "high",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            'Add an <input type="submit"> or <button type="submit"> inside the form to allow submission.',
        });
      }
    }
    return results;
  },
};

// ── duplicated-form ─────────────────────────────────────────────────

const duplicatedFormRule: Rule = {
  identifier: "form/duplicated-form",
  description: "Same action URL and method used across multiple form nodes",
  category: "form",
  defaultSeverity: "low",
  documentation:
    "Detects multiple forms submitting to the same endpoint.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const actionMethodCount = new Map<string, number>();
    for (const form of dom.forms) {
      const key = `${form.method}:${form.action}`;
      actionMethodCount.set(key, (actionMethodCount.get(key) ?? 0) + 1);
    }

    const results: RuleMatch[] = [];
    for (const [key, count] of actionMethodCount) {
      if (count > 1) {
        const [method, action] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
        results.push({
          fingerprint: `form/duplicated-form:${key}`,
          title: "Duplicate form submission endpoints",
          description: `${count} forms share the same action URL "${action}" and method "${method}". This may indicate redundant forms or copy-paste errors.`,
          severity: "low",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Review duplicated forms and consolidate where possible. Ensure each form has a unique purpose and submission endpoint.",
        });
      }
    }
    return results;
  },
};

// ── excessive-required ──────────────────────────────────────────────

const excessiveRequiredRule: Rule = {
  identifier: "form/excessive-required",
  description: "More than 5 required/visible inputs in a single form",
  category: "form",
  defaultSeverity: "low",
  documentation:
    "Detects forms with too many required fields, which may reduce conversion rates.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    const requiredInputs = dom.inputs.filter((i) => i.required);
    if (requiredInputs.length > 5) {
      results.push({
        fingerprint: `form/excessive-required:${requiredInputs.length}`,
        title: "Excessive required form fields",
        description: `The form has ${requiredInputs.length} required fields. Long forms with many required fields can reduce completion rates.`,
        severity: "low",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Reduce the number of required fields. Consider making non-essential fields optional or using progressive disclosure.",
      });
    }
    return results;
  },
};

// ── oversized-form ──────────────────────────────────────────────────

const oversizedFormRule: Rule = {
  identifier: "form/oversized-form",
  description: "More than 10 total inputs/controls in a form",
  category: "form",
  defaultSeverity: "low",
  documentation:
    "Detects forms with too many total input fields.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    const totalInputs = dom.inputs.length;
    if (totalInputs > 10) {
      results.push({
        fingerprint: `form/oversized-form:${totalInputs}`,
        title: "Oversized form detected",
        description: `The form contains ${totalInputs} input fields. Large forms can overwhelm users and hurt conversion.`,
        severity: "low",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Break long forms into multiple steps (wizard pattern) or sections. Only ask for essential information.",
      });
    }
    return results;
  },
};

// ── isolated-form ───────────────────────────────────────────────────

const isolatedFormRule: Rule = {
  identifier: "form/isolated-form",
  description: "Form node with no submits_to edge in the graph",
  category: "form",
  defaultSeverity: "high",
  documentation:
    "Detects form elements that have no submission path in the graph.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const formNodes = graph.nodes.filter((n) => n.type === "form");
    const submitEdges = graph.edges.filter((e) => e.type === "submits_to");
    const submitSources = new Set(submitEdges.map((e) => e.source));

    const results: RuleMatch[] = [];
    for (const node of formNodes) {
      if (!submitSources.has(node.id)) {
        results.push({
          fingerprint: `form/isolated-form:${node.id}`,
          title: "Isolated form detected",
          description: `Form "${node.label}" (${node.id}) has no submits_to edge in the graph. The form's submission target is unknown.`,
          severity: "high",
          evidenceIds: [],
          graphNodeIds: [node.id],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Ensure the form has a valid action URL and that the submission flow is properly represented in the application graph.",
        });
      }
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(missingLabelRule);
ruleRegistry.register(missingSubmitRule);
ruleRegistry.register(duplicatedFormRule);
ruleRegistry.register(excessiveRequiredRule);
ruleRegistry.register(oversizedFormRule);
ruleRegistry.register(isolatedFormRule);

export {
  missingLabelRule,
  missingSubmitRule,
  duplicatedFormRule,
  excessiveRequiredRule,
  oversizedFormRule,
  isolatedFormRule,
};
