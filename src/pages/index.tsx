import Head from "next/head";
import { useEffect } from "react";

export default function Home() {
  const redir = `${
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000"
  }/api/auth/callback`;
  const authHref = `https://creatorsgarten.org/auth/authorize?client_id=https://db.creatorsgarten.org&scope=openid+email&response_type=id_token&redirect_uri=${encodeURIComponent(
    redir
  )}`;
  useEffect(() => {
    location.replace(authHref);
  }, [authHref]);
  return (
    <>
      <Head>
        <title>nocogarten</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <p>
          Redirecting to Creatorsgarten.org… <a href={authHref}>Click here</a>{" "}
          if you are not redirected.
        </p>
      </main>
    </>
  );
}
