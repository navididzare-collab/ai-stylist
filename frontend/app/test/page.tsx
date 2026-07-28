"use client";

import { useState } from "react";
import { loginUser } from "@/lib/api/auth";
import { useAuth } from "@/lib/useAuth";

export default function TestPage() {
  const { login, user, token } = useAuth();
  const [result, setResult] = useState("");

  async function testLogin() {
    try {
      const res = await loginUser("09370219716", "85678567");
      setResult(JSON.stringify(res, null, 2));
      
      // تست login
      login(
        { id: res.user.id, fullName: res.user.full_name, phone: res.user.phone },
        res.access_token
      );
    } catch (e) {
      setResult("ERROR: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="p-10">
      <button onClick={testLogin} className="bg-blue-500 text-white px-4 py-2 rounded">
        تست لاگین
      </button>
      <pre className="mt-4 bg-gray-100 p-4 rounded">{result}</pre>
      <div className="mt-4">
        <p>User: {user ? user.fullName : "null"}</p>
        <p>Token: {token ? "داره" : "نداره"}</p>
      </div>
    </div>
  );
}