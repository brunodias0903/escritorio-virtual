export default {
  '*.{js,mjs,ts}': ['eslint --fix', 'prettier --write'],
  '*.{json,jsonc,md,yaml,yml}': 'prettier --write',
};
