import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
const [template,css,config,calculator,app]=await Promise.all(['page.template.html','styles.css','fee-config.js','calculator.js','app.js'].map(read));
// Bundle without changing any calculation expressions. No imports or fetches at runtime.
const stripExports=source=>source.replace(/^export /gm,'');
const appBody=app.replace(/^import .*;\r?\n/gm,'');
const script=`(()=>{\n'use strict';\n${stripExports(config)}\nconst config=feeConfig;\n${stripExports(calculator)}\n${appBody}\n})();`;
const html=template.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>\n${css}\n</style>`).replace('<script type="module" src="app.js"></script>',()=>`<script>\n${script.replace(/<\/script/gi,'<\\/script')}\n</script>`);
await writeFile(new URL('index.html',root),html);
console.log('Built standalone index.html (no server or external module loading required)');
