import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import axios from "axios";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { initMiddleware } from "init-middleware";

const handleCors = initMiddleware(cors());

const baseURL = process.env.NOCODB_URL || "https://db.creatorsgarten.org";

const issuer = "https://creatorsgarten.org";
const keySetUrl = new URL("https://creatorsgarten.org/.well-known/jwks");
const clientId = "https://db.creatorsgarten.org";
const keySet = createRemoteJWKSet(keySetUrl);

function validate(jwt: string) {
  return jwtVerify(jwt, keySet, { issuer, audience: clientId });
}

type Data = {
  email: string;
  password: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await handleCors(req, res);
  const idToken = String(req.body?.id_token ?? req.query.id_token);
  const result = await validate(idToken);
  const email = String(result.payload.email);
  const password = randomUUID();
  try {
    await ensureUser(email, password);
    if (req.query.response_mode === "json") {
      res.json({ email, password });
    } else {
      const credentials = encodeURIComponent(
        JSON.stringify({ email, password })
      );
      const random1 = Array.from({ length: 8 }, () => crypto.randomUUID()).join(
        "-"
      );
      const random2 = Array.from({ length: 8 }, () => crypto.randomUUID()).join(
        "-"
      );
      res.redirect(
        `${baseURL}/sso#random1=${random1}&credentials=${credentials}&random2=${random2}`
      );
    }
  } catch (error) {
    res.status(500).json({ error: String(error) } as any);
  }
}

async function ensureUser(email: string, password: string) {
  const unauthenticatedClient = axios.create({
    baseURL,
  });

  const {
    data: { token },
  } = await unauthenticatedClient
    .post("/api/v1/auth/user/signin", {
      email: process.env.NOCODB_SUPERADMIN_EMAIL,
      password: process.env.NOCODB_SUPERADMIN_PASSWORD,
    })
    .catch(handleAxiosError("Unable to sign in as superadmin"));

  const authenticatedClient = axios.create({
    baseURL,
    headers: {
      "xc-auth": token,
    },
  });

  /*
(These comments are here to guide GitHub Copilot to generate the correct code.)

POST https://db.creatorsgarten.org/api/v1/users
xc-auth: {{token}}
Content-Type: application/json

{
  "email":"org.yi.dttvb@gmail.com",
  "roles":"org-level-creator"
}

400 Bad Request
{"msg":"User already exist"}

200 OK
{"invite_token":"60a1d670-a38e-4615-a93d-4c959d29f337","email":"org.yi.dttvb@gmail.com"}

###

GET https://db.creatorsgarten.org/api/v1/users?limit=1000
xc-auth: {{token}}

200 OK
{"list":[{"id":"us_btwo8573qsg7ml","email":"org.yi.dttvb@gmail.com","firstname":null,"lastname":null,"username":null,"email_verified":null,"invite_token":"60a1d670-a38e-4615-a93d-4c959d29f337","created_at":"2023-06-26 13:38:11+00:00","updated_at":"2023-06-26 13:38:11+00:00","roles":"org-level-creator","projectsCount":0}]
,"pageInfo":{"totalRows":5,"page":1,"pageSize":1000,"isFirstPage":true,"isLastPage":true}}

###

POST https://db.creatorsgarten.org/api/v1/users/{{userId}}/generate-reset-url
xc-auth: {{token}}
Content-Type: application/json

200 OK
{"reset_password_token":"1b95298f-8b15-41a2-b856-4790e41bd5f5","reset_password_url":"https://db.creatorsgarten.org/auth/password/reset/1b95298f-8b15-41a2-b856-4790e41bd5f5"}

###

POST https://db.creatorsgarten.org/api/v1/auth/password/reset/{{passwordResetToken}}
Content-Type: application/json

{"password":"{{newPassword}}"}

200 OK
{"msg":"Password has been reset successfully"}

###

POST https://db.creatorsgarten.org/api/v1/auth/user/signup
xc-auth: {{token}}
Content-Type: application/json

{
  "email": "org.yi.dttvb@gmail.com",
  "password": "{{newPassword}}",
  "firstname": "Thai",
  "lastname": "P",
  "token": "{{inviteToken}}",
  "ignore_subscribe": true
}

200 OK
{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im9yZy55aS5kdHR2YkBnbWFpbC5jb20iLCJmaXJzdG5hbWUiOiJUaGFpIiwibGFzdG5hbWUiOiJQIiwiaWQiOiJ1c19qbThrMmg1dmR4bnlqNSIsInJvbGVzIjoib3JnLWxldmVsLWNyZWF0b3IiLCJ0b2tlbl92ZXJzaW9uIjoiNmIxYjBiN2E2YWM1YmZmODNmNThiNGI2OGRlMjAzNDA3OTU5ZjA0MmUyYWM5OWVlMmRjMzcxOTc0YTYxMDZkMTA4NzVmMmU0N2YzNzJkYzYiLCJpYXQiOjE2ODc3ODgwOTIsImV4cCI6MTY4NzgyNDA5Mn0.HEcFmOtSgYrOqv3jlQ2AO3DpRn_k5g0O0idGY6arLuM"}
*/

  // Retrieve all users
  const {
    data: { list: users },
  } = await authenticatedClient
    .get<{
      list: { id: string; email: string }[];
    }>("/api/v1/users?limit=1000")
    .catch(handleAxiosError("Unable to retrieve users"));
  const user = users.find((user) => user.email === email);

  if (!user) {
    // Invite the user into the organization
    console.log("-> 1");
    const {
      data: { invite_token: inviteToken },
    } = await authenticatedClient
      .post<{
        invite_token: string;
      }>("/api/v1/users", {
        email,
        roles: "org-level-creator",
      })
      .catch(handleAxiosError("Unable to invite user"));

    // Sign up the user
    console.log("-> 2");
    const {
      data: { token: userToken },
    } = await unauthenticatedClient
      .post<{
        token: string;
      }>("/api/v1/auth/user/signup", {
        email,
        password,
        token: inviteToken,
        ignore_subscribe: true,
      })
      .catch(handleAxiosError("Unable to sign up user"));
  } else {
    // Reset the user's password
    console.log("-> 3");
    const {
      data: { reset_password_token: resetPasswordToken },
    } = await authenticatedClient
      .post<{
        reset_password_token: string;
      }>(`/api/v1/users/${user.id}/generate-reset-url`)
      .catch(handleAxiosError("Unable to generate reset password token"));

    console.log("-> 4");
    await unauthenticatedClient
      .post<{
        msg: string;
      }>(`/api/v1/auth/password/reset/${resetPasswordToken}`, {
        password,
      })
      .catch(handleAxiosError("Unable to reset password"));
  }
}

function handleAxiosError(message: string) {
  return (error: any) => {
    if (axios.isAxiosError(error)) {
      console.error(message, error.response?.data);
      throw new Error(`${message}: ${error}`, { cause: error });
    }
    throw error;
  };
}
