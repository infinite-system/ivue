/**
 * ivue-house-gate.ts — YOUR gate. The severity menu at the top is the part
 * you edit; the block below it is a working example of how to extend.
 *
 * `npx ivue skill` installs this file into your project and never
 * overwrites a copy you have modified — upgrade a customized gate with
 * your AI agent using the ivue skill, which reconciles your rulings with
 * the new Standard.
 *
 * In this repo the imports are relative (the file lives beside the
 * engine); the installed copy imports from the package instead
 * (`ivue/extras` and `ivue/skills/ivue/ivue-standards-check`).
 *
 * Try it:
 *
 *   npm run gate:house -- --list
 *   npm run gate:house -- --prove a_source_file_stays_under_the_line_budget
 *   npm run gate:house -- --prove
 *   npm run gate:house -- --source-root src --test-glob 'src/**\/*.test.ts'
 */
import { Static } from '../../lib/Static';
import { CheckStandard, type CheckProof, type StandardCheck } from './ivue-standards-check';

class $HouseGate extends CheckStandard.$Class {
  // ── YOUR RULINGS ─────────────────────────────────────────────────────
  // The severity menu: every check at its default, so this gate blocks
  // exactly what the base gate blocks. Flip an entry to 'warn' (report,
  // never block) or 'off' (skip globally, announced in the summary) and
  // the whole team inherits the ruling. Per-file exceptions belong in the
  // skip list (ivue-standards-skip.json), not here.
  static get severities(): Readonly<Record<string, 'error' | 'warn' | 'off'>> {
    return {
      exactly_one_reactive_source_is_installed: 'error',
      a_public_class_publishes_its_namespace_manifest: 'error',
      a_class_file_is_named_after_its_class: 'error',
      a_class_file_holds_only_imports_class_namespace_and_types: 'error',
      behavior_lives_on_the_prototype_not_in_fields: 'error',
      construction_goes_through_the_namespace_class_slot: 'error',
      the_anchor_is_static_only_when_statics_exist: 'error',
      static_binds_methods_and_caches_dollar_getters_per_receiver: 'error',
      a_shared_store_is_a_static_readonly_field: 'error',
      a_derived_static_getter_is_lower_camel_case: 'error',
      static_reads_go_through_self_not_the_base_class: 'error',
      mutable_state_is_a_ref_returning_getter: 'error',
      a_ref_is_read_and_written_through_value: 'error',
      a_derivation_is_a_plain_getter_unless_computed_is_justified: 'error',
      a_composable_is_injected_by_a_one_call_dollar_getter: 'error',
      instance_types_only_unwrapping_surfaces: 'error',
      a_component_has_one_model_owner: 'error',
      the_state_destructure_is_total: 'error',
      template_expressions_carry_no_logic: 'error',
      watch_lifetime_matches_the_instance_owner: 'error',
      a_reactive_closure_delegates_to_one_method: 'error',
      a_store_is_used_lazily_and_swapped_at_the_class_slot: 'error',
      keyed_state_creates_on_read_and_peeks_on_write: 'error',
      a_generic_reactive_class_casts_its_constructor: 'error',
      cross_module_class_reads_happen_inside_bodies: 'error',
      declarations_use_full_descriptive_names: 'error',
      class_members_are_ordered_and_spaced: 'error',
      a_test_file_opens_with_its_generator_header: 'error',
      a_generator_header_carries_both_registers_in_order: 'error',
      a_header_symbol_is_declared_in_the_sibling_source: 'error',
      a_claim_annotation_sits_directly_above_its_test: 'error',
      header_claims_and_annotated_tests_match_one_to_one: 'error',
      an_impossibility_is_proved_by_an_exact_negative_test: 'error',
      a_contract_pointer_resolves_and_is_proved: 'error',
      a_source_tripwire_resolves_to_its_sibling_header: 'error',
      a_test_caveat_derives_from_a_tested_claim: 'error',
      the_population_and_skip_list_are_exact: 'error',
      two_test_files_do_not_share_one_generator_header: 'error',
      // the house example ships FLIPPED: a line budget is advisory by
      // nature — it reports, it never blocks (real classes can be long)
      a_source_file_stays_under_the_line_budget: 'warn',
    };
  }

  // ── EXTENSION EXAMPLE — how to ADD a house check ─────────────────────
  // A house check is three members, and everything else is inherited
  // (run(), the CLI, the skip-list vocabulary, prove()):
  //
  //   1. the check getter — its name IS the check's one snake_case
  //      identity (getter name, finding label, skip token, severity key);
  //   2. `checks`         — appends it to the inherited manifest;
  //   3. `proofs`         — spreads its constitution entry (claim,
  //      impossibility, red arm, green arm) over the inherited ones.
  //      prove() REFUSES a check that skips this step.
  //
  // Delete these members to run the plain Standard; copy their shape to
  // add your own rules.

  // A literal tunable constant — SCREAMING_SNAKE per the Standard. The
  // check's name deliberately carries no number, so pinching this knob
  // (here, or in a deeper subclass) never falsifies it; the finding
  // message states the current budget.
  static get MAX_SOURCE_LINES() {
    return 900;
  }

  static get a_source_file_stays_under_the_line_budget(): StandardCheck {
    return this.defineCheck('a_source_file_stays_under_the_line_budget', (context) =>
      context.sources
        .filter((unit) => unit.lines.length > this.MAX_SOURCE_LINES)
        .map((unit) => this.finding(this.a_source_file_stays_under_the_line_budget, unit, 1, `${unit.lines.length} lines — the budget is ${this.MAX_SOURCE_LINES}; split the module`)),
    );
  }

  static get checks(): readonly StandardCheck[] {
    return [...super.checks, this.a_source_file_stays_under_the_line_budget];
  }

  static get proofs(): Readonly<Record<string, CheckProof>> {
    return {
      ...super.proofs,
      [this.a_source_file_stays_under_the_line_budget.name]: {
        claim: 'If a source file exceeds the line budget, then the gate names it and states the budget',
        impossibility: 'a source file over the line budget passes the gate',
        red: [{ files: { 'src/Long.ts': `${'// filler\n'.repeat(901)}export type Filler = number;\n` }, expectFindings: [/90\d lines — the budget is \d+; split the module/] }],
        green: [{ files: { 'src/Short.ts': 'export type Short = number;\n' } }],
      },
    };
  }
}

export namespace HouseGate {
  export const $Class = Static($HouseGate);
  export let Class = $Class;

  // Registers this gate as the CLI entry — superseding the base gate's own
  // registration, because the entry module evaluates last.
  CheckStandard.bootstrapCli(Class);
}
