import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-2xl text-center space-y-6">
      <h1 className="text-6xl font-bold tracking-tight">
        ZK-PayLink
      </h1>
      <p className="text-xl text-slate-400">
        The easiest way to send and receive funds on Stellar. 
        Secure, private, and no wallet required for the recipient.
      </p>
      <div className="flex gap-4 justify-center">
        <Link 
          href="/create" 
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          Create PayLink
        </Link>
        <Link 
          href="/claim" 
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold transition"
        >
          Claim Funds
        </Link>
      </div>
    </div>
  );
}
