import Head from "next/head";
import { useEffect } from "react";

export default function Home() {
  const authHref = `/api/login`;
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
