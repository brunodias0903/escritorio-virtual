import { defaultDeskConfig, type DeskInfo } from '@/shared/domain';
import { describe, expect, it } from 'vitest';
import { capacityText, deskCardState } from './deskCard';

const info = (ownerEmail: string | null): DeskInfo => ({
  map: 'lobby',
  deskId: 'mesa-1',
  owner: ownerEmail
    ? { email: ownerEmail, name: 'Ana Souza', role: 'Designer' }
    : null,
  config: defaultDeskConfig('Ana'),
});

const base = {
  name: 'Mesa 1',
  people: 1,
  myEmail: 'bia@x.com',
  iHaveDesk: false,
  isAdmin: false,
};

describe('deskCardState', () => {
  it('mesa sem registro ou devolvida está livre e pode ser adotada', () => {
    expect(deskCardState({ ...base, info: undefined })).toMatchObject({
      kind: 'free',
      canAdopt: true,
    });
    expect(deskCardState({ ...base, info: info(null) })).toMatchObject({
      kind: 'free',
      canAdopt: true,
    });
  });

  it('quem já tem mesa vê a livre sem poder adotar', () => {
    expect(
      deskCardState({ ...base, info: undefined, iHaveDesk: true }),
    ).toMatchObject({
      kind: 'free',
      canAdopt: false,
    });
  });

  it('na minha mesa, posso personalizar e devolver', () => {
    expect(
      deskCardState({ ...base, info: info('bia@x.com'), iHaveDesk: true }),
    ).toMatchObject({
      kind: 'mine',
    });
  });

  it('na mesa de outra pessoa, só vejo; administrador pode devolver', () => {
    expect(deskCardState({ ...base, info: info('ana@x.com') })).toMatchObject({
      kind: 'other',
      ownerName: 'Ana Souza',
      ownerRole: 'Designer',
      canRelease: false,
    });
    expect(
      deskCardState({ ...base, info: info('ana@x.com'), isAdmin: true }),
    ).toMatchObject({
      canRelease: true,
    });
  });
});

describe('capacityText', () => {
  it('mostra quantas pessoas de 3, sem passar do limite', () => {
    expect(capacityText(1)).toBe('1/3');
    expect(capacityText(3)).toBe('3/3');
    expect(capacityText(5)).toBe('3/3');
  });
});
