// Shared in-memory state for Instagram module
// postId → Set<userId>
export const likesMap = new Map();

// postId → threadId
export const threadsMap = new Map();
