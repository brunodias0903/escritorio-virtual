import type {
  DeskRecord,
  DeskRepository,
} from '../../../modules/desks/desks.repository.js';
import type { DeskConfig } from '../../../shared/domain/index.js';

export class MemoryDeskRepository implements DeskRepository {
  private readonly desks = new Map<string, DeskRecord>();

  private key(map: string, deskId: string, serverId = 'default') {
    return `${serverId}:${map}:${deskId}`;
  }

  async all(serverId = 'default') {
    return [...this.desks.values()].filter(
      (d) => (d.serverId ?? 'default') === serverId,
    );
  }

  async get(map: string, deskId: string, serverId = 'default') {
    return this.desks.get(this.key(map, deskId, serverId));
  }

  async byOwner(email: string, serverId = 'default') {
    return [...this.desks.values()].find(
      (d) => d.ownerEmail === email && (d.serverId ?? 'default') === serverId,
    );
  }

  async adopt(record: DeskRecord) {
    const serverId = record.serverId ?? 'default';
    const key = this.key(record.map, record.deskId, serverId);
    if (this.desks.has(key)) return false;
    if (await this.byOwner(record.ownerEmail, serverId)) return false;
    this.desks.set(key, { ...record, serverId });
    return true;
  }

  async release(map: string, deskId: string, serverId = 'default') {
    return this.desks.delete(this.key(map, deskId, serverId));
  }

  async setConfig(
    map: string,
    deskId: string,
    config: DeskConfig,
    at: number,
    serverId = 'default',
  ) {
    const key = this.key(map, deskId, serverId);
    const current = this.desks.get(key);
    if (!current) return false;
    this.desks.set(key, { ...current, config, updatedAt: at });
    return true;
  }

  async setOwner(email: string, name: string, role: string) {
    let updated = false;
    for (const [key, desk] of this.desks) {
      if (desk.ownerEmail !== email) continue;
      this.desks.set(key, { ...desk, ownerName: name, ownerRole: role });
      updated = true;
    }
    return updated;
  }
}
