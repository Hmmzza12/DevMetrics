/**
 * GitHub GraphQL API v4 query documents.
 *
 * Every query includes the `rateLimit` field so the sync worker can check the
 * remaining budget after each call and abort gracefully before hitting a 403.
 */

const RATE_LIMIT_FRAGMENT = `rateLimit { limit remaining resetAt cost }`;

/** Identity of the authenticated user (used at login and to filter commits). */
export const VIEWER_QUERY = `
  query Viewer {
    viewer {
      id
      databaseId
      login
      avatarUrl
      followers { totalCount }
    }
    ${RATE_LIMIT_FRAGMENT}
  }
`;

/** Owned repositories, newest-updated first, with language breakdown. */
export const REPOS_QUERY = `
  query Repos($cursor: String) {
    viewer {
      repositories(
        first: 50
        after: $cursor
        ownerAffiliations: [OWNER]
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          databaseId
          name
          description
          isPrivate
          stargazerCount
          updatedAt
          owner { login }
          primaryLanguage { name }
          defaultBranchRef { name }
          languages(first: 15, orderBy: { field: SIZE, direction: DESC }) {
            totalSize
            edges {
              size
              node { name }
            }
          }
        }
      }
    }
    ${RATE_LIMIT_FRAGMENT}
  }
`;

/** Commit history authored by the viewer on a repo's default branch. */
export const COMMITS_QUERY = `
  query Commits(
    $owner: String!
    $name: String!
    $authorId: ID!
    $since: GitTimestamp!
    $cursor: String
  ) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(
              first: 100
              since: $since
              author: { id: $authorId }
              after: $cursor
            ) {
              totalCount
              pageInfo { hasNextPage endCursor }
              nodes { committedDate }
            }
          }
        }
      }
    }
    ${RATE_LIMIT_FRAGMENT}
  }
`;

// ── Login-scoped variants (public lookups via the server PAT) ───────────────
// Same shapes as the viewer queries, but targeting `user(login:)` and restricted
// to PUBLIC repositories. `user` is null when the login doesn't exist.

/** Identity of an arbitrary public user (also gives the node id for commits). */
export const USER_IDENTITY_QUERY = `
  query UserIdentity($login: String!) {
    user(login: $login) {
      id
      databaseId
      login
      avatarUrl
      followers { totalCount }
    }
    ${RATE_LIMIT_FRAGMENT}
  }
`;

/** A public user's owned, public repositories, newest-updated first. */
export const USER_REPOS_QUERY = `
  query UserRepos($login: String!, $cursor: String) {
    user(login: $login) {
      repositories(
        first: 50
        after: $cursor
        ownerAffiliations: [OWNER]
        privacy: PUBLIC
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          databaseId
          name
          description
          isPrivate
          stargazerCount
          updatedAt
          owner { login }
          primaryLanguage { name }
          defaultBranchRef { name }
          languages(first: 15, orderBy: { field: SIZE, direction: DESC }) {
            totalSize
            edges {
              size
              node { name }
            }
          }
        }
      }
    }
    ${RATE_LIMIT_FRAGMENT}
  }
`;

/** A public user's authored pull requests, newest-created first. */
export const USER_PRS_QUERY = `
  query UserPrs($login: String!, $cursor: String) {
    user(login: $login) {
      pullRequests(
        first: 50
        after: $cursor
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          databaseId
          createdAt
          mergedAt
          merged
          repository { databaseId }
          reviews(first: 20) { nodes { submittedAt } }
        }
      }
    }
    ${RATE_LIMIT_FRAGMENT}
  }
`;

/** Pull requests authored by the viewer, newest-created first. */
export const PRS_QUERY = `
  query Prs($cursor: String) {
    viewer {
      pullRequests(
        first: 50
        after: $cursor
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          databaseId
          createdAt
          mergedAt
          merged
          repository { databaseId }
          reviews(first: 20) { nodes { submittedAt } }
        }
      }
    }
    ${RATE_LIMIT_FRAGMENT}
  }
`;
