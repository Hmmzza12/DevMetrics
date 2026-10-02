import { db } from '../db/client.js';
import { users, type User } from '../db/schema.js';
import { fetchViewer } from '../github/client.js';
import { encryptToken } from '../lib/crypto.js';

/**
 * Create or update a user from a fresh GitHub OAuth token.
 *
 * Fetches the viewer profile, encrypts the access token, and upserts on the
 * unique `github_id`. The plaintext token is never persisted or returned.
 */
export async function upsertUserFromToken(token: string): Promise<User> {
  const viewer = await fetchViewer(token);
  const encrypted = encryptToken(token);

  const [row] = await db
    .insert(users)
    .values({
      githubId: viewer.githubId,
      username: viewer.login,
      avatarUrl: viewer.avatarUrl,
      accessToken: encrypted,
      followers: viewer.followers,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        username: viewer.login,
        avatarUrl: viewer.avatarUrl,
        accessToken: encrypted,
        followers: viewer.followers,
      },
    })
    .returning();

  return row;
}
