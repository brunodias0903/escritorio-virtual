import type {
  Profile,
  ProfileRepository,
  SavedPosition,
} from '../../../modules/office/profile.repository.js';
import { emailHandle, type Appearance } from '../../../shared/domain/index.js';

export class MemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, Profile>();

  async get(email: string) {
    return this.profiles.get(email);
  }

  async touch(email: string, name: string, at: number) {
    const current = this.profiles.get(email);
    this.profiles.set(email, {
      email,
      name,
      appearance: current?.appearance ?? null,
      lastSeen: at,
      position: current?.position ?? null,
    });
  }

  async setAppearance(email: string, appearance: Appearance) {
    const current = this.profiles.get(email);
    if (current) this.profiles.set(email, { ...current, appearance });
  }

  async setPosition(email: string, position: SavedPosition) {
    const current = this.profiles.get(email);
    if (current) this.profiles.set(email, { ...current, position });
  }

  async byHandles(handles: string[]) {
    return [...this.profiles.values()].filter((p) =>
      handles.includes(emailHandle(p.email)),
    );
  }

  async directory(limit: number) {
    return [...this.profiles.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }
}
