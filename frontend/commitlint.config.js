export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => message.trim().toLowerCase() === 'initial commit'],
  rules: {
    // Permite títulos naturais em português, como 'Adiciona chat por canais'.
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'header-max-length': [2, 'always', 100],
  },
};
