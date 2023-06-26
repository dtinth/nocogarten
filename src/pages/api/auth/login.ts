import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the host and protocol
  const host = req.headers.host;
  const redir = `${
    process.env.NODE_ENV === "production" ? `https://${host}` : `http://${host}`
  }/api/auth/callback`;
  const redirectUrl = `https://creatorsgarten.org/auth/authorize?client_id=https://db.creatorsgarten.org&scope=openid+email&response_type=id_token&redirect_uri=${encodeURIComponent(
    redir
  )}`;
  res.redirect(redirectUrl);
}
