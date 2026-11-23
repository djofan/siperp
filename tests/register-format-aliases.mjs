import Module, {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
const require=createRequire(import.meta.url),ts=require("typescript");
const aliases=new Map([
 ["@/lib/number-format",fileURLToPath(new URL("../lib/number-format.ts",import.meta.url))],
 ["@/components/ui/RupiahNumberInput",fileURLToPath(new URL("../components/ui/RupiahNumberInput.tsx",import.meta.url))],
]);
// Existing unit harnesses execute TSX as CommonJS. Resolve only these shared imports;
// leave third-party modules and Node's TypeScript/ESM loaders untouched.
const original=Module._load,cache=new Map();
Module._load=function(specifier,parent,isMain){
 const file=aliases.get(specifier);if(!file)return original.call(this,specifier,parent,isMain);
 if(cache.has(file))return cache.get(file).exports;
 const mod=new Module(file,parent);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);
 mod._compile(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
 return mod.exports;
};
