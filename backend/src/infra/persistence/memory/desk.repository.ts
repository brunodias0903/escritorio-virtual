import type {
  DeskRecord,
  DeskRepository,
} from '../../../modules/desks/desks.repository.js';
import type { DeskConfig } from '../../../shared/domain/index.js';

export class MemoryDeskRepository implements DeskRepository {
  private readonly desks = new Map<string, DeskRecord>();

  private key(map: string, deskId: string) {
    return `${map}:${deskId}`;
  }

  async all() {
    return [...this.desks.values()];
  }

  async get(map: string, deskId: string) {
    return this.desks.get(this.key(map, deskId));
  }

  async byOwner(email: string) {
    return [...this.desks.values()].find((d) => d.ownerEmail === email);
  }

  async adopt(record: DeskRecord) {
    const key = this.key(record.map, record.deskId);
    if (this.desks.has(key)) return false;
    if (await this.byOwner(record.ownerEmail)) return false;
    this.desks.set(key, record);
    return true;
  }

  async release(map: string, deskId: string) {
    return this.desks.delete(this.key(map, deskId));
  }

  async setConfig(map: string, deskId: string, config: DeskConfig, at: number) {
    const key = this.key(map, deskId);
    const current = this.desks.get(key);
    if (!current) return false;
    this.desks.set(key, { ...current, config, updatedAt: at });
    return true;
  }

  async setOwner(email: string, name: string, role: string) {
    for (const [key, desk] of this.desks) {
      if (desk.ownerEmail !== email) continue;
      this.desks.set(key, { ...desk, ownerName: name, ownerRole: role });
      return true;
    }
    return false;
  }
}
