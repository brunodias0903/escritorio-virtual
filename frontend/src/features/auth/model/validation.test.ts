import { describe, expect, it } from 'vitest';
import {
  validateCodeEmail,
  validateLogin,
  validateRegister,
  validateReset,
  validateUpdate,
} from './validation';

const account = {
  fullName: '  Ana   Souza ',
  nickname: ' anas ',
  email: ' Ana@Empresa.com ',
  code: ' 123456 ',
  role: ' Designer ',
  password: 'senha-segura-123',
  confirmPassword: 'senha-segura-123',
};

describe('validateRegister', () => {
  it('limpa e aceita um cadastro completo', () => {
    expect(validateRegister(account)).toEqual({
      ok: true,
      data: {
        fullName: 'Ana Souza',
        nickname: 'anas',
        email: 'ana@empresa.com',
        code: '123456',
        role: 'Designer',
        password: 'senha-segura-123',
      },
    });
  });

  it('aceita qualquer e-mail válido (o servidor decide quem entra)', () => {
    expect(
      validateRegister({ ...account, email: 'joao@gmail.com' }),
    ).toMatchObject({ ok: true });
    expect(validateRegister({ ...account, email: 'ana@' })).toEqual({
      ok: false,
      message: 'E-mail inválido.',
    });
  });

  it('exige nome e sobrenome', () => {
    expect(validateRegister({ ...account, fullName: 'Ana' })).toEqual({
      ok: false,
      message: 'Informe o nome completo (nome e sobrenome).',
    });
    expect(validateRegister({ ...account, fullName: 'Ana S' })).toMatchObject({
      ok: false,
    });
  });

  it('exige nickname válido, senha forte e senhas iguais', () => {
    expect(validateRegister({ ...account, nickname: 'a b' })).toMatchObject({
      ok: false,
      message: expect.stringContaining('3 a 20'),
    });
    expect(
      validateRegister({
        ...account,
        password: 'curta',
        confirmPassword: 'curta',
      }),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining('10 caracteres'),
    });
    expect(
      validateRegister({ ...account, confirmPassword: 'outra-senha-1' }),
    ).toEqual({ ok: false, message: 'As senhas não são iguais.' });
  });
});

describe('validateLogin', () => {
  it('aceita nickname ou e-mail, e explica o que falta', () => {
    expect(validateLogin({ login: ' anas ', password: 'x' })).toEqual({
      ok: true,
      data: { login: 'anas', password: 'x' },
    });
    expect(
      validateLogin({ login: 'ana@parceiro.com', password: 'x' }),
    ).toMatchObject({ ok: true });
    expect(validateLogin({ login: '', password: 'x' })).toEqual({
      ok: false,
      message: 'Informe o nickname ou o e-mail.',
    });
    expect(validateLogin({ login: 'anas', password: '' })).toEqual({
      ok: false,
      message: 'Informe a senha.',
    });
  });
});

describe('validateUpdate', () => {
  const base = {
    fullName: 'Ana Souza',
    nickname: 'anas',
    role: ' Tech   Lead ',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  it('sem senha nova, só muda os dados', () => {
    expect(validateUpdate(base)).toMatchObject({
      ok: true,
      data: { role: 'Tech Lead', newPassword: '' },
    });
  });

  it('senha nova exige a atual e confirmação igual', () => {
    expect(
      validateUpdate({
        ...base,
        newPassword: 'nova-senha-123',
        confirmPassword: 'nova-senha-123',
      }),
    ).toEqual({
      ok: false,
      message: 'Informe a senha atual para trocar a senha.',
    });
    expect(
      validateUpdate({
        ...base,
        currentPassword: 'velha-velha',
        newPassword: 'nova-senha-123',
        confirmPassword: 'outra',
      }),
    ).toEqual({ ok: false, message: 'As senhas novas não são iguais.' });
    expect(
      validateUpdate({
        ...base,
        currentPassword: 'velha-velha',
        newPassword: 'nova-senha-123',
        confirmPassword: 'nova-senha-123',
      }),
    ).toMatchObject({ ok: true });
  });

  it('exige nome e sobrenome', () => {
    expect(validateUpdate({ ...base, fullName: 'Ana' })).toMatchObject({
      ok: false,
    });
  });
});

describe('código por e-mail', () => {
  it('cadastro exige o código de 6 números', () => {
    expect(validateRegister({ ...account, code: '12a' })).toEqual({
      ok: false,
      message: 'Informe o código de 6 números do e-mail.',
    });
  });

  it('pedir o código: confere só o formato do e-mail', () => {
    expect(validateCodeEmail(' Ana@PARCEIRO.com ')).toEqual({
      ok: true,
      data: 'ana@parceiro.com',
    });
    expect(validateCodeEmail('ana@')).toMatchObject({ ok: false });
  });

  it('esqueci a senha: código e senhas iguais', () => {
    const base = {
      email: 'ana@parceiro.com',
      code: '123456',
      password: 'nova-senha-123',
      confirmPassword: 'nova-senha-123',
    };
    expect(validateReset(base)).toMatchObject({ ok: true });
    expect(validateReset({ ...base, confirmPassword: 'x' })).toEqual({
      ok: false,
      message: 'As senhas não são iguais.',
    });
    expect(validateReset({ ...base, code: '' })).toMatchObject({ ok: false });
  });
});
