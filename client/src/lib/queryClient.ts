import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Ensure URL doesn't have double slashes
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  
  console.log(`Making ${method} request to ${cleanUrl}`);
  
  const options: RequestInit = {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      // Add additional headers if needed
      "Accept": "application/json"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Send cookies if any
    mode: "cors" // Explicitly state we're using CORS
  };
  
  try {
    const res = await fetch(cleanUrl, options);
    
    // Log response status
    console.log(`Received response from ${cleanUrl}: ${res.status} ${res.statusText}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request error for ${cleanUrl}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Ensure URL doesn't have double slashes
    const urlKey = queryKey[0] as string;
    const cleanUrl = urlKey.startsWith('/') ? urlKey : `/${urlKey}`;
    
    const res = await fetch(cleanUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds stale time for better caching
      retry: false,
      refetchOnMount: false, // Prevent refetching when components mount
      refetchOnReconnect: false, // Prevent refetching when reconnecting
    },
    mutations: {
      retry: false,
    },
  },
});
