import { z } from 'zod';
import {
  MapIdSchema,
  ServerMessageSchema,
  type Player,
} from '../../shared/domain/index.js';

/** Mensagem que uma instância repassa às outras para elas entregarem aos seus sockets. */
export const BusEventSchema = z.object({
  origin: z.string(),
  /** Id do jogador que gerou a mensagem. */
  sender: z.string(),
  to: z.enum(['others', 'all']),
  message: ServerMessageSchema,
  /** Só entrega a quem está nesta sala. */
  map: MapIdSchema.optional(),
  /** Só entrega a estas pessoas (conversas diretas). */
  emails: z.array(z.string()).optional(),
});
export type BusEvent = z.infer<typeof BusEventSchema>;

/** Barramento Pub/Sub entre instâncias do servidor. */
export interface Bus {
  publish(event: BusEvent): Promise<void>;
  subscribe(handler: (event: BusEvent) => void): Promise<void>;
  close(): Promise<void>;
}

/** Quem está online em cada instância, para quem entra ver todo mundo. */
export interface Presence {
  /** Grava ou atualiza um jogador desta instância. */
  set(origin: string, player: Player): Promise<void>;
  remove(origin: string, playerId: string): Promise<void>;
  /** Renova a validade da lista desta instância. */
  heartbeat(origin: string): Promise<void>;
  /** Jogadores de todas as outras instâncias. */
  others(origin: string): Promise<Player[]>;
}
