import type { NextApiRequest, NextApiResponse } from "next";

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface AuthReturnType {
  success: boolean;
  data: AuthToken | string;
}

type AuthBodyBase = {
  client_id: string;
  client_secret: string;
  api_key: string;
};

type RefreshBody = AuthBodyBase & {
  refresh_token: string;
  access_token: string;
};

type LoginBody = AuthBodyBase;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthReturnType>
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS,PUT,PATCH,DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      data: "Method not allowed",
    });
  }

  const type = req.query.type as "login" | "refresh";

  const client_id = process.env.EKA_CLIENT_ID;
  const client_secret = process.env.EKA_CLIENT_SECRET;
  const api_key = process.env.EKA_API_KEY;

  if (!client_id || !client_secret || !api_key) {
    return res.status(400).json({
      success: false,
      data: "Missing EKA credentials in environment variables",
    });
  }

  if (!type) {
    return res.status(400).json({
      success: false,
      data: "auth action type not provided. please provided either login or refresh in the query param.",
    });
  }
  try {
    let body: LoginBody | RefreshBody;

    if (type === "refresh") {
      const { refresh_token, auth_token } = req.body as {
        refresh_token: string;
        auth_token: string;
      };

      if (!refresh_token || !auth_token) {
        return res.status(400).json({
          success: false,
          data: "Missing refresh or access token in request body",
        });
      }

      body = {
        client_id,
        client_secret,
        api_key,
        refresh_token,
        access_token: auth_token,
      };
    } else {
      body = {
        client_id,
        client_secret,
        api_key,
      };
    }

    const url =
      type === "refresh"
        ? "https://api.eka.care/connect-auth/v1/account/refresh"
        : "https://api.eka.care/connect-auth/v1/account/login";

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(400).json({
        success: false,
        data: errorText || "Auth failed",
      });
    }

    const data = (await response.json()) as AuthToken;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Auth Error:", error);
    return res.status(400).json({
      success: false,
      data: String(error),
    });
  }
}
