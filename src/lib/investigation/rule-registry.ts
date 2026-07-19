import type { Rule, RuleMatch, InvestigationContext } from "./types";
import type { FindingCategory } from "@/types";

export class RuleRegistry {
  private rules = new Map<string, Rule>();

  register(rule: Rule): void {
    if (this.rules.has(rule.identifier)) {
      return;
    }
    this.rules.set(rule.identifier, rule);
  }

  registerAll(rules: Rule[]): void {
    for (const rule of rules) this.register(rule);
  }

  get(identifier: string): Rule | undefined {
    return this.rules.get(identifier);
  }

  getByCategory(category: FindingCategory): Rule[] {
    return [...this.rules.values()].filter((r) => r.category === category);
  }

  getIdentifiers(): string[] {
    return [...this.rules.keys()];
  }

  get all(): Rule[] {
    return [...this.rules.values()];
  }

  executeRule(identifier: string, ctx: InvestigationContext): RuleMatch[] {
    const rule = this.rules.get(identifier);
    if (!rule) return [];
    try {
      return rule.execute(ctx);
    } catch {
      return [];
    }
  }

  executeRules(
    identifiers: string[],
    ctx: InvestigationContext,
  ): Map<string, RuleMatch[]> {
    const results = new Map<string, RuleMatch[]>();
    for (const id of identifiers) {
      results.set(id, this.executeRule(id, ctx));
    }
    return results;
  }
}

export const ruleRegistry = new RuleRegistry();
