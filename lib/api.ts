// Your live Render URL — the base of every API call
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// TypeScript interface — mirrors your FastAPI UserResponse schema exactly
// Same fields you defined in Pydantic, now defined in TypeScript
export interface User {
    id: number
    email: string
    name: string
    bio: string | null
    avatar_url: string | null
    date_of_birth: string | null
    is_active: boolean
    is_profile_complete: boolean
    latitude: number | null
    longitude: number | null
    discovery_radius_km: number
    is_discoverable: boolean
    last_seen: string | null
    created_at: string
}

// A helper function that makes authenticated API calls
// Every protected route needs the Clerk token in the header
// Instead of repeating this in every call, one function handles it
async function fetchWithAuth(endpoint: string, token: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...options.headers,
        },
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Something went wrong")
    }

    return response.json()
}

// ── API functions — one per backend endpoint ────────────────────

export async function registerUser(
    token: string,
    data: { email: string; name: string }
): Promise<User> {
    return fetchWithAuth("/users/register", token, {
        method: "POST",
        body: JSON.stringify(data),
    })
}

export async function getMyProfile(token: string): Promise<User> {
    return fetchWithAuth("/users/me", token)
}

interface UserUpdatePayload {
    name?: string
    bio?: string | null
    date_of_birth?: string | null
    is_discoverable?: boolean
}

export async function updateMyProfile(
    token: string,
    data: UserUpdatePayload
): Promise<User> {
    return fetchWithAuth("/users/me", token, {
        method: "PATCH",
        body: JSON.stringify(data),
    })
}

// export async function getNearbyUsers(token: string): Promise<User[]> {
//     return fetchWithAuth("/discover/nearby", token)
// }


// next round of features, related to finding and updateding about nearby users
export interface NearbyUser {
    id: number
    name: string
    bio: string | null
    avatar_url: string | null
    distance_km: number
    is_online: boolean
}

export async function updateLocation(
    token: string,
    latitude: number,
    longitude: number
): Promise<void> {
    return fetchWithAuth("/discover/me/location", token, {
        method: "PATCH",
        body: JSON.stringify({ latitude, longitude }),
    })
}

export async function updatePresence(token: string): Promise<void> {
    return fetchWithAuth("/discover/me/presence", token, {
        method: "PATCH",
    })
}

export async function getNearbyUsers(token: string): Promise<NearbyUser[]> {
    return fetchWithAuth("/discover/nearby", token)
}

export async function updateDiscoverySettings(
    token: string,
    data: { discovery_radius_km?: number; is_discoverable?: boolean }
): Promise<User> {
    return fetchWithAuth("/users/me", token, {
        method: "PATCH",
        body: JSON.stringify(data),
    })
}


//related to activity page

export interface ConnectionRequest {
    id: number
    sender_id: number
    receiver_id: number
    message: string
    status: string
    created_at: string
    expires_at: string
    responded_at: string | null
    sender_name?: string
    sender_bio?: string
    receiver_name?: string
}

export interface ChatSession {
    id: number
    request_id: number
    user_one_id: number
    user_two_id: number
    status: string
    started_at: string
    expires_at: string
    ended_at: string | null
    other_user_name?: string
}

export interface RespondResult {
    status: string
    session_id?: number
    expires_at?: string
}

export async function sendConnectionRequest(
    token: string,
    receiver_id: number,
    message: string
): Promise<ConnectionRequest> {
    return fetchWithAuth("/connections/", token, {
        method: "POST",
        body: JSON.stringify({ receiver_id, message }),
    })
}

export async function getPendingRequests(
    token: string
): Promise<ConnectionRequest[]> {
    return fetchWithAuth("/connections/pending", token)
}

export async function getSentRequests(
    token: string
): Promise<ConnectionRequest[]> {
    return fetchWithAuth("/connections/sent", token)
}

export async function respondToRequest(
    token: string,
    request_id: number,
    action: "accept" | "reject"
): Promise<RespondResult> {
    return fetchWithAuth(`/connections/${request_id}/respond`, token, {
        method: "PATCH",
        body: JSON.stringify({ action }),
    })
}

export async function getActiveSessions(
    token: string
): Promise<ChatSession[]> {
    return fetchWithAuth("/sessions/active", token)
}

export async function getSession(
    token: string,
    session_id: number
): Promise<ChatSession> {
    return fetchWithAuth(`/sessions/${session_id}`, token)
}


//related to chat 
export function createChatWebSocket(
    sessionId: number,
    token: string
): WebSocket {
    const wsBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
        .replace("https://", "wss://")
        .replace("http://", "ws://")

    return new WebSocket(`${wsBase}/ws/session/${sessionId}?token=${token}`)
}