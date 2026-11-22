'use client';
export default function ErrorPage({retry}:{error:unknown;retry:()=>void}){return <main className="container" style={{padding:'60px 20px'}}><h2>We couldn’t load this page</h2><p>Check your connection and try again. Your saved manuscripts remain in your account.</p><button className="button primary" onClick={()=>retry()}>Try again</button></main>;}
