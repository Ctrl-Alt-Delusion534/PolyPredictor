const BASE_URL = "http://localhost:8000/api";

export const apiRequest = async (endpoint, method = "GET", body = null) => {
  const url = `${BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Failure on ${endpoint}:`, error.message);
    throw error;
  }
};
