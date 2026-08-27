import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mjml2html from 'mjml';

const templatesDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(templatesDir, '..');
const sourceDir = path.join(templatesDir, 'src');
const outputDir = path.resolve(packageRoot, '../backend/app/Views/emails');
const watchMode = process.argv.includes('--watch');

async function build() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const templates = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.mjml'));

  for (const template of templates) {
    const sourcePath = path.join(sourceDir, template.name);
    const source = await readFile(sourcePath, 'utf8');
    const result = await mjml2html(source, {
      filePath: sourcePath,
      ignoreIncludes: false,
      includePath: sourceDir,
      validationLevel: 'strict',
    });

    if (result.errors.length) {
      throw new Error(result.errors.map((error) => `${template.name}:${error.line} ${error.message}`).join('\n'));
    }

    const outputName = template.name.replace(/\.mjml$/, '.html');
    const html = `${result.html.replace(/[ \t]+$/gm, '').trimEnd()}\n`;
    await writeFile(path.join(outputDir, outputName), html, 'utf8');
    console.log(`✓ ${template.name} → backend/app/Views/emails/${outputName}`);
  }
}

await build();

if (watchMode) {
  let timer;
  console.log('Watching email templates …');
  watch(sourceDir, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((error) => console.error(error.message)), 120);
  });
}
