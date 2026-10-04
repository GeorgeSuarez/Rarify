import { describe, test } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { noManualEffectErrorTagRule } from "@/tools/oxlint/anti-slop/effect/rules/no-manual-effect-error-tag.ts";
import { noManualTagComparisonRule } from "@/tools/oxlint/anti-slop/effect/rules/no-manual-tag-comparison.ts";
import { noManualTaggedConstructionRule } from "@/tools/oxlint/anti-slop/effect/rules/no-manual-tagged-construction.ts";
import { noServiceConstructorImportsRule } from "@/tools/oxlint/anti-slop/effect/rules/no-service-constructor-imports.ts";
import { preferEffectMatchRule } from "@/tools/oxlint/anti-slop/effect/rules/prefer-effect-match.ts";
import { noArrayFilterMapRule } from "@/tools/oxlint/anti-slop/rules/no-array-filter-map.ts";
import { noReduceAccumulatorCopyRule } from "@/tools/oxlint/anti-slop/rules/no-reduce-accumulator-copy.ts";
import { requireReadableSpacingRule } from "@/tools/oxlint/anti-slop/rules/require-readable-spacing.ts";
import createPaddingLineRule from "@/tools/oxlint/anti-slop/vendor/eslint-stylistic/padding-line-between-statements.ts";

/**
 * Focused cases for the rules adopted when the vendored plugin was updated to
 * upstream `c44ef22`, ported from that revision's per-rule test suites. The
 * plugin's RuleTester falls back to a synchronous harness because Vitest does
 * not install global `describe`/`it`.
 */
const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

