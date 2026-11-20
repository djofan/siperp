import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";
const require=createRequire(import.meta.url),ts=require("typescript"),React=require("react");
const {renderToStaticMarkup}=require("react-dom/server");
function load(file){const context={exports:{},require};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);return context.exports;}
test("article formatting preserves sources while escaping HTML and unsafe links",()=>{
 const {ArticleBody}=load("modules/lazsip/components/ArticleBody.tsx");
 const html=renderToStaticMarkup(React.createElement(ArticleBody,{content:'## Ketentuan\n\n- Satu\n- Dua\n\n> Kutipan\n\n[Rujukan](https://example.com)\n\n<script>alert(1)</script> [Buruk](javascript:alert(1))'}));
 assert.match(html,/<h2[^>]*>Ketentuan<\/h2>/);assert.match(html,/<li>Satu<\/li>/);assert.match(html,/<blockquote/);
 assert.match(html,/href="https:\/\/example.com"/);assert.doesNotMatch(html,/<script|href="javascript:/);assert.match(html,/&lt;script&gt;/);
});
