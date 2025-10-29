const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://nlpkdlab.online";

export interface IndexDocumentsResponse {
  message?: string;
  documents?: Array<{ name: string; id?: string }>;
  indexed_count?: number;
  [key: string]: unknown;
}

export interface QueryResponse {
  answer?: string;
  response?: string;
  result?: string;
  data?: unknown;
  [key: string]: unknown;
}

export const indexDocuments = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE_URL}/index`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Index request failed with status ${response.status}`);
  }

  const data = (await response.json()) as IndexDocumentsResponse;
  return data;
};

export const queryDocuments = async (query: string) => {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Query request failed with status ${response.status}`);
  }

  const data = (await response.json()) as QueryResponse;
  return data;
};
