const API_URL = "https://api-1-lbzf.onrender.com";

export const apiRequest = async (endpoint: string, method = "GET", body?: any) => {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new Error("Request failed");
    }

    return await res.json();
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
};
