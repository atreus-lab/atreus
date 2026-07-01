import Link from "next/link";

export default function Home() {
  return (
    <div className="page-content">
      <h1 className="page-title">Atreus</h1>
      <p className="page-subtitle">
        The easiest way to send and receive funds on Stellar.
        Secure, private, and no wallet required for the recipient.
      </p>
      <div className="flex flex-col gap-4 items-center">
        <Link href="/dashboard" className="btn-primary text-center w-full max-w-xs">
          Launch Wallet
        </Link>
        <div className="flex-gap-center">
          <Link href="/create" className="btn-ghost">
            Create Link
          </Link>
          <Link href="/claim" className="btn-secondary">
            Claim Funds
          </Link>
        </div>
      </div>
    </div>
  );
}
