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

export async function updateMyProfile(
    token: string,
    data: Partial<User>
): Promise<User> {
    return fetchWithAuth("/users/me", token, {
        method: "PATCH",
        body: JSON.stringify(data),
    })
}

export async function getNearbyUsers(token: string): Promise<User[]> {
    return fetchWithAuth("/discover/nearby", token)
}