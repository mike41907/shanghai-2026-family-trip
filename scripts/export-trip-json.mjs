import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "src", "data", "initialTrip.ts");
const outputPath = join(root, "public", "trip.json");
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true
  }
}).outputText;

const module = { exports: {} };
new Function("module", "exports", transpiled)(module, module.exports);
const trip = module.exports.INITIAL_TRIP;

if (!trip || !Array.isArray(trip.days)) throw new Error("Unable to load INITIAL_TRIP");
writeFileSync(outputPath, `${JSON.stringify(trip, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