describe("vendored anti-slop rules", () => {
  test("no-array-filter-map rejects eager filter().map() chains on known arrays", () => {
    tester.run("anti-slop/no-array-filter-map", noArrayFilterMapRule, {
      valid: [
        "const users = []; users.values().filter(active).map(email).toArray();",
        "const users = []; users.values().map(email).filter(Boolean).toArray();",
        "Iterator.from(users).filter(active).map(email).toArray();",
        "function collect(users: IteratorObject<User>) { return users.filter(active).map(email).toArray(); }",
        "const users = []; users.flatMap(user => user.active ? [user.email] : []);",
        "const users = []; users.map(email); users.filter(active);",
        "const users = []; users.map(email).map(normalize);",
        "const users = []; users.filter(active).filter(verified);",
        "const custom = { filter() { return this; }, map() {} }; custom.filter(active).map(email);",
        "function collect(unknownReceiver) { return unknownReceiver.filter(active).map(email); }",
        "const users = fetchUsers(); users.filter(active).map(email);",
        "const users = []; function collect(users) { return users.filter(active).map(email); }",
        "let users = []; users = iterator; users.filter(active).map(email);",
        "const users = []; users[method](active).map(email);",
        "const first = second; const second = first; first.filter(active).map(email);",
      ],
      invalid: [
        { code: "[].filter(active).map(email);", errors: [{ messageId: "arrayFilterMap" }] },
        {
          code: "[].map(user => user.active ? user.email : undefined).filter(email => email !== undefined);",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "const users = []; users.map(email).filter(Boolean);",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "const users = []; const alias = users; alias.filter(active).map(email);",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "function collect(users: User[]) { return users.filter(active).map(email); }",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "function collect(users: readonly User[]) { return users.map(email).filter(present); }",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "function collect(users: ReadonlyArray<User>) { return users.filter(active).map(email); }",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "function collect(users: Array<User>) { return users.filter(active).map(email); }",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "const users = [] as const; users['filter'](active)['map'](email);",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "const users = []; (users.filter(active)!).map(email);",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "const users = []; users?.filter(active)?.map(email);",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "const users = []; users.slice().filter(active).map(email);",
          errors: [{ messageId: "arrayFilterMap" }],
        },
        {
          code: "const users = []; users.filter(active).map(email).filter(Boolean);",
          errors: [{ messageId: "arrayFilterMap" }, { messageId: "arrayFilterMap" }],
        },
      ],
    });
  });

  test("no-reduce-accumulator-copy rejects accumulators copied instead of mutated", () => {
    tester.run("anti-slop/no-reduce-accumulator-copy", noReduceAccumulatorCopyRule, {
      valid: [
        "items.reduce((acc, item) => { acc.push(item); return acc; }, []);",
        "items.reduce((acc, item) => Object.assign(acc, item), {});",
        "items.reduce((acc, item) => Object.assign(acc, acc, item), {});",
        "items.reduce((acc, item) => { acc[item.id] = { ...item }; return acc; }, {});",
        "items.reduce((acc, item) => { acc.push(Object.assign({}, item)); return acc; }, []);",
        "items.reduce((acc, item) => { acc.push(item.slice()); return acc; }, []);",
        "items.reduce((acc, item) => acc.concat(item), '');",
        "items.reduce((acc, item) => acc.concat(item), customCollection);",
        "function copy(acc) { return Object.assign({}, acc); }",
        "items.map((acc, item) => Object.assign({}, acc));",
        "items.reduce((acc, item) => { function copy(acc) { return Object.assign({}, acc); } return acc; }, {});",
        "items.reduce((acc, item) => { const snapshot = () => Object.assign({}, acc); return acc; }, {});",
        "items.reduce((acc, item) => { { const acc = {}; Object.assign({}, acc); } return acc; }, {});",
        "const Object = custom; items.reduce((acc, item) => Object.assign({}, acc), {});",
        "function run(Object) { return items.reduce((acc, item) => Object.assign({}, acc), {}); }",
        "const Array = custom; items.reduce((acc, item) => Array.from(acc), []);",
        "items.reduce((acc, item) => { let alias = acc; alias = item; return Object.assign({}, alias); }, {});",
        "items.reduce((acc, item) => [...acc, item], []);",
        "items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});",
      ],
      invalid: [
        {
          code: "items.reduce((acc, item) => Object.assign({}, acc, { [item.id]: item }), {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduceRight((acc, item) => Object.assign({}, acc, item), {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item, index, array) => Object.assign({}, acc, item), {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce(acc => Object.assign({}, acc), {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce(function (acc, item) { return Object.assign({}, item, acc); }, {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items['reduce'](((acc, item) => Object['assign']({}, acc, item)), {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc = {}, item) => Object.assign({}, acc, item), {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => { const alias = acc; return Object.assign({}, alias, item); }, {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => Object.assign({}, acc as State, item), {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => { const next = Object.assign({}, acc); next[item.id] = item; return next; }, {});",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => acc.concat([item]), []);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduceRight((acc, item, index) => acc['concat']([item]), [] as Item[]);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => { const next = acc.slice(); next.push(item); return next; }, []);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => { const alias = acc; return alias.concat(item); }, []);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "const initial = []; items.reduce((acc, item) => acc.concat(item), initial);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => { const next = Array.from(acc); next.push(item); return next; }, []);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => acc.toSpliced(acc.length, 0, item), []);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => acc.toSorted(), []);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => acc.toReversed(), []);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
        {
          code: "items.reduce((acc, item) => acc.with(0, item), []);",
          errors: [{ messageId: "accumulatorCopy" }],
        },
      ],
    });
  });

  test("require-readable-spacing inserts blank lines without collapsing existing ones", () => {
    tester.run("anti-slop/require-readable-spacing", requireReadableSpacingRule, {
      valid: [
        "import { a } from 'a';\nimport { b } from 'b';\n\nexport const c = a + b;",
        "function f() {\nconst a = 1;\nconst b = 2;\n\nreturn a + b;\n}",
        "function f() { return 1; }",
        "function f(a: string): string;\nfunction f(a: number): number;\nfunction f(a: string | number) { return a; }",
        "export function f(a: string): string;\nexport function f(a: number): number;\nexport function f(a: string | number) { return a; }",
        "const f = Effect.gen(function* () {\nconst a = yield* A;\nconst b = yield* B;\n\nreturn a + b;\n});",
        "export type A = string;\n\n/** B documentation. */\nexport type B = number;",
        "function f() { if (ok) { go(); } else { stop(); } }",
        "function f() {\n// return docs\nreturn 1;\n}",
        "const a = 1;\n\n\nconst b = 2;",
        "switch (x) { case 1: case 2: go(); break; default: stop(); }",
      ],
      invalid: [
        {
          code: "const a = 1;\nconst b = 2;",
          output: "const a = 1;\n\nconst b = 2;",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "export const a = 1;\n/** B docs. */\nexport type B = number;",
          output: "export const a = 1;\n\n/** B docs. */\nexport type B = number;",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "const a = 1; // trailing\n// leading\nconst b = 2;",
          output: "const a = 1; // trailing\n\n// leading\nconst b = 2;",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "const a = 1; const b = 2;",
          output: "const a = 1;\n\n const b = 2;",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "import { a } from 'a';\nconst b = a;",
          output: "import { a } from 'a';\n\nconst b = a;",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "function f() {\nconst a = 1;\nreturn a;\n}",
          output: "function f() {\nconst a = 1;\n\nreturn a;\n}",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "function f() {\nconst a = 1;\nif (a) go();\n}",
          output: "function f() {\nconst a = 1;\n\nif (a) go();\n}",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "function f() {\nif (ok) { go(); }\nstop();\n}",
          output: "function f() {\nif (ok) { go(); }\n\nstop();\n}",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "const f = Effect.gen(function* () {\nconst a = yield* A;\nconst b = yield* B;\nconst dispatch = Effect.fn('dispatch')(function* () {\nyield* a;\n});\nreturn dispatch;\n});",
          output:
            "const f = Effect.gen(function* () {\nconst a = yield* A;\nconst b = yield* B;\n\nconst dispatch = Effect.fn('dispatch')(function* () {\nyield* a;\n});\n\nreturn dispatch;\n});",
          errors: [{ messageId: "expectedBlankLine" }, { messageId: "expectedBlankLine" }],
        },
        {
          code: "export interface A {}\nexport class B {}",
          output: "export interface A {}\n\nexport class B {}",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "const a = 1\n;[1].forEach(f)",
          output: "const a = 1\n\n;[1].forEach(f)",
          errors: [{ messageId: "expectedBlankLine" }],
        },
        {
          code: "function f() {\nfoo();\nwhile (ok) go();\n}",
          output: "function f() {\nfoo();\n\nwhile (ok) go();\n}",
          errors: [{ messageId: "expectedBlankLine" }],
        },
      ],
    });
  });

  test("the vendored padding rule still removes blank lines when configured to", () => {
    tester.run(
      "vendored padding removal",
      createPaddingLineRule([{ blankLine: "never", prev: "*", next: "*" }]),
      {
        valid: ["foo();\nbar();"],
        invalid: [
          {
            code: "foo();\n\nbar();",
            output: "foo();\nbar();",
            errors: [{ messageId: "unexpectedBlankLine" }],
          },
          {
            code: "foo();\n\n// comment\n\nbar();",
            output: null,
            errors: [{ messageId: "unexpectedBlankLine" }],
          },
        ],
      },
    );
  });

  test("no-manual-effect-error-tag prefers tagged Effect handlers inside broad catches", () => {
    tester.run("anti-slop-effect/no-manual-effect-error-tag", noManualEffectErrorTagRule, {
      valid: [
        'error._tag === "NotFound";',
        'Effect.catchTag("NotFound", recover);',
        'Effect.catchTag("Wrapper", (error) => error.reason._tag === "Timeout" ? retry : fail);',
      ],
      invalid: [
        {
          code: 'Effect.catch((error) => error._tag === "NotFound" ? recover : fail);',
          errors: [{ messageId: "tag" }],
        },
        {
          code: 'Effect.catchAll(function (error) { return error.reason._tag === "Timeout" ? retry : fail; });',
          errors: [{ messageId: "reason" }],
        },
        {
          code: 'Effect.catchIf(predicate, (error) => { switch (error._tag) { case "NotFound": return recover; } });',
          errors: [{ messageId: "tag" }],
        },
      ],
    });
  });

  test("no-manual-tag-comparison prefers Match and Predicate over _tag checks", () => {
    tester.run("anti-slop-effect/no-manual-tag-comparison", noManualTagComparisonRule, {
      valid: [
        'Predicate.isTagged("Ready")(value);',
        'Match.value(value).pipe(Match.tag("Ready", handleReady));',
        'if (value.status === "Ready") handleReady(value);',
        'Effect.catch((error) => error._tag === "NotFound" ? recover : fail);',
      ],
      invalid: [
        {
          code: 'value._tag === "Ready";',
          errors: [{ messageId: "manualComparison" }],
        },
        {
          code: '"Ready" !== value["_tag"];',
          errors: [{ messageId: "manualComparison" }],
        },
        {
          code: 'switch (value._tag) { case "Ready": handleReady(value); }',
          errors: [{ messageId: "manualSwitch" }],
        },
      ],
    });
  });

  test("no-manual-tagged-construction requires Effect constructors for tagged values", () => {
    tester.run("anti-slop-effect/no-manual-tagged-construction", noManualTaggedConstructionRule, {
      valid: [
        'Match.when({ _tag: "Ready" }, handleReady);',
        'Match.not({ "_tag": "Pending" });',
        "Ready.make({ value });",
        "new NotFound({ id });",
        "({ _tag: tag, value });",
      ],
      invalid: [
        {
          code: 'const value = { _tag: "Ready", payload };',
          errors: [{ messageId: "manualConstruction" }],
        },
        {
          code: 'const value = { ["_tag"]: "Ready" };',
          errors: [{ messageId: "manualConstruction" }],
        },
      ],
    });
  });

  test("no-service-constructor-imports rejects runtime make* service imports", () => {
    tester.run("anti-slop-effect/no-service-constructor-imports", noServiceConstructorImportsRule, {
      valid: [
        {
          filename: "src/issue-service.test.ts",
          code: 'import { makeIssueService } from "./issue-service.ts";',
        },
        {
          filename: "src/issue-service.spec.tsx",
          code: 'import { makeIssueService } from "../issue-service.ts";',
        },
        {
          filename: "src/runtime.ts",
          code: 'import { makeExecutionMemo } from "alchemy/Runtime/ExecutionMemo";',
        },
        {
          filename: "src/runtime.ts",
          code: 'import { issueServiceLayer } from "./issue-service.ts";\nWorkspaceName.make("name");',
        },
        {
          filename: "src/runtime.ts",
          code: 'import { makeissueService } from "./issue-service.ts";',
        },
      ],
      invalid: [
        {
          filename: "src/runtime.ts",
          code: 'import { makeIssueService } from "./issue-service.ts";',
          errors: [{ messageId: "serviceConstructorImport", data: { name: "makeIssueService" } }],
          output: null,
        },
        {
          filename: "src/runtime.ts",
          code: 'import { makeIssueService as createIssueService } from "../issue-service.ts";',
          errors: [{ messageId: "serviceConstructorImport", data: { name: "makeIssueService" } }],
          output: null,
        },
      ],
    });
  });

  test("prefer-effect-match rejects chained literal ternaries over one value", () => {
    tester.run("anti-slop-effect/prefer-effect-match", preferEffectMatchRule, {
      valid: [
        'kind === "a" ? first : fallback;',
        'kind === "a" ? first : other === "b" ? second : fallback;',
        "condition ? first : otherCondition ? second : fallback;",
      ],
      invalid: [
        {
          code: 'kind === "a" ? first : kind === "b" ? second : fallback;',
          errors: [{ messageId: "preferMatch" }],
        },
        {
          code: "`a` !== kind ? first : `b` === kind ? second : fallback;",
          errors: [{ messageId: "preferMatch" }],
        },
      ],
    });
  });
});
