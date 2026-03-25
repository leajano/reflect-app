import { v4 as uuidv4 } from 'uuid';

export function generateSelfToken(participantId: number, cycleId: number): string {
  const raw = `${participantId}:self:${cycleId}`;
  return Buffer.from(raw).toString('base64url');
}

export function generatePeerToken(participantId: number, cycleId: number): string {
  const uniqueId = uuidv4();
  const raw = `${participantId}:peer:${uniqueId}:${cycleId}`;
  return Buffer.from(raw).toString('base64url');
}

export interface ParsedToken {
  participantId: number;
  type: 'self' | 'peer';
  cycleId: number;
  uniqueId?: string;
}

export function parseToken(token: string): ParsedToken | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = raw.split(':');

    if (parts.length < 3) return null;

    const participantId = parseInt(parts[0]);
    const type = parts[1] as 'self' | 'peer';

    if (isNaN(participantId) || !['self', 'peer'].includes(type)) return null;

    if (type === 'self') {
      const cycleId = parseInt(parts[2]);
      if (isNaN(cycleId)) return null;
      return { participantId, type, cycleId };
    } else {
      // peer token format: participantId:peer:uniqueId:cycleId
      // uniqueId is a UUID which contains hyphens, not colons
      const uniqueId = parts[2];
      const cycleId = parseInt(parts[3]);
      if (isNaN(cycleId)) return null;
      return { participantId, type, cycleId, uniqueId };
    }
  } catch {
    return null;
  }
}
