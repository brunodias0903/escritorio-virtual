import { relative } from 'node:path';

const relTo = (dir, files) =>
  files
    .map((file) => JSON.stringify(relative(dir, file).replace(/\\/g, '/')))
    .join(' ');

export default {
  'backend/**/*.{js,mjs,ts}': (files) => {
    const targets = relTo('backend', files);
    return [
      `pnpm --dir backend exec eslint --fix ${targets}`,
      `pnpm --dir backend exec prettier --write ${targets}`,
    ];
  },
  'frontend/**/*.{js,jsx,ts,tsx}': (files) => {
    const targets = relTo('frontend', files);
    return [
      `pnpm --dir frontend exec eslint --fix ${targets}`,
      `pnpm --dir frontend exec prettier --write ${targets}`,
    ];
  },
  'frontend/**/*.{css,html}': (files) => {
    const targets = relTo('frontend', files);
    return `pnpm --dir frontend exec prettier --write ${targets}`;
  },
  '*.{js,mjs,json,jsonc,md,yaml,yml}': 'prettier --write',
  'scripts/*.{js,mjs}': 'prettier --write',
};
