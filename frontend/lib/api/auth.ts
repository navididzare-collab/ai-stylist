const API_BASE = "https://app-python-f3b4n.apps.teh11.abrhapaas.com";
export type AuthApiResponse = {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    full_name: string;
    phone: string;
  };
};

async function parseErrorOrThrow(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  throw new Error(body?.detail || fallback);
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function registerUser(
  fullName: string,
  phone: string,
  password: string
): Promise<AuthApiResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, phone, password }),
  });

  if (!res.ok) {
    await parseErrorOrThrow(res, "خطا در ثبت‌نام. دوباره تلاش کنید.");
  }

  return res.json();
}

export async function loginUser(
  phone: string,
  password: string
): Promise<AuthApiResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });

  if (!res.ok) {
    await parseErrorOrThrow(res, "شماره موبایل یا رمز عبور اشتباه است.");
  }

  return res.json();
}

// --- جدید: ویرایش پروفایل ---

export async function updateUserName(fullName: string): Promise<{ id: number; full_name: string; phone: string; created_at: string }> {
  const res = await fetch(`${API_BASE}/auth/me/name`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ full_name: fullName }),
  });

  if (!res.ok) {
    await parseErrorOrThrow(res, "خطا در تغییر نام.");
  }

  return res.json();
}

export async function updateUserPassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/me/password`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  if (!res.ok) {
    await parseErrorOrThrow(res, "رمز عبور فعلی اشتباه است.");
  }

  return res.json();
}