import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const repository = resolve(import.meta.dirname, "..");
const build = resolve(repository, "output/netlify/sidequests-readiness");
const hosting = resolve(repository, "standalone/readiness/hosting");

await mkdir(build, { recursive: true });
await cp(hosting, build, { recursive: true });

const sourcePdf = resolve(repository, "public/readiness/sidequests-readiness-brief.pdf");
const rootPdf = resolve(build, "sidequests-readiness-brief.pdf");
await copyFile(sourcePdf, rootPdf);

const macMetadata = resolve(build, ".DS_Store");
await rm(macMetadata, { force: true });
